// Язык прототипа: ?lang=en — английский, иначе русский (как в low-battery).
// Английская версия живёт в США: своя карта (Остин), 12-часовое время,
// мили и mph. Тайминги, длительности и события у обеих версий одни и те же.
export const LANG = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "ru";

export const STRINGS = {
  ru: {
    menuTitle: "Лента",
    option: "Вариант",
    letters: { a: "А", b: "Б", c: "В", d: "Г", f: "Д" },
    back: "Назад",
    refresh: "Обновить",
    silent: "Без звука",
    today: "Сегодня",
    yesterday: "Вчера",
    more: "Подробнее",
    turnOnAlerts: "Вкл. уведомления",
    safeDriving: "Безопасное вождение",
    walk: "Прогулка",
    drive: "Поездка",
    start: "СТАРТ",
    finish: "ФИНИШ",
    distance: "расстояние",
    maxSpeed: "макс. скорость",
    since: (t) => `с ${t}`,
    left: { walk: (t) => `Вышел в ${t}`, car: (t) => `Выехал в ${t}` },
    arrived: { walk: (t) => `Пришёл в ${t}`, car: (t) => `Приехал в ${t}` },
    toastPlace: "Откроются детали места",
    toastRoute: "Откроются детали маршрута",
    alertsOn: (place) => `Уведомления о месте «${place}» включены`,
    alertsOff: "Уведомления выключены",
    eventsWord: ["событие", "события", "событий"],
    stepsWord: ["шаг", "шага", "шагов"],
    months: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля",
      "августа", "сентября", "октября", "ноября", "декабря"]
  },
  en: {
    menuTitle: "Feed",
    option: "Option",
    letters: { a: "A", b: "B", c: "C", d: "D", f: "E" },
    back: "Back",
    refresh: "Refresh",
    silent: "Silent",
    today: "Today",
    yesterday: "Yesterday",
    more: "Details",
    turnOnAlerts: "Turn on alerts",
    safeDriving: "Safe driving",
    walk: "Walk",
    drive: "Ride",
    start: "START",
    finish: "FINISH",
    distance: "distance",
    maxSpeed: "max speed",
    since: (t) => `since ${t}`,
    left: { walk: (t) => `Left at ${t}`, car: (t) => `Left at ${t}` },
    arrived: { walk: (t) => `Arrived at ${t}`, car: (t) => `Arrived at ${t}` },
    toastPlace: "Place details will open",
    toastRoute: "Route details will open",
    alertsOn: (place) => `Alerts for ${place} are on`,
    alertsOff: "Alerts are off",
    eventsWord: ["event", "events"],
    stepsWord: ["step", "steps"],
    months: ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"]
  }
};

export const T = STRINGS[LANG];

// Слово по числу: ru — один / несколько / много, en — один / много.
export function plural(n, forms) {
  if (LANG === "en") return n === 1 ? forms[0] : forms[1];
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

// Длительность: «58 мин», «1 ч 02 мин», «9 ч 00 мин» — минуты всегда с нулём,
// если есть часы. По-английски так же: «1 h 02 min».
export function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const [hu, mu] = LANG === "en" ? ["h", "min"] : ["ч", "мин"];
  return h ? `${h} ${hu} ${String(m).padStart(2, "0")} ${mu}` : `${m} ${mu}`;
}

// Время «HH:MM» из данных: ru — как есть, en — 12-часовое «3:02 PM».
function clock(hhmm) {
  if (LANG === "ru") return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
export function fmtTime(hhmm) {
  return clock(hhmm);
}

// Интервал: ru «14:32 — 15:02»; en «2:32 – 3:02 PM» (AM/PM один раз, если совпадает).
export function fmtRange(from, to) {
  if (LANG === "ru") return `${from} — ${to}`;
  const a = clock(from);
  const b = clock(to);
  const sameHalf = a.slice(-2) === b.slice(-2);
  return `${sameHalf ? a.slice(0, -3) : a} – ${b}`;
}

export function fmtInt(n) {
  return LANG === "en" ? n.toLocaleString("en-US") : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Расстояние: ru «1,6 км», en «1.7 mi».
export function fmtDistance(meters) {
  return LANG === "en"
    ? `${(meters / 1609.344).toFixed(1)} mi`
    : `${(meters / 1000).toFixed(1).replace(".", ",")} км`;
}

// Скорость в данных — км/ч; по-английски показываем mph.
export function fmtSpeed(kmh) {
  return LANG === "en" ? `${Math.round(kmh / 1.609344)} mph` : `${kmh} км/ч`;
}

export function fmtEvents(n) {
  return `${n} ${plural(n, T.eventsWord)}`;
}

// День: «Сегодня» / «Вчера, 17 сентября» / «Yesterday, September 17».
export function fmtDay({ day, month, date }) {
  const word = day === "today" ? T.today : T.yesterday;
  if (!month) return word;
  return LANG === "en" ? `${word}, ${T.months[month - 1]} ${date}` : `${word}, ${date} ${T.months[month - 1]}`;
}

// Ссылка на ту же страницу с сохранением языка.
export function withLang(query = "") {
  const params = new URLSearchParams(query);
  if (LANG === "en") params.set("lang", "en");
  const s = params.toString();
  return s ? `?${s}` : location.pathname;
}
