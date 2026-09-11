/**
 * Live AIS Map & Globe Controller
 * Coordinates selected vessel camera focus, markers, and HUD info card
 * between Globe.gl and MapLibre GL without duplicating instances or loops.
 */
import { getMap } from './map-init.js';
import { liveAISService } from '../services/live-ais-service.js';

export class LiveAISController {
  constructor() {
    this.selectedVessel = null;
    this.mapMarker = null;
    this.hudContainer = null;
    this.onSelectionChangeCallbacks = new Set();

    // Listen for real-time vessel updates to update marker / HUD if selected
    liveAISService.onUpdate((vessels) => {
      if (this.selectedVessel) {
        const updated = vessels.find(v => v.mmsi === this.selectedVessel.mmsi);
        if (updated) {
          this.selectedVessel = updated;
          this._updateMarkerPosition();
          this._updateHudCard();
        }
      }
    });
  }

  setHudContainer(container) {
    this.hudContainer = container;
  }

  onSelectionChange(cb) {
    this.onSelectionChangeCallbacks.add(cb);
    return () => this.onSelectionChangeCallbacks.delete(cb);
  }

  getSelectedVessel() {
    return this.selectedVessel;
  }

  selectVessel(vessel) {
    if (!vessel) return;
    this.selectedVessel = vessel;

    const globeEl = document.getElementById('globe-viz');
    const isGlobeVisible = globeEl && globeEl.style.display !== 'none' && globeEl.style.opacity !== '0';

    if (isGlobeVisible && window.myGlobeInstance) {
      this._focusGlobe(vessel);
    } else {
      this._focusMapLibre(vessel);
    }

    this._renderHudCard(vessel);

    for (const cb of this.onSelectionChangeCallbacks) {
      try { cb(this.selectedVessel); } catch (e) { console.error(e); }
    }
  }

  deselectVessel() {
    if (!this.selectedVessel) return;
    this.selectedVessel = null;

    // 1. Remove HUD Card
    if (this.hudContainer) {
      this.hudContainer.innerHTML = '';
    }

    // 2. Remove MapLibre marker
    if (this.mapMarker) {
      this.mapMarker.remove();
      this.mapMarker = null;
    }

    // 3. Clear Globe markers & restore rotation
    const globe = window.myGlobeInstance;
    const globeEl = document.getElementById('globe-viz');
    const isGlobeVisible = globeEl && globeEl.style.display !== 'none' && globeEl.style.opacity !== '0';

    if (isGlobeVisible && globe) {
      if (globe.ringsData) globe.ringsData([]);
      if (globe.pointsData) globe.pointsData([]);
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 1.0;
      globe.pointOfView({ lat: 15, lng: 70, altitude: 1.5 }, 1200);
    } else {
      const map = getMap();
      if (map) {
        map.flyTo({ center: [71.15, 19.35], zoom: 9.5, duration: 1200 });
      }
    }

    for (const cb of this.onSelectionChangeCallbacks) {
      try { cb(null); } catch (e) { console.error(e); }
    }
  }

  _focusGlobe(vessel) {
    const globe = window.myGlobeInstance;
    if (!globe) return;

    // Stop auto-rotation
    globe.controls().autoRotate = false;

    // Fly camera to actual AIS vessel coordinates
    globe.pointOfView({ lat: vessel.lat, lng: vessel.lon, altitude: 0.4 }, 1200);

    // Show glowing rings and point at vessel position
    if (globe.ringsData) {
      globe
        .ringsData([vessel])
        .ringLat('lat')
        .ringLng('lon')
        .ringColor(() => '#2f81f7')
        .ringMaxRadius(3.5)
        .ringPropagationSpeed(1.8);
    }
    if (globe.pointsData) {
      globe
        .pointsData([vessel])
        .pointLat('lat')
        .pointLng('lon')
        .pointColor(() => '#2f81f7')
        .pointAltitude(0.015)
        .pointRadius(0.9);
    }
  }

