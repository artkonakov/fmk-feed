// Камера карты без MapLibre: проекция Web Mercator и подгонка кадра под
// маршрут так же, как это делает map.fitBounds. Нужна запасным картинкам:
// инструмент tools/render-fallbacks.html рисует карту в известной камере,
// а прототип, если живая карта не загрузилась, ставит картинку и пины
// ровно туда, где их показала бы карта.

const TILE = 512; // размер мира на нулевом зуме у MapLibre

// lng/lat → пиксели мира на нулевом зуме.
export function project([lng, lat]) {
  const s = Math.sin((lat * Math.PI) / 180);
  return [
    ((lng + 180) / 360) * TILE,
    (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE
  ];
}

// Пиксели мира на нулевом зуме → lng/lat.
export function unproject([x, y]) {
  const lng = (x / TILE) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / TILE;
  return [lng, (180 / Math.PI) * Math.atan(Math.sinh(n))];
}

function bbox(coords) {
  const pts = coords.map(project);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// Как map.fitBounds: зум, при котором маршрут влезает в кадр w×h за вычетом
// отступов, и центр, сдвинутый так, чтобы маршрут встал в середину
// свободной области. center — в пикселях мира на нулевом зуме.
export function fitCamera(coords, w, h, pad = { top: 0, right: 0, bottom: 0, left: 0 }) {
  const b = bbox(coords);
  const dx = Math.max(b.maxX - b.minX, 1e-9);
  const dy = Math.max(b.maxY - b.minY, 1e-9);
  const zoom = Math.min(22, Math.log2(Math.min((w - pad.left - pad.right) / dx, (h - pad.top - pad.bottom) / dy)));
  const s = 2 ** zoom;
  const center = [
    (b.minX + b.maxX) / 2 - (pad.left - pad.right) / (2 * s),
    (b.minY + b.maxY) / 2 - (pad.top - pad.bottom) / (2 * s)
  ];
  return { zoom, center };
}

// Камера запасной картинки: маршрут по центру, зум — как если бы он влезал
// в рамку 260×170 (это крупнее любого кадра в вариантах, так что в прототипе
// картинка в основном уменьшается и остаётся чёткой). Размер картинки
// FALLBACK_SIZE с запасом покрывает карточку даже при уменьшении вдвое.
export const FALLBACK_SIZE = { width: 1000, height: 800 };
const FALLBACK_FIT = { width: 260, height: 170 };

export function fallbackCamera(coords) {
  return fitCamera(coords, FALLBACK_FIT.width, FALLBACK_FIT.height);
}

// Имя файла запасной картинки: assets/map-fallback/<lang>-<route>-<theme>.webp
export function fallbackUrl(lang, route, theme) {
  return `assets/map-fallback/${lang}-${route}-${theme}.webp`;
}
