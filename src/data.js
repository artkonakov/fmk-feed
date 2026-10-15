import { ROUTES } from "./routes.js";

// Figma: 2026 H2 OKR — Growth, Feed 11668:397454.
// Карта — Ховрино (как на макете). Координаты [lng, lat].

const FIG = "assets/figma";

export const CHILD = {
  name: "Миша",
  photo: "assets/Foto Boy.png",
  battery: 83,
  silent: true
};

// Места: иконка в шапке карточки (20px на синей/серой плашке) и в пине на карте (18px).
export const PLACES = {
  home: {
    name: "Дом",
    headIcon: `${FIG}/head-house.svg`,
    pinIcon: `${FIG}/pin-house.svg`,
    tone: "primary"
  },
  school: {
    name: "Школа",
    headIcon: `${FIG}/head-school-cap.svg`,
    pinIcon: `${FIG}/pin-school-cap.svg`,
    tone: "primary"
  },
  stroiteley: {
    name: "ул. Строителей, 28",
    headIcon: `${FIG}/head-pin.svg`,
    pinIcon: `${FIG}/pin-pin.svg`,
    tone: "deep"
  },
  onega: {
    name: "Онежская ул., 6",
    headIcon: `${FIG}/head-pin.svg`,
    pinIcon: `${FIG}/pin-pin.svg`,
    tone: "deep"
  }
};

const ICON = {
  history: `${FIG}/icon-history.svg`,
  walk: `${FIG}/icon-walking.svg`,
  car: `${FIG}/icon-car.svg`,
  speed: `${FIG}/icon-speed.svg`,
  star: `${FIG}/icon-badge-star.svg`,
  bell: `${FIG}/icon-bell-on.svg`,
  arrow: `${FIG}/icon-arrow-right.svg`
};
export { ICON };

// Лента сверху вниз: от «сейчас» к прошлому, по дням. Day stamp (11665:395879)
// у каждого дня прилипает к верху, пока день на экране. Два типа блоков:
//   place — пребывание в месте, route — перемещение между местами (карта).
const TODAY = [
  {
    type: "place",
    place: "home",
    title: "Сейчас Дома",
    time: "с 16:00",
    duration: "1 ч 30 мин",
    action: { kind: "more", label: "Подробнее" }
  },
  {
    type: "route",
    route: "toHome",
    from: { place: "stroiteley", label: "Вышел в 15:02" },
    to: { place: "home", label: "Пришёл в 16:00" },
    time: "15:02 — 16:00",
    mode: "walk",
    duration: "58 мин",
    events: "11 событий"
  },
  {
    type: "place",
    place: "stroiteley",
    time: "14:32 — 15:02",
    duration: "30 мин",
    action: { kind: "more", label: "Подробнее" }
  },
  {
    type: "route",
    route: "toStroiteley",
    from: { place: "school", label: "Вышел в 13:30" },
    to: { place: "stroiteley", label: "Пришёл в 14:32" },
    time: "13:30 — 14:32",
    mode: "walk",
    duration: "1 ч 02 мин",
    events: "3 события"
  },
  {
    type: "place",
    place: "school",
    time: "10:00 — 13:30",
    duration: "1 ч 30 мин",
    action: { kind: "bell", label: "Вкл. уведомления" }
  },
  {
    type: "route",
    route: "toSchool",
    from: { place: "home", label: "Выехал в 09:30" },
    to: { place: "school", label: "Приехал в 10:00" },
    time: "09:30 — 10:00",
    mode: "car",
    duration: "30 мин",
    events: "2 события",
    badges: {
      left: { icon: "star", label: "Безопасное вождение", tone: "good" },
      right: { icon: "speed", label: "64 км/ч" }
    }
  },
  {
    type: "place",
    place: "home",
    time: "21:20 — 09:30",
    duration: "12 ч 10 мин",
    action: { kind: "more", label: "Подробнее" }
  }
];

// Вчера: те же места и маршруты, другое время — для проверки липкой плашки.
const YESTERDAY = [
  {
    type: "route",
    route: "onegaToHome",
    from: { place: "onega", label: "Вышел в 21:02" },
    to: { place: "home", label: "Пришёл в 21:20" },
    time: "21:02 — 21:20",
    mode: "walk",
    duration: "18 мин",
    events: "8 событий"
  },
  {
    type: "place",
    place: "onega",
    time: "18:05 — 21:02",
    duration: "2 ч 57 мин",
    action: { kind: "more", label: "Подробнее" }
  },
  {
    type: "route",
    route: "schoolToOnega",
    from: { place: "school", label: "Вышел в 17:30" },
    to: { place: "onega", label: "Пришёл в 18:05" },
    time: "17:30 — 18:05",
    mode: "walk",
    duration: "35 мин",
    events: "4 события"
  },
  {
    type: "place",
    place: "school",
    time: "08:30 — 17:30",
    duration: "9 ч 00 мин",
    action: { kind: "more", label: "Подробнее" }
  },
  {
    type: "route",
    route: "toSchool",
    from: { place: "home", label: "Выехал в 08:05" },
    to: { place: "school", label: "Приехал в 08:30" },
    time: "08:05 — 08:30",
    mode: "car",
    duration: "25 мин",
    events: "2 события",
    badges: {
      left: { icon: "star", label: "Безопасное вождение", tone: "good" },
      right: { icon: "speed", label: "58 км/ч" }
    }
  },
  {
    type: "place",
    place: "home",
    time: "21:40 — 08:05",
    duration: "10 ч 25 мин",
    action: { kind: "more", label: "Подробнее" }
  }
];

export const DAYS = [
  { label: "Сегодня", items: TODAY },
  { label: "Вчера, 17 сентября", items: YESTERDAY }
];

export { ROUTES };

// Меню вариантов, как в low-battery: ?p=a / b / c / d. Буквы перемешаны
// относительно дизайна и подписей в меню нет, чтобы по экрану выбора нельзя было
// угадать, какой вариант какой. Что за буквой:
//   а — карточка маршрута «карта сверху, текст и чипы под ней» (Figma 11668:398053);
//   б — контрольный: как в приложении сейчас (Figma 11699:405063);
//   в — таймлайн слева от карточек (Figma 11668:401539);
//   г — базовая лента, чипы лежат на карте (Figma 11668:397454).
// routeCard: "overlay" — чипы на карте; "split" — текст и чипы под картой;
// "control" (+ placeCard: "control") — контрольный вариант.
export const VARIANTS = {
  a: { title: "Вариант А", routeCard: "split" },
  b: { title: "Вариант Б", routeCard: "control", placeCard: "control" },
  c: { title: "Вариант В", routeCard: "overlay", timeline: true },
  d: { title: "Вариант Г", routeCard: "overlay" }
};

// Старые ссылки ?p=v1 / v2 / v3 открывают тот же вариант под новой буквой.
export const VARIANT_ALIASES = { v1: "d", v2: "a", v3: "c", control: "b" };
