'use strict';
// ================= БЕЗДНА — ядро: константи, помощни функции, глобално състояние =================

const VOID = 0, FLOOR = 1, WALL = 2;
const FOV_R = 8;

// SCALE = цели device-пиксели за 1 арт-пиксел -> винаги остра картина (без дробно мащабиране)
let SCALE = 2, TW = 64, TH = 32;
function computeScale() {
  const dpr = window.devicePixelRatio || 1;
  const dw = window.innerWidth * dpr, dh = window.innerHeight * dpr;
  // мащабът следва реалната резолюция (не dpr), за да се вижда достатъчно от света;
  // на тъч екрани е по-едър (пръсти + малък физически екран); винаги цяло число => остри пиксели
  const touch = (typeof G !== 'undefined') && G.isTouch;
  const bySize = touch
    ? Math.min(Math.floor(dh / 290), Math.floor(dw / 450))
    : Math.min(Math.floor(dh / 340), Math.floor(dw / 520));
  SCALE = Math.max(2, bySize);
  TW = 32 * SCALE;
  TH = 16 * SCALE;
}

const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const chance = p => Math.random() < p;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// изометрична проекция (световни координати в плочки -> екранни device px, преди камера)
const isoX = (x, y) => (x - y) * TW / 2;
const isoY = (x, y) => (x + y) * TH / 2;

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// глобално състояние на играта
const G = {
  state: 'title',      // title | play | pause | inventory | levelup | dead | transition
  time: 0, depth: 1, runSeed: 1,
  map: null, visible: null, explored: null,
  player: null,
  enemies: [], projectiles: [], particles: [], texts: [], ground: [], props: [], decals: [],
  camX: 0, camY: 0, camInit: false,
  shake: 0, hitStop: 0, hurtFlash: 0,
  kills: 0, maxDepth: 1, startTime: 0,
  fade: 0, transT: 0, transMsg: '',
  levelupChoices: null, levelupQueue: 0,
  interactHint: null,
  mouse: { x: 0, y: 0, wx: 0, wy: 0, down: false, rdown: false },
  keys: Object.create(null),
  best: null,
  msg: null, msgT: 0,
  bossName: null,
  // повърхността (отворен свят) и постоянен прогрес
  onSurface: false,
  transTarget: null,        // накъде води преходът: 0 = повърхността, N = етаж N
  meta: null,               // попълва се от defaultMeta() по-долу
  shops: {},                // текуща стока на търговците
  shopVendor: null,
  // тъч управление (телефон, пейзажна ориентация)
  isTouch: (typeof window !== 'undefined') && ('ontouchstart' in window),
  portrait: false,
  // герои (до 3), контролни точки и банкиран прогрес
  charSlot: 0, charName: 'Exile',
  checkpoint: 1,            // най-дълбокият отключен вход в Бездната
  heroBank: null,           // ниво/перкове/умения, прибрани у дома през портала
  sbSel: 0,                 // избран активен слот в книгата с магии
  newName: '',              // въвежданото име на нов герой
  joy: null,                // {id, sx, sy, dx, dy} — виртуален джойстик
  atkHold: null,            // id на докосването върху бутона за атака
  fireHold: null,           // id на докосването върху бутона за огън
  editSel: null,            // избран бутон в редактора на контролите
  editDrag: null,           // активно влачене в редактора
  setDrag: false,           // влачене на слайдера за звук
};

// постоянният прогрес между смъртите (и стари записи получават новите полета)
function defaultMeta() {
  return {
    worldSeed: 0, bestDepth: 1, deaths: 0, totalKills: 0,
    seals: 0,                                   // Печати на Бездната (от архибоса) — само за структурни отключвания
    shards: 0,                                  // Осколки на пазителя (от пазители/елити) — за омагьосване на афикси
    invSlots: 5,                                // започваме с 5 (един ред), купуват се до 20 при Мистика
    magic3: false, magic4: false,               // отключени слотове за магии в хотбара
    vendorLvl: { weapon: 1, armor: 1, potion: 1 }, // нива на развитие на сергиите
    volume: 0.8,                                // сила на звука 0..1
    ctrl: null,                                 // персонализирана подредба на тъч бутоните
    dash2: false,                               // втори заряд на отскока (Майстора)
    legendPool: false,                          // отключен пул на уникатите (Майстора)
    inputMode: 'auto',                          // auto | kbm | pad | touch
    kbBinds: {},                                // презаписани клавиши {action: code|null}
    padBinds: {},                               // презаписани бутони на пада {action: index|null}
  };
}
// ---------- действия и биндове (клавиатура + контролер) ----------
// kb = код по подразбиране (KeyboardEvent.code), pad = индекс на бутон (standard mapping)
const ACTIONS = [
  { id: 'up', n: 'Up', kb: 'KeyW' },
  { id: 'down', n: 'Down', kb: 'KeyS' },
  { id: 'left', n: 'Left', kb: 'KeyA' },
  { id: 'right', n: 'Right', kb: 'KeyD' },
  { id: 'attack', n: 'Attack', kb: null, pad: 0 },      // на клавиатура атаката е ляв бутон на мишката
  { id: 'dash', n: 'Dash', kb: 'Space', pad: 1 },
  { id: 'interact', n: 'Action', kb: 'KeyE', pad: 2 },
  { id: 'spell1', n: 'Spell 1', kb: 'KeyQ', pad: 3 },
  { id: 'spell2', n: 'Spell 2', kb: 'Digit3', pad: 5 },
  { id: 'spell3', n: 'Spell 3', kb: 'Digit4', pad: 7 },
  { id: 'potion1', n: 'Life potion', kb: 'Digit1', pad: 4 },
  { id: 'potion2', n: 'Mana potion', kb: 'Digit2', pad: 6 },
  { id: 'inventory', n: 'Inventory', kb: 'KeyI', pad: 8 },
  { id: 'spellbook', n: 'Spellbook', kb: 'KeyB' },
  { id: 'skilltree', n: 'Skills', kb: 'KeyT' },
  { id: 'settings', n: 'Settings', kb: null, pad: 9 },
  { id: 'mute', n: 'Sound on/off', kb: 'KeyM' },
];
const ACTION_MAP = {};
for (const a of ACTIONS) ACTION_MAP[a.id] = a;

