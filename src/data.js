import { ROUTES as ROUTES_RU } from "./routes.js";
import { ROUTES_US } from "./routes-us.js";
import {
  LANG, T, fmtDuration, fmtTime, fmtRange, fmtSpeed, fmtEvents, fmtDay
} from "./i18n.js";

// Figma: 2026 H2 OKR — Growth, Feed 11668:397454.
// Русская версия — Ховрино (как на макете), английская — Кресвью, Остин (Техас).
// Лента одна на оба языка: здесь только числа и ключи, тексты собирает i18n.js.

const FIG = "assets/figma";

export const ROUTES = LANG === "en" ? ROUTES_US : ROUTES_RU;

export const CHILD = {
  name: { ru: "Миша", en: "Alex" }[LANG],
  photo: "assets/Foto Boy.png",
  battery: 83,
  silent: true
};

// Места: иконка в шапке карточки (20px на синей/серой плашке) и в пине на карте (18px).
// Ключи stroiteley / onega остались от русских адресов; в английской версии
// это адреса рядом с концами маршрутов в Остине.
const PLACE_DEFS = {
  home: {
    name: { ru: "Дом", en: "Home" },
    now: { ru: "Сейчас Дома", en: "At Home" },
    headIcon: `${FIG}/head-house.svg`,
    pinIcon: `${FIG}/pin-house.svg`,
    tone: "primary"
  },
  school: {
    name: { ru: "Школа", en: "School" },
    headIcon: `${FIG}/head-school-cap.svg`,
    pinIcon: `${FIG}/pin-school-cap.svg`,
    tone: "primary"
  },
  stroiteley: {
    name: { ru: "ул. Строителей, 28", en: "1408 Romeria Dr" },
    headIcon: `${FIG}/head-pin.svg`,
    pinIcon: `${FIG}/pin-pin.svg`,
    tone: "deep"
  },
  onega: {
    name: { ru: "Онежская ул., 6", en: "6 Stobaugh St" },
    headIcon: `${FIG}/head-pin.svg`,
    pinIcon: `${FIG}/pin-pin.svg`,
    tone: "deep"
  }
};

export const PLACES = Object.fromEntries(
  Object.entries(PLACE_DEFS).map(([id, p]) => [id, { ...p, name: p.name[LANG], now: p.now?.[LANG] }])
);

const ICON = {
  history: `${FIG}/icon-history.svg`,
  time: `${FIG}/icon-time.svg`,
  walk: `${FIG}/icon-walking.svg`,
  car: `${FIG}/icon-car.svg`,
  speed: `${FIG}/icon-speed.svg`,
  star: `${FIG}/icon-badge-star.svg`,
  bell: `${FIG}/icon-bell-on.svg`,
  arrow: `${FIG}/icon-arrow-right.svg`
};
export { ICON };

// Лента сверху вниз: от «сейчас» к прошлому, по дням.
//   place — пребывание в месте: since (сейчас там) или from/to, minutes, action;
//   route — перемещение: from/to { place, at }, mode, minutes, events,
//           safe (безопасное вождение), speed — макс. скорость, км/ч.
const TODAY = [
  { type: "place", place: "home", now: true, since: "16:00", minutes: 90, action: "more" },
  { type: "route", route: "toHome", from: { place: "stroiteley", at: "15:02" }, to: { place: "home", at: "16:00" }, mode: "walk", minutes: 58, events: 11 },
  { type: "place", place: "stroiteley", from: "14:32", to: "15:02", minutes: 30, action: "more" },
  { type: "route", route: "toStroiteley", from: { place: "school", at: "13:30" }, to: { place: "stroiteley", at: "14:32" }, mode: "walk", minutes: 62, events: 3 },
  { type: "place", place: "school", from: "10:00", to: "13:30", minutes: 90, action: "bell" },
  { type: "route", route: "toSchool", from: { place: "home", at: "09:30" }, to: { place: "school", at: "10:00" }, mode: "car", minutes: 30, events: 2, safe: true, speed: 64 },
  { type: "place", place: "home", from: "21:20", to: "09:30", minutes: 730, action: "more" }
];

