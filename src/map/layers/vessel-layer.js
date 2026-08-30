import * as maplibregl from 'maplibre-gl';
import { case001 } from '../../data/case001.ts';

let onVesselClickCallback = null;
let popup = null;
let currentTrajectoryVesselId = null;

function createVesselsGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: case001.vessels.map(v => {
      const currentPos = v.trajectory[v.trajectory.length - 1];
      
      let color = '#78909c';
      if (v.confidence === 'HIGH') color = '#ff1744';
      else if (v.confidence === 'MEDIUM') color = '#ffab00';

      return {
        type: 'Feature',
        properties: {
          id: v.id,
          name: v.name,
          type: v.type,
          mmsi: v.mmsi,
          heading: v.headingDegrees,
          color: color
        },
        geometry: {
          type: 'Point',
          coordinates: [currentPos.lng, currentPos.lat]
        }
      };
    })
  };
}

export function createVesselLayer(map, onClick) {
  onVesselClickCallback = onClick;
}

export function addVesselLayer(map) {
  if (map.getSource('vessels-source')) return;

  const geojson = createVesselsGeoJSON();

  map.addSource('vessels-source', {
    type: 'geojson',
    data: geojson
  });

  // Highlight circle (underneath) for selected vessel (optional)
  map.addLayer({
    id: 'vessels-highlight',
    type: 'circle',
    source: 'vessels-source',
    paint: {
      'circle-radius': 16,
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.3,
      'circle-blur': 0.5
    },
    filter: ['==', 'id', ''] // initially none
  });

  // Vessel solid circle
  map.addLayer({
    id: 'vessels-circle',
    type: 'circle',
    source: 'vessels-source',
    paint: {
      'circle-radius': 6,
      'circle-color': '#0f1437', // dark center
      'circle-stroke-width': 3,
      'circle-stroke-color': ['get', 'color']
    }
  });

  // Main vessel symbol (Text only)
  map.addLayer({
    id: 'vessels-symbol',
    type: 'symbol',
    source: 'vessels-source',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'], // valid fallback stack
      'text-offset': [0, 1.5],
      'text-size': 11
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0,0,0,0.8)',
      'text-halo-width': 2
    }
  });

  // Empty trajectory source
  map.addSource('trajectory-source', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  map.addLayer({
    id: 'trajectory-line',
    type: 'line',
    source: 'trajectory-source',
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#00e5ff',
      'line-width': 2,
      'line-dasharray': [2, 2],
      'line-opacity': 0.8
    }
  });

  // Interactivity
  map.on('click', 'vessels-circle', (e) => {
    const props = e.features[0].properties;
    
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: true, offset: [0, -10] })
      .setLngLat(e.lngLat)
      .setHTML(`<strong>${props.name}</strong><br>${props.type} • ${props.mmsi}`)
      .addTo(map);
      
    if (onVesselClickCallback) {
      onVesselClickCallback(props.id);
    }
  });

  map.on('mouseenter', 'vessels-circle', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'vessels-circle', () => { map.getCanvas().style.cursor = ''; });
}

export function showTrajectory(map, vessel) {
  if (!map || !map.getSource('trajectory-source')) return;

  if (!vessel || !vessel.trajectory) {
    map.getSource('trajectory-source').setData({ type: 'FeatureCollection', features: [] });
    map.setFilter('vessels-highlight', ['==', 'id', '']);
    return;
  }

  const geojson = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: vessel.trajectory.map(p => [p.lng, p.lat])
    }
  };

  map.getSource('trajectory-source').setData(geojson);
  map.setFilter('vessels-highlight', ['==', 'id', vessel.id]);
}

export function hideTrajectory(map) {
  if (!map || !map.getSource('trajectory-source')) return;
  map.getSource('trajectory-source').setData({ type: 'FeatureCollection', features: [] });
  map.setFilter('vessels-highlight', ['==', 'id', '']);
}

export function selectVesselOnMap(id) {
  // If we had external state we could store it here, but typically we just
  // let showTrajectory handle the highlight when called later.
  currentTrajectoryVesselId = id;
}

export function removeVesselLayer(map) {
  if (popup) popup.remove();
  
  if (map.getLayer('vessels-highlight')) map.removeLayer('vessels-highlight');
  if (map.getLayer('vessels-symbol')) map.removeLayer('vessels-symbol');
  if (map.getLayer('vessels-circle')) map.removeLayer('vessels-circle');
  if (map.getLayer('vessels-highlight')) map.removeLayer('vessels-highlight');
  if (map.getLayer('trajectory-line')) map.removeLayer('trajectory-line');
  
  if (map.getSource('vessels-source')) map.removeSource('vessels-source');
  if (map.getSource('trajectory-source')) map.removeSource('trajectory-source');
}
