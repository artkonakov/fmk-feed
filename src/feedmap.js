import * as maplibregl from "https://unpkg.com/maplibre-gl@6.9.1/dist/maplibre-gl.mjs";
import { LANG } from "./i18n.js";

// Стили «Findmykids V2 beta» light / dark из Places-on-map: тайлы, спрайты
// и глифы едут с CDN Findmykids, токен не нужен. Тема — по системе: светлая
// карта со чёрным маршрутом, тёмная — с белым (Figma 12038:285889).
const THEMES = {
  light: { style: "assets/map-light.json", line: "#000000", casing: "#ffffff", casingOpacity: 0.9 },
  dark: { style: "assets/map-dark.json", line: "#ffffff", casing: "#000000", casingOpacity: 0.5 }
};
const darkQuery = matchMedia("(prefers-color-scheme: dark)");
const theme = () => THEMES[darkQuery.matches ? "dark" : "light"];

// Все созданные карты: при смене системной темы им меняется стиль.
const maps = new Set();
darkQuery.addEventListener("change", () => {
  maps.forEach((map) => map.setStyle(theme().style));
});

// Кадр подгоняется под то, что лежит поверх карты: чипы сверху и снизу
// карточки и сами пины с подписями. Пин якорится центром плашки 28px,
// подпись висит над ней — всё это должно влезть между чипами.
const FRAME_GAP = 8;      // зазор от чипа / края карточки до пина
const PIN_HALF = 14;      // половина плашки пина
const LABEL_GAP = 2;      // зазор между подписью и плашкой

// Маршрут на макете: линия 4px с подложкой (цвета — в THEMES).
const LINE_WIDTH = 4;
const CASING_WIDTH = 8;

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

export function mountRouteMap(card, { coords, pins }) {
  const canvas = card.querySelector(".route-map");
  card.__initMap = () => createMap(card, canvas, { coords, pins });
  observer.observe(card);
}

function createMap(card, canvas, { coords, pins }) {
  const bounds = coords.reduce(
    (b, c) => b.extend(c),
    new maplibregl.LngLatBounds(coords[0], coords[0])
  );

  const map = new maplibregl.Map({
    container: canvas,
    style: theme().style,
    bounds,
    interactive: false,
    attributionControl: false,
    fadeDuration: 0
  });

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
    const { line, casing, casingOpacity } = theme();
    if (LANG === "en") useLatinLabels(map);
    map.addSource("route", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: coords } }
    });
    map.addLayer({
      id: "route-casing",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": casing, "line-width": CASING_WIDTH, "line-opacity": casingOpacity }
    });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": line, "line-width": LINE_WIDTH }
    });
  });

  map.once("idle", () => card.classList.add("is-map-ready"));
  maps.add(map);

  return map;
}

// Подписи стиля берут сначала местное написание (name:nonlatin). Для английской
// версии — латиница: «coalesce(name:latin, name)».
function useLatinLabels(map) {
  map.getStyle().layers.forEach((layer) => {
    const field = layer.layout?.["text-field"];
    if (JSON.stringify(field ?? "").includes("name:nonlatin")) {
      map.setLayoutProperty(layer.id, "text-field", ["coalesce", ["get", "name:latin"], ["get", "name"]]);
    }
  });
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
