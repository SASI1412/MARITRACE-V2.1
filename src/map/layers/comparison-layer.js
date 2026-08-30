import * as maplibregl from 'maplibre-gl';
import { case001 } from '../../data/case001.ts';

let marker = null;

export function addComparisonLayer(map) {
  if (map.getSource('comparison-observed-source')) return;

  map.addSource('comparison-observed-source', {
    type: 'geojson',
    data: case001.simulation.observedSlick
  });

  map.addSource('comparison-simulated-source', {
    type: 'geojson',
    data: case001.simulation.simulatedSlick
  });

  // Observed Slick
  map.addLayer({
    id: 'comparison-observed-fill',
    type: 'fill',
    source: 'comparison-observed-source',
    paint: {
      'fill-color': '#ff6e40',
      'fill-opacity': 0.2
    }
  });
  map.addLayer({
    id: 'comparison-observed-line',
    type: 'line',
    source: 'comparison-observed-source',
    paint: {
      'line-color': '#ff6e40',
      'line-width': 2.5,
      'line-opacity': 0.9
    }
  });

  // Simulated Slick
  map.addLayer({
    id: 'comparison-simulated-fill',
    type: 'fill',
    source: 'comparison-simulated-source',
    paint: {
      'fill-color': '#ea80fc',
      'fill-opacity': 0.15
    }
  });
  map.addLayer({
    id: 'comparison-simulated-line',
    type: 'line',
    source: 'comparison-simulated-source',
    paint: {
      'line-color': '#ea80fc',
      'line-width': 2.5,
      'line-opacity': 0.85,
      'line-dasharray': [4, 2]
    }
  });

  // Overlap Label
  const el = document.createElement('div');
  el.className = 'overlap-label';
  el.innerHTML = `
    <div style="
      background: rgba(15,20,55,0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(234,128,252,0.4);
      border-radius: 8px;
      padding: 6px 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: #ea80fc;
      white-space: nowrap;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    ">
      Overlap: 73%
    </div>
  `;
  
  marker = new maplibregl.Marker({ element: el })
    .setLngLat([71.25, 19.34])
    .addTo(map);
}

export function removeComparisonLayer(map) {
  if (marker) marker.remove();
  
  ['comparison-observed-fill', 'comparison-observed-line', 'comparison-simulated-fill', 'comparison-simulated-line'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  
  ['comparison-observed-source', 'comparison-simulated-source'].forEach(id => {
    if (map.getSource(id)) map.removeSource(id);
  });
}

export function createComparisonLayer() {}
