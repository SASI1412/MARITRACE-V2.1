/**
 * Main Application Entry Point
 * Wires together map, panels, and workflow engine
 */
import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/map.css';
import './styles/animations.css';
import './styles/ml-panel.css';

import { initMap, getMap } from './map/map-init.js';
import { runInvestigation, resetInvestigation } from './engine/investigation-workflow.js';
import { renderVesselDetailPanel, renderCandidateListPanel, initVesselCardListeners } from './panels/candidate-list-panel.js';
import { animateScoreRings } from './utils/animation-utils.js';
import { getCurrentTimeDisplay } from './utils/format-utils.js';
import { showTrajectory } from './map/layers/vessel-layer.js';
import { case001 } from './data/case001.ts';

// Initialize application
function init() {
  // Init map
  initMap();

  // Init globe
  initGlobe();

  // Update clock
  updateClock();
  setInterval(updateClock, 1000);

  // Set case ID
  document.getElementById('case-id').textContent = 'Case: ' + case001.id;

  // Setup layer toggles
  setupLayerToggles();

  // Tab switching
  setupTabs();

  // Investigate button
  const btnInvestigate = document.getElementById('btn-investigate');
  btnInvestigate.addEventListener('click', () => {
    runInvestigation(handleVesselSelect);
  });

  // Replay button
  const btnReplay = document.getElementById('btn-replay');
  btnReplay.addEventListener('click', async () => {
    await resetInvestigation();
    // Small delay before re-running
    setTimeout(() => {
      runInvestigation(handleVesselSelect);
    }, 800);
  });
}

function updateClock() {
  const el = document.getElementById('current-time');
  if (el) el.textContent = getCurrentTimeDisplay();
}

function handleVesselSelect(vesselId) {
  const vesselPane = document.getElementById('pane-vessels');
  const map = getMap();

  // Switch to vessels tab
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
  document.querySelector('[data-tab="vessels"]').classList.add('active');
  document.getElementById('pane-vessels').style.display = 'block';

  // Show detail
  vesselPane.innerHTML = renderVesselDetailPanel(vesselId);
  setTimeout(() => animateScoreRings(vesselPane), 100);

  // Show trajectory on map
  const vessel = case001.vessels.find(v => v.id === vesselId);
  if (vessel) showTrajectory(map, vessel);

  // Wire back button
  const backBtn = vesselPane.querySelector('#btn-back-to-list');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      vesselPane.innerHTML = renderCandidateListPanel();
      initVesselCardListeners(vesselPane, handleVesselSelect);
      setTimeout(() => animateScoreRings(vesselPane), 100);
    });
  }
}

function setupTabs() {
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      const pane = document.getElementById(`pane-${tabId}`);
      if (pane) pane.style.display = 'block';
    });
  });
}

function setupLayerToggles() {
  const layers = [
    { id: 'spill', label: 'SAR Spill', color: '#ff6e40', checked: true },
    { id: 'heatmap', label: 'Origin Probability', color: '#f44336', checked: true },
    { id: 'backDrift', label: 'Backward Drift', color: '#40c4ff', checked: true },
    { id: 'forwardDrift', label: 'Forward Drift', color: '#ea80fc', checked: true },
    { id: 'vessels', label: 'AIS Vessels', color: '#00e5ff', checked: true },
    { id: 'windCurrent', label: 'Wind & Currents', color: '#64b5f6', checked: true },
    { id: 'comparison', label: 'Slick Comparison', color: '#ea80fc', checked: true },
  ];

  const container = document.getElementById('layer-toggles');
  layers.forEach(layer => {
    const toggle = document.createElement('label');
    toggle.className = 'layer-toggle';
    toggle.innerHTML = `
      <input type="checkbox" ${layer.checked ? 'checked' : ''} data-layer="${layer.id}" id="layer-${layer.id}">
      <span class="layer-color" style="background:${layer.color}"></span>
      ${layer.label}
    `;
    container.appendChild(toggle);
  });

  container.addEventListener('change', (e) => {
    if (!e.target.matches('input[data-layer]')) return;
    const layerId = e.target.dataset.layer;
    const map = getMap();
    const visible = e.target.checked;
    toggleLayerVisibility(layerId, visible, map);
  });
}

function toggleLayerVisibility(layerId, visible, map) {
  const layerMap = {
    spill: () => import('./map/layers/spill-layer.js').then(m => visible ? m.addSpillLayer(map) : m.removeSpillLayer(map)),
    heatmap: () => import('./map/layers/heatmap-layer.js').then(m => visible ? m.addHeatmapLayer(map) : m.removeHeatmapLayer(map)),
    backDrift: () => import('./map/layers/drift-layer.js').then(m => visible ? m.addBackwardDriftLayer(map) : m.removeBackwardDriftLayer(map)),
    forwardDrift: () => import('./map/layers/drift-layer.js').then(m => visible ? m.addForwardDriftLayer(map) : m.removeForwardDriftLayer(map)),
    vessels: () => import('./map/layers/vessel-layer.js').then(m => visible ? m.addVesselLayer(map) : m.removeVesselLayer(map)),
    windCurrent: () => import('./map/layers/wind-current-layer.js').then(m => visible ? m.addWindCurrentLayer(map) : m.removeWindCurrentLayer(map)),
    comparison: () => import('./map/layers/comparison-layer.js').then(m => visible ? m.addComparisonLayer(map) : m.removeComparisonLayer(map)),
  };

  const toggle = layerMap[layerId];
  if (toggle) toggle();
}

function initGlobe() {
  const container = document.getElementById('globe-viz');
  if (container && window.Globe) {
    const myGlobe = window.Globe()(container)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .pointOfView({ lat: 15, lng: 70, altitude: 1.5 });
      
    window.myGlobeInstance = myGlobe;
    
    // Add auto-rotation
    myGlobe.controls().autoRotate = true;
    myGlobe.controls().autoRotateSpeed = 1.0;
    
    // Handle window resize
    window.addEventListener('resize', () => {
      myGlobe.width(container.clientWidth).height(container.clientHeight);
    });
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
