/**
 * Spill info panel — displays detected spill details
 */
import { case001 } from '../data/case001.ts';
import { formatTimestamp, formatArea } from '../utils/format-utils.js';
import { formatCoord } from '../utils/geo-utils.js';

export function renderSpillInfoPanel() {
  const spill = case001.spill;
  return `
    <div class="card anim-fade-in" style="animation-delay:0ms">
      <div class="card-header">
        <div>
          <div class="card-title">🛰️ Satellite Detection</div>
          <div class="card-subtitle">Sentinel-1 SAR Anomaly</div>
        </div>
        <span class="badge badge-info">Step 1</span>
      </div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Detected</span>
          <span class="info-value">${formatTimestamp(spill.detectionTimestamp)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Confidence</span>
          <span class="info-value" style="color:var(--color-success)">${spill.detectionConfidence}%</span>
        </div>
        <div class="info-item">
          <span class="info-label">Location</span>
          <span class="info-value" style="font-size:10px">${spill.location}</span>
        </div>
      </div>
    </div>

    <div class="card anim-fade-in" style="animation-delay:80ms">
      <div class="card-header">
        <div>
          <div class="card-title">🛢️ Spill Characteristics</div>
          <div class="card-subtitle">Observed slick parameters</div>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Area</span>
          <span class="info-value">${formatArea(spill.areaKm2)}</span>
        </div>
      </div>
    </div>
  `;
}