const YESTERDAY = [
  { type: "route", route: "onegaToHome", from: { place: "onega", at: "21:02" }, to: { place: "home", at: "21:20" }, mode: "walk", minutes: 18, events: 8 },
  { type: "place", place: "onega", from: "18:05", to: "21:02", minutes: 177, action: "more" },
  { type: "route", route: "schoolToOnega", from: { place: "school", at: "17:30" }, to: { place: "onega", at: "18:05" }, mode: "walk", minutes: 35, events: 4 },
  { type: "place", place: "school", from: "08:30", to: "17:30", minutes: 540, action: "more" },
  { type: "route", route: "toSchool", from: { place: "home", at: "08:05" }, to: { place: "school", at: "08:30" }, mode: "car", minutes: 25, events: 2, safe: true, speed: 58 },
  { type: "place", place: "home", from: "21:40", to: "08:05", minutes: 625, action: "more" }
];

// Из чисел — готовые строки под текущий язык. Поля те же, что читают карточки.
function localize(item) {
  if (item.type === "place") {
    return {
      ...item,
      title: item.now ? PLACES[item.place].now : undefined,
      time: item.since ? T.since(fmtTime(item.since)) : fmtRange(item.from, item.to),
      ongoing: Boolean(item.since),
      duration: fmtDuration(item.minutes),
      action: item.action === "bell"
        ? { kind: "bell", label: T.turnOnAlerts }
        : { kind: "more", label: T.more }
    };
  }
  return {
    ...item,
    from: { place: item.from.place, label: T.left[item.mode](fmtTime(item.from.at)) },
    to: { place: item.to.place, label: T.arrived[item.mode](fmtTime(item.to.at)) },
    time: fmtRange(item.from.at, item.to.at),
    duration: fmtDuration(item.minutes),
    eventsCount: item.events,
    events: fmtEvents(item.events),
    badges: item.safe || item.speed
      ? {
          left: item.safe ? { icon: "star", label: T.safeDriving, tone: "good" } : undefined,
          right: item.speed ? { icon: "speed", label: fmtSpeed(item.speed) } : undefined
        }
      : undefined
  };
}

export const DAYS = [
  { label: fmtDay({ day: "today" }), items: TODAY.map(localize) },
  { label: fmtDay({ day: "yesterday", month: 9, date: 17 }), items: YESTERDAY.map(localize) }
];

// Меню вариантов, как в low-battery: ?p=a / b / c / d (+ &lang=en). Буквы
// перемешаны относительно дизайна и подписей в меню нет, чтобы по экрану
// выбора нельзя было угадать, какой вариант какой. Что за буквой:
//   а — карточка маршрута «карта сверху, текст и чипы под ней» (Figma 11668:398053);
//   б — контрольный: как в приложении сейчас (Figma 11699:405063);
//   в — таймлайн слева от карточек (Figma 11668:401539);
//   г — базовая лента, чипы лежат на карте (Figma 11668:397454);
//   д — карточки как в контрольном, но в одну строку: длительность слева, время со стрелкой справа.
// routeCard: "overlay" — чипы на карте; "split" — текст и чипы под картой;
// "control" (+ placeCard: "control") — контрольный вариант.
// durationIcon: иконка у длительности в карточке места ("history" по умолчанию,
// "time" — часы, Figma 11668:397475).
const VARIANT_DEFS = {
  a: { routeCard: "split" },
  b: { routeCard: "control", placeCard: "control" },
  c: { routeCard: "overlay", timeline: true },
  d: { routeCard: "overlay", durationIcon: "time" },
  f: { routeCard: "control", placeCard: "control", routeTitle: "duration", dayBar: "pill" }
};

export const VARIANTS = Object.fromEntries(
  Object.entries(VARIANT_DEFS).map(([id, v]) => [id, { ...v, title: `${T.option} ${T.letters[id]}` }])
);

// Старые ссылки ?p=v1 / v2 / v3 открывают тот же вариант под новой буквой.
export const VARIANT_ALIASES = { v1: "d", v2: "a", v3: "c", control: "b" };
