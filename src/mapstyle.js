// Оформление карты маршрута — общее для живой карты (feedmap.js) и для
// инструмента запасных картинок (tools/render-fallbacks.html).

// Стили «Findmykids V2 beta» light / dark из Places-on-map: тайлы, спрайты
// и глифы едут с CDN Findmykids, токен не нужен. Светлая карта — с чёрным
// маршрутом, тёмная — с белым (Figma 12038:285889).
export const MAP_THEMES = {
  light: { style: "assets/map-light.json", line: "#000000", casing: "#ffffff", casingOpacity: 0.9 },
  dark: { style: "assets/map-dark.json", line: "#ffffff", casing: "#000000", casingOpacity: 0.5 }
};

// Маршрут на макете: линия 4px с подложкой 8px.
export const LINE_WIDTH = 4;
export const CASING_WIDTH = 8;

// Линия маршрута поверх стиля: вызывать на style.load.
export function addRouteLayers(map, coords, theme) {
  map.addSource("route", {
    type: "geojson",
    data: { type: "Feature", geometry: { type: "LineString", coordinates: coords } }
  });
  map.addLayer({
    id: "route-casing",
    type: "line",
    source: "route",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": theme.casing, "line-width": CASING_WIDTH, "line-opacity": theme.casingOpacity }
  });
  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": theme.line, "line-width": LINE_WIDTH }
  });
}

// Подписи стиля берут сначала местное написание (name:nonlatin). Для английской
// версии — латиница: «coalesce(name:latin, name)».
export function useLatinLabels(map) {
  map.getStyle().layers.forEach((layer) => {
    const field = layer.layout?.["text-field"];
    if (JSON.stringify(field ?? "").includes("name:nonlatin")) {
      map.setLayoutProperty(layer.id, "text-field", ["coalesce", ["get", "name:latin"], ["get", "name"]]);
    }
  });
}
