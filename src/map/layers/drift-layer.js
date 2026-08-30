const maplibregl = window.maplibregl;
import { case001 } from '../../data/case001.ts';

function createPathsGeoJSON(paths) {
  return {
    type: 'FeatureCollection',
    features: paths.map(path => ({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: path.map(p => [p.lng, p.lat])
      }
    }))
  };
}

export function addBackwardDriftLayer(map) {
  if (map.getSource('backward-drift-source')) return;

  const geojson = createPathsGeoJSON(case001.simulation.backwardDriftPaths);

  map.addSource('backward-drift-source', {
    type: 'geojson',
    data: geojson
  });

  map.addLayer({
    id: 'backward-drift-line',
    type: 'line',
    source: 'backward-drift-source',
    paint: {
      'line-color': '#ffffff', // changed to white for contrast
      'line-width': 2,
      'line-dasharray': [2, 2],
      'line-opacity': 0.9
    }
  });

  map.addLayer({
    id: 'backward-drift-arrows',
    type: 'symbol',
    source: 'backward-drift-source',
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 50,
      'text-field': '>',
      'text-size': 18,
      'text-keep-upright': false
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0,0,0,0.8)',
      'text-halo-width': 1
    }
  });
}

export function removeBackwardDriftLayer(map) {
  if (map.getLayer('backward-drift-arrows')) map.removeLayer('backward-drift-arrows');
  if (map.getLayer('backward-drift-line')) map.removeLayer('backward-drift-line');
  if (map.getSource('backward-drift-source')) map.removeSource('backward-drift-source');
}

export function addForwardDriftLayer(map) {
  if (map.getSource('forward-drift-source')) return;

  const geojson = createPathsGeoJSON(case001.simulation.forwardDriftPaths);

  map.addSource('forward-drift-source', {
    type: 'geojson',
    data: geojson
  });

  map.addLayer({
    id: 'forward-drift-line',
    type: 'line',
    source: 'forward-drift-source',
    paint: {
      'line-color': '#ea80fc',
      'line-width': 1.5,
      'line-opacity': 0.4
    }
  });
}

export function removeForwardDriftLayer(map) {
  if (map.getLayer('forward-drift-line')) map.removeLayer('forward-drift-line');
  if (map.getSource('forward-drift-source')) map.removeSource('forward-drift-source');
}

export function createBackwardDriftLayer() {}
export function createForwardDriftLayer() {}
