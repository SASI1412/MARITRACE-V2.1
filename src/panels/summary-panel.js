/**
 * Investigation summary / report panel
 */
import { case001 } from '../data/case001.ts';
import { getConfidenceColor } from '../utils/format-utils.js';

export function renderSummaryPanel() {
  const vessels = [...case001.vessels].sort((a, b) => b.scores.overall - a.scores.overall);
  const topVessel = vessels[0];
  const color = getConfidenceColor(topVessel.confidence);

  return `
    <div class="card anim-fade-in" style="animation-delay:0ms; border: 1px solid var(--color-success); background: rgba(35,134,54,0.1); padding: 24px; position: relative;">
      
      <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 24px; text-transform: uppercase; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
        Final Summary
      </div>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom: 24px;">
        <div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">CASE</div>
          <div style="font-size: 14px; font-weight: 600; color: #fff; font-family:var(--font-mono);">${case001.id}</div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Spill area</div>
          <div style="font-size: 14px; font-weight: 600; color: #fff; font-family:var(--font-mono);">${case001.spill.areaKm2} km²</div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Detection confidence</div>
          <div style="font-size: 14px; font-weight: 600; color: var(--color-success); font-family:var(--font-mono);">${case001.spill.detectionConfidence}%</div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Origin confidence</div>
          <div style="font-size: 14px; font-weight: 600; color: var(--color-warning); font-family:var(--font-mono);">${case001.origin.confidence}</div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Candidates</div>
          <div style="font-size: 14px; font-weight: 600; color: #fff; font-family:var(--font-mono);">${vessels.length}</div>
        </div>
      </div>
      
      <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 16px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Top candidate</div>
        <div style="font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 12px; letter-spacing: 0.05em;">
          ${topVessel.name.toUpperCase()}
        </div>
        
        <div style="display:flex; justify-content:space-between; margin-bottom: 12px;">
          <div>
            <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Compatibility</div>
            <div style="font-size: 24px; font-weight: 900; color: ${color}; font-family:var(--font-mono);">
              ${topVessel.scores.overall} <span style="font-size: 14px; color:rgba(255,255,255,0.4);">/ 100</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Confidence</div>
            <div class="badge" style="font-size: 12px; padding: 4px 8px; background: ${color}30; color: ${color}; border: 1px solid ${color};">
              ${topVessel.confidence}
            </div>
          </div>
        </div>
        
        <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Evidence</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px; font-size:12px; color:#fff; font-family:var(--font-mono);">
          <span>Spatial <span style="color:var(--color-success)">✓</span></span>
          <span>Temporal <span style="color:var(--color-success)">✓</span></span>
          <span>Trajectory <span style="color:var(--color-success)">✓</span></span>
          <span>Drift <span style="color:var(--color-success)">✓</span></span>
          <span>AIS <span style="color:var(--color-success)">✓</span></span>
        </div>
      </div>
      
      <div style="font-size: 11px; color: var(--color-warning); font-style: italic; background: rgba(255,171,0,0.1); padding: 12px; border-radius: 4px; border-left: 3px solid var(--color-warning); margin-bottom: 24px; line-height: 1.5;">
        Disclaimer: MARITRACE provides an evidence-based compatibility ranking, not a legal determination of responsibility.
      </div>
      
      <div style="display:flex; justify-content:center;">
        <button class="btn btn-primary" id="btn-replay-summary" style="width: 100%; padding: 12px; justify-content: center;">
          REPLAY INVESTIGATION
        </button>
      </div>
    </div>
  `;
}
