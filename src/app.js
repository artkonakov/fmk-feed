import { CHILD, PLACES, DAYS, ROUTES, ICON, VARIANTS, VARIANT_ALIASES } from "./data.js";
import { LANG, T, fmtDistance, fmtInt, plural, withLang } from "./i18n.js";
import { mountRouteMap } from "./feedmap.js";

// Day stamp: отступ пилюли от верха разделителя и висящей плашки (padding-top
// у .day-stamp и .day-float) и зазор, когда новая плашка подпирает старую.
const PILL_INSET = 8;
const STACK_GAP = 4;
const DAY_GAP = 16; // gap между секциями дней в .feed

// Стиль карточек текущего варианта. Маршрут: "overlay" | "split" | "control";
// место: "default" | "control" (контрольный — как сейчас в приложении).
let routeStyle = "overlay";
let placeStyle = "default";
let durationIcon = "history";
let dayBar = "bar"; // "bar" — полоса дня контрольного, "pill" — капсула, как в остальных вариантах
let routeTitle = "mode"; // "mode" — «Прогулка • 58 мин», "duration" — только «58 мин»


// --- Меню ------------------------------------------------------------------
function renderMenu() {
  document.title = T.menuTitle;
  document.getElementById("menuView").hidden = false;
  document.querySelector(".menu-header").textContent = T.menuTitle;
  const list = document.getElementById("menuList");

  Object.entries(VARIANTS).forEach(([id, v], idx) => {
    if (idx > 0) list.append(el("div", "row-divider"));
    const row = el(v.disabled ? "div" : "a", "menu-row");
    if (v.disabled) row.classList.add("is-disabled");
    else row.href = withLang(`p=${id}`);
    row.innerHTML = `
      <div class="m-text">
        <div class="m-title">${v.title}</div>
      </div>
      <div class="chev"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#c2c4c9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
    list.append(row);
  });
}

// --- Прототип --------------------------------------------------------------
function renderProto(id) {
  document.title = VARIANTS[id].title;
  document.getElementById("backBtn").setAttribute("aria-label", T.back);
  document.getElementById("refreshBtn").setAttribute("aria-label", T.refresh);
  routeStyle = VARIANTS[id].routeCard ?? "overlay";
  placeStyle = VARIANTS[id].placeCard ?? "default";
  durationIcon = VARIANTS[id].durationIcon ?? "history";
  routeTitle = VARIANTS[id].routeTitle ?? "mode";
  document.body.classList.toggle("is-inline-time", routeTitle === "duration");
  dayBar = VARIANTS[id].dayBar ?? (placeStyle === "control" ? "bar" : "pill");
  document.body.classList.toggle("is-control", dayBar === "bar");
  document.body.classList.toggle("is-compact", placeStyle === "control");
  document.body.dataset.variant = id;
  document.body.classList.toggle("has-timeline", Boolean(VARIANTS[id].timeline));
  document.getElementById("protoView").hidden = false;

  renderHeader();

  const feed = document.getElementById("feed");
  // dayBlocks: каждый день — единый белый блок с прилипающим заголовком
  // вместо разделителя с висящей плашкой.
  const dayBlocks = Boolean(VARIANTS[id].dayBlocks);
  document.body.classList.toggle("is-day-blocks", dayBlocks);
  DAYS.forEach((day) => {
    const section = el("section", "feed-day");
    section.append(dayBlocks ? dayTitle(day) : dayStamp(day));
    day.items.forEach((item) => {
      if (item.type === "place") section.append(placeCard(item));
      else if (item.type === "route") section.append(routeCard(item));
    });
    feed.append(section);
  });
  if (dayBlocks) watchDayTitles(feed);
  else floatDayStamp(feed);
  if (VARIANTS[id].timeline) drawTimeline(feed);

  document.getElementById("backBtn").addEventListener("click", () => {
    location.href = withLang();
  });
  document.getElementById("refreshBtn").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    btn.classList.remove("is-spinning");
    void btn.offsetWidth;
    btn.classList.add("is-spinning");
  });
}

function renderHeader() {
  const battery = CHILD.battery >= 80
    ? { icon: "assets/icon-24-battery-full.svg", tone: "good" }
    : { icon: "assets/icon-24-battery-middle.svg", tone: "warn" };
  document.getElementById("childTitle").innerHTML = `
    <span class="child-name">
      <img class="child-photo" src="${CHILD.photo}" alt="">${CHILD.name}
    </span>
    <span class="child-status">
      <span class="status-item is-${battery.tone}">
        <span class="icon-tint" style="--icon:url('${battery.icon}')"></span>${CHILD.battery}%
      </span>
      ${CHILD.silent ? `
        <span class="status-sep"></span>
        <span class="status-item is-warn">
          <span class="icon-tint" style="--icon:url('assets/icon-24-sound-off.svg')"></span><span class="status-text">${T.silent}</span>
        </span>` : ""}
    </span>`;
}

// Day stamp (Figma 11665:395879): линия на всю ширину и пилюля с датой.
// sticky внутри своей секции: держится наверху, пока день на экране,
// а следующий день выталкивает её и прилипает сам.
function dayStamp({ label }) {
  const stamp = el("div", "day-stamp");
  stamp.innerHTML = `<span class="day-stamp-pill">${label}</span>`;
  return stamp;
}

// Заголовок дня в варианте Г (день единым блоком): H2 Medium 18/19, прилипает
// к верху ленты (sticky внутри своего блока — следующий день его выталкивает).
function dayTitle({ label }) {
  const title = el("h2", "day-title");
  title.textContent = label;
  return title;
}

// Прилип ли заголовок дня: он у верха ленты, а его блок уже уехал под шапку.
// Прилипший растягивается на всю ширину и получает линию снизу, как у навбара.
function watchDayTitles(feed) {
  const titles = [...feed.querySelectorAll(".day-title")];
  const update = () => {
    const top = feed.getBoundingClientRect().top;
    titles.forEach((title) => {
      const block = title.parentElement.getBoundingClientRect().top;
      title.classList.toggle("is-stuck", block < top - 0.5 && title.getBoundingClientRect().top <= top + 0.5);
    });
  };
  feed.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

// Висящая плашка: одна на ленту, у верха. Разделители едут вместе с лентой
// (с линией); следующий, подъехав, толкает висящую вверх, а дойдя до верха,
// совпадает с её местом — и висящая плашка берёт его дату.
function floatDayStamp(feed) {
  if (dayBar === "bar") return floatDayBarControl(feed);
  const view = document.getElementById("protoView");
  const float = el("div", "day-float");
  float.innerHTML = `<span class="day-stamp-pill"></span>`;
  view.append(float);
  const pill = float.firstElementChild;
  const stamps = [...feed.querySelectorAll(".day-stamp")];

  const update = () => {
    const top = feed.getBoundingClientRect().top - view.getBoundingClientRect().top;
    float.style.top = `${top}px`;
    const edge = feed.getBoundingClientRect().top;

    // Последний разделитель, который уже дошёл до верха ленты.
    let current = null;
    let next = null;
    for (const stamp of stamps) {
      if (stamp.getBoundingClientRect().top <= edge + 0.5) current = stamp;
      else if (!next) next = stamp;
    }
    // В самом начале ленты висящей плашки нет: виден сам разделитель «Сегодня».
    float.hidden = feed.scrollTop <= 0 || !current || current.getBoundingClientRect().top > edge - 0.5;

    // Следующий день подъезжает под висящую плашку и, коснувшись её,
    // толкает вверх: дальше они едут парой, пока старая не уйдёт под шапку.
    let push = 0;
    if (next && !float.hidden) {
      const floatPill = pill.offsetTop + pill.offsetHeight; // низ пилюли без сдвига
      const nextPill = next.getBoundingClientRect().top - edge + PILL_INSET;
      push = Math.min(0, nextPill - floatPill - STACK_GAP);
    }
    float.style.transform = `translateY(${push}px)`;

    // Линию разделителя не прячем: она едет с лентой, проходит за висящей
    // пилюлей (разделители слоем ниже) и уходит под навбар — лента её обрезает.

    // Прогресс дня: серая заливка в висящей пилюле. 0 — день только начался
    // (разделитель у верха), 1 — день кончился: следующий разделитель дошёл
    // до верха или лента докручена до конца.
    if (current && !float.hidden) {
      const section = current.parentElement;
      const start = feed.scrollTop + current.getBoundingClientRect().top - edge;
      const maxScroll = feed.scrollHeight - feed.clientHeight;
      const end = Math.min(start + section.offsetHeight + DAY_GAP, maxScroll);
      const progress = end > start ? (feed.scrollTop - start) / (end - start) : 1;
      pill.style.setProperty("--progress", `${(Math.min(1, Math.max(0, progress)) * 100).toFixed(2)}%`);
    }

    // Пилюля «уехала» в висящую плашку: в разделителе остаётся только линия.
    stamps.forEach((stamp) => stamp.classList.toggle("is-floating", !float.hidden && stamp === current));

    if (current) pill.textContent = current.textContent.trim();
  };
  // Без rAF: прячем/меняем плашку в том же кадре, что и прокрутка.
  feed.addEventListener("scroll", update, { passive: true });
  feed.addEventListener("scrollend", update);
  window.addEventListener("resize", update);
  update();
}

// Feed Card (место): плашка с иконкой, название, время, «длительность» и кнопка.
function placeCard(item) {
  if (placeStyle === "control") return placeCardControl(item);
  const place = PLACES[item.place];
  const card = el("article", "feed-card place-card");
  const action = item.action.kind === "bell"
    ? `<button class="card-btn is-bell" type="button">
         <img src="${ICON.bell}" width="20" height="20" alt="">${item.action.label}
       </button>`
    : `<button class="card-btn" type="button">
         ${item.action.label}<img src="${ICON.arrow}" width="20" height="20" alt="">
       </button>`;
  card.innerHTML = `
    <div class="card-head">
      <span class="icon-bg is-${place.tone}"><img src="${place.headIcon}" width="20" height="20" alt=""></span>
      <h2 class="card-title">${item.title ?? place.name}</h2>
      <span class="card-time">${item.time}</span>
    </div>
    <div class="card-row">
      <span class="card-label">
        <img src="${ICON[durationIcon]}" width="20" height="20" alt="">${item.duration}
      </span>
      ${action}
    </div>`;
  card.querySelector(".card-btn.is-bell")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const on = e.currentTarget.classList.toggle("is-on");
    toast(on ? T.alertsOn(place.name) : T.alertsOff);
  });
  card.addEventListener("click", () => toast(T.toastPlace));
  return card;
}

// Feed Card (маршрут). Стили (VARIANTS[*].routeCard):
//   overlay — статичная карта на всю карточку, чипы лежат поверх (v1);
//   split   — карта сверху, под ней «Прогулка • 2,5 км», время и чипы (v2);
//   headed  — шапка контрольного вида, под ней карта как в overlay (Д).
const MODE_TITLE = { walk: T.walk, car: T.drive };

function routeCard(item) {
  if (routeStyle === "control") return routeCardControl(item);
  const split = routeStyle === "split";
  // headed — карта с чипами как в overlay, а над ней шапка контрольного вида.
  const headed = routeStyle === "headed";
  const card = el("article", `feed-card route-card ${split ? "is-split" : "is-overlay"}${headed ? " ctl-card ctl-route is-headed" : ""}`);
  const coords = ROUTES[item.route];
  const badge = (b) => b
    ? `<span class="card-label is-float${b.tone === "good" ? " is-good" : ""}">
         <img src="${ICON[b.icon]}" width="20" height="20" alt="">${b.label}
       </span>`
    : "";
  const events = (floating) => `
    <button class="card-btn${floating ? " is-float" : ""}" type="button">
      ${item.events}<img src="${ICON.arrow}" width="20" height="20" alt="">
    </button>`;
  const media = (overlays) => `
    <div class="route-media">
      <div class="route-map" aria-hidden="true"></div>
      <span class="route-play" aria-hidden="true">
        <img src="assets/figma/play-button.svg" width="40" height="40" alt="">
      </span>
      ${overlays}
    </div>`;

  if (split) {
    // Скорость уходит из чипа на карте в чип под ней: «30 мин • 64 км/ч».
    const speed = item.badges?.right?.label;
    card.innerHTML = `
      ${media(item.badges?.left ? `<div class="route-top">${badge(item.badges.left)}</div>` : "")}
      <div class="route-content">
        <div class="card-head">
          <h2 class="card-title">${MODE_TITLE[item.mode]} • ${fmtDistance(routeLength(coords))}</h2>
          <span class="card-time">${item.time}</span>
        </div>
        <div class="card-row">
          <span class="card-label">
            <img src="${ICON[item.mode]}" width="20" height="20" alt="">${item.duration}${speed ? `<span class="label-dot">•</span>${speed}` : ""}
          </span>
          ${events(false)}
        </div>
      </div>`;
  } else {
    // В Д длительность уже в шапке, поэтому в чипе внизу — шаги у прогулки
    // и расстояние у поездки.
    const meters = routeLength(coords);
    const steps = Math.round(meters / 0.72);
    const chip = !headed ? item.duration
      : item.mode === "car" ? fmtDistance(meters)
      : `${fmtInt(steps)} ${plural(steps, T.stepsWord)}`;
    card.innerHTML = (headed ? routeHead(item, { arrow: false }) : "") + media(`
      ${item.badges ? `<div class="route-top">${badge(item.badges.left)}${badge(item.badges.right)}</div>` : ""}
      <div class="route-bottom">
        <span class="card-label is-float">
          <img src="${ICON[!headed ? item.mode : item.mode === "car" ? "distance" : "steps"]}" width="20" height="20" alt="">${chip}
        </span>
        ${events(true)}
      </div>`);
  }

  card.addEventListener("click", () => toast(T.toastRoute));

  // Пины ставятся на концы линии, чтобы она упиралась ровно в плашку.
  // В split-карточке подписи — «СТАРТ» / «ФИНИШ» вместо «Вышел в 15:02».
  const pin = ({ place, label }, lngLat, splitLabel) => ({
    icon: PLACES[place].pinIcon,
    tone: PLACES[place].tone,
    lngLat,
    label: split ? splitLabel : label
  });
  mountRouteMap(card, {
    route: item.route,
    coords,
    pins: [pin(item.from, coords[0], T.start), pin(item.to, coords.at(-1), T.finish)]
  });
  return card;
}

// --- Контрольный вариант (Figma 11699:405063) -------------------------------
// Как лента выглядит в приложении сейчас. Собран на тех же иконках и токенах.

// Место: иконка 40px, название, время (у законченного — длительность в скобках).
// У сохранённых мест (не адресов) справа голубая кнопка-стрелка.
function placeCardControl(item) {
  const place = PLACES[item.place];
  const isAddress = place.tone === "deep";
  const card = el("article", `feed-card ctl-card ctl-place${routeTitle === "duration" ? " is-inline" : ""}`);
  const time = item.ongoing ? item.time : `${item.time} (${item.duration})`;
  card.innerHTML = `
    <div class="ctl-head">
      <span class="ctl-icon ${isAddress ? "is-plain" : "is-primary"}">
        ${isAddress
          ? `<span class="icon-tint" style="--icon:url('${place.headIcon}')"></span>`
          : `<img src="${place.headIcon}" alt="">`}
      </span>
      ${routeTitle === "duration" ? `
      <div class="ctl-text">
        <h2 class="ctl-title">${item.duration}</h2>
        <span class="ctl-sub is-name">${item.title ?? place.name}</span>
      </div>
      <span class="ctl-sub">${item.time}</span>` : `
      <div class="ctl-text">
        <h2 class="ctl-title">${item.title ?? place.name}</h2>
        <span class="ctl-sub">${time}</span>
      </div>`}
      ${isAddress && routeTitle !== "duration" ? "" : `<span class="ctl-arrow${routeTitle === "duration" ? "" : " is-blue"}"><span class="icon-tint" style="--icon:url('${ICON.arrow}')"></span></span>`}
    </div>`;
  card.addEventListener("click", () => toast(T.toastPlace));
  return card;
}

// Маршрут: шапка с режимом и длительностью, карта, под ней три показателя.
function routeCardControl(item) {
  const coords = ROUTES[item.route];
  const meters = routeLength(coords);
  const speed = item.badges?.right?.label;
  const steps = Math.round(meters / 0.72);
  const first = item.mode === "car" && speed
    ? { value: speed, label: T.maxSpeed, good: item.badges?.left?.tone === "good" }
    : { value: fmtInt(steps), label: plural(steps, T.stepsWord) };
  const stats = [
    first,
    { value: fmtDistance(meters), label: T.distance },
    { value: item.eventsCount, label: plural(item.eventsCount, T.eventsWord) }
  ];
  const safe = item.badges?.left;

  const card = el("article", "feed-card route-card ctl-card ctl-route");
  card.innerHTML = `
    ${routeHead(item)}
    <div class="route-media">
      <div class="route-map" aria-hidden="true"></div>
      <span class="route-play" aria-hidden="true">
        <img src="assets/figma/play-button.svg" width="40" height="40" alt="">
      </span>
      ${safe ? `
        <div class="route-top ctl-tag-wrap">
          <span class="ctl-tag${safe.tone === "good" ? " is-good" : ""}">
            <img src="${ICON[safe.icon]}" width="18" height="18" alt="">${safe.label}
          </span>
        </div>` : ""}
    </div>
    <div class="ctl-stats">
      ${stats.map((st) => `
        <div class="ctl-stat">
          <span class="ctl-stat-value${st.good ? " is-good" : ""}">${st.value}</span>
          <span class="ctl-stat-label">${st.label}</span>
        </div>`).join('<span class="ctl-stat-sep"></span>')}
    </div>`;

  card.addEventListener("click", () => toast(T.toastRoute));
  const pin = ({ place }, lngLat, label) => ({
    icon: PLACES[place].pinIcon,
    tone: PLACES[place].tone,
    lngLat,
    label
  });
  mountRouteMap(card, {
    route: item.route,
    coords,
    pins: [pin(item.from, coords[0], T.start), pin(item.to, coords.at(-1), T.finish)]
  });
  return card;
}

// Шапка маршрута контрольного вида: иконка режима, длительность, время, стрелка.
// В Д (headed) стрелки нет — время стоит само по себе.
function routeHead(item, { arrow = true } = {}) {
  return `
    <div class="ctl-head">
      <span class="ctl-icon is-plain is-mode is-${item.mode}"><span class="icon-tint" style="--icon:url('${ICON[item.mode]}')"></span></span>
      ${routeTitle === "duration" ? `
      <h2 class="ctl-title">${item.duration}</h2>
      <span class="ctl-sub">${item.time}</span>` : `
      <div class="ctl-text">
        <h2 class="ctl-title">${MODE_TITLE[item.mode]} <span class="ctl-dot">•</span> ${item.duration}</h2>
        <span class="ctl-sub">${item.time}</span>
      </div>`}
      ${arrow ? `<span class="ctl-arrow"><span class="icon-tint" style="--icon:url('${ICON.arrow}')"></span></span>` : ""}
    </div>`;
}

// Длина линии маршрута в метрах (по сфере — для коротких отрезков хватает).
function routeLength(coords) {
  const R = 6371000;
  const rad = Math.PI / 180;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const x = (lng2 - lng1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
    const y = (lat2 - lat1) * rad;
    total += Math.hypot(x, y) * R;
  }
  return total;
}

// День в контрольном варианте (Figma 11708:405731 и 11708:405721).
// В ленте — подпись «Сегодня» слева. Уходя под верх ленты, она съезжает
// к центру, а следом появляется прилипшая полоса: серая пилюля на всю ширину
// с голубой заливкой прогресса дня. Следующий день, подъезжая, выталкивает
// полосу вверх и повторяет то же самое со своей подписью.
function floatDayBarControl(feed) {
  const view = document.getElementById("protoView");
  const bar = el("div", "day-bar");
  bar.innerHTML = `<span class="day-bar-pill"><span class="day-bar-fill"></span><span class="day-bar-text"></span></span>`;
  view.append(bar);
  const fill = bar.querySelector(".day-bar-fill");
  const text = bar.querySelector(".day-bar-text");
  const stamps = [...feed.querySelectorAll(".day-stamp")];
  const nav = view.querySelector(".nav");

  const update = () => {
    const feedTop = feed.getBoundingClientRect().top;
    bar.style.top = `${feedTop - view.getBoundingClientRect().top}px`;

    let current = null;
    let next = null;
    stamps.forEach((stamp) => {
      const label = stamp.querySelector(".day-stamp-pill");
      const d = stamp.getBoundingClientRect().top - feedTop;
      // Подпись едет слева к центру, пока уходит под верх ленты.
      const exit = label.offsetTop + label.offsetHeight;
      const t = Math.min(1, Math.max(0, -d / exit));
      label.style.transform = `translateX(${(t * (stamp.clientWidth - label.offsetWidth)) / 2}px)`;
      if (d <= -exit) current = stamp;
      else if (!next) next = stamp;
    });

    bar.classList.toggle("is-shown", Boolean(current));
    // Пока полоса видна под шапкой, разделитель шапки прячем: они одно целое.
    if (!current) {
      nav.classList.remove("is-joined");
      return;
    }

    // Следующий день подпирает полосу снизу и уводит её под шапку.
    const nextTop = next ? next.getBoundingClientRect().top - feedTop : Infinity;
    const push = Math.min(0, nextTop - bar.offsetHeight);
    bar.style.transform = `translateY(${push}px)`;
    nav.classList.toggle("is-joined", push > -bar.offsetHeight);

    // Прогресс дня — та же логика, что у плашки в остальных вариантах.
    const section = current.parentElement;
    const start = feed.scrollTop + current.getBoundingClientRect().top - feedTop;
    const maxScroll = feed.scrollHeight - feed.clientHeight;
    const end = Math.min(start + section.offsetHeight + DAY_GAP, maxScroll);
    const progress = end > start ? (feed.scrollTop - start) / (end - start) : 1;
    fill.style.width = `${(Math.min(1, Math.max(0, progress)) * 100).toFixed(2)}%`;
    text.textContent = current.textContent.trim();
  };
  feed.addEventListener("scroll", update, { passive: true });
  feed.addEventListener("scrollend", update);
  window.addEventListener("resize", update);
  update();
}

// Таймлайн (v3, Figma 11668:401539): серая линия слева от карточек и точка
// напротив середины каждой. Первая карточка — где ребёнок сейчас: синяя точка
// с пульсирующим ореолом. Линия идёт сквозь разделители дней — это одна лента.
// Лежит в самой ленте и едет вместе с ней; пересчитывается, когда меняется
// высота карточек (шрифты, ширина экрана).
function drawTimeline(feed) {
  const rail = el("div", "timeline");
  rail.setAttribute("aria-hidden", "true");
  feed.prepend(rail);
  const cards = [...feed.querySelectorAll(".feed-card")];

  const layout = () => {
    const base = feed.getBoundingClientRect().top - feed.scrollTop;
    const centers = cards.map((card) => {
      const r = card.getBoundingClientRect();
      return r.top - base + r.height / 2;
    });
    rail.innerHTML = `
      <span class="timeline-line" style="top:${centers[0]}px;height:${centers.at(-1) - centers[0]}px"></span>
      ${centers.map((y, i) => `<span class="timeline-dot${i === 0 ? " is-now" : ""}" style="top:${y}px"></span>`).join("")}`;
  };

  layout();
  document.fonts?.ready.then(layout);
  const ro = new ResizeObserver(layout);
  ro.observe(feed);
  feed.querySelectorAll(".feed-day").forEach((day) => ro.observe(day));
}

// Тост как в low-battery: один на экран, перезапускается на каждое нажатие.
let toastTimer = 0;
function toast(text) {
  const node = document.getElementById("toast");
  node.textContent = text;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2000);
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

// Роутинг как в low-battery: без ?p — меню вариантов, ?p=v1 — прототип.
// Стоит в конце модуля: к этому моменту объявлены все const/let выше.
document.documentElement.lang = LANG;
const params = new URLSearchParams(location.search);
const requested = params.get("p");
const variantId = VARIANT_ALIASES[requested] ?? requested;

if (variantId && VARIANTS[variantId] && !VARIANTS[variantId].disabled) {
  renderProto(variantId);
} else {
  renderMenu();
}
