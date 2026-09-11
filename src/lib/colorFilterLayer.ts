import L from "leaflet";

export interface PhotoColor {
  lat: number;
  lng: number;
  color: [number, number, number];
}

// Tuning constants for the sunset-color overlay. Purely aesthetic — there's
// no "correct" value, adjust to taste.
const GRID_COLS = 56;
const GRID_ROWS = 36;
// Distance floor (km): stops a photo directly under a grid cell from
// producing a divide-by-near-zero color spike.
const MIN_DISTANCE_KM = 60;
const MAX_ALPHA = 0.55;
// Distance (km) at which a single nearby photo's influence has decayed to
// half of MAX_ALPHA. Smaller = tighter "glow" around each photo; larger =
// tint reaches further before fading.
const ALPHA_HALF_DISTANCE_KM = 1500;
const ALPHA_DECAY_K = Math.log(2) * ALPHA_HALF_DISTANCE_KM;

type ColorFilterLayerInstance = L.Layer & {
  _photos: PhotoColor[];
  _canvas: HTMLCanvasElement;
  _map: L.Map;
  _reset: () => void;
  _redraw: () => void;
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Custom Leaflet layer that paints a low-res, distance-weighted color grid
 * over the map: each grid cell's color is an inverse-distance-weighted
 * average of every photo's average color (weight = 1/distance, normalized
 * by the sum of weights — standard IDW interpolation), so cells near a
 * cluster of photos pick up their dominant colors and cells far from any
 * photo fade toward transparent (alpha decays with the same weight sum).
 * See docs/decisions.md for why this normalizes by the weight sum rather
 * than the literal photo count the original ask described.
 */
export const ColorFilterLayer = L.Layer.extend({
  initialize(this: ColorFilterLayerInstance, photos: PhotoColor[]) {
    this._photos = photos;
  },

  setPhotos(this: ColorFilterLayerInstance, photos: PhotoColor[]) {
    this._photos = photos;
    this._redraw();
  },

  onAdd(this: ColorFilterLayerInstance, map: L.Map) {
    this._map = map;
    this._canvas = L.DomUtil.create("canvas", "sunset-color-filter");
    this._canvas.style.position = "absolute";
    this._canvas.style.pointerEvents = "none";

    const pane = map.getPane("sunsetColorPane") ?? map.createPane("sunsetColorPane");
    pane.style.zIndex = "350"; // above tiles (200), below markers (600)
    pane.style.pointerEvents = "none";
    pane.appendChild(this._canvas);

    map.on("moveend zoomend resize", this._reset, this);
    this._reset();
  },

  onRemove(this: ColorFilterLayerInstance, map: L.Map) {
    L.DomUtil.remove(this._canvas);
    map.off("moveend zoomend resize", this._reset, this);
  },

  _reset(this: ColorFilterLayerInstance) {
    const size = this._map.getSize();
    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);
    this._canvas.width = size.x;
    this._canvas.height = size.y;
    this._canvas.style.width = `${size.x}px`;
    this._canvas.style.height = `${size.y}px`;
    this._redraw();
  },

  _redraw(this: ColorFilterLayerInstance) {
    if (!this._canvas || !this._map) return;
    const photos: PhotoColor[] = this._photos ?? [];
    const ctx = this._canvas.getContext("2d");
    if (!ctx) return;

    const w = this._canvas.width;
    const h = this._canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (photos.length === 0 || w === 0 || h === 0) return;

    const small = document.createElement("canvas");
    small.width = GRID_COLS;
    small.height = GRID_ROWS;
    const sctx = small.getContext("2d")!;
    const imageData = sctx.createImageData(GRID_COLS, GRID_ROWS);
    const cellW = w / GRID_COLS;
    const cellH = h / GRID_ROWS;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const point = this._map.containerPointToLatLng([
          (col + 0.5) * cellW,
          (row + 0.5) * cellH,
        ]);

        let accR = 0;
        let accG = 0;
        let accB = 0;
        let accWeight = 0;
        for (const p of photos) {
          const d = Math.max(haversineKm(point.lat, point.lng, p.lat, p.lng), MIN_DISTANCE_KM);
          const weight = 1 / d;
          accR += p.color[0] * weight;
          accG += p.color[1] * weight;
          accB += p.color[2] * weight;
          accWeight += weight;
        }

        // IDW average stays within the photos' own color range regardless
        // of how many/how far they are; alpha separately decays with the
        // same weight sum so distant/sparse areas fade toward transparent.
        const idx = (row * GRID_COLS + col) * 4;
        imageData.data[idx] = accWeight > 0 ? accR / accWeight : 0;
        imageData.data[idx + 1] = accWeight > 0 ? accG / accWeight : 0;
        imageData.data[idx + 2] = accWeight > 0 ? accB / accWeight : 0;
        imageData.data[idx + 3] = MAX_ALPHA * (1 - Math.exp(-accWeight * ALPHA_DECAY_K)) * 255;
      }
    }

    sctx.putImageData(imageData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, GRID_COLS, GRID_ROWS, 0, 0, w, h);
  },
});
