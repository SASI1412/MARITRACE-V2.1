import * as maplibregl from 'maplibre-gl';
import { case001 } from '../../data/case001.ts';
import { formatArea, formatTimestamp } from '../../utils/format-utils.js';

let popup = null;

export function addSpillLayer(map) {
  if (map.getSource('spill-source')) return;

  map.addSource('spill-source', {
    type: 'geojson',
    data: case001.simulation.observedSlick
  });

  map.addLayer({
    id: 'spill-fill',
    type: 'fill',
    source: 'spill-source',
    paint: {
      'fill-color': '#ff6e40',
      'fill-opacity': 0.25
    }
  });

  map.addLayer({
    id: 'spill-line',
    type: 'line',
    source: 'spill-source',
    paint: {
      'line-color': '#ff6e40',
      'line-width': 2,
      'line-opacity': 0.9
    }
  });

  // Popup logic
  map.on('click', 'spill-fill', (e) => {
    const { areaKm2, detectionTimestamp } = case001.spill;
    
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: true })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="popup-title">SAR Slick Detection</div>
        <div class="popup-row">
          <span class="popup-label">Time</span>
          <span class="popup-value">${formatTimestamp(detectionTimestamp)}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">Area</span>
          <span class="popup-value">${formatArea(areaKm2)}</span>
        </div>
      `)
      .addTo(map);
  });

  map.on('mouseenter', 'spill-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'spill-fill', () => { map.getCanvas().style.cursor = ''; });
}

export function removeSpillLayer(map) {
  if (popup) popup.remove();
  if (map.getLayer('spill-fill')) map.removeLayer('spill-fill');
  if (map.getLayer('spill-line')) map.removeLayer('spill-line');
  if (map.getSource('spill-source')) map.removeSource('spill-source');
}

// For compatibility with old structure
export function createSpillLayer(map) {
  // Do nothing, initialization is handled in addSpillLayer
}
