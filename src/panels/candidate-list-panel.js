/**
 * Candidate list panel
 */
import { case001 } from '../data/case001.ts';
import { formatSpeed, formatHeading, formatDistance, getConfidenceColor, getBadgeHTML, getScoreColor } from '../utils/format-utils.js';
import { createScoreRing, animateScoreRings } from '../utils/animation-utils.js';

let onVesselCardClick = null;

export function setVesselCardClickHandler(handler) {
  onVesselCardClick = handler;
}

export function renderCandidateListPanel() {
  const vessels = [...case001.vessels].sort((a, b) => b.scores.overall - a.scores.overall);
  
  let html = `
    <div class="card anim-fade-in" style="animation-delay:0ms">
      <div class="card-header">
        <div>
          <div class="card-title">🚢 Candidate Vessels</div>
          <div class="card-subtitle">${vessels.length} vessels ranked by compatibility</div>
        </div>
        <span class="badge badge-info">Step 5</span>
      </div>
    </div>
  `;

  vessels.forEach((vessel, idx) => {
    const rank = idx + 1;
    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank <= 3 ? 'rank-3' : 'rank-low';
    const color = getConfidenceColor(vessel.confidence);

    html += `
      <div class="vessel-card ${rankClass} anim-fade-in" style="animation-delay:${(idx + 1) * 80}ms" data-vessel-id="${vessel.id}" id="vessel-card-${vessel.id}">
        <div class="vessel-header">
          <div>
            <div class="vessel-name">${vessel.name}</div>
            <div class="vessel-type">${vessel.type}</div>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-3);">
            ${createScoreRing(vessel.scores.overall, 48, 4, color)}
            ${getBadgeHTML(vessel.confidence)}
          </div>
        </div>
        <div class="vessel-meta">
          <span class="vessel-meta-item">📍 ${vessel.distanceFromOriginKm} km</span>
          <span class="vessel-meta-item">🚢 ${vessel.mmsi || '—'}</span>
        </div>
        <div class="vessel-rank">#${rank}</div>
      </div>
    `;
  });

  return html;
}

export function renderVesselDetailPanel(vesselId) {
  const vessel = case001.vessels.find(v => v.id === vesselId);
  if (!vessel) return '<p>No data</p>';

  const color = getConfidenceColor(vessel.confidence);
  const score = vessel.scores;
  
  const dims = [
    { key: 'spatial', label: 'Spatial Compatibility' },
    { key: 'temporal', label: 'Temporal Compatibility' },
    { key: 'trajectory', label: 'Trajectory Similarity' },
    { key: 'drift', label: 'Forward Drift Agreement' },
    { key: 'aisQuality', label: 'AIS Data Quality' }
  ];

  let evidenceHtml = '';
  dims.forEach((dim, i) => {
    const s = score[dim.key];
    evidenceHtml += `
      <div class="evidence-row anim-fade-in" style="animation-delay:${i * 60}ms; margin-bottom: 12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span class="evidence-label" style="font-size:12px; font-weight:600; text-transform:uppercase; color:var(--text-secondary);">${dim.label}</span>
          <span class="evidence-score" style="color:${getScoreColor(s)}; font-family:var(--font-mono); font-weight:700;">${s} / 100</span>
        </div>
        <div class="evidence-bar-track" style="height:4px; background:rgba(255,255,255,0.1); border-radius:0px; overflow:hidden;">
          <div class="evidence-bar-fill" style="width:${s}%; height:100%; background:${getScoreColor(s)}; border-radius:0px; transition:width 1s ease-out;"></div>
        </div>
      </div>
    `;
  });

  return `
    <div class="card anim-fade-in" style="border:1px solid ${color}; background:rgba(0,0,0,0.2);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 16px;">
        <div>
          <div style="font-size:20px; font-weight:800; color:#fff; letter-spacing:0.05em; margin-bottom:4px;">${vessel.name.toUpperCase()}</div>
          <div style="font-size:12px; font-weight:600; color:var(--text-muted); font-family:var(--font-mono);">MMSI ${vessel.mmsi || '—'}</div>
          <div style="font-size:12px; font-weight:600; color:var(--text-muted); font-family:var(--font-mono);">${vessel.type.toUpperCase()}</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="btn-back-to-list">← Back</button>
      </div>

      <div style="display:flex; align-items:center; gap: 16px; margin-bottom: 24px;">
        <div style="font-size:32px; font-weight:900; color:${color}; font-family:var(--font-mono);">${score.overall} <span style="font-size:16px; color:rgba(255,255,255,0.4);">/ 100</span></div>
        <div class="badge" style="padding:4px 8px; font-size:12px; font-weight:700; background:${color}30; color:${color}; border:1px solid ${color};">
          ${vessel.confidence} CONFIDENCE
        </div>
      </div>

      <div style="font-size:11px; font-weight:700; color:var(--text-muted); letter-spacing:0.1em; text-transform:uppercase; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; margin-bottom:16px;">
        Evidence Breakdown
      </div>
      
      <div style="margin-bottom:24px;">
        ${evidenceHtml}
      </div>

      <div style="font-size:11px; font-weight:700; color:var(--text-muted); letter-spacing:0.1em; text-transform:uppercase; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; margin-bottom:12px;">
        EVIDENCE CHECKLIST
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; font-size:13px; color:#fff; margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:8px;"><span style="color:var(--color-success); font-weight:bold;">✓</span> Strong spatial match</div>
        <div style="display:flex; align-items:center; gap:8px;"><span style="color:var(--color-success); font-weight:bold;">✓</span> Strong temporal match</div>
        <div style="display:flex; align-items:center; gap:8px;"><span style="color:var(--color-success); font-weight:bold;">✓</span> Consistent AIS trajectory</div>
        <div style="display:flex; align-items:center; gap:8px;"><span style="color:var(--color-success); font-weight:bold;">✓</span> Strong forward-drift agreement</div>
        <div style="display:flex; align-items:center; gap:8px;"><span style="color:var(--color-success); font-weight:bold;">✓</span> Good AIS coverage</div>
      </div>

      <div style="font-size:13px; color:var(--text-secondary); font-style:italic; border-left:3px solid ${color}; padding-left:12px; margin-bottom:24px;">
        "The candidate shows strong agreement across spatial, temporal, trajectory and drift evidence."
      </div>

      <div style="background:rgba(0,0,0,0.3); border-radius:6px; padding:16px; text-align:center; margin-bottom:16px; border:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:10px; font-weight:700; color:var(--text-muted); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:4px;">
          ATTRIBUTION COMPATIBILITY SCORE
        </div>
        <div style="font-size:24px; font-weight:900; color:${color}; font-family:var(--font-mono);">
          ${score.overall} <span style="font-size:14px; color:rgba(255,255,255,0.4);">/ 100</span>
        </div>
      </div>

      <div style="font-size:11px; color:var(--color-warning); text-align:center; font-weight:600; padding:8px; background:rgba(255,171,0,0.1); border-radius:4px;">
        IMPORTANT: Compatibility score is not legal proof of responsibility.
      </div>
    </div>
  `;
}

export function initVesselCardListeners(container, selectCallback) {
  container.querySelectorAll('.vessel-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.vesselId;
      if (selectCallback) selectCallback(id);
    });
  });
}
