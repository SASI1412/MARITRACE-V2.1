const maplibregl = window.maplibregl;
import * as turf from '@turf/turf';
import { case001 } from '../../data/case001.ts';
import { formatCoord } from '../../utils/geo-utils.js';

let popup = null;

function createOriginPolygons() {
  const center = case001.origin.center;
  const point = turf.point([center.lng, center.lat]);
  
  // Create 3 concentric polygons to represent probability zones
  // 90%, 50%, 10% confidence zones (approximate visual representation)
  const features = [
    turf.ellipse(point, 12, 7, { units: 'kilometers', angle: 45, properties: { confidence: 'LOW', color: '#ffeb3b', opacity: 0.15 } }),
    turf.ellipse(point, 8, 4.5, { units: 'kilometers', angle: 45, properties: { confidence: 'MEDIUM', color: '#ff9800', opacity: 0.25 } }),
    turf.ellipse(point, 4, 2, { units: 'kilometers', angle: 45, properties: { confidence: 'HIGH', color: '#f44336', opacity: 0.4 } })
  ];

  return turf.featureCollection(features);
}

export function addHeatmapLayer(map) {
  if (map.getSource('origin-source')) return;

  const geojson = createOriginPolygons();

  map.addSource('origin-source', {
    type: 'geojson',
    data: geojson
  });

  map.addLayer({
    id: 'origin-fill',
    type: 'fill',
    source: 'origin-source',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': ['get', 'opacity']
    }
  });

  map.addLayer({
    id: 'origin-line',
    type: 'line',
    source: 'origin-source',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 1,
      'line-opacity': 0.8,
      'line-dasharray': [4, 4]
    }
  });

  // Origin Marker
  const center = case001.origin.center;
  map.addSource('origin-center-source', {
    type: 'geojson',
    data: turf.point([center.lng, center.lat])
  });

  map.addLayer({
    id: 'origin-center-circle',
    type: 'circle',
    source: 'origin-center-source',
    paint: {
      'circle-radius': 6,
      'circle-color': '#f44336',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  });

  map.on('click', 'origin-center-circle', (e) => {
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: true })
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>Probable Origin Zone</strong><br>
        Center: ${formatCoord(center.lat, center.lng)}<br>
        Confidence: ${case001.origin.confidence}
      `)
      .addTo(map);
  });
  
  map.on('mouseenter', 'origin-center-circle', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'origin-center-circle', () => { map.getCanvas().style.cursor = ''; });
}

export function removeHeatmapLayer(map) {
  if (popup) popup.remove();
  
  if (map.getLayer('origin-fill')) map.removeLayer('origin-fill');
  if (map.getLayer('origin-line')) map.removeLayer('origin-line');
  if (map.getLayer('origin-center-circle')) map.removeLayer('origin-center-circle');
  
  if (map.getSource('origin-source')) map.removeSource('origin-source');
  if (map.getSource('origin-center-source')) map.removeSource('origin-center-source');
}

export function createHeatmapLayer(map) {
  // Handled by addHeatmapLayer
}
