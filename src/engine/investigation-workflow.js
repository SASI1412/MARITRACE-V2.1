/**
 * Investigation Workflow Engine
 * Orchestrates the 8-step animated investigation pipeline
 */
import { case001 } from '../data/case001.ts';
import { flyTo, getMap } from '../map/map-init.js';
import { addSpillLayer, createSpillLayer, removeSpillLayer } from '../map/layers/spill-layer.js';
import { addHeatmapLayer, createHeatmapLayer, removeHeatmapLayer } from '../map/layers/heatmap-layer.js';
import { addVesselLayer, createVesselLayer, removeVesselLayer, showTrajectory, hideTrajectory, selectVesselOnMap } from '../map/layers/vessel-layer.js';
import { addBackwardDriftLayer, createBackwardDriftLayer, removeBackwardDriftLayer, addForwardDriftLayer, createForwardDriftLayer, removeForwardDriftLayer } from '../map/layers/drift-layer.js';
import { addWindCurrentLayer, createWindCurrentLayer, removeWindCurrentLayer } from '../map/layers/wind-current-layer.js';
import { addComparisonLayer, createComparisonLayer, removeComparisonLayer } from '../map/layers/comparison-layer.js';
import { addAnimatedParticlesLayer, removeAnimatedParticlesLayer, playAnimation, pauseAnimation, resetAnimation } from '../map/layers/animated-particles-layer.ts';
import { renderSpillInfoPanel } from '../panels/spill-info-panel.js';
import { renderDriftInfoPanel } from '../panels/drift-info-panel.js';
import { renderCandidateListPanel, renderVesselDetailPanel, initVesselCardListeners } from '../panels/candidate-list-panel.js';
import { renderTimelinePanel, updateTimelineStep } from '../panels/timeline-panel.js';
import { renderSummaryPanel } from '../panels/summary-panel.js';
import { renderMLDetectionPanel, runMLSequence } from '../panels/ml-detection-panel.ts';
import { renderDriftVerificationPanel, initDriftVerificationListeners } from '../panels/drift-verification-panel.ts';
import { delay, animateScoreRings } from '../utils/animation-utils.js';

let currentStep = -1;
let isRunning = false;
let onStepChange = null;
let onVesselSelectFromMap = null;

export function setStepChangeCallback(cb) {
  onStepChange = cb;
}

export function setVesselSelectCallback(cb) {
  onVesselSelectFromMap = cb;
}

export function getCurrentStep() {
  return currentStep;
}

export function isWorkflowRunning() {
  return isRunning;
}

function updateStatus(text, type = 'active') {
  const indicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  if (indicator) {
    indicator.className = `status-indicator status-${type}`;
  }
  if (statusText) statusText.textContent = text;
}

function updatePipelineStep(stepIdx, state) {
  const stepEl = document.querySelector(`#pipeline-steps .pipeline-step:nth-child(${stepIdx + 1})`);
  if (stepEl) {
    stepEl.classList.remove('active', 'complete');
    if (state) stepEl.classList.add(state);
  }
}

