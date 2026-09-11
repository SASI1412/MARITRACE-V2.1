/**
 * Live AIS Stream Service (Client)
 * Manages HTTP snapshot polling and real-time WebSocket connection to the backend.
 * Guarantees stable 20-vessel membership and safe data normalization.
 */

export class LiveAISService {
  constructor() {
    this.vessels = [];
    this.status = 'DISCONNECTED'; // CONNECTING, LIVE, PARTIAL DATA, DISCONNECTED, NO_KEY, ERROR
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectDelay = 2000;
    this.maxReconnectDelay = 30000;
    this.isRefreshing = false;
  }

  onUpdate(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onStatus(callback) {
    this.statusListeners.add(callback);
    callback(this.status, this.vessels.length);
    return () => this.statusListeners.delete(callback);
  }

  _notify() {
    for (const cb of this.listeners) {
      try { cb(this.vessels); } catch (e) { console.error('AIS update listener error:', e); }
    }
  }

  _notifyStatus(status) {
    this.status = status;
    for (const cb of this.statusListeners) {
      try { cb(this.status, this.vessels.length); } catch (e) { console.error('AIS status listener error:', e); }
    }
  }

  safeNormalizeVessel(raw) {
    if (!raw) return null;

    // Guard against undefined.toString()
    let mmsi = null;
    if (raw.mmsi !== undefined && raw.mmsi !== null) {
      mmsi = String(raw.mmsi).trim();
    } else if (raw.UserID !== undefined && raw.UserID !== null) {
      mmsi = String(raw.UserID).trim();
    }

    if (!mmsi) return null;

    const lat = typeof raw.lat === 'number' ? raw.lat : parseFloat(raw.lat);
    const lon = typeof raw.lon === 'number' ? raw.lon : parseFloat(raw.lon);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return null;
    }

    let sog = null;
    if (raw.sog !== undefined && raw.sog !== null) {
      const parsedSog = parseFloat(raw.sog);
      if (!isNaN(parsedSog) && parsedSog <= 102.2) sog = parsedSog;
    }

    let cog = null;
    if (raw.cog !== undefined && raw.cog !== null) {
      const parsedCog = parseFloat(raw.cog);
      if (!isNaN(parsedCog) && parsedCog <= 360.0) cog = parsedCog;
    }

    const shipName = (raw.shipName && typeof raw.shipName === 'string') 
      ? raw.shipName.trim() 
      : `VESSEL ${mmsi}`;

    return {
      mmsi,
      shipName: shipName || `VESSEL ${mmsi}`,
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4)),
      sog: sog !== null ? Number(sog.toFixed(1)) : null,
      cog: cog !== null ? Number(cog.toFixed(1)) : null,
      timestamp: raw.timestamp || new Date().toISOString(),
      source: 'AISSTREAM_LIVE'
    };
  }

  async fetchInitialSnapshot() {
    this._notifyStatus('CONNECTING');
    try {
      const res = await fetch('/api/live-ais');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data.success) {
        if (data.status === 'NO_KEY') {
          this._notifyStatus('NO_KEY');
        } else {
          this._notifyStatus('ERROR');
        }
        return this.vessels;
      }

      const validVessels = (data.vessels || [])
        .map(v => this.safeNormalizeVessel(v))
        .filter(Boolean);

      // Enforce unique MMSIs and max 20
      const seen = new Set();
      this.vessels = [];
      for (const v of validVessels) {
        if (!seen.has(v.mmsi) && this.vessels.length < 20) {
          seen.add(v.mmsi);
          this.vessels.push(v);
        }
      }

      this._notifyStatus(this.vessels.length >= 20 ? 'LIVE' : (this.vessels.length > 0 ? 'PARTIAL' : 'CONNECTING'));
      this._notify();
      return this.vessels;
    } catch (err) {
      console.warn('Could not fetch initial AIS snapshot:', err.message);
      this._notifyStatus('ERROR');
      return [];
    }
  }

  connectWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // Already connecting or connected
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/ais`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectDelay = 2000;
        this._notifyStatus(this.vessels.length >= 20 ? 'LIVE' : (this.vessels.length > 0 ? 'PARTIAL' : 'CONNECTING'));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleWsMessage(msg);
        } catch (e) {
          console.error('Invalid WS message JSON:', e);
        }
      };

      this.ws.onclose = () => {
        this.failedWsAttempts = (this.failedWsAttempts || 0) + 1;
        if (this.failedWsAttempts >= 2) {
          // Fallback to polling for serverless platforms like Vercel
          this._startPollingFallback();
        } else {
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        // Handled in onclose
      };
    } catch (e) {
      this._startPollingFallback();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
      this.connectWebSocket();
    }, this.reconnectDelay);
  }

  _startPollingFallback() {
    if (this.pollingTimer) return;
    // Gentle polling interval (every 12 seconds) for serverless environments (Vercel)
    this.pollingTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/live-ais');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.vessels)) {
          // If we don't have vessels yet, initialize them
          if (this.vessels.length === 0) {
            const valid = data.vessels.map(v => this.safeNormalizeVessel(v)).filter(Boolean).slice(0, 20);
            this.vessels = valid;
            this._notifyStatus(this.vessels.length >= 20 ? 'LIVE' : 'PARTIAL');
            this._notify();
          } else {
            // Update existing vessels in the fixed 20 snapshot
            for (const incoming of data.vessels) {
              const norm = this.safeNormalizeVessel(incoming);
              if (!norm) continue;
              const idx = this.vessels.findIndex(v => v.mmsi === norm.mmsi);
              if (idx !== -1) {
                this.vessels[idx] = { ...this.vessels[idx], ...norm };
              }
            }
            this._notify();
          }
        }
      } catch (e) {
        // Silent catch for background polling
      }
    }, 12000);
  }

  _handleWsMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'SNAPSHOT_INIT') {
      const valid = (msg.vessels || [])
        .map(v => this.safeNormalizeVessel(v))
        .filter(Boolean);

      const seen = new Set();
      this.vessels = [];
      for (const v of valid) {
        if (!seen.has(v.mmsi) && this.vessels.length < 20) {
          seen.add(v.mmsi);
          this.vessels.push(v);
        }
      }
      this._notifyStatus(msg.status === 'NO_KEY' ? 'NO_KEY' : (this.vessels.length >= 20 ? 'LIVE' : 'PARTIAL'));
      this._notify();
    } else if (msg.type === 'VESSEL_ADDED') {
      const vessel = this.safeNormalizeVessel(msg.vessel);
      if (!vessel) return;

      // Stable 20-vessel rule: Only add if not present and length < 20
      if (!this.vessels.some(v => v.mmsi === vessel.mmsi)) {
        if (this.vessels.length < 20) {
          this.vessels.push(vessel);
          this._notifyStatus(this.vessels.length >= 20 ? 'LIVE' : 'PARTIAL');
          this._notify();
        }
      }
    } else if (msg.type === 'VESSEL_UPDATE') {
      const updated = this.safeNormalizeVessel(msg.vessel);
      if (!updated) return;

      // Stable 20-vessel rule: Update only existing vessels in the 20-vessel snapshot
      const idx = this.vessels.findIndex(v => v.mmsi === updated.mmsi);
      if (idx !== -1) {
        this.vessels[idx] = {
          ...this.vessels[idx],
          lat: updated.lat,
          lon: updated.lon,
          sog: updated.sog,
          cog: updated.cog,
          timestamp: updated.timestamp
        };
        this._notify();
      }
    } else if (msg.type === 'SNAPSHOT_REFRESH') {
      this.vessels = [];
      this._notifyStatus('CONNECTING');
      this._notify();
    }
  }

  async refresh() {
    if (this.isRefreshing) return this.vessels;
    this.isRefreshing = true;
    this._notifyStatus('CONNECTING');
    try {
      const res = await fetch('/api/live-ais/refresh', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const valid = (data.vessels || [])
          .map(v => this.safeNormalizeVessel(v))
          .filter(Boolean);

        const seen = new Set();
        this.vessels = [];
        for (const v of valid) {
          if (!seen.has(v.mmsi) && this.vessels.length < 20) {
            seen.add(v.mmsi);
            this.vessels.push(v);
          }
        }
        this._notifyStatus(this.vessels.length >= 20 ? 'LIVE' : (this.vessels.length > 0 ? 'PARTIAL' : 'CONNECTING'));
        this._notify();
      }
    } catch (e) {
      console.warn('Failed to refresh AIS snapshot:', e);
    } finally {
      this.isRefreshing = false;
    }
    return this.vessels;
  }
}

// Singleton client service
export const liveAISService = new LiveAISService();