// менюта, в които контролерът движи маркер по елементите (пространствена навигация)
const menuNavStates = { title: 1, charselect: 1, settings: 1, spellbook: 1, skilltree: 1, stats: 1, inventory: 1, shop: 1, binds: 1, inputmode: 1, potionsel: 1 };
function kbBind(id) {
  const o = G.meta && G.meta.kbBinds;
  return (o && id in o) ? o[id] : ACTION_MAP[id].kb;
}
function padBind(id) {
  const o = G.meta && G.meta.padBinds;
  return (o && id in o) ? o[id] : ACTION_MAP[id].pad;
}
function actionForKey(code) {
  for (const a of ACTIONS) if (kbBind(a.id) === code) return a.id;
  return null;
}
function actionForPad(idx) {
  for (const a of ACTIONS) if (padBind(a.id) === idx) return a.id;
  return null;
}
// задава нов бутон; ако е зает от друго действие, старото остава без бутон
function assignBind(dev, actionId, val) {
  const key = dev === 'kb' ? 'kbBinds' : 'padBinds';
  if (!G.meta[key]) G.meta[key] = {};
  const prev = dev === 'kb' ? actionForKey(val) : actionForPad(val);
  if (prev && prev !== actionId) {
    G.meta[key][prev] = null;
    toast('"' + ACTION_MAP[prev].n + '" is now unbound', '#e0a458');
  }
  G.meta[key][actionId] = val;
  if (typeof saveProfile === 'function') saveProfile();
  if (typeof Sfx !== 'undefined') Sfx.play('pickup');
}
function resetBinds(dev) {
  if (dev === 'kb') G.meta.kbBinds = {}; else G.meta.padBinds = {};
  if (typeof saveProfile === 'function') saveProfile();
}

// падът е реалният вход в момента (използван е скоро) — за подсказки/маркери,
// защото в „авто" режим на компютър useMouseAim() остава true и с включен контролер
function padRecent() { return !!(usePad() && G.padUseT && (G.time - G.padUseT < 5)); }

// режим на управление: авто (по устройството) или изричен избор от настройките
function inputMode() { return (G.meta && G.meta.inputMode) || 'auto'; }
function useTouchUI() { const m = inputMode(); return m === 'touch' || (m === 'auto' && G.isTouch); }
function usePad() { const m = inputMode(); return m === 'pad' || m === 'auto'; }
function useMouseAim() { const m = inputMode(); return m === 'kbm' || (m === 'auto' && !G.isTouch); }
function mergeMeta(loaded) {
  const m = defaultMeta();
  if (loaded) {
    for (const k in loaded) if (k !== 'vendorLvl') m[k] = loaded[k];
    if (loaded.vendorLvl) Object.assign(m.vendorLvl, loaded.vendorLvl);
  }
  m.invSlots = clamp(m.invSlots || 5, 5, 20); // мин 5 (стари записи с 4 стават 5), таван 20
  return m;
}
G.meta = defaultMeta();

function toast(str, color) {
  G.msg = { str, color: color || '#ffd23b' };
  G.msgT = 2.6;
}

function cellAt(i, j) {
  const m = G.map;
  if (!m || i < 0 || j < 0 || i >= m.w || j >= m.h) return VOID;
  return m.cells[j * m.w + i];
}

function addText(x, y, str, color, big) {
  G.texts.push({ x, y, z: 14, t: 0, life: 0.9, str: String(str), color, big: !!big });
  if (G.texts.length > 60) G.texts.shift();
}

function addParticle(p) {
  G.particles.push(p);
  if (G.particles.length > 650) G.particles.splice(0, G.particles.length - 650);
}

// пръски във всички посоки (z = височина в арт-пиксели)
function burst(x, y, colors, n, spd, life) {
  for (let i = 0; i < n; i++) {
    const a = rnd(Math.PI * 2), s = rnd(0.4, 1) * (spd || 3);
    addParticle({
      x, y, z: rnd(4, 12),
      vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(6, 26),
      grav: 60, t: 0, life: (life || 0.5) * rnd(0.6, 1.3),
      col: pick(colors), size: chance(0.3) ? 2 : 1,
    });
  }
}