function setInvestigationContent(html) {
  const container = document.getElementById('investigation-content');
  if (container) {
    container.innerHTML = html;
    container.style.display = 'block';
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
  
  const tab = document.querySelector(`[data-tab="${tabId}"]`);
  const pane = document.getElementById(`pane-${tabId}`);
  if (tab) tab.classList.add('active');
  if (pane) {
    pane.style.display = 'block';
    pane.classList.add('anim-fade-in');
  }
}

export async function runInvestigation(selectVesselOnMap) {
  if (isRunning) return;
  isRunning = true;
  currentStep = -1;
  onVesselSelectFromMap = selectVesselOnMap;

  const map = getMap();
  const welcomeState = document.getElementById('welcome-state');
  if (welcomeState) welcomeState.style.display = 'none';

  // Show pipeline steps
  const pipelineSteps = document.getElementById('pipeline-steps');
  pipelineSteps.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const step = document.createElement('div');
    step.className = 'pipeline-step';
    pipelineSteps.appendChild(step);
  }

  // Show case ID
  document.getElementById('case-id').textContent = `Case: ${case001.id}`;

  // Switch to Investigation tab
  switchTab('investigation');

  const btnInvestigate = document.getElementById('btn-investigate');
  const btnReplay = document.getElementById('btn-replay');
  if (btnInvestigate) btnInvestigate.style.display = 'none';
  if (btnReplay) btnReplay.style.display = 'none';

  // ---- STEP 0: ML SAR Detection ----
  currentStep = 0;
  updateStatus('Awaiting ML Inference...', 'active');
  updatePipelineStep(0, 'active');
  if (onStepChange) onStepChange(0);

  // Reveal map controls if they were hidden
  const mapControls = document.getElementById('map-controls');
  if (mapControls) mapControls.style.display = 'block';

  setInvestigationContent(
    renderTimelinePanel(0) +
    '<div class="section-divider"><span>SAR Analysis</span></div>' +
    renderMLDetectionPanel()
  );
  
  // Wait for user to run the ML sequence
  const mlResult = await runMLSequence(document.getElementById('investigation-content'));
  updatePipelineStep(0, 'complete');

  if (!mlResult.spillDetected) {
    updateStatus('No spill detected - Investigation aborted', 'complete');
    
    // Disable remaining pipeline steps to show it was aborted
    const stepEls = document.querySelectorAll('#pipeline-steps .pipeline-step');
    for (let i = 1; i < stepEls.length; i++) {
      stepEls[i].style.opacity = '0.3';
    }

    switchTab('summary');
    const summaryPane = document.getElementById('pane-summary');
    summaryPane.innerHTML = `
      <div class="panel-container anim-fade-in" style="padding: 24px; border: 1px solid rgba(255, 255, 255, 0.1);">
        <div class="card-title" style="color:var(--text-secondary);">CASE ABORTED</div>
        <div class="card-subtitle" style="margin-bottom: 24px;">ML Confidence Too Low</div>
        
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <div style="color: var(--text-primary); font-size: 14px; margin-bottom: 8px;">The selected SAR imagery was analyzed by the detection model.</div>
          <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 4px;">Result: <span style="color:#ffb300;">Look-alike (Not an oil spill)</span></div>
          <div style="color: var(--text-secondary); font-size: 13px;">Confidence: <span style="color:#ffb300;">28.4%</span></div>
          <div style="margin-top: 16px; font-size: 13px; color: var(--text-muted); line-height: 1.6;">
            The dark area in the imagery does not exhibit the characteristic radar backscatter dampening patterns of an oil spill. It is likely a natural biological film or a coastal wind-shadow effect. The automated attribution workflow has been aborted to save computational resources.
          </div>
        </div>
        
        <button class="btn btn-primary btn-block" id="btn-replay-summary-negative">RESTART INVESTIGATION</button>
      </div>
    `;

    const replayBtn = summaryPane.querySelector('#btn-replay-summary-negative');
    if (replayBtn) {
      replayBtn.addEventListener('click', async () => {
        await resetInvestigation();
        setTimeout(() => {
          runInvestigation(selectVesselOnMap);
        }, 800);
      });
    }

    if (btnReplay) btnReplay.style.display = 'inline-flex';
    isRunning = false;
    currentStep = 9;
    return;
  }

  // ---- STEP 1: Satellite Spill Detection (Map Rendering) ----
  currentStep = 1;
  updateStatus('Plotting SAR imagery to GIS...', 'active');
  updatePipelineStep(1, 'active');
  if (onStepChange) onStepChange(1);

  setInvestigationContent(
    renderTimelinePanel(1) +
    '<div class="section-divider"><span>Detection Analysis</span></div>' +
    renderSpillInfoPanel()
  );

  const spillLayer = createSpillLayer(map);
  // Zoom to spill center
  const centerLat = 19.34;
  const centerLng = 71.25;
  flyTo(centerLat, centerLng, 11, 2);
  await delay(1500);
  
  addSpillLayer(map);
  await waitForNextStage();
  updatePipelineStep(1, 'complete');

  // ---- STEP 2: Backward Drift Reconstruction ----
  currentStep = 2;
  updateStatus('Running backward drift simulation...', 'active');
  updatePipelineStep(2, 'active');
  if (onStepChange) onStepChange(2);

  setInvestigationContent(
    renderTimelinePanel(2) +
    '<div class="section-divider"><span>Drift Reconstruction</span></div>' +
    renderDriftInfoPanel()
  );

  createBackwardDriftLayer();
  createWindCurrentLayer();
  addWindCurrentLayer(map);
  await waitForNextStage();
  addBackwardDriftLayer(map);

  // Zoom out to see drift
  flyTo(19.38, 71.16, 10.5, 2);
  await waitForNextStage();
  updatePipelineStep(1, 'complete');

  // ---- STEP 3: Origin Probability Zone ----
  currentStep = 3;
  updateStatus('Computing origin probability...', 'active');
  updatePipelineStep(3, 'active');
  if (onStepChange) onStepChange(3);

  updateTimelineStep(document.getElementById('investigation-content'), 3);

  createHeatmapLayer(map);
  addHeatmapLayer(map);
  flyTo(case001.origin.center.lat, case001.origin.center.lng, 11, 2);
  await waitForNextStage();
  updatePipelineStep(3, 'complete');

  // ---- STEP 4: AIS Vessel Correlation ----
  currentStep = 4;
  updateStatus('Correlating AIS vessel data...', 'active');
  updatePipelineStep(4, 'active');
  if (onStepChange) onStepChange(4);

  setInvestigationContent(
    renderTimelinePanel(4) +
    '<div class="section-divider"><span>Drift Reconstruction</span></div>' +
    renderDriftInfoPanel()
  );

  createVesselLayer(map, selectVesselOnMap);
  addVesselLayer(map);
  flyTo(19.40, 71.10, 10, 2);
  await delay(2500);

  // Show top candidate trajectory
  const topVessel = [...case001.vessels].sort((a,b) => b.scores.overall - a.scores.overall)[0];
  if (topVessel) showTrajectory(map, topVessel);
  await delay(1500);
  updatePipelineStep(4, 'complete');

  // ---- STEP 5: Candidate Ranking ----
  currentStep = 5;
  updateStatus('Ranking candidate vessels...', 'active');
  updatePipelineStep(5, 'active');
  if (onStepChange) onStepChange(5);

  // Switch to vessels tab
  switchTab('vessels');
  const vesselPane = document.getElementById('pane-vessels');
  vesselPane.innerHTML = renderCandidateListPanel();
  initVesselCardListeners(vesselPane, selectVesselOnMap);

  await delay(800);
  animateScoreRings(vesselPane);
  await delay(2500);
  updatePipelineStep(5, 'complete');

  // ---- STEP 6: Attribution Compatibility Score ----
  currentStep = 6;
  updateStatus('Calculating attribution scores...', 'active');
  updatePipelineStep(6, 'active');
  if (onStepChange) onStepChange(6);

  // Show detail for top candidate
  vesselPane.innerHTML = renderVesselDetailPanel(topVessel.id);
  await delay(300);
  animateScoreRings(vesselPane);

  // Wire back button
  const backBtn = vesselPane.querySelector('#btn-back-to-list');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      vesselPane.innerHTML = renderCandidateListPanel();
      initVesselCardListeners(vesselPane, (id) => {
        vesselPane.innerHTML = renderVesselDetailPanel(id);
        animateScoreRings(vesselPane);
        const b = vesselPane.querySelector('#btn-back-to-list');
        if (b) b.addEventListener('click', () => {
          vesselPane.innerHTML = renderCandidateListPanel();
          initVesselCardListeners(vesselPane, selectVesselOnMap);
          animateScoreRings(vesselPane);
        });
        // Show trajectory on map
        const v = case001.vessels.find(vv => vv.id === id);
        if (v) showTrajectory(map, v);
      });
      animateScoreRings(vesselPane);
    });
  }

  await delay(1000);
  await waitForNextStage();
  updatePipelineStep(6, 'complete');

  // ---- STEP 7: Forward Drift Verification ----
  currentStep = 7;
  updateStatus('Running forward drift verification...', 'active');
  updatePipelineStep(7, 'active');
  if (onStepChange) onStepChange(7);

  // Switch back to investigation tab, show custom drift analysis view
  switchTab('investigation');
  
  // Make sure top vessel is selected on map so its trajectory is visible
  selectVesselOnMap(topVessel.id);
  showTrajectory(map, topVessel);

  setInvestigationContent(
    renderTimelinePanel(7) +
    '<div class="section-divider"><span>Forward Drift Verification</span></div>' +
    renderDriftVerificationPanel(topVessel.name)
  );

  initDriftVerificationListeners(
    document.getElementById('investigation-content'),
    () => { playAnimation(); },
    () => { pauseAnimation(); },
    () => { resetAnimation(); }
  );

  addComparisonLayer(map);
  addAnimatedParticlesLayer(map);

  await delay(1500); // Give user a moment to see the panel before auto-playing
  playAnimation();
  await delay(2000);
  await waitForNextStage();
  updatePipelineStep(7, 'complete');

  // ---- STEP 8: Final Evidence Summary ----
  currentStep = 8;
  updateStatus('Investigation complete', 'complete');
  updatePipelineStep(8, 'active');
  if (onStepChange) onStepChange(8);

  setInvestigationContent(renderTimelinePanel(8));

  // Fill summary tab
  switchTab('summary');
  const summaryPane = document.getElementById('pane-summary');
  summaryPane.innerHTML = renderSummaryPanel();
  await delay(300);
  animateScoreRings(summaryPane);

  await delay(1500);
  updatePipelineStep(8, 'complete');
  updateStatus('Investigation Complete — Case ' + case001.id, 'complete');

  const replaySummaryBtn = summaryPane.querySelector('#btn-replay-summary');
  if (replaySummaryBtn) {
    replaySummaryBtn.addEventListener('click', async () => {
      await resetInvestigation();
      setTimeout(() => {
        runInvestigation(selectVesselOnMap);
      }, 800);
    });
  }

  // Show replay button in header
  if (btnReplay) {
    btnReplay.style.display = 'inline-flex';
  }

  isRunning = false;
  currentStep = 9; // done

  // Setup layer legend
  setupLayerLegend(map);
}

