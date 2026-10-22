import { LANG } from "./i18n.js";
import { project, fitCamera, fallbackCamera, FALLBACK_SIZE, fallbackUrl } from "./mapcamera.js";
import { MAP_THEMES, addRouteLayers, useLatinLabels } from "./mapstyle.js";

// MapLibre грузится необязательно: если unpkg недоступен, лента всё равно
// рисуется, а вместо карт встают запасные картинки.
const maplibreReady = import("https://unpkg.com/maplibre-gl@6.9.1/dist/maplibre-gl.mjs").catch((error) => {
  console.warn("maplibre не загрузился — карты из картинок", error);
  return null;
});

// Тема — по системе (тёмная карта с белым маршрутом, см. mapstyle.js).
const darkQuery = matchMedia("(prefers-color-scheme: dark)");
const themeName = () => (darkQuery.matches ? "dark" : "light");
const theme = () => MAP_THEMES[themeName()];

// Все живые карты: при смене системной темы им меняется стиль.
// Запасные картинки переключаются сами — через CSS (см. .map-fallback).
const maps = new Set();
darkQuery.addEventListener("change", () => {
  maps.forEach((map) => map.setStyle(theme().style));
});

// ?map=off — сразу картинки вместо карт: проверить и показать запасной режим.
const FORCE_FALLBACK = new URLSearchParams(location.search).get("map") === "off";

// Карта считается не загрузившейся, если за это время не пришло ни одного
// тайла, — тогда вместо неё встаёт запасная картинка.
const MAP_TIMEOUT = 8000;

// Кадр подгоняется под то, что лежит поверх карты: чипы сверху и снизу
// карточки и сами пины с подписями. Пин якорится центром плашки 28px,
// подпись висит над ней — всё это должно влезть между чипами.
const FRAME_GAP = 8;      // зазор от чипа / края карточки до пина
const PIN_HALF = 14;      // половина плашки пина
const LABEL_GAP = 2;      // зазор между подписью и плашкой

// Карточек с картой немного, но WebGL-контексты не бесконечны:
// карта создаётся, только когда карточка подъезжает к экрану.
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      entry.target.__initMap?.();
    });
  },
  { rootMargin: "300px 0px" }
);

export function mountRouteMap(card, opts) {
  card.__initMap = () => createMap(card, opts);
  observer.observe(card);
}

async function createMap(card, { route, coords, pins }) {
  const canvas = card.querySelector(".route-map");
  const maplibregl = await maplibreReady;
  if (!maplibregl || !navigator.onLine || FORCE_FALLBACK) {
    showFallback(card, canvas, { route, coords, pins });
    return;
  }

  const bounds = coords.reduce(
    (b, c) => b.extend(c),
    new maplibregl.LngLatBounds(coords[0], coords[0])
  );

  let map;
  try {
    map = new maplibregl.Map({
      container: canvas,
      style: theme().style,
      bounds,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0
    });
  } catch (error) {
    // Например, WebGL недоступен.
    console.warn("карта не создалась — картинка", error);
    showFallback(card, canvas, { route, coords, pins });
    return;
  }

  const pinEls = pins.map((pin) => {
    const element = buildPin(pin);
    new maplibregl.Marker({ element, anchor: "center" }).setLngLat(pin.lngLat).addTo(map);
    return element;
  });

  // Пины уже в DOM — меряем подписи и чипы и ставим кадр.
  map.fitBounds(bounds, { padding: framePadding(card, pinEls), duration: 0 });

  // style.load срабатывает и после setStyle при смене темы: маршрут
  // добавляется заново с цветами текущей темы.
  map.on("style.load", () => {
    if (LANG === "en") useLatinLabels(map);
    addRouteLayers(map, coords, theme());
  });

  // Пришёл ли хоть один тайл карты: без них остаётся пустой фон с линией.
  let tiles = 0;
  map.on("sourcedata", (event) => {
    if (event.tile && event.sourceId !== "route") tiles += 1;
  });

  const fallBack = () => {
    if (card.classList.contains("is-map-fallback")) return;
    maps.delete(map);
    map.remove();
    showFallback(card, canvas, { route, coords, pins });
  };
  const timer = setTimeout(fallBack, MAP_TIMEOUT);
  map.on("idle", () => {
    if (card.classList.contains("is-map-fallback")) return;
    if (tiles > 0) {
      clearTimeout(timer);
      card.classList.add("is-map-ready");
    }
  });
  map.on("error", (event) => {
    // Стиль, тайлы или глифы не грузятся и тайлов так и нет — сразу картинка.
    if (tiles === 0 && !navigator.onLine) fallBack();
    else console.warn("maplibre:", event?.error?.message);
  });

  maps.add(map);
}

