/**
 * MapLibre GL JS initialization with dark maritime basemap
 */
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

let map = null;

// Free public CARTO Dark Matter basemap (raster tiles, no API key required)
const mapStyle = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    'osm': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
    }
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

export function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: mapStyle,
    center: [71.15, 19.35], // [lng, lat] for MapLibre
    zoom: 9.5,
    maxZoom: 18,
    minZoom: 5,
    attributionControl: false // We'll add it manually to customize position
  });

  window.map = map;

  // Controls
  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 150, unit: 'metric' }), 'bottom-left');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  return map;
}

export function getMap() {
  return map;
}

export function flyTo(lat, lng, zoom, durationSecs = 2) {
  if (!map) return;
  map.flyTo({
    center: [lng, lat],
    zoom: zoom,
    duration: durationSecs * 1000,
    essential: true,
    curve: 1.2
  });
}

// Added this to allow map to load fully before adding layers
export function onMapLoad(callback) {
  if (!map) return;
  if (map.loaded()) {
    callback();
  } else {
    map.on('load', callback);
  }
}