  _focusMapLibre(vessel) {
    const map = getMap();
    if (!map) return;

    // Center map on actual AIS coordinates
    map.flyTo({
      center: [vessel.lon, vessel.lat],
      zoom: 11,
      duration: 1200,
      essential: true
    });

    // Create or move MapLibre marker
    if (!this.mapMarker) {
      const el = document.createElement('div');
      el.className = 'live-ship-map-marker';
      el.innerHTML = `
        <div class="live-ship-marker-pulse"></div>
        <svg class="live-ship-marker-icon" viewBox="0 0 24 24" fill="#2f81f7">
          <path d="M12 2L4 20l8-4 8 4L12 2z"/>
        </svg>
      `;
      const maplibregl = window.maplibregl;
      if (maplibregl) {
        this.mapMarker = new maplibregl.Marker({ element: el })
          .setLngLat([vessel.lon, vessel.lat])
          .addTo(map);
      }
    } else {
      this.mapMarker.setLngLat([vessel.lon, vessel.lat]);
    }
  }

  _updateMarkerPosition() {
    if (!this.selectedVessel) return;
    const globe = window.myGlobeInstance;
    const globeEl = document.getElementById('globe-viz');
    const isGlobeVisible = globeEl && globeEl.style.display !== 'none' && globeEl.style.opacity !== '0';

    if (isGlobeVisible && globe) {
      if (globe.ringsData) globe.ringsData([this.selectedVessel]);
      if (globe.pointsData) globe.pointsData([this.selectedVessel]);
    } else if (this.mapMarker) {
      this.mapMarker.setLngLat([this.selectedVessel.lon, this.selectedVessel.lat]);
    }
  }

  _renderHudCard(vessel) {
    if (!this.hudContainer) return;

    const sogText = vessel.sog !== null ? `${vessel.sog} kn` : 'N/A';
    const cogText = vessel.cog !== null ? `${vessel.cog}°` : 'N/A';

    this.hudContainer.innerHTML = `
      <div class="live-vessel-hud-card" id="live-vessel-card">
        <div class="live-vessel-hud-header">
          <div>
            <div class="live-vessel-hud-title">${vessel.shipName}</div>
            <div style="font-size:10px; color:#58a6ff; font-family:var(--font-mono, monospace); font-weight:700; margin-top:2px;">
              AISSTREAM LIVE
            </div>
          </div>
          <button class="live-vessel-hud-close" id="btn-close-vessel-hud" title="Close Vessel Card">✕</button>
        </div>

        <div class="live-vessel-hud-grid">
          <div>
            <div class="hud-field-label">MMSI</div>
            <div class="hud-field-val" id="hud-val-mmsi">${vessel.mmsi}</div>
          </div>
          <div>
            <div class="hud-field-label">Speed (SOG)</div>
            <div class="hud-field-val" id="hud-val-sog">${sogText}</div>
          </div>
          <div>
            <div class="hud-field-label">Latitude</div>
            <div class="hud-field-val" id="hud-val-lat">${vessel.lat.toFixed(4)}°</div>
          </div>
          <div>
            <div class="hud-field-label">Longitude</div>
            <div class="hud-field-val" id="hud-val-lon">${vessel.lon.toFixed(4)}°</div>
          </div>
          <div>
            <div class="hud-field-label">Course (COG)</div>
            <div class="hud-field-val" id="hud-val-cog">${cogText}</div>
          </div>
          <div>
            <div class="hud-field-label">Source</div>
            <div class="hud-field-val" style="color:#58a6ff;">AISSTREAM_LIVE</div>
          </div>
        </div>

        <div class="live-vessel-hud-footer">
          <span>Real-time satellite AIS telemetry</span>
          <span style="color:#6e7681;" id="hud-val-time">${new Date(vessel.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    `;

    const closeBtn = this.hudContainer.querySelector('#btn-close-vessel-hud');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.deselectVessel();
      });
    }
  }

  _updateHudCard() {
    if (!this.hudContainer || !this.selectedVessel) return;
    const v = this.selectedVessel;

    const sogEl = this.hudContainer.querySelector('#hud-val-sog');
    const cogEl = this.hudContainer.querySelector('#hud-val-cog');
    const latEl = this.hudContainer.querySelector('#hud-val-lat');
    const lonEl = this.hudContainer.querySelector('#hud-val-lon');
    const timeEl = this.hudContainer.querySelector('#hud-val-time');

    if (sogEl) sogEl.textContent = v.sog !== null ? `${v.sog} kn` : 'N/A';
    if (cogEl) cogEl.textContent = v.cog !== null ? `${v.cog}°` : 'N/A';
    if (latEl) latEl.textContent = `${v.lat.toFixed(4)}°`;
    if (lonEl) lonEl.textContent = `${v.lon.toFixed(4)}°`;
    if (timeEl) timeEl.textContent = new Date(v.timestamp).toLocaleTimeString();
  }
}

export const liveAISController = new LiveAISController();