function setupLayerLegend(map) {
  const legend = document.getElementById('map-legend');
  if (legend) {
    legend.style.display = 'block';
    legend.innerHTML = `
      <div style="font-weight:var(--fw-semibold);margin-bottom:var(--space-2);font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);">Legend</div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary);">
          <span style="width:12px;height:12px;background:rgba(255,110,64,0.35);border:1.5px solid #ff6e40;border-radius:2px;"></span>
          Observed SAR Spill
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary);">
          <span style="width:12px;height:12px;background:linear-gradient(135deg,#ffeb3b,#f44336);border-radius:2px;"></span>
          Origin Probability
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary);">
          <span style="width:12px;height:3px;background:#40c4ff;border-radius:2px;"></span>
          Backward Drift
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary);">
          <span style="width:12px;height:3px;background:#ea80fc;border-radius:2px;"></span>
          Forward Drift
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary);">
          <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2 L5 20 L12 16 L19 20 Z" fill="#ff1744" stroke="rgba(255,255,255,0.3)" stroke-width="1"/></svg>
          High Confidence Vessel
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary);">
          <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2 L5 20 L12 16 L19 20 Z" fill="#ffab00" stroke="rgba(255,255,255,0.3)" stroke-width="1"/></svg>
          Medium Confidence
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary);">
          <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2 L5 20 L12 16 L19 20 Z" fill="#78909c" stroke="rgba(255,255,255,0.3)" stroke-width="1"/></svg>
          Low / Background
        </div>
      </div>
    `;
  }
}

