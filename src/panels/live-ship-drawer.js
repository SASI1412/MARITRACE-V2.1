/**
 * Live Ship Drawer Component
 * Renders the persistent slide-out panel, search, radius filtering, and vessel list.
 */
import * as turf from '@turf/turf';
import { liveAISService } from '../services/live-ais-service.js';

export class LiveShipDrawer {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.isOpen = false;
    this.searchQuery = '';
    this.locationFilter = null; // { lat, lon, radiusKm }
    this.isRadiusOpen = false;

    this._initDom();
    this._bindEvents();

    // Subscribe to service updates
    liveAISService.onUpdate((vessels) => this.renderList(vessels));
    liveAISService.onStatus((status, count) => this.renderStatus(status, count));
  }

  _initDom() {
    this.container.innerHTML = `
      <div class="live-ship-drawer" id="live-ship-drawer">
        <!-- Header -->
        <div class="live-drawer-header">
          <div class="live-drawer-top-row">
            <div class="live-drawer-title-group">
              <span class="live-drawer-title">LIVE SHIP TRACKING</span>
              <span class="live-drawer-subtitle">REAL-TIME AIS VESSELS</span>
            </div>
            <button class="live-drawer-close-btn" id="btn-close-live-drawer" title="Close Drawer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>

          <div class="live-drawer-status-row">
            <div class="live-status-pill status-connecting" id="live-status-badge">
              <span class="live-beacon-dot" style="width:6px;height:6px;"></span>
              <span id="live-status-text">CONNECTING...</span>
            </div>
            <button class="btn-refresh-ais" id="btn-refresh-live-ais">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
              REFRESH LIVE VESSELS
            </button>
          </div>
        </div>

        <!-- Search & Filter -->
        <div class="live-search-section">
          <div class="live-search-input-wrapper">
            <svg class="live-search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input type="text" class="live-search-input" id="input-live-search" placeholder="Search by name or MMSI..." />
          </div>

          <div class="live-radius-toggle" id="toggle-radius-filter">
            <span>📍 Location / Radius Filter</span>
            <span id="radius-toggle-icon">▾</span>
          </div>

          <div class="live-radius-panel" id="panel-radius-filter">
            <div class="live-radius-grid">
              <div class="live-radius-field">
                <label>Lat</label>
                <input type="number" id="input-radius-lat" step="0.01" placeholder="e.g. 19.3" />
              </div>
              <div class="live-radius-field">
                <label>Lon</label>
                <input type="number" id="input-radius-lon" step="0.01" placeholder="e.g. 71.2" />
              </div>
              <div class="live-radius-field">
                <label>Radius (km)</label>
                <input type="number" id="input-radius-km" value="500" min="10" max="10000" />
              </div>
            </div>
            <div class="live-radius-actions">
              <button class="btn-radius-action" id="btn-radius-clear">Clear</button>
              <button class="btn-radius-action" id="btn-radius-apply" style="background:#2f81f7; color:#fff; border-color:#2f81f7;">Apply</button>
            </div>
          </div>
        </div>

        <!-- Vessel List -->
        <div class="live-vessel-list" id="live-vessel-list-items">
          <div class="live-drawer-empty">
            <div class="ml-spinner" style="display:block; margin:0 auto;"></div>
            <span>Connecting to real AISStream feed...</span>
          </div>
        </div>
      </div>
    `;

    this.drawerEl = this.container.querySelector('#live-ship-drawer');
    this.listEl = this.container.querySelector('#live-vessel-list-items');
    this.statusBadge = this.container.querySelector('#live-status-badge');
    this.statusText = this.container.querySelector('#live-status-text');
    this.refreshBtn = this.container.querySelector('#btn-refresh-live-ais');
    this.searchInput = this.container.querySelector('#input-live-search');
  }

  _bindEvents() {
    // Close button
    this.container.querySelector('#btn-close-live-drawer').addEventListener('click', () => {
      this.close();
    });

    // Refresh button
    this.refreshBtn.addEventListener('click', async () => {
      this.refreshBtn.disabled = true;
      this.refreshBtn.innerHTML = `
        <span class="ml-spinner" style="width:10px;height:10px;border-width:1.5px;display:inline-block;"></span>
        REFRESHING...
      `;
      try {
        await liveAISService.refresh();
      } finally {
        setTimeout(() => {
          this.refreshBtn.disabled = false;
          this.refreshBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            REFRESH LIVE VESSELS
          `;
        }, 800);
      }
    });

    // Search input
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = (e.target.value || '').trim().toLowerCase();
      this.renderList(liveAISService.vessels);
    });

    // Radius accordion toggle
    const radiusToggle = this.container.querySelector('#toggle-radius-filter');
    const radiusPanel = this.container.querySelector('#panel-radius-filter');
    const radiusIcon = this.container.querySelector('#radius-toggle-icon');

    radiusToggle.addEventListener('click', () => {
      this.isRadiusOpen = !this.isRadiusOpen;
      radiusPanel.classList.toggle('open', this.isRadiusOpen);
      radiusIcon.textContent = this.isRadiusOpen ? '▴' : '▾';
    });

    // Radius Apply
    this.container.querySelector('#btn-radius-apply').addEventListener('click', () => {
      const lat = parseFloat(this.container.querySelector('#input-radius-lat').value);
      const lon = parseFloat(this.container.querySelector('#input-radius-lon').value);
      const radiusKm = parseFloat(this.container.querySelector('#input-radius-km').value) || 500;

      if (!isNaN(lat) && !isNaN(lon)) {
        this.locationFilter = { lat, lon, radiusKm };
      } else {
        this.locationFilter = null;
      }
      this.renderList(liveAISService.vessels);
    });

    // Radius Clear
    this.container.querySelector('#btn-radius-clear').addEventListener('click', () => {
      this.container.querySelector('#input-radius-lat').value = '';
      this.container.querySelector('#input-radius-lon').value = '';
      this.locationFilter = null;
      this.renderList(liveAISService.vessels);
    });
  }

  open() {
    this.isOpen = true;
    this.drawerEl.classList.add('open');
  }

  close() {
    this.isOpen = false;
    this.drawerEl.classList.remove('open');
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  renderStatus(status, count) {
    if (!this.statusBadge || !this.statusText) return;

    this.statusBadge.className = 'live-status-pill';

    if (status === 'LIVE') {
      this.statusBadge.classList.add('status-live');
      this.statusText.textContent = `LIVE AIS — ${count} VESSELS`;
    } else if (status === 'PARTIAL' || status === 'PARTIAL DATA') {
      this.statusBadge.classList.add('status-partial');
      this.statusText.textContent = `LIVE AIS — ${count} VESSELS`;
    } else if (status === 'CONNECTING') {
      this.statusBadge.classList.add('status-connecting');
      this.statusText.textContent = 'CONNECTING...';
    } else if (status === 'NO_KEY') {
      this.statusBadge.classList.add('status-unavailable');
      this.statusText.textContent = 'LIVE AIS UNAVAILABLE';
    } else {
      this.statusBadge.classList.add('status-error');
      this.statusText.textContent = 'DISCONNECTED';
    }
  }

  filterVessels(vessels) {
    return vessels.filter(v => {
      // 1. Text Search (Name or MMSI)
      if (this.searchQuery) {
        const nameMatch = v.shipName && v.shipName.toLowerCase().includes(this.searchQuery);
        const mmsiMatch = v.mmsi && String(v.mmsi).includes(this.searchQuery);
        if (!nameMatch && !mmsiMatch) return false;
      }

      // 2. Location Radius Filter using Turf.js
      if (this.locationFilter) {
        try {
          const fromPt = turf.point([v.lon, v.lat]);
          const toPt = turf.point([this.locationFilter.lon, this.locationFilter.lat]);
          const distKm = turf.distance(fromPt, toPt, { units: 'kilometers' });
          if (distKm > this.locationFilter.radiusKm) return false;
        } catch (e) {
          // If distance calculation fails, don't drop vessel
        }
      }

      return true;
    });
  }

  renderList(vessels) {
    if (!this.listEl) return;

    const filtered = this.filterVessels(vessels);
    const selectedVessel = this.controller.getSelectedVessel();

    if (filtered.length === 0) {
      if (vessels.length === 0) {
        if (liveAISService.status === 'NO_KEY') {
          this.listEl.innerHTML = `
            <div class="live-drawer-empty">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              <div style="font-weight:700; color:#fff;">LIVE AIS UNAVAILABLE</div>
              <div style="font-size:11px; line-height:1.5;">
                AISSTREAM_API_KEY is not configured in <code style="color:#58a6ff;">backend/.env</code>.
                Obtain a free API key from <a href="https://aisstream.io" target="_blank" style="color:#58a6ff;text-decoration:underline;">aisstream.io</a>.
              </div>
            </div>
          `;
        } else {
          this.listEl.innerHTML = `
            <div class="live-drawer-empty">
              <div class="ml-spinner" style="display:block; margin:0 auto;"></div>
              <span>Awaiting incoming PositionReports...</span>
            </div>
          `;
        }
      } else {
        this.listEl.innerHTML = `
          <div class="live-drawer-empty">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <span>No vessels matched your search within the 20-vessel snapshot.</span>
          </div>
        `;
      }
      return;
    }

    this.listEl.innerHTML = filtered.map(v => {
      const isSelected = selectedVessel && selectedVessel.mmsi === v.mmsi;
      const sogText = v.sog !== null ? `${v.sog} kn` : 'N/A';
      const cogText = v.cog !== null ? `${v.cog}°` : 'N/A';

      return `
        <div class="live-vessel-item ${isSelected ? 'selected' : ''}" data-mmsi="${v.mmsi}">
          <div class="live-vessel-header">
            <div class="live-vessel-name" title="${v.shipName}">${v.shipName}</div>
            <div class="live-vessel-badge">AISSTREAM LIVE</div>
          </div>
          <div class="live-vessel-mmsi">MMSI: ${v.mmsi}</div>
          <div class="live-vessel-coords">
            <span>📍 ${v.lat.toFixed(4)}°, ${v.lon.toFixed(4)}°</span>
          </div>
          <div class="live-vessel-meta-row">
            <div class="live-vessel-meta-item">
              <span>SOG:</span>
              <span class="live-vessel-meta-val">${sogText}</span>
            </div>
            <div class="live-vessel-meta-item">
              <span>COG:</span>
              <span class="live-vessel-meta-val">${cogText}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to rows
    this.listEl.querySelectorAll('.live-vessel-item').forEach(item => {
      item.addEventListener('click', () => {
        const mmsi = item.dataset.mmsi;
        const vessel = liveAISService.vessels.find(v => v.mmsi === mmsi);
        if (vessel) {
          this.controller.selectVessel(vessel);
          this.renderList(liveAISService.vessels); // Re-render to update active styling
        }
      });
    });
  }
}