// Запасная картинка вместо карты: снимок из assets/map-fallback/ в той же
// камере, что у живой карты (mapcamera.js), плюс живые пины поверх. Картинок
// две — светлая и тёмная, нужную показывает CSS по системной теме.
function showFallback(card, canvas, { route, coords, pins }) {
  canvas.innerHTML = "";
  card.classList.add("is-map-fallback");

  const layer = document.createElement("div");
  layer.className = "map-fallback";
  canvas.append(layer);

  const imgs = ["light", "dark"].map((name) => {
    const img = document.createElement("img");
    img.className = `map-fallback-img is-${name}`;
    img.alt = "";
    img.src = fallbackUrl(LANG, route, name);
    layer.append(img);
    return img;
  });

  const pinEls = pins.map((pin) => {
    const element = buildPin(pin);
    element.classList.add("is-static");
    layer.append(element);
    return element;
  });

  // Камера, которую выбрала бы живая карта, и камера, в которой снята картинка.
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const cam = fitCamera(coords, w, h, framePadding(card, pinEls));
  const ref = fallbackCamera(coords);
  const scale = 2 ** cam.zoom;
  const k = 2 ** (cam.zoom - ref.zoom);

  // Где на экране точка мира (пиксели нулевого зума).
  const toScreen = ([x, y]) => [w / 2 + (x - cam.center[0]) * scale, h / 2 + (y - cam.center[1]) * scale];

  // Левый верхний угол картинки — в пикселях мира её зума.
  const refScale = 2 ** ref.zoom;
  const left = w / 2 + ((ref.center[0] * refScale - FALLBACK_SIZE.width / 2) * k - cam.center[0] * scale);
  const top = h / 2 + ((ref.center[1] * refScale - FALLBACK_SIZE.height / 2) * k - cam.center[1] * scale);
  imgs.forEach((img) => {
    img.style.width = `${FALLBACK_SIZE.width * k}px`;
    img.style.height = `${FALLBACK_SIZE.height * k}px`;
    img.style.transform = `translate(${left}px, ${top}px)`;
  });

  pinEls.forEach((el, i) => {
    const [x, y] = toScreen(project(pins[i].lngLat));
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });

  const ready = () => card.classList.add("is-map-ready");
  const current = imgs[themeName() === "dark" ? 1 : 0];
  if (current.complete) ready();
  else {
    current.addEventListener("load", ready, { once: true });
    current.addEventListener("error", ready, { once: true });
  }
}

// Отступы кадра в px от краёв карточки до точек маршрута.
function framePadding(card, pinEls) {
  // Считаем от блока с картой: в split-карточке под ним ещё текст.
  const media = card.querySelector(".route-media");
  const box = media.getBoundingClientRect();
  const top = media.querySelector(".route-top");
  const bottom = media.querySelector(".route-bottom");
  const labels = pinEls.map((el) => el.querySelector(".map-pin-label"));
  const labelH = Math.max(...labels.map((l) => l.offsetHeight));
  const halfW = Math.max(PIN_HALF, ...labels.map((l) => l.offsetWidth / 2));

  const topEdge = top ? top.getBoundingClientRect().bottom - box.top : 0;
  const bottomEdge = bottom ? box.bottom - bottom.getBoundingClientRect().top : 0;
  return {
    top: Math.round(topEdge + FRAME_GAP + labelH + LABEL_GAP + PIN_HALF),
    bottom: Math.round(bottomEdge + FRAME_GAP + PIN_HALF),
    left: Math.round(FRAME_GAP + halfW),
    right: Math.round(FRAME_GAP + halfW)
  };
}

// [T] Pin Place: плашка 28px r10 с иконкой 18px, подпись над ней.
// Маркер якорится центром плашки, чтобы линия упиралась ровно в неё.
function buildPin({ icon, tone, label }) {
  const el = document.createElement("div");
  el.className = "map-pin";
  el.innerHTML = `
    <span class="map-pin-label">${label}</span>
    <span class="map-pin-box is-${tone}"><img src="${icon}" width="18" height="18" alt=""></span>`;
  return el;
}