export async function resetInvestigation() {
  const map = getMap();
  currentStep = -1;
  isRunning = false;

  // Remove all layers
  removeSpillLayer(map);
  removeHeatmapLayer(map);
  removeVesselLayer(map);
  removeBackwardDriftLayer(map);
  removeForwardDriftLayer(map);
  removeWindCurrentLayer(map);
  removeComparisonLayer(map);
  removeAnimatedParticlesLayer(map);
  hideTrajectory(map);

  // Reset UI
  updateStatus('System Ready', 'ready');
  document.getElementById('pipeline-steps').innerHTML = '';
  document.getElementById('welcome-state').style.display = 'block';
  document.getElementById('investigation-content').style.display = 'none';
  document.getElementById('investigation-content').innerHTML = '';
  document.getElementById('pane-vessels').innerHTML = '';
  document.getElementById('pane-summary').innerHTML = '';
  document.getElementById('map-legend').style.display = 'none';

  const btnInvestigate = document.getElementById('btn-investigate');
  const btnReplay = document.getElementById('btn-replay');
  if (btnInvestigate) btnInvestigate.style.display = 'inline-flex';
  if (btnReplay) btnReplay.style.display = 'none';

  // Bring back globe
  const globe = document.getElementById('globe-viz');
  if (globe) {
    globe.style.display = 'block';
    // tiny delay to allow display:block to apply before opacity transition
    setTimeout(() => globe.style.opacity = '1', 50);
  }

  switchTab('investigation');
  flyTo(19.35, 71.15, 10, 1.5);
}
