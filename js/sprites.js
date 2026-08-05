'use strict';
// ================= СПРАЙТОВЕ: процедурен пиксел-арт (арт-резолюция, целочислено мащабиране) =================

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return g;
}
function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
function rc(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

// 1px тъмен контур около силуета — прави всеки спрайт четлив и остър
function outlineSprite(g, color) {
  const c = g.canvas, w = c.width, h = c.height;
  const id = g.getImageData(0, 0, w, h), a = id.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 40;
  g.fillStyle = color || '#0a0c12';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a[(y * w + x) * 4 + 3] <= 40 && (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1)))
      g.fillRect(x, y, 1, 1);
  }
}
function whiteVersion(cv) {
  const g = mk(cv.width, cv.height);
  g.drawImage(cv, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, cv.width, cv.height);
  return g.canvas;
}
function dimVersion(cv, amt) {
  const g = mk(cv.width, cv.height);
  g.drawImage(cv, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(8,11,20,' + (amt === undefined ? 0.62 : amt) + ')';
  g.fillRect(0, 0, cv.width, cv.height);
  return g.canvas;
}

// ромб 32x16
function diamondSpan(y) {
  const half = y < 8 ? 2 * (y + 1) : 2 * (16 - y);
  return [16 - half, half * 2];
}
function fillDiamond(g, oy, c) {
  for (let y = 0; y < 16; y++) {
    const [x0, w] = diamondSpan(y);
    rc(g, x0, oy + y, w, 1, c);
  }
}
function inDiamond(x, y) {
  if (y < 0 || y > 15) return false;
  const [x0, w] = diamondSpan(y);
  return x >= x0 && x < x0 + w;
}

// ---------- теми по дълбочина ----------
const THEMES = [
  { name: 'Dungeon', sub: 'cold stone',
    base: '#3b4254', dark: '#323848', light: '#4a5268', crack: '#272c3a', edge: '#2a2f3e', accent: '#5a6a85',
    top: '#4d566c', topLight: '#5f6a84', topDark: '#414a5e', faceL: '#2e3546', faceR: '#252b3a', mortar: '#1b202e' },
  { name: 'Catacombs', sub: 'moss and bones',
    base: '#3c4a41', dark: '#324038', light: '#4a5c4e', crack: '#252f28', edge: '#2a352d', accent: '#55804c',
    top: '#4b5c50', topLight: '#5d7060', topDark: '#3f4f44', faceL: '#2c3830', faceR: '#242e27', mortar: '#1a221c' },
  { name: 'Bloody Halls', sub: 'obsidian and embers',
    base: '#4a3138', dark: '#3b262c', light: '#5c3f45', crack: '#2a1a1e', edge: '#31212a', accent: '#8a3040',
    top: '#553a42', topLight: '#6a4750', topDark: '#452e36', faceL: '#33222a', faceR: '#291a21', mortar: '#1c1116' },
  { name: 'Abyss', sub: 'the void stares',
    base: '#3a3150', dark: '#2e2740', light: '#4a3f66', crack: '#231d33', edge: '#2b2440', accent: '#6a4f9e',
    top: '#4a3f63', topLight: '#5c4e7c', topDark: '#3d3453', faceL: '#2c2542', faceR: '#231d35', mortar: '#161126' },
  { name: 'Heart of Darkness', sub: 'here the light dies',
    base: '#252c44', dark: '#1d2336', light: '#33405e', crack: '#141a2b', edge: '#1a2033', accent: '#5c78e8',
    top: '#313a58', topLight: '#41507a', topDark: '#28304a', faceL: '#1e2438', faceR: '#171c2c', mortar: '#0e1220' },
  { name: 'Garrison Depths', sub: 'flooded cells and rusted bars', // МИРХОЛД: наводнена тъмница на гарнизона
    base: '#3a4a4d', dark: '#2f3d40', light: '#4a5e60', crack: '#233032', edge: '#293738', accent: '#4f8a7d',
    top: '#485a5c', topLight: '#5a7072', topDark: '#3c4c4e', faceL: '#2c3a3c', faceR: '#243032', mortar: '#182224' },
];
const MIRHOLD_THEME = THEMES.length - 1; // темата на Гарнизонната тъмница
// визията се сменя на всеки 10 етажа (всеки арх-бос пази своя), нова след етаж 50
function themeIndexFor(depth) {
  if (G.dungeonId === 'mirhold') return MIRHOLD_THEME;
  return depth > 50 ? 4 : Math.min(3, Math.floor((depth - 1) / 10));
}

const Spr = { themeIdx: -1 };

// ---------- плочки ----------
function genFloor(t, R) {
  const g = mk(32, 16);
  fillDiamond(g, 0, t.base);
  for (let i = 0; i < 70; i++) {
    const x = (R() * 32) | 0, y = (R() * 16) | 0;
    if (inDiamond(x, y)) px(g, x, y, R() < 0.5 ? t.dark : t.light);
  }
  if (R() < 0.55) { // пукнатина
    let x = 8 + (R() * 16 | 0), y = 3 + (R() * 9 | 0);
    for (let i = 0; i < 7; i++) {
      if (inDiamond(x, y)) px(g, x, y, t.crack);
      x += R() < 0.5 ? 1 : -1; y += R() < 0.65 ? 1 : 0;
    }
  }
  if (R() < 0.4) { // камъче / мъх
    const x = 6 + (R() * 18 | 0), y = 4 + (R() * 8 | 0);
    if (inDiamond(x, y) && inDiamond(x + 1, y)) { px(g, x, y, t.accent); px(g, x + 1, y, t.dark); }
  }
  // ръбове: горните светли, долните тъмни -> четене на решетката без размазване
  for (let y = 0; y < 16; y++) {
    const [x0, w] = diamondSpan(y);
    if (y < 8) { px(g, x0, y, t.light); px(g, x0 + 1, y, t.light); px(g, x0 + w - 1, y, t.edge); px(g, x0 + w - 2, y, t.edge); }
    else { px(g, x0, y, t.edge); px(g, x0 + 1, y, t.edge); px(g, x0 + w - 1, y, t.crack); px(g, x0 + w - 2, y, t.crack); }
  }
  return g.canvas;
}

const WALL_HP = 20; // височина на стената в арт-пиксели
function genWall(t, R) {
  const H = WALL_HP;
  const g = mk(32, 16 + H);
  // капак
  fillDiamond(g, 0, t.top);
  for (let i = 0; i < 45; i++) {
    const x = (R() * 32) | 0, y = (R() * 16) | 0;
    if (inDiamond(x, y)) px(g, x, y, R() < 0.5 ? t.topDark : t.topLight);
  }
  for (let y = 0; y < 8; y++) {
    const [x0, w] = diamondSpan(y);
    px(g, x0, y, t.topLight); px(g, x0 + w - 1, y, t.topLight);
  }
  // лица с тухли
  for (let x = 0; x < 32; x++) {
    const left = x < 16;
    const yb = left ? 8 + (x >> 1) + 1 : 8 + ((31 - x) >> 1) + 1;
    for (let k = 0; k < H; k++) {
      const y = yb + k;
      if (y >= 16 + H) continue;
      let col = left ? t.faceL : t.faceR;
      if (k % 5 === 4) col = t.mortar;                       // хоризонтална фуга
      else if (((x + ((k / 5) | 0) * 4) % 8) === 0) col = t.mortar; // вертикална фуга (разместена)
      if (k >= H - 2) col = t.mortar;                        // контактна сянка при пода
      px(g, x, y, col);
    }
    // светъл ръб на върха на лицето
    px(g, x, yb, left ? t.topLight : t.topDark);
  }
  // разделител между двете лица
  for (let k = 0; k < H; k++) px(g, 16, 8 + 7 + 1 + k, t.mortar);
  return g.canvas;
}

// ---------- реквизит ----------
function genBrazier() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const g = mk(14, 18);
    // крака + купа
    rc(g, 3, 14, 2, 3, '#2b2521'); rc(g, 9, 14, 2, 3, '#2b2521');
    rc(g, 2, 11, 10, 3, '#4a3f35'); rc(g, 3, 10, 8, 1, '#5c4f42');
    rc(g, 3, 11, 8, 1, '#3a312a');
    // жар
    rc(g, 4, 9, 6, 1, '#ff5a1f');
    // пламък (3 кадъра)
    const fl = [
      [[6, 3, 2, 2], [5, 5, 4, 2], [4, 7, 6, 2]],
      [[7, 2, 2, 2], [5, 4, 4, 3], [4, 7, 6, 2]],
      [[5, 3, 2, 2], [6, 5, 3, 2], [4, 7, 6, 2]],
    ][f];
    rc(g, fl[2][0], fl[2][1], fl[2][2], fl[2][3], '#ff8a1f');
    rc(g, fl[1][0], fl[1][1], fl[1][2], fl[1][3], '#ffd23b');
    rc(g, fl[0][0], fl[0][1], fl[0][2], fl[0][3], '#fff2a0');
    px(g, 4 + ((f * 3) % 6), 8, '#fff2a0');
    outlineSprite(g, '#0a0c12');
    frames.push(g.canvas);
  }
  return frames;
}
function genBarrel() {
  const g = mk(12, 13);
  rc(g, 2, 1, 8, 11, '#6e4a2f');
  rc(g, 3, 0, 6, 1, '#7d5636');
  rc(g, 2, 3, 8, 1, '#3d2a1a'); rc(g, 2, 8, 8, 1, '#3d2a1a'); // обръчи
  rc(g, 4, 1, 1, 11, '#5c3d26'); rc(g, 7, 1, 1, 11, '#82603c');
  px(g, 5, 0, '#8f6a42');
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}
function genCrate() {
  const g = mk(12, 11);
  rc(g, 1, 1, 10, 9, '#7d5636');
  rc(g, 1, 1, 10, 1, '#8f6a42'); rc(g, 1, 9, 10, 1, '#5c3d26');
  rc(g, 1, 1, 1, 9, '#8f6a42'); rc(g, 10, 1, 1, 9, '#5c3d26');
  rc(g, 5, 1, 2, 9, '#6e4a2f'); rc(g, 1, 5, 10, 1, '#6e4a2f');
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}
function genChest(open) {
  const g = mk(16, 13);
  if (!open) {
    rc(g, 1, 4, 14, 8, '#6e4a2f');
    rc(g, 1, 2, 14, 3, '#7d5636');
    rc(g, 1, 6, 14, 1, '#3d2a1a');
    rc(g, 7, 5, 2, 4, '#e8c04a'); px(g, 7, 7, '#8f6a1f');
    rc(g, 1, 2, 1, 10, '#5c3d26'); rc(g, 14, 2, 1, 10, '#5c3d26');
  } else {
    rc(g, 1, 6, 14, 6, '#6e4a2f');
    rc(g, 1, 0, 14, 3, '#7d5636'); // отворен капак
    rc(g, 1, 3, 14, 1, '#5c3d26');
    rc(g, 2, 7, 12, 2, '#ffd23b'); rc(g, 4, 6, 3, 1, '#fff2a0'); // злато вътре
    rc(g, 1, 11, 14, 1, '#3d2a1a');
  }
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}
function genVaultDoor() {
  const g = mk(16, 20);
  rc(g, 2, 2, 12, 17, '#3a3040');       // каменна рамка
  rc(g, 3, 3, 10, 15, '#5c4a2a');       // бронзова врата
  rc(g, 3, 3, 10, 1, '#7d6636'); rc(g, 3, 17, 10, 1, '#2a2018');
  rc(g, 5, 4, 1, 13, '#e8c04a'); rc(g, 10, 4, 1, 13, '#e8c04a'); // вертикални златни ленти
  rc(g, 3, 9, 10, 1, '#e8c04a');        // хоризонтална лента
  rc(g, 7, 9, 2, 3, '#ffd23b'); px(g, 7, 8, '#8f6a1f'); px(g, 8, 8, '#8f6a1f'); px(g, 8, 10, '#5a4010'); // катинар
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}
function genArenaMarker() {
  const g = mk(14, 22);
  rc(g, 6, 3, 2, 18, '#5c3d26');        // прът
  rc(g, 2, 3, 9, 8, '#8a1c2a');         // червено знаме
  rc(g, 2, 3, 9, 1, '#c22836'); rc(g, 2, 10, 9, 1, '#5a0f18');
  rc(g, 5, 5, 3, 3, '#d8d3c0'); px(g, 5, 6, '#403c30'); px(g, 7, 6, '#403c30'); px(g, 6, 8, '#d8d3c0'); // череп
  px(g, 4, 9, '#8a97ad'); px(g, 8, 9, '#8a97ad'); // кръстосани остриета
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}
function genStairs(t) {
  const g = mk(32, 16);
  fillDiamond(g, 0, t.dark);
  // спускащи се стъпала към чернота
  for (let s = 0; s < 4; s++) {
    const shrink = s * 3;
    for (let y = 0; y < 16; y++) {
      const [x0, w] = diamondSpan(y);
      const nx0 = x0 + shrink, nw = w - shrink * 2;
      if (nw <= 0) continue;
      const col = s === 3 ? '#05070c' : ['#2a2f3e', '#20242f', '#14171f'][s];
      rc(g, nx0, y, nw, 1, col);
    }
  }
  // стъпаловидни ръбове
  for (let s = 1; s < 3; s++) {
    for (let y = 0; y < 8; y++) {
      const [x0, w] = diamondSpan(y);
      const nx0 = x0 + s * 3, nw = w - s * 6;
      if (nw > 0) { px(g, nx0, y, t.light); px(g, nx0 + nw - 1, y, t.light); }
    }
  }
  return g.canvas;
}
function genFountain(dry) {
  const frames = [];
  for (let f = 0; f < (dry ? 1 : 2); f++) {
    const g = mk(18, 15);
    rc(g, 1, 8, 16, 5, '#5a6272');
    rc(g, 2, 7, 14, 1, '#6d768a');
    rc(g, 1, 12, 16, 1, '#3a4150');
    rc(g, 3, 9, 12, 3, dry ? '#2a2f3a' : '#2456a8');
    if (!dry) {
      rc(g, 4, 9, 3, 1, f ? '#4f9cff' : '#7fc0ff');
      rc(g, 10, 10, 3, 1, f ? '#7fc0ff' : '#4f9cff');
      // колонка вода
      rc(g, 8, 2, 2, 7, '#4f9cff');
      px(g, 8, 1, '#a8d8ff'); px(g, 9, 3 + f, '#a8d8ff');
    } else {
      rc(g, 8, 4, 2, 5, '#3a4150');
    }
    outlineSprite(g, '#0a0c12');
    frames.push(g.canvas);
  }
  return frames;
}
function genBones() {
  const g = mk(12, 7);
  rc(g, 1, 4, 5, 1, '#c9c2ac'); px(g, 0, 3, '#c9c2ac'); px(g, 6, 5, '#a39d8a');
  rc(g, 8, 2, 3, 3, '#d8d3c0'); px(g, 9, 3, '#403c30'); px(g, 8, 5, '#a39d8a'); // черепче
  return g.canvas;
}
function genRubble(t) {
  const g = mk(12, 6);
  px(g, 2, 3, t.light); rc(g, 3, 2, 2, 2, t.accent); px(g, 6, 4, t.dark);
  rc(g, 8, 2, 2, 2, t.light); px(g, 9, 4, t.dark);
  return g.canvas;
}
function genBlood() {
  const out = [];
  for (let v = 0; v < 3; v++) {
    const g = mk(14, 8);
    for (let i = 0; i < 14; i++) {
      const x = rndi(1, 12), y = rndi(1, 6);
      if (inDiamond(x + 9, y + 4)) {} // без значение — свободни пръски
      px(g, x, y, pick(['#6e1420', '#8a1c2a', '#521018']));
    }
    rc(g, 4, 3, 4, 2, '#6e1420');
    out.push(g.canvas);
  }
  return out;
}
function genShadow() {
  const g = mk(14, 7);
  for (let y = 0; y < 7; y++) {
    const half = y < 4 ? (y + 1) * 1.8 : (7 - y) * 1.8;
    const x0 = Math.round(7 - half), w = Math.round(half * 2);
    rc(g, x0, y, w, 1, 'rgba(4,6,12,0.35)');
  }
  return g.canvas;
}

// ---------- хуманоиди ----------
const PAL_KNIGHT = {
  steel: '#94a1b8', steelL: '#c6d3e6', steelD: '#67738c',
  skin: '#e6b48d', eye: '#1a1d26', hair: '#4a3220',
  cape: '#8a2f3c', capeD: '#6e2430', belt: '#42331f', gold: '#e8c04a',
  boot: '#3a3040', pants: '#4a4258',
};
const PAL_BONE = { b: '#d8d3c0', bd: '#a39d8a', bdd: '#6e695a', eye: '#ff3b3b' };

function drawKnight(o) {
  // o: {dir:'down'|'up', frame:0..3, atk:0|1|2}
  // едра "чиби" пропорция: голям затворен шлем, гребен, пелерина, щит
  const g = mk(22, 26);
  const F = o.frame | 0, down = o.dir !== 'up';
  const bob = (F === 1 || F === 3) ? 1 : 0;
  const lOff = F === 1 ? -1 : (F === 3 ? 1 : 0);
  const ST = '#9aa7bd', SL = '#cdd9ea', SM = '#8a97ad', SD = '#5f6a84', SDD = '#454e63';
  const RD = '#c22836', RDD = '#8f1620', RDL = '#e04a52';
  const GOLD = '#e8c04a', DK = '#12151d', BELT = '#42331f';

  // --- крака (под всичко) ---
  const legY = 21;
  rc(g, 6, legY + lOff, 3, 4 - Math.max(0, lOff), SM);
  rc(g, 13, legY - lOff, 3, 4 - Math.max(0, -lOff), SM);
  px(g, 7, legY + 1 + lOff, SL); px(g, 14, legY + 1 - lOff, SL);        // колене
  rc(g, 5, legY + 3 + lOff, 4, 2 - Math.max(0, lOff), SD);              // ботуши
  rc(g, 13, legY + 3 - lOff, 4, 2 - Math.max(0, -lOff), SD);
  rc(g, 5, legY + 4 + lOff, 4, 1, SDD); rc(g, 13, legY + 4 - lOff, 4, 1, SDD);

  const ty = 14 + bob; // торс
  const hy = 2 + bob;  // шлем

  if (down) {
    // пелерина наднича отстрани зад тялото
    rc(g, 4, ty + 1, 2, 7, RDD); rc(g, 16, ty + 1, 2, 7, RDD);
    px(g, 4, ty + 8, RDD); px(g, 17, ty + 8, RDD);
    // кираса
    rc(g, 6, ty, 10, 6, ST);
    rc(g, 7, ty + 1, 3, 2, SL);                                          // отблясък
    rc(g, 11, ty, 1, 5, SD);                                             // централен ръб
    rc(g, 6, ty + 5, 10, 1, BELT); rc(g, 10, ty + 5, 2, 1, GOLD);        // колан + катарама
    // раменни плочи
    rc(g, 3, ty - 1, 4, 3, ST); px(g, 3, ty - 1, SL); px(g, 4, ty - 1, SL);
    rc(g, 15, ty - 1, 4, 3, ST); px(g, 18, ty, SD);
    // дясна ръка + екипираното оръжие
    const wt = o.weapon || 'sword';
    if (o.atk && o.noWeapon) {
      // РЪКАТА ЗАМАХВА (3 пози) — оръжието е отделен компонент, закачен за дланта
      if (o.atk === 1) {        // засилване: ръката вдигната нагоре
        rc(g, 17, ty - 4, 2, 4, ST); px(g, 17, ty - 4, SL); px(g, 18, ty - 1, SD);
      } else if (o.atk === 2) { // среда: ръката изпъната встрани
        rc(g, 17, ty - 1, 4, 2, ST); px(g, 17, ty - 1, SL); px(g, 20, ty, SD);
      } else {                  // завършек: ръката надолу-напред
        rc(g, 16, ty + 2, 2, 4, ST); px(g, 16, ty + 2, SL); px(g, 17, ty + 5, SD);
      }
    }
    else if (o.atk) {
      rc(g, 17, ty - 3, 2, 3, ST);                                       // вдигната ръка
      if (wt === 'axe') {
        rc(g, 18, ty - 8, 1, 5, '#7d5636');                              // дръжка
        rc(g, 16, ty - 11, 4, 3, ST); rc(g, 16, ty - 11, 2, 1, SL);      // широко острие
        px(g, 15, ty - 10, SL); rc(g, 16, ty - 9, 4, 1, SD);
      } else if (wt === 'dagger') {
        rc(g, 18, ty - 6, 2, 3, SL); rc(g, 18, ty - 7, 1, 1, '#ffffff');
        rc(g, 17, ty - 3, 3, 1, GOLD);
      } else if (wt === 'greatsword') {
        rc(g, 18, ty - 12, 3, 9, SL); rc(g, 19, ty - 13, 1, 1, '#ffffff');
        rc(g, 19, ty - 11, 1, 8, SM);
        rc(g, 16, ty - 4, 6, 1, GOLD);                                    // широк гард
      } else if (wt === 'spear') {
        rc(g, 18, ty - 12, 1, 10, '#7d5636');
        px(g, 18, ty - 13, SL); px(g, 18, ty - 14, '#ffffff');
        px(g, 18, ty - 3, GOLD);
      } else if (wt === 'chains') {
        px(g, 17, ty - 2, '#8a97ad'); px(g, 18, ty - 4, '#67738c');       // верига в дъга
        px(g, 20, ty - 6, '#8a97ad'); px(g, 21, ty - 7, '#67738c');
        rc(g, 20, ty - 10, 2, 3, SL); px(g, 21, ty - 11, '#ffffff');      // острие в края
      } else {
        rc(g, 18, ty - 9, 2, 6, SL); rc(g, 18, ty - 10, 1, 1, '#ffffff');
        rc(g, 16, ty - 4, 4, 1, GOLD);
      }
    } else {
      rc(g, 17, ty + 2, 2, 3, SM); px(g, 17, ty + 4, SD);                // ръка
      if (o.noWeapon) { /* оръжието виси отделно, закачено за дланта */ }
      else if (wt === 'axe') {
        rc(g, 19, ty - 4, 1, 8, '#7d5636'); px(g, 19, ty + 3, '#5c4a36');
        rc(g, 17, ty - 5, 2, 4, ST); px(g, 17, ty - 5, SL);              // острие наляво
        px(g, 18, ty - 6, SM); px(g, 17, ty - 2, SD);
      } else if (wt === 'dagger') {
        rc(g, 19, ty - 1, 1, 4, SL); px(g, 19, ty - 2, '#ffffff');
        rc(g, 18, ty + 2, 3, 1, GOLD);
      } else if (wt === 'greatsword') {
        rc(g, 19, ty - 7, 2, 11, SL); rc(g, 20, ty - 6, 1, 10, SM);       // масивно острие
        px(g, 19, ty - 8, SL);
        rc(g, 18, ty + 3, 4, 1, GOLD);
      } else if (wt === 'spear') {
        rc(g, 19, ty - 8, 1, 14, '#7d5636');                              // дълга дръжка
        px(g, 19, ty - 9, SL); px(g, 19, ty - 10, '#ffffff');
        px(g, 19, ty - 2, GOLD);                                          // обков
      } else if (wt === 'chains') {
        px(g, 17, ty + 1, '#8a97ad'); px(g, 18, ty + 2, '#67738c');       // висяща верига
        px(g, 17, ty + 3, '#8a97ad'); px(g, 18, ty + 4, '#67738c');
        rc(g, 17, ty + 5, 2, 3, SL); px(g, 18, ty + 8, '#ffffff');        // острие долу
      } else {
        rc(g, 19, ty - 4, 1, 7, SL); px(g, 19, ty - 5, SL);
        rc(g, 18, ty + 3, 3, 1, GOLD);
      }
    }
    // щит (пред тялото, лява страна) — ясен heater-силует със собствен контур
    const shx = 1, shy = ty - 1;
    const rows = [[0, 7], [0, 7], [0, 7], [0, 7], [0, 7], [1, 6], [1, 6], [2, 5], [3, 4]];
    rows.forEach((sp, yy) => rc(g, shx + sp[0], shy + yy, sp[1] - sp[0] + 1, 1, SM));
    rc(g, shx, shy, 8, 1, GOLD);                                          // златен кант горе
    rows.forEach((sp, yy) => {                                            // тъмен контур
      px(g, shx + sp[0], shy + yy, SDD); px(g, shx + sp[1], shy + yy, SDD);
    });
    rc(g, shx + 1, shy + 1, 1, 4, SL);                                    // блик отляво
    px(g, shx + 4, shy + 3, RD); px(g, shx + 5, shy + 3, RD);             // червен ромб
    px(g, shx + 3, shy + 4, RD); rc(g, shx + 4, shy + 4, 2, 1, RDL); px(g, shx + 6, shy + 4, RD);
    px(g, shx + 4, shy + 5, RD); px(g, shx + 5, shy + 5, RD);
  } else {
    // гръб: пелерина покрива тялото
    rc(g, 4, ty - 1, 14, 8, RD);
    rc(g, 4, ty - 1, 14, 1, RDL);
    rc(g, 7, ty + 1, 1, 6, RDD); rc(g, 12, ty + 2, 1, 5, RDD);            // гънки
    for (let xx = 4; xx < 18; xx += 2) rc(g, xx, ty + 7, 1, 1 + (xx % 4 === 0 ? 1 : 0), RDD); // накъсан край
    rc(g, 10, ty - 1, 2, 1, GOLD);                                        // закопчалка
    // раменни плочи над пелерината
    rc(g, 3, ty - 1, 4, 2, ST); px(g, 3, ty - 1, SL);
    rc(g, 15, ty - 1, 4, 2, ST); px(g, 18, ty - 1, SD);
    // щит на гърба (дясно, огледално на предния)
    const shx = 13, shy = ty;
    const rows2 = [[0, 6], [0, 6], [0, 6], [0, 6], [1, 5], [1, 5], [2, 4], [3, 3]];
    rows2.forEach((sp, yy) => rc(g, shx + sp[0], shy + yy, sp[1] - sp[0] + 1, 1, SM));
    rc(g, shx, shy, 7, 1, GOLD);
    rows2.forEach((sp, yy) => {
      px(g, shx + sp[0], shy + yy, SDD); px(g, shx + sp[1], shy + yy, SDD);
    });
    rc(g, shx + 1, shy + 1, 1, 3, SL);
    if (o.atk && o.noWeapon) {
      // ръката замахва (3 пози) и от гръб — над пелерината
      if (o.atk === 1) { rc(g, 17, ty - 3, 2, 4, ST); px(g, 17, ty - 3, SL); px(g, 18, ty, SD); }
      else if (o.atk === 2) { rc(g, 17, ty, 4, 2, ST); px(g, 17, ty, SL); px(g, 20, ty + 1, SD); }
      else { rc(g, 16, ty + 3, 2, 4, ST); px(g, 16, ty + 3, SL); px(g, 17, ty + 6, SD); }
    }
    else if (o.atk) {
      const wt2 = o.weapon || 'sword';
      if (wt2 === 'axe') {
        rc(g, 18, ty - 8, 1, 5, '#7d5636');
        rc(g, 16, ty - 11, 4, 3, ST); rc(g, 16, ty - 11, 2, 1, SL);
      } else if (wt2 === 'dagger') {
        rc(g, 18, ty - 6, 2, 3, SL); rc(g, 18, ty - 7, 1, 1, '#ffffff');
      } else if (wt2 === 'greatsword') {
        rc(g, 18, ty - 12, 3, 9, SL); rc(g, 19, ty - 13, 1, 1, '#ffffff'); rc(g, 16, ty - 4, 6, 1, GOLD);
      } else if (wt2 === 'spear') {
        rc(g, 18, ty - 12, 1, 10, '#7d5636'); px(g, 18, ty - 13, SL); px(g, 18, ty - 14, '#ffffff');
      } else if (wt2 === 'chains') {
        px(g, 17, ty - 2, '#8a97ad'); px(g, 19, ty - 4, '#67738c'); px(g, 21, ty - 6, '#8a97ad');
        rc(g, 20, ty - 10, 2, 3, SL); px(g, 21, ty - 11, '#ffffff');
      } else {
        rc(g, 18, ty - 9, 2, 6, SL); rc(g, 18, ty - 10, 1, 1, '#ffffff'); rc(g, 17, ty - 4, 3, 1, GOLD);
      }
    }
  }

  // --- шлем (голям, затворен, заоблен купол) ---
  rc(g, 9, hy, 4, 1, ST);                                                 // връх на купола
  rc(g, 7, hy + 1, 8, 1, ST);
  rc(g, 6, hy + 2, 10, 9, ST);                                            // основно тяло
  rc(g, 7, hy + 11, 8, 1, ST);                                            // заоблена брадичка
  rc(g, 8, hy + 12, 6, 1, SDD);                                           // ръб при врата
  rc(g, 9, hy, 2, 1, SL); rc(g, 7, hy + 1, 3, 1, SL);                     // блик горе-ляво
  rc(g, 6, hy + 2, 2, 5, SL);
  rc(g, 15, hy + 3, 1, 8, SD); rc(g, 13, hy + 11, 2, 1, SD);              // сянка дясно-долу
  if (down) {
    rc(g, 6, hy + 5, 10, 2, DK);                                          // широк прорез за очите
    px(g, 6, hy + 5, SD); px(g, 15, hy + 6, SDD);
    px(g, 8, hy + 9, DK); px(g, 10, hy + 9, DK); px(g, 12, hy + 9, DK);   // отдушници
    px(g, 8, hy + 10, DK); px(g, 10, hy + 10, DK); px(g, 12, hy + 10, DK);
    rc(g, 6, hy + 7, 10, 1, SD);                                          // ръб под визьора
  } else {
    rc(g, 10, hy + 3, 1, 8, SD);                                          // шев на тила
    px(g, 10, hy + 12, SD);
  }
  // гребен — висок и развят назад
  rc(g, 10, hy - 3, 2, 4, RD);
  px(g, 10, hy - 3, RDL); px(g, 9, hy - 2, RDL);
  px(g, 12, hy - 2, RD); px(g, 13, hy - 1, RDD); px(g, 12, hy - 1, RDD);  // опашка
  px(g, 14, hy, RDD);

  outlineSprite(g, '#10131c');
  return g.canvas;
}

// отделен спрайт на оръжието (сочи НАГОРЕ, дръжката долу) — за анимацията на ЗАМАХА
function genHeldWeapon(wt) {
  const g = mk(9, 18);
  const SL = '#cdd9ea', SM = '#8a97ad', ST = '#9aa7bd', SD = '#5f6a84', GOLD = '#e8c04a', WOOD = '#7d5636';
  if (wt === 'axe') {
    // ЧУК с две глави — както изглежда иконата в инвентара
    rc(g, 4, 3, 1, 14, WOOD);                                             // дръжка
    rc(g, 1, 2, 3, 5, ST); px(g, 0, 3, SL); rc(g, 1, 2, 2, 1, SL);        // лява глава
    rc(g, 5, 2, 3, 5, ST); px(g, 8, 3, SD); rc(g, 5, 6, 3, 1, SD);        // дясна глава
  } else if (wt === 'dagger') {
    rc(g, 3, 8, 2, 5, SL); px(g, 3, 7, '#ffffff');
    rc(g, 2, 13, 5, 1, GOLD);
    rc(g, 4, 14, 1, 3, WOOD);
  } else if (wt === 'greatsword') {
    rc(g, 3, 1, 3, 11, SL); px(g, 4, 0, '#ffffff'); rc(g, 5, 2, 1, 10, SM);
    rc(g, 1, 12, 7, 1, GOLD);                                             // широк гард
    rc(g, 4, 13, 1, 4, WOOD);
  } else if (wt === 'spear') {
    rc(g, 4, 4, 1, 13, WOOD);
    px(g, 4, 3, SL); px(g, 4, 2, SL); px(g, 4, 1, '#ffffff');             // връх
    px(g, 4, 12, GOLD);                                                   // обков
  } else if (wt === 'chains') {
    rc(g, 3, 1, 2, 4, SL); px(g, 4, 0, '#ffffff');                        // острие в края
    px(g, 4, 6, SM); px(g, 3, 8, SD); px(g, 4, 10, SM);                   // брънки
    px(g, 3, 12, SD); px(g, 4, 14, SM); px(g, 4, 16, SD);
  } else { // меч
    rc(g, 3, 3, 2, 9, SL); px(g, 3, 2, '#ffffff'); rc(g, 4, 4, 1, 8, SM);
    rc(g, 2, 12, 5, 1, GOLD);                                             // гард
    rc(g, 4, 13, 1, 4, WOOD);
  }
  outlineSprite(g, '#10131c');
  return g.canvas;
}

function drawSkeleton(o) {
  const g = mk(16, 20);
  const P = o.pal || PAL_BONE;
  const F = o.frame | 0;
  const bob = (F === 1 || F === 3) ? 1 : 0;
  const lOff = F === 1 ? -1 : (F === 3 ? 1 : 0);
  rc(g, 5, 14 + lOff, 2, 4, P.bd);
  rc(g, 9, 14 - lOff, 2, 4, P.bd);
  rc(g, 4, 17 + lOff, 3, 1, P.bdd); rc(g, 9, 17 - lOff, 3, 1, P.bdd);
  const ty = 8 + bob;
  rc(g, 4, ty, 8, 6, P.b);
  for (let r = 0; r < 3; r++) rc(g, 5, ty + 1 + r * 2, 6, 1, P.bdd); // ребра
  rc(g, 3, ty, 1, 4, P.bd); // лява ръка
  if (o.hood) { rc(g, 4, ty, 8, 2, o.hood); }
  if (o.bow) { // лък
    rc(g, 13, ty - 2, 1, 8, '#7d5636');
    px(g, 12, ty - 2, '#7d5636'); px(g, 12, ty + 5, '#7d5636');
    for (let k = 0; k < 6; k++) px(g, 14, ty - 1 + k, '#c9c2ac');
    rc(g, 12, ty + 1, 1, 2, P.bd);
  } else {
    rc(g, 12, ty, 1, 4, P.bd);
    if (o.atk) { rc(g, 13, ty - 4, 1, 5, '#c9d1d9'); px(g, 13, ty - 5, '#ffffff'); }
    else { rc(g, 13, ty - 2, 1, 5, '#8a93a3'); }  // ръждив меч
  }
  const hy = 1 + bob;
  rc(g, 5, hy, 6, 6, P.b);
  rc(g, 5, hy + 5, 6, 1, P.bd);
  px(g, 6, hy + 2, P.eye); px(g, 9, hy + 2, P.eye);
  rc(g, 7, hy + 4, 2, 1, P.bdd); // зъби
  if (o.hood) { rc(g, 5, hy - 1, 6, 3, o.hood); rc(g, 4, hy, 1, 4, o.hood); rc(g, 11, hy, 1, 4, o.hood); }
  if (o.crown) { rc(g, 5, hy - 2, 6, 2, '#e8c04a'); px(g, 5, hy - 3, '#e8c04a'); px(g, 8, hy - 3, '#e8c04a'); px(g, 10, hy - 3, '#e8c04a'); }
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}

function drawSlime(o) {
  const g = mk(16, 12);
  const c = o.col || ['#46c86e', '#2a8f4a', '#a8f0c0'];
  const sq = o.frame === 1; // свиване
  const y0 = sq ? 4 : 2, h = sq ? 8 : 10, w = sq ? 14 : 12, x0 = sq ? 1 : 2;
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const ww = Math.round(w * (0.5 + 0.6 * Math.sin(Math.PI * (0.15 + 0.85 * t))));
    const xs = Math.round(x0 + (w - ww) / 2);
    rc(g, xs, y0 + y, ww, 1, y < 2 ? c[2] : (y > h - 3 ? c[1] : c[0]));
  }
  px(g, 5, y0 + 3, '#0e1418'); px(g, 9, y0 + 3, '#0e1418'); // очи
  px(g, 4, y0 + 1, '#ffffff'); px(g, 5, y0 + 1, '#ffffff'); // отблясък
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}

function drawBat(o) {
  const g = mk(16, 10);
  const up = o.frame === 0;
  rc(g, 6, 3, 4, 4, '#7a5fa0');
  px(g, 6, 4, '#ffd23b'); px(g, 9, 4, '#ffd23b'); // очи
  px(g, 6, 2, '#5c4680'); px(g, 9, 2, '#5c4680'); // уши
  if (up) { rc(g, 1, 1, 5, 2, '#5c4680'); rc(g, 10, 1, 5, 2, '#5c4680'); rc(g, 2, 3, 4, 1, '#4a3868'); rc(g, 10, 3, 4, 1, '#4a3868'); }
  else { rc(g, 1, 5, 5, 2, '#5c4680'); rc(g, 10, 5, 5, 2, '#5c4680'); rc(g, 2, 4, 4, 1, '#4a3868'); rc(g, 10, 4, 4, 1, '#4a3868'); }
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}

function drawShaman(o) {
  const g = mk(16, 20);
  const F = o.frame | 0, sway = (F === 1 || F === 3) ? 1 : 0;
  rc(g, 4, 8, 8, 11, '#5c2a6e');                    // роба до пода
  rc(g, 4, 8, 8, 2, '#7a3a8f');
  rc(g, 5, 18, 6, 1, '#3d1c4a');
  rc(g, 4 + sway, 12, 1, 4, '#3d1c4a'); rc(g, 11 - sway, 12, 1, 4, '#3d1c4a'); // гънки
  // жезъл с кристал
  rc(g, 13, 4, 1, 13, '#6e4a2f');
  rc(g, 12, 2, 3, 3, '#c84fff'); px(g, 13, 2, '#f0b0ff');
  // глава с качулка
  rc(g, 5, 2, 6, 6, '#7a3a8f');
  rc(g, 6, 4, 4, 3, '#1a1022');
  px(g, 6, 5, '#c84fff'); px(g, 9, 5, '#c84fff');   // светещи очи
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}

function drawBrute(o) {
  const g = mk(22, 24);
  const F = o.frame | 0;
  const bob = (F === 1 || F === 3) ? 1 : 0;
  const lOff = F === 1 ? -1 : (F === 3 ? 1 : 0);
  const skin = o.col || ['#7a8a4a', '#5c6a36', '#98a86a'];
  rc(g, 6, 18 + lOff, 3, 5, skin[1]);
  rc(g, 13, 18 - lOff, 3, 5, skin[1]);
  rc(g, 5, 22 + lOff, 4, 1, '#3a3040'); rc(g, 13, 22 - lOff, 4, 1, '#3a3040');
  const ty = 8 + bob;
  rc(g, 4, ty, 14, 10, skin[0]);                    // масивен торс
  rc(g, 5, ty + 1, 5, 3, skin[2]);
  rc(g, 4, ty + 8, 14, 2, '#42331f');               // колан
  rc(g, 2, ty, 3, 7, skin[0]); rc(g, 17, ty, 3, 7, skin[0]); // ръце
  rc(g, 2, ty + 6, 3, 2, skin[1]); rc(g, 17, ty + 6, 3, 2, skin[1]); // юмруци
  if (o.atk) { rc(g, 17, ty - 6, 4, 7, skin[0]); rc(g, 17, ty - 7, 4, 2, skin[1]); } // вдигната ръка
  const hy = 2 + bob;
  rc(g, 7, hy, 8, 7, skin[0]);
  rc(g, 7, hy, 8, 1, skin[2]);
  px(g, 9, hy + 2, '#ff3b3b'); px(g, 12, hy + 2, '#ff3b3b');
  rc(g, 8, hy + 5, 6, 1, skin[1]);
  px(g, 8, hy + 4, '#e8e4d0'); px(g, 13, hy + 4, '#e8e4d0'); // бивни
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}

function drawWraith(o) {
  const g = mk(16, 20);
  const F = o.frame | 0;
  rc(g, 4, 2, 8, 10, '#2c3244');
  rc(g, 4, 2, 8, 2, '#3c4458');
  rc(g, 5, 4, 6, 4, '#0c0e18');
  px(g, 6, 5, '#57e6c8'); px(g, 9, 5, '#57e6c8');    // очи
  // разкъсан долен край (вее се)
  for (let x = 4; x < 12; x++) {
    const len = 3 + ((x * 7 + F * 3) % 4);
    rc(g, x, 12, 1, len, '#2c3244');
    px(g, x, 12 + len, '#1c2130');
  }
  rc(g, 2, 6, 2, 5, '#2c3244'); rc(g, 12, 6, 2, 5, '#2c3244'); // ръкави
  outlineSprite(g, '#0e2a26');
  return g.canvas;
}

function drawBoss(o) {
  const g = mk(26, 30);
  const P = PAL_BONE;
  const F = o.frame | 0;
  const bob = (F === 1 || F === 3) ? 1 : 0;
  const lOff = F === 1 ? -1 : (F === 3 ? 1 : 0);
  rc(g, 8, 22 + lOff, 3, 6, P.bd); rc(g, 15, 22 - lOff, 3, 6, P.bd);
  rc(g, 7, 27 + lOff, 4, 1, P.bdd); rc(g, 15, 27 - lOff, 4, 1, P.bdd);
  const ty = 12 + bob;
  rc(g, 6, ty, 14, 9, P.b);
  for (let r = 0; r < 4; r++) rc(g, 7, ty + 1 + r * 2, 12, 1, P.bdd);
  rc(g, 6, ty, 14, 1, '#8a2f3c');                   // кралска мантия по раменете
  rc(g, 4, ty, 2, 6, P.bd); rc(g, 20, ty, 2, 6, P.bd);
  if (o.atk) { rc(g, 20, ty - 9, 3, 10, '#c9d1d9'); rc(g, 20, ty - 10, 3, 1, '#ffffff'); px(g, 21, ty + 1, '#e8c04a'); }
  else { rc(g, 22, ty - 5, 2, 12, '#8a93a3'); rc(g, 22, ty - 6, 2, 1, '#c9d1d9'); }  // огромен меч
  const hy = 3 + bob;
  rc(g, 9, hy, 8, 8, P.b);
  rc(g, 9, hy + 7, 8, 1, P.bd);
  rc(g, 10, hy + 3, 2, 2, '#ff3b3b'); rc(g, 14, hy + 3, 2, 2, '#ff3b3b');
  rc(g, 11, hy + 6, 4, 1, P.bdd);
  rc(g, 9, hy - 2, 8, 2, '#e8c04a');                 // корона
  px(g, 9, hy - 3, '#e8c04a'); px(g, 12, hy - 4, '#ffd23b'); px(g, 16, hy - 3, '#e8c04a');
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}

function drawGolem(o) {
  // КЪРВАВ ГОЛЕМ: каменно чудовище с кървав кристал
  const g = mk(30, 34);
  const F = o.frame | 0;
  const bob = (F === 1 || F === 3) ? 1 : 0;
  const lOff = F === 1 ? -1 : (F === 3 ? 1 : 0);
  const ST = '#5a4a46', SL = '#7a665e', SD = '#443733', BL = '#c22836', BLL = '#ff4757';
  // крака-пънове
  rc(g, 8, 27 + lOff, 5, 6, ST); rc(g, 17, 27 - lOff, 5, 6, ST);
  rc(g, 8, 31 + lOff, 5, 2, SD); rc(g, 17, 31 - lOff, 5, 2, SD);
  const ty = 11 + bob;
  // масивно тяло
  rc(g, 6, ty, 18, 16, ST);
  rc(g, 7, ty + 1, 6, 4, SL);
  rc(g, 21, ty + 2, 3, 13, SD);
  // кървави пукнатини
  px(g, 9, ty + 7, BL); px(g, 10, ty + 8, BL); px(g, 10, ty + 9, BL); px(g, 11, ty + 10, BL);
  px(g, 18, ty + 4, BL); px(g, 19, ty + 5, BL); px(g, 18, ty + 6, BL);
  // кристално сърце
  rc(g, 13, ty + 5, 4, 5, BL); rc(g, 14, ty + 6, 2, 3, BLL); px(g, 14, ty + 6, '#ff9aa4');
  // ръце — грамади
  if (o.atk) {
    rc(g, 1, ty - 8, 5, 10, ST); rc(g, 24, ty - 8, 5, 10, ST);   // вдигнати
    rc(g, 1, ty - 8, 5, 2, SL); rc(g, 24, ty - 8, 5, 2, SL);
    rc(g, 0, ty - 9, 7, 3, SL); rc(g, 23, ty - 9, 7, 3, SL);     // юмруци горе
  } else {
    rc(g, 2, ty + 1, 4, 12, ST); rc(g, 24, ty + 1, 4, 12, ST);
    rc(g, 1, ty + 11, 6, 5, SL); rc(g, 23, ty + 11, 6, 5, SL);   // юмруци
    rc(g, 1, ty + 14, 6, 2, SD); rc(g, 23, ty + 14, 6, 2, SD);
  }
  // малка глава
  const hy = 4 + bob;
  rc(g, 11, hy, 8, 7, ST);
  rc(g, 11, hy, 8, 1, SL);
  rc(g, 12, hy + 3, 2, 2, BLL); rc(g, 16, hy + 3, 2, 2, BLL);    // очи
  rc(g, 13, hy + 6, 4, 1, SD);
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}
function drawLich(o) {
  // АРХИЛИЧ: рогат череп, тъмна роба, жезъл с кълбо
  const g = mk(24, 32);
  const F = o.frame | 0;
  const sway = (F === 1 || F === 3) ? 1 : 0;
  const RB = '#2a2438', RBL = '#3c3450', RBD = '#1c1828', TRIM = '#6a4f9e';
  // роба
  rc(g, 6, 10, 12, 16, RB);
  rc(g, 6, 10, 12, 2, RBL);
  rc(g, 8 + sway, 14, 1, 8, RBD); rc(g, 14 - sway, 15, 1, 8, RBD); // гънки
  rc(g, 6, 12, 1, 12, TRIM); rc(g, 17, 12, 1, 12, TRIM);           // кант
  for (let x = 6; x < 18; x++) {                                    // раздран край
    const len = 2 + ((x * 5 + F * 2) % 4);
    rc(g, x, 25, 1, len, RB);
    px(g, x, 25 + len, RBD);
  }
  // ръкави
  rc(g, 3, 12, 3, 6, RB); rc(g, 18, 12, 3, 6, RB);
  rc(g, 3, 17, 2, 2, '#d8d3c0'); // костелива ръка
  // жезъл с кълбо
  const staffTop = o.atk ? 2 : 6;
  rc(g, 20, staffTop + 4, 1, 22 - staffTop, '#4a3c2d');
  rc(g, 19, staffTop, 3, 3, '#c84fff'); px(g, 20, staffTop, '#f0b0ff');
  px(g, 19 + (F % 2), staffTop + 3, '#c84fff');
  // череп с рога
  const hy = 1;
  rc(g, 8, hy + 2, 8, 7, '#d8d3c0');
  rc(g, 8, hy + 8, 8, 1, '#a39d8a');
  rc(g, 9, hy + 4, 2, 2, '#c84fff'); rc(g, 13, hy + 4, 2, 2, '#c84fff'); // светещи очи
  rc(g, 10, hy + 7, 4, 1, '#6e695a');
  // рога
  px(g, 7, hy + 2, '#a39d8a'); px(g, 6, hy + 1, '#a39d8a'); px(g, 5, hy, '#8a8577');
  px(g, 16, hy + 2, '#a39d8a'); px(g, 17, hy + 1, '#a39d8a'); px(g, 18, hy, '#8a8577');
  // качулка зад черепа
  rc(g, 7, hy + 1, 1, 8, RB); rc(g, 16, hy + 1, 1, 8, RB);
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}

function drawTotem(f) {
  // тотем на Архилича: издълбан стълб със светещо око
  const g = mk(14, 22);
  rc(g, 4, 2, 6, 18, '#4a3c2d');
  rc(g, 4, 2, 2, 18, '#5c4a36');
  rc(g, 3, 0, 8, 3, '#33291f');
  rc(g, 3, 19, 8, 2, '#33291f');
  rc(g, 5, 6, 4, 3, '#1a1022');
  rc(g, 6, 7, 2, 1, f ? '#c84fff' : '#f0b0ff');   // око
  rc(g, 5, 12, 4, 1, '#33291f'); rc(g, 5, 15, 4, 1, '#33291f'); // резки
  px(g, 4, 10, '#6a4f9e'); px(g, 9, 13, '#6a4f9e');
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}
function drawArch(o) {
  // ВЛАДЕТЕЛЯТ НА БЕЗДНАТА: мрачен рицар със синьо сияние
  const g = mk(30, 36);
  const F = o.frame | 0;
  const bob = (F === 1 || F === 3) ? 1 : 0;
  const lOff = F === 1 ? -1 : (F === 3 ? 1 : 0);
  const AR = '#2c3244', ARL = '#454e63', ARD = '#1c212f', GL = '#5c78e8', GLL = '#8ab0ff';
  // крака
  rc(g, 9, 28 + lOff, 4, 6, AR); rc(g, 17, 28 - lOff, 4, 6, AR);
  rc(g, 8, 32 + lOff, 5, 2, ARD); rc(g, 17, 32 - lOff, 5, 2, ARD);
  const ty = 13 + bob;
  // масивна броня
  rc(g, 7, ty, 16, 14, AR);
  rc(g, 8, ty + 1, 5, 4, ARL);
  rc(g, 21, ty + 2, 2, 11, ARD);
  rc(g, 14, ty, 2, 12, ARD);                       // централен ръб
  px(g, 15, ty + 3, GL); px(g, 15, ty + 6, GL);     // светещи пукнатини
  px(g, 10, ty + 8, GL); px(g, 19, ty + 5, GL);
  rc(g, 7, ty + 12, 16, 2, ARD);
  // раменни чудовища
  rc(g, 3, ty - 2, 6, 5, ARL); rc(g, 21, ty - 2, 6, 5, ARL);
  px(g, 3, ty - 3, ARL); px(g, 26, ty - 3, ARL);
  // ръце
  if (o.atk) {
    rc(g, 24, ty - 9, 3, 10, AR);
    rc(g, 23, ty - 12, 5, 4, ARL);                  // вдигнат юмрук
    px(g, 25, ty - 11, GLL);
  } else {
    rc(g, 3, ty + 3, 3, 9, AR); rc(g, 24, ty + 3, 3, 9, AR);
    rc(g, 3, ty + 11, 4, 3, ARD); rc(g, 23, ty + 11, 4, 3, ARD);
  }
  // рогат шлем
  const hy = 3 + bob;
  rc(g, 10, hy, 10, 10, AR);
  rc(g, 10, hy, 10, 1, ARL);
  rc(g, 11, hy + 4, 8, 2, ARD);
  rc(g, 12, hy + 4, 6, 1, GL);                      // светещ визьор
  px(g, 13, hy + 4, GLL); px(g, 16, hy + 4, GLL);
  // рога
  px(g, 8, hy - 1, ARL); px(g, 7, hy - 2, ARL); px(g, 6, hy - 4, ARD); px(g, 6, hy - 3, ARL);
  px(g, 21, hy - 1, ARL); px(g, 22, hy - 2, ARL); px(g, 23, hy - 4, ARD); px(g, 23, hy - 3, ARL);
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}

// ---------- предмети (икони 12x12) ----------
function genItemIcon(kind, rarity) {
  const g = mk(12, 12);
  const rim = ['#c9d1d9', '#4f9cff', '#ffd400', '#b34fff', '#ff7a1f'][rarity || 0];
  switch (kind) {
    case 'sword':
      for (let i = 0; i < 7; i++) px(g, 3 + i, 9 - i, '#c6d3e6');
      for (let i = 0; i < 6; i++) px(g, 4 + i, 9 - i, '#94a1b8');
      px(g, 10, 2, '#ffffff');
      rc(g, 2, 8, 3, 1, '#e8c04a'); rc(g, 3, 9, 1, 2, '#7d5636'); px(g, 2, 10, '#e8c04a');
      break;
    case 'axe':
      rc(g, 6, 2, 1, 9, '#7d5636');
      rc(g, 3, 1, 3, 5, '#94a1b8'); rc(g, 2, 2, 1, 3, '#c6d3e6');
      rc(g, 7, 1, 3, 5, '#94a1b8'); rc(g, 10, 2, 1, 3, '#67738c');
      break;
    case 'dagger':
      for (let i = 0; i < 5; i++) px(g, 4 + i, 8 - i, '#c6d3e6');
      px(g, 9, 3, '#ffffff');
      rc(g, 3, 7, 3, 1, '#e8c04a'); px(g, 3, 9, '#7d5636'); px(g, 4, 8, '#7d5636');
      break;
    case 'greatsword':
      // широко дълго острие по диагонала
      for (let i = 0; i < 8; i++) { px(g, 2 + i, 10 - i, '#c6d3e6'); px(g, 3 + i, 10 - i, '#94a1b8'); }
      px(g, 10, 2, '#ffffff'); px(g, 11, 1, '#ffffff');
      rc(g, 1, 8, 4, 1, '#e8c04a'); rc(g, 2, 9, 1, 3, '#7d5636'); px(g, 1, 11, '#e8c04a');
      break;
    case 'spear':
      for (let i = 0; i < 8; i++) px(g, 2 + i, 10 - i, '#7d5636');
      px(g, 10, 2, '#c6d3e6'); px(g, 11, 1, '#ffffff'); px(g, 9, 2, '#94a1b8'); px(g, 10, 1, '#c6d3e6');
      px(g, 4, 9, '#e8c04a');
      break;
    case 'chains':
      // две малки остриета, свързани с верига
      px(g, 2, 3, '#8a97ad'); px(g, 4, 4, '#67738c'); px(g, 6, 5, '#8a97ad'); px(g, 8, 6, '#67738c');
      rc(g, 1, 1, 2, 3, '#c6d3e6'); px(g, 1, 0, '#ffffff');
      rc(g, 9, 7, 2, 3, '#c6d3e6'); px(g, 10, 10, '#ffffff');
      px(g, 3, 2, '#e8c04a'); px(g, 8, 8, '#e8c04a');
      break;
    case 'armor':
      rc(g, 3, 2, 6, 7, '#94a1b8');
      rc(g, 2, 2, 1, 3, '#67738c'); rc(g, 9, 2, 1, 3, '#67738c');
      rc(g, 4, 3, 2, 2, '#c6d3e6');
      rc(g, 4, 9, 1, 2, '#67738c'); rc(g, 7, 9, 1, 2, '#67738c');
      break;
    case 'ring':
      rc(g, 3, 4, 6, 6, '#e8c04a');
      rc(g, 4, 5, 4, 4, '#00000000'); g.clearRect(4, 5, 4, 4);
      rc(g, 5, 2, 2, 2, rim); px(g, 5, 2, '#ffffff');
      break;
    case 'amulet':
      px(g, 3, 1, '#e8c04a'); px(g, 2, 2, '#e8c04a'); px(g, 8, 1, '#e8c04a'); px(g, 9, 2, '#e8c04a');
      px(g, 4, 1, '#e8c04a'); px(g, 7, 1, '#e8c04a');
      rc(g, 4, 5, 4, 5, rim); rc(g, 5, 6, 2, 2, '#ffffff');
      px(g, 5, 3, '#e8c04a'); px(g, 6, 4, '#e8c04a');
      break;
    case 'potion_hp':
      rc(g, 4, 4, 4, 7, '#ff4757'); rc(g, 4, 6, 1, 3, '#ff8a94');
      rc(g, 3, 5, 1, 5, '#ff4757'); rc(g, 8, 5, 1, 5, '#c22836');
      rc(g, 5, 2, 2, 2, '#c9d1d9'); rc(g, 5, 1, 2, 1, '#7d5636');
      break;
    case 'potion_mp':
      rc(g, 4, 4, 4, 7, '#3b82f6'); rc(g, 4, 6, 1, 3, '#7fb0ff');
      rc(g, 3, 5, 1, 5, '#3b82f6'); rc(g, 8, 5, 1, 5, '#2456a8');
      rc(g, 5, 2, 2, 2, '#c9d1d9'); rc(g, 5, 1, 2, 1, '#7d5636');
      break;
    case 'gold': // КРЪГЛА сребърна монета с отсечен кръст (X век)
      rc(g, 4, 2, 4, 1, '#c6d0dc'); rc(g, 3, 3, 6, 1, '#d8dee8');
      rc(g, 2, 4, 8, 4, '#d8dee8'); rc(g, 3, 8, 6, 1, '#aab6c8'); rc(g, 4, 9, 4, 1, '#8a94a5');
      px(g, 3, 3, '#f2f6fc'); px(g, 4, 2, '#f2f6fc'); rc(g, 2, 4, 1, 2, '#f2f6fc'); // отблясък
      rc(g, 9, 5, 1, 3, '#6a7485');                                   // сянка на ръба
      rc(g, 5, 4, 2, 4, '#8a94a5'); rc(g, 4, 5, 4, 2, '#8a94a5');     // печатът-кръст
      px(g, 5, 5, '#6a7485'); px(g, 6, 6, '#6a7485');
      break;
    case 'gold_small': // дребна монета на земята (щом се дропне)
      rc(g, 4, 5, 4, 3, '#d8dee8'); rc(g, 5, 4, 2, 1, '#c6d0dc'); rc(g, 5, 8, 2, 1, '#8a94a5');
      px(g, 4, 5, '#f2f6fc'); px(g, 7, 6, '#6a7485'); px(g, 6, 6, '#aab6c8');
      break;
    case 'sv_hack': { // насечени сребърни парчета с тъмен кант и грапави ръбове
      const OL = '#2b303a';
      rc(g, 1, 6, 4, 3, '#c6d0dc'); px(g, 1, 6, '#f2f6fc'); px(g, 4, 8, '#8a94a5');
      px(g, 0, 7, OL); px(g, 2, 5, OL); px(g, 5, 7, OL); px(g, 2, 9, OL);
      rc(g, 6, 3, 3, 2, '#e2e8f0'); px(g, 8, 4, '#aab6c8'); px(g, 6, 2, OL); px(g, 9, 3, OL); px(g, 7, 5, OL);
      rc(g, 7, 8, 4, 2, '#c6d0dc'); px(g, 10, 9, '#8a94a5'); px(g, 7, 7, OL); px(g, 11, 8, OL); px(g, 8, 10, OL);
      px(g, 3, 2, '#d8dee8'); px(g, 4, 2, '#8a94a5'); px(g, 3, 1, OL);
      break;
    }
    case 'sv_ring': { // масивен пръстен с камък
      const OL = '#2b303a';
      rc(g, 3, 4, 6, 1, '#e2e8f0'); rc(g, 3, 9, 6, 1, '#8a94a5');
      rc(g, 2, 5, 1, 4, '#d8dee8'); rc(g, 9, 5, 1, 4, '#6a7485');
      rc(g, 3, 5, 1, 1, '#f2f6fc');
      rc(g, 4, 5, 4, 3, OL); rc(g, 5, 5, 2, 2, '#5cd6c4'); px(g, 5, 5, '#a8fff2'); // камъкът
      px(g, 2, 4, OL); px(g, 9, 4, OL); px(g, 2, 9, OL); px(g, 9, 9, OL);
      break;
    }
    case 'sv_armring': { // усукана гривна с отворени краища
      const OL = '#2b303a';
      rc(g, 3, 2, 6, 1, '#e2e8f0'); px(g, 3, 2, '#f2f6fc');
      rc(g, 2, 3, 1, 5, '#d8dee8'); rc(g, 9, 3, 1, 5, '#8a94a5');
      px(g, 3, 8, '#c6d0dc'); px(g, 8, 8, '#8a94a5');
      rc(g, 3, 9, 2, 1, '#d8dee8'); rc(g, 7, 9, 2, 1, '#6a7485'); // отворените краища
      px(g, 4, 3, '#8a94a5'); px(g, 6, 2, '#aab6c8'); px(g, 3, 5, '#f2f6fc'); // усукване
      px(g, 2, 2, OL); px(g, 9, 2, OL); px(g, 1, 5, OL); px(g, 10, 5, OL); px(g, 5, 10, OL); px(g, 6, 9, OL);
      break;
    }
    case 'sv_torc': { // тежък обръч-огърлица с топчести краища
      const OL = '#2b303a';
      rc(g, 4, 2, 4, 1, '#e2e8f0'); px(g, 4, 2, '#f2f6fc');
      px(g, 3, 3, '#d8dee8'); px(g, 8, 3, '#aab6c8');
      rc(g, 2, 4, 1, 4, '#d8dee8'); rc(g, 9, 4, 1, 4, '#8a94a5');
      rc(g, 2, 8, 3, 3, OL); rc(g, 3, 8, 2, 2, '#f2f6fc'); px(g, 3, 9, '#aab6c8'); // топче ляво
      rc(g, 7, 8, 3, 3, OL); rc(g, 8, 8, 2, 2, '#c6d0dc'); px(g, 9, 9, '#6a7485'); // топче дясно
      px(g, 3, 2, OL); px(g, 8, 2, OL); px(g, 1, 5, OL); px(g, 10, 5, OL);
      break;
    }
    case 'sv_goblet': { // бокал с гравюра и столче
      const OL = '#2b303a';
      rc(g, 3, 1, 6, 1, '#f2f6fc'); rc(g, 3, 2, 6, 3, '#c6d0dc');
      px(g, 3, 2, '#e2e8f0'); px(g, 8, 3, '#6a7485');
      px(g, 5, 3, '#8a94a5'); px(g, 6, 3, '#8a94a5'); // гравюрата
      rc(g, 4, 5, 4, 1, '#8a94a5');
      rc(g, 5, 6, 2, 3, '#aab6c8'); px(g, 5, 6, '#d8dee8');
      rc(g, 3, 9, 6, 1, '#c6d0dc'); rc(g, 3, 10, 6, 1, '#6a7485');
      px(g, 2, 2, OL); px(g, 9, 2, OL); px(g, 4, 6, OL); px(g, 7, 6, OL); px(g, 2, 9, OL); px(g, 9, 9, OL);
      break;
    }
    case 'sv_ingot': { // отлят слитък с печат
      const OL = '#2b303a';
      rc(g, 1, 5, 10, 4, '#c6d0dc');
      rc(g, 2, 4, 8, 1, '#f2f6fc');
      rc(g, 1, 8, 10, 1, '#6a7485'); rc(g, 2, 9, 8, 1, '#4e5560');
      px(g, 2, 5, '#e2e8f0'); px(g, 3, 5, '#e2e8f0');
      rc(g, 5, 6, 3, 2, '#8a94a5'); px(g, 6, 6, '#6a7485'); // отсеченият печат
      px(g, 0, 6, OL); px(g, 11, 6, OL); px(g, 1, 4, OL); px(g, 10, 4, OL); px(g, 1, 9, OL); px(g, 10, 9, OL);
      break;
    }
    case 'sv_bag': // кесията със сечено сребро (за HUD)
      rc(g, 3, 5, 6, 5, '#6e5a3e'); rc(g, 4, 4, 4, 1, '#8a7350'); rc(g, 4, 10, 4, 1, '#54452f');
      px(g, 3, 5, '#8a7350'); px(g, 8, 9, '#54452f');
      rc(g, 5, 5, 2, 1, '#42351f');                                  // връвта
      px(g, 4, 2, '#d8dee8'); px(g, 5, 3, '#c6d0dc'); px(g, 7, 2, '#8a94a5'); px(g, 6, 1, '#e2e8f0'); // подаващо се сребро
      break;
    case 'tome':
      // том с магия: книга с runa
      rc(g, 2, 2, 8, 9, '#5c3f8f');
      rc(g, 2, 2, 8, 1, '#8a5fd0');
      rc(g, 2, 10, 8, 1, '#3d2a6e');
      rc(g, 2, 2, 1, 9, '#e8c04a');
      px(g, 5, 4, '#8ab0ff'); px(g, 6, 4, '#8ab0ff');
      rc(g, 5, 6, 2, 1, '#d8e6ff');
      px(g, 5, 8, '#8ab0ff'); px(g, 6, 8, '#8ab0ff');
      break;
    case 'shard':
      // Осколка на пазителя: остър тюркоазен кристал
      rc(g, 5, 1, 2, 2, '#b6f5e6');
      rc(g, 4, 3, 4, 3, '#57e6c8');
      rc(g, 3, 6, 6, 3, '#2f8f7d');
      rc(g, 5, 9, 2, 2, '#57e6c8');
      px(g, 5, 2, '#e8fffb'); px(g, 5, 4, '#b6f5e6'); px(g, 4, 7, '#8ff0dc');
      px(g, 7, 5, '#2f8f7d'); px(g, 6, 8, '#1c6a5a');
      break;
    case 'seal':
      // Печат на Бездната: тъмна плочка със светеща руна
      rc(g, 3, 1, 6, 10, '#2a2438');
      rc(g, 3, 1, 6, 1, '#3c3450'); rc(g, 3, 10, 6, 1, '#1c1828');
      px(g, 5, 3, '#c84fff'); px(g, 6, 3, '#c84fff');
      px(g, 4, 4, '#c84fff'); px(g, 7, 4, '#c84fff');
      rc(g, 5, 5, 2, 1, '#f0b0ff');
      px(g, 4, 6, '#c84fff'); px(g, 7, 6, '#c84fff');
      px(g, 5, 8, '#c84fff'); px(g, 6, 8, '#c84fff');
      break;
    case 'soulstone':
      // Камък на душата: тъмночервен кристал с бледа душа, светеща вътре
      rc(g, 4, 2, 4, 2, '#8a1c2a');
      rc(g, 3, 4, 6, 4, '#c22836');
      rc(g, 4, 8, 4, 2, '#8a1c2a');
      rc(g, 5, 5, 2, 2, '#ffd0e0'); // ядрото — душата
      px(g, 5, 4, '#ff8aa0'); px(g, 6, 6, '#ff8aa0');
      px(g, 5, 2, '#ffb0c0'); px(g, 4, 3, '#e0556a');
      px(g, 7, 7, '#5a0f18'); px(g, 3, 6, '#e0556a'); px(g, 8, 5, '#5a0f18');
      break;
  }
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}

// ---------- ефекти ----------
function genSlash() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const g = mk(36, 36);
    const prog = (f + 1) / 3;
    const a0 = -1.1, a1 = -1.1 + 2.2 * prog;
    for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) {
      const dx = x - 18, dy = y - 18;
      const r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (a > a0 && a < a1 && a > a1 - 1.15) {
        if (r >= 13 && r < 17) px(g, x, y, '#ffffff');
        else if (r >= 10 && r < 13) px(g, x, y, '#ffe9a8');
        else if (r >= 8 && r < 10 && f > 0) px(g, x, y, 'rgba(255,210,80,0.55)');
      }
    }
    frames.push(g.canvas);
  }
  return frames;
}
function genFireball() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const g = mk(9, 9);
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
      const r = Math.hypot(x - 4, y - 4);
      if (r < 2) px(g, x, y, '#fff2a0');
      else if (r < 3.2) px(g, x, y, '#ffd23b');
      else if (r < 4.2 && ((x + y + f) % 2 === 0)) px(g, x, y, '#ff8a1f');
    }
    frames.push(g.canvas);
  }
  return frames;
}
function genExplosion() {
  const frames = [];
  const rads = [3.5, 6.5, 9.5];
  for (let f = 0; f < 3; f++) {
    const g = mk(22, 22);
    const R0 = rads[f];
    for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) {
      const r = Math.hypot(x - 11, y - 11);
      if (Math.abs(r - R0) < 1.4) px(g, x, y, f === 2 ? '#ff8a1f' : '#ffd23b');
      else if (r < R0 - 1 && f < 2 && ((x + y) % 2 === 0)) px(g, x, y, '#ff5a1f');
    }
    frames.push(g.canvas);
  }
  return frames;
}
function genArrow() {
  const g = mk(10, 3);
  rc(g, 0, 1, 8, 1, '#a08050');
  px(g, 8, 1, '#c9d1d9'); px(g, 9, 1, '#ffffff'); px(g, 8, 0, '#c9d1d9'); px(g, 8, 2, '#c9d1d9');
  px(g, 0, 0, '#d84a5a'); px(g, 0, 2, '#d84a5a');
  return g.canvas;
}
function genBolt() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const g = mk(7, 7);
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const r = Math.hypot(x - 3, y - 3);
      if (r < 1.6) px(g, x, y, '#f0b0ff');
      else if (r < 3 && ((x + y + f) % 2 === 0)) px(g, x, y, '#c84fff');
    }
    frames.push(g.canvas);
  }
  return frames;
}
function genSpark() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const g = mk(9, 9);
    const L = f === 0 ? 2 : 4;
    for (let i = 1; i <= L; i++) {
      px(g, 4 + i, 4, '#ffffff'); px(g, 4 - i, 4, '#ffffff');
      px(g, 4, 4 + i, '#ffffff'); px(g, 4, 4 - i, '#ffffff');
    }
    px(g, 4, 4, '#ffe9a8');
    if (f) { px(g, 6, 2, '#ffe9a8'); px(g, 2, 6, '#ffe9a8'); px(g, 2, 2, '#ffe9a8'); px(g, 6, 6, '#ffe9a8'); }
    frames.push(g.canvas);
  }
  return frames;
}
function genCursor() {
  const g = mk(11, 11);
  for (let i = 0; i < 3; i++) {
    px(g, 5, i, '#ffffff'); px(g, 5, 10 - i, '#ffffff');
    px(g, i, 5, '#ffffff'); px(g, 10 - i, 5, '#ffffff');
  }
  px(g, 5, 5, '#ffd23b');
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}
function genCrown() {
  const g = mk(7, 4);
  rc(g, 0, 2, 7, 2, '#e8c04a');
  px(g, 0, 1, '#e8c04a'); px(g, 3, 0, '#ffd23b'); px(g, 6, 1, '#e8c04a');
  outlineSprite(g, '#0a0c12');
  return g.canvas;
}

// ---------- пикселов шрифт за числа (3x5) ----------
const FONT3 = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001011001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001010010',
  '8': '111101111101111', '9': '111101111001111', '+': '000010111010000', '-': '000000111000000',
  '!': '010010010000010',
};
function drawPixText(ctx2, str, x, y, s, color) {
  ctx2.fillStyle = color;
  let cx = x;
  for (const ch of str) {
    const d = FONT3[ch];
    if (d) {
      for (let i = 0; i < 15; i++) {
        if (d[i] === '1') ctx2.fillRect(cx + (i % 3) * s, y + ((i / 3) | 0) * s, s, s);
      }
    }
    cx += 4 * s;
  }
}
function pixTextW(str, s) { return str.length * 4 * s - s; }

// ---------- инициализация ----------
function packFrames(frames) {
  return { frames, white: whiteVersion(frames[0]) };
}

function initSprites(themeIdx) {
  if (Spr.themeIdx === themeIdx && Spr.ready) return;
  const t = THEMES[themeIdx];
  const R = mulberry32(1234 + themeIdx * 777);

  Spr.floor = [];
  for (let v = 0; v < 6; v++) {
    const lit = genFloor(t, R);
    Spr.floor.push({ lit, dim: dimVersion(lit) });
  }
  Spr.wall = [];
  for (let v = 0; v < 3; v++) {
    const lit = genWall(t, R);
    Spr.wall.push({ lit, dim: dimVersion(lit) });
  }
  Spr.stairs = (() => { const lit = genStairs(t); return { lit, dim: dimVersion(lit) }; })();
  Spr.rubble = genRubble(t);

  if (!Spr.staticReady) {
    Spr.staticReady = true;
    Spr.brazier = genBrazier();
    Spr.barrel = genBarrel();
    Spr.crate = genCrate();
    Spr.chest = genChest(false);
    Spr.chestOpen = genChest(true);
    Spr.vaultdoor = genVaultDoor();
    Spr.arena = genArenaMarker();
    Spr.fountain = genFountain(false);
    Spr.fountainDry = genFountain(true)[0];
    Spr.bones = genBones();
    Spr.blood = genBlood();
    Spr.shadow = genShadow();
    Spr.crown = genCrown();
    Spr.cursor = genCursor();

    // герой: комплект спрайтове за всеки тип оръжие
    Spr.player = {};
    for (const wt of ['sword', 'axe', 'dagger', 'greatsword', 'spear', 'chains']) {
      const set = { down: [], up: [], atkDown: [], atkUp: [], downNW: [], upNW: [], atkDownNW: [], atkUpNW: [] };
      for (let f = 0; f < 4; f++) {
        set.down.push(drawKnight({ dir: 'down', frame: f, weapon: wt }));
        set.up.push(drawKnight({ dir: 'up', frame: f, weapon: wt }));
        // тялото БЕЗ оръжие — оръжието е отделен компонент, закачен за дланта
        set.downNW.push(drawKnight({ dir: 'down', frame: f, weapon: wt, noWeapon: true }));
        set.upNW.push(drawKnight({ dir: 'up', frame: f, weapon: wt, noWeapon: true }));
      }
      for (let a = 1; a <= 2; a++) {
        set.atkDown.push(drawKnight({ dir: 'down', frame: 0, atk: a, weapon: wt }));
        set.atkUp.push(drawKnight({ dir: 'up', frame: 0, atk: a, weapon: wt }));
      }
      // атаката: 3 пози на РЪКАТА (засилване/среда/завършек), без вградено оръжие
      for (let a = 1; a <= 3; a++) {
        set.atkDownNW.push(drawKnight({ dir: 'down', frame: 0, atk: a, weapon: wt, noWeapon: true }));
        set.atkUpNW.push(drawKnight({ dir: 'up', frame: 0, atk: a, weapon: wt, noWeapon: true }));
      }
      set.held = genHeldWeapon(wt); // оръжието-компонент (закача се за дланта)
      set.white = whiteVersion(set.down[0]);
      Spr.player[wt] = set;
    }
    // котви на ДЛАНТА (пиксели в спрайта 22x26) — точката, за която се закача оръжието.
    // ходене: кадри 1 и 3 подскачат с 1px (bob); атака: по една котва за всяка от 3-те пози
    Spr.playerAnchors = {
      down: [[18, 18], [18, 19], [18, 18], [18, 19]],
      up: [[19, 16], [19, 17], [19, 16], [19, 17]],
      atkDown: [[18, 10], [20, 14], [17, 20]],
      atkUp: [[18, 11], [20, 15], [17, 21]],
    };

    Spr.enemies = {
      boss2: packFrames([0, 1, 2, 3].map(f => drawGolem({ frame: f }))),
      boss2Atk: drawGolem({ frame: 0, atk: 1 }),
      boss3: packFrames([0, 1, 2, 3].map(f => drawLich({ frame: f }))),
      boss3Atk: drawLich({ frame: 0, atk: 1 }),
      boss4: packFrames([0, 1, 2, 3].map(f => drawArch({ frame: f }))),
      boss4Atk: drawArch({ frame: 0, atk: 1 }),
      totem: packFrames([drawTotem(0), drawTotem(1)]),
      slime: packFrames([drawSlime({ frame: 0 }), drawSlime({ frame: 1 })]),
      slime_red: packFrames([drawSlime({ frame: 0, col: ['#c8465a', '#8f2a3a', '#f0a8b0'] }), drawSlime({ frame: 1, col: ['#c8465a', '#8f2a3a', '#f0a8b0'] })]),
      bat: packFrames([drawBat({ frame: 0 }), drawBat({ frame: 1 })]),
      skeleton: packFrames([0, 1, 2, 3].map(f => drawSkeleton({ frame: f }))),
      skeletonAtk: drawSkeleton({ frame: 0, atk: 1 }),
      archer: packFrames([0, 1, 2, 3].map(f => drawSkeleton({ frame: f, bow: true, hood: '#3a4a3a' }))),
      shaman: packFrames([0, 1, 2, 3].map(f => drawShaman({ frame: f }))),
      brute: packFrames([0, 1, 2, 3].map(f => drawBrute({ frame: f }))),
      bruteAtk: drawBrute({ frame: 0, atk: 1 }),
      wraith: packFrames([0, 1, 2, 3].map(f => drawWraith({ frame: f }))),
      boss: packFrames([0, 1, 2, 3].map(f => drawBoss({ frame: f }))),
      bossAtk: drawBoss({ frame: 0, atk: 1 }),
    };

    Spr.icons = {};
    for (const k of ['sword', 'axe', 'dagger', 'greatsword', 'spear', 'chains', 'armor', 'ring', 'amulet', 'potion_hp', 'potion_mp', 'gold', 'gold_small', 'seal', 'shard', 'tome', 'soulstone',
      'sv_hack', 'sv_ring', 'sv_armring', 'sv_torc', 'sv_goblet', 'sv_ingot', 'sv_bag'])
      Spr.icons[k] = genItemIcon(k, 0);

    Spr.slash = genSlash();
    Spr.fireball = genFireball();
    Spr.explosion = genExplosion();
    Spr.arrow = genArrow();
    Spr.bolt = genBolt();
    Spr.spark = genSpark();
  }

  Spr.themeIdx = themeIdx;
  Spr.ready = true;
}

// ---------- повърхността: тъмно фентъзи здрач ----------
const SURF_PAL = {
  // тревата: тъмна маслинена (#424023 по избор на дизайнера); пътеките остават кафяви
  grass: '#424023', grassD: '#36341a', grassL: '#4e4c2e', moss: '#585a32',
  dirt: '#453a2d', dirtD: '#392f24', dirtL: '#544737', pebble: '#5c5648',
  edge: '#282816',
};
function genGrass(R, path) {
  const t = SURF_PAL;
  const g = mk(32, 16);
  fillDiamond(g, 0, path ? t.dirt : t.grass);
  for (let i = 0; i < 60; i++) {
    const x = (R() * 32) | 0, y = (R() * 16) | 0;
    if (inDiamond(x, y)) px(g, x, y, path ? (R() < 0.5 ? t.dirtD : t.dirtL) : (R() < 0.5 ? t.grassD : t.grassL));
  }
  if (!path && R() < 0.5) { // туфи трева
    const x = 6 + (R() * 20 | 0), y = 3 + (R() * 9 | 0);
    if (inDiamond(x, y + 1)) { px(g, x, y, t.moss); px(g, x, y + 1, t.grassL); px(g, x + 1, y + 1, t.moss); }
  }
  if (path && R() < 0.4) { const x = 8 + (R() * 16 | 0), y = 4 + (R() * 8 | 0); if (inDiamond(x, y)) px(g, x, y, t.pebble); }
  for (let y = 0; y < 16; y++) {
    const [x0, w] = diamondSpan(y);
    if (y >= 8) { px(g, x0, y, t.edge); px(g, x0 + w - 1, y, t.edge); }
  }
  return g.canvas;
}
function genTree(R, dead) {
  const g = mk(20, 30);
  rc(g, 9, 24, 3, 5, '#3a2f24'); rc(g, 9, 24, 1, 5, '#4a3c2d'); // ствол
  if (dead) {
    rc(g, 10, 8, 1, 17, '#33291f');
    rc(g, 6, 12, 4, 1, '#33291f'); px(g, 5, 11, '#3d3226'); px(g, 4, 10, '#3d3226');
    rc(g, 11, 9, 4, 1, '#33291f'); px(g, 15, 8, '#3d3226'); px(g, 16, 7, '#3d3226');
    rc(g, 8, 15, 3, 1, '#33291f'); px(g, 7, 14, '#3d3226');
    px(g, 10, 7, '#3d3226'); px(g, 11, 6, '#33291f');
  } else {
    // тъмна ела на пластове
    const tri = (cy, half, col) => { for (let r = 0; r <= half; r++) { const w = 1 + r * 2; rc(g, 10 - r, cy + r, w, 1, col); } };
    tri(2, 3, '#1f2e24'); tri(6, 4, '#24352a'); tri(11, 5, '#1f2e24'); tri(16, 6, '#1a271f');
    px(g, 8, 4, '#31452f'); px(g, 7, 9, '#31452f'); px(g, 12, 13, '#31452f'); px(g, 6, 18, '#2a3a2c');
  }
  outlineSprite(g, '#0e1512');
  return g.canvas;
}
function genRockS(R) {
  const g = mk(14, 10);
  rc(g, 2, 3, 10, 6, '#4a505e');
  rc(g, 4, 2, 6, 2, '#565d6e');
  rc(g, 3, 7, 8, 2, '#3a4050');
  px(g, 5, 4, '#656d80'); px(g, 8, 3, '#656d80'); px(g, 6, 6, '#333947');
  outlineSprite(g, '#10141c');
  return g.canvas;
}
function genTomb(R) {
  const g = mk(10, 13);
  rc(g, 2, 3, 6, 9, '#575d6b');
  rc(g, 3, 1, 4, 3, '#575d6b');
  rc(g, 2, 3, 1, 9, '#6b7283');
  rc(g, 7, 4, 1, 8, '#454b59');
  rc(g, 4, 5, 2, 1, '#3a3f4c'); rc(g, 4, 7, 2, 1, '#3a3f4c'); // надпис
  rc(g, 1, 11, 8, 1, '#2c3129');
  outlineSprite(g, '#10141c');
  return g.canvas;
}
function genPillar() {
  const g = mk(12, 22);
  rc(g, 3, 2, 6, 18, '#565d6e');
  rc(g, 2, 0, 8, 3, '#656d80');
  rc(g, 2, 19, 8, 2, '#454b59');
  rc(g, 3, 2, 1, 17, '#6b7283');
  rc(g, 8, 3, 1, 16, '#454b59');
  px(g, 5, 8, '#3a4050'); px(g, 6, 12, '#3a4050'); // пукнатини
  outlineSprite(g, '#10141c');
  return g.canvas;
}
function genFence() {
  const g = mk(16, 11);
  rc(g, 1, 3, 1, 8, '#4a3c2d'); rc(g, 8, 3, 1, 8, '#4a3c2d'); rc(g, 14, 3, 1, 8, '#4a3c2d');
  rc(g, 0, 4, 16, 1, '#5c4a36'); rc(g, 0, 7, 16, 1, '#5c4a36');
  px(g, 1, 2, '#5c4a36'); px(g, 8, 2, '#5c4a36'); px(g, 14, 2, '#5c4a36');
  outlineSprite(g, '#10141c');
  return g.canvas;
}
function genCampfire() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const g = mk(16, 14);
    // камъни в кръг
    px(g, 2, 10, '#4a505e'); px(g, 5, 12, '#565d6e'); px(g, 10, 12, '#4a505e'); px(g, 13, 10, '#565d6e');
    px(g, 3, 11, '#3a4050'); px(g, 12, 11, '#3a4050');
    // дърва
    rc(g, 5, 10, 6, 2, '#3a2f24'); rc(g, 4, 11, 3, 1, '#4a3c2d'); rc(g, 9, 11, 3, 1, '#33291f');
    // пламък
    const fl = [
      [[7, 3, 2, 2], [6, 5, 4, 3], [5, 8, 6, 2]],
      [[8, 2, 2, 3], [6, 5, 4, 3], [5, 8, 6, 2]],
      [[6, 3, 2, 2], [7, 5, 3, 3], [5, 8, 6, 2]],
    ][f];
    rc(g, fl[2][0], fl[2][1], fl[2][2], fl[2][3], '#ff5a1f');
    rc(g, fl[1][0], fl[1][1], fl[1][2], fl[1][3], '#ff8a1f');
    rc(g, fl[0][0], fl[0][1], fl[0][2], fl[0][3], '#ffd23b');
    px(g, 7 + (f % 2), fl[0][1] - 1, '#fff2a0');
    outlineSprite(g, '#0e1512');
    frames.push(g.canvas);
  }
  return frames;
}
// 5 нива развитие на сергия: количка -> малка палатка -> палатка -> голяма палатка -> шатра
function genStallTier(tier, c, goods) {
  const W = '#5c4a36', WD = '#4a3c2d', WDD = '#33291f', WL = '#6e5a42';
  if (tier === 1) { // количка за бутане
    const g = mk(20, 16);
    rc(g, 3, 5, 14, 6, WD); rc(g, 3, 5, 14, 1, WL);                 // корито
    rc(g, 2, 4, 2, 8, W); rc(g, 16, 4, 2, 8, W);
    for (let i = 0; i < 4; i++) px(g, 5 + i * 3, 4, goods[i % goods.length]); // стока отгоре
    // колело
    for (let a = 0; a < 16; a++) {
      const x = 10 + Math.round(3.2 * Math.cos(a * 0.4)), y = 12 + Math.round(3.2 * Math.sin(a * 0.4) * 0.8);
      px(g, x, y, WDD);
    }
    rc(g, 9, 11, 2, 2, W);
    rc(g, 0, 6, 3, 1, W); px(g, 0, 7, WD);                          // дръжка
    outlineSprite(g, '#10141c');
    return g.canvas;
  }
  if (tier === 2) { // малка палатка
    const g = mk(22, 20);
    for (let r = 0; r < 10; r++) {                                   // А-образен покрив
      const half = 1 + r;
      rc(g, 11 - half, 4 + r, half * 2, 1, ((r / 2) | 0) % 2 ? c[0] : c[1]);
    }
    px(g, 10, 2, W); px(g, 11, 3, W);                                // върхът с колче
    rc(g, 8, 12, 6, 6, '#14100e');                                   // вход
    rc(g, 1, 13, 20, 1, WD);
    outlineSprite(g, '#10141c');
    return g.canvas;
  }
  if (tier === 3) { // палатка с било
    const g = mk(26, 24);
    rc(g, 12, 0, 2, 4, W);                                           // прът
    for (let r = 0; r < 12; r++) {
      const half = 2 + r;
      rc(g, 13 - Math.min(half, 12), 4 + r, Math.min(half, 12) * 2, 1, ((r / 3) | 0) % 2 ? c[0] : c[1]);
    }
    rc(g, 1, 16, 24, 5, c[1]);                                       // стени
    rc(g, 9, 15, 8, 8, '#14100e');                                   // вход
    px(g, 0, 22, WD); px(g, 25, 22, WD);                             // колчета
    outlineSprite(g, '#10141c');
    return g.canvas;
  }
  if (tier === 4) { // голяма палатка със знаме
    const g = mk(32, 28);
    rc(g, 15, 0, 1, 6, W);
    rc(g, 16, 0, 4, 2, c[0]); px(g, 16, 2, c[0]);                    // знаме
    for (let r = 0; r < 12; r++) {                                    // широк покрив-трапец
      const half = 3 + r;
      rc(g, 16 - Math.min(half, 15), 5 + r, Math.min(half, 15) * 2, 1, ((r / 3) | 0) % 2 ? c[0] : c[1]);
    }
    rc(g, 1, 17, 30, 8, c[1]);
    rc(g, 1, 17, 30, 1, WD);
    rc(g, 11, 17, 10, 10, '#14100e');                                 // широк вход
    rc(g, 2, 19, 1, 7, WD); rc(g, 29, 19, 1, 7, WD);
    outlineSprite(g, '#10141c');
    return g.canvas;
  }
  // tier 5: шатра, окичена със стоката
  const g = mk(38, 32);
  rc(g, 18, 0, 2, 5, W); rc(g, 20, 0, 5, 2, '#e8c04a'); px(g, 20, 2, '#e8c04a'); // златно знаме
  for (let r = 0; r < 13; r++) {
    const half = 4 + r;
    rc(g, 19 - Math.min(half, 18), 4 + r, Math.min(half, 18) * 2, 1, ((r / 3) | 0) % 2 ? c[0] : c[1]);
  }
  rc(g, 1, 17, 36, 2, '#e8c04a');                                    // златен фриз
  // фестонен ръб на навеса
  for (let x = 1; x < 37; x += 4) { rc(g, x, 19, 2, 1, c[0]); px(g, x + 2, 19, c[1]); }
  rc(g, 1, 20, 36, 8, c[1]);
  rc(g, 14, 20, 10, 12, '#14100e');                                   // вход
  rc(g, 2, 21, 1, 9, WD); rc(g, 35, 21, 1, 9, WD);
  // окачена стока от двете страни на входа
  for (let i = 0; i < 3; i++) {
    px(g, 5 + i * 3, 22, goods[i % goods.length]); px(g, 5 + i * 3, 23, goods[(i + 1) % goods.length]);
    px(g, 27 + i * 3, 22, goods[(i + 1) % goods.length]); px(g, 27 + i * 3, 23, goods[i % goods.length]);
  }
  outlineSprite(g, '#10141c');
  return g.canvas;
}
// тезгях на САРАФИНА (лагера): маса с везни, кесии и окачени сребърни дрънкулки
function genExchangeStand() {
  const g = mk(24, 26);
  rc(g, 3, 15, 18, 8, '#4a3c2c');                                     // дървен тезгях
  rc(g, 2, 14, 20, 2, '#5c4a34'); rc(g, 3, 22, 18, 1, '#382d20');
  rc(g, 4, 16, 1, 6, '#5c4a34');
  // ВЕЗНИТЕ: стойка + рамо + две блюда
  rc(g, 11, 4, 1, 10, '#6a6d75'); rc(g, 7, 4, 9, 1, '#8a8d95'); px(g, 11, 3, '#aab6c8');
  rc(g, 6, 5, 1, 3, '#6a6d75'); rc(g, 16, 5, 1, 3, '#6a6d75');        // въженца
  rc(g, 5, 8, 3, 1, '#c6d0dc'); px(g, 5, 9, '#8a94a5');               // блюдо ляво
  rc(g, 15, 8, 3, 1, '#c6d0dc'); px(g, 17, 9, '#8a94a5');             // блюдо дясно
  px(g, 6, 7, '#e2e8f0');                                             // сребро в блюдото
  // кесии с монети на тезгяха
  rc(g, 5, 12, 3, 3, '#6e5a3e'); px(g, 6, 11, '#8a7350');
  rc(g, 17, 12, 3, 3, '#6e5a3e'); px(g, 18, 11, '#8a7350');
  px(g, 9, 13, '#d8dee8'); px(g, 13, 13, '#d8dee8'); px(g, 14, 14, '#aab6c8'); // разпилени монети
  // окачени гривни отстрани
  px(g, 2, 17, '#c6d0dc'); px(g, 2, 18, '#8a94a5'); px(g, 21, 18, '#c6d0dc'); px(g, 21, 19, '#8a94a5');
  outlineSprite(g, '#10141c');
  return g.canvas;
}
function genMysticStand() {
  // маса на Мистика: каменен пиедестал с реещ се печат
  const g = mk(22, 26);
  rc(g, 5, 16, 12, 7, '#565d6e');                                     // пиедестал
  rc(g, 4, 15, 14, 2, '#6b7283');
  rc(g, 5, 22, 12, 1, '#3a4050');
  rc(g, 6, 17, 1, 5, '#6b7283');
  // свещи
  rc(g, 2, 19, 2, 4, '#d8d3c0'); px(g, 2, 18, '#ff8a1f');
  rc(g, 18, 20, 2, 3, '#d8d3c0'); px(g, 18, 19, '#ff8a1f');
  // реещ се печат
  rc(g, 8, 4, 6, 9, '#2a2438');
  rc(g, 8, 4, 6, 1, '#3c3450');
  px(g, 10, 6, '#c84fff'); px(g, 11, 6, '#c84fff');
  rc(g, 9, 8, 4, 1, '#f0b0ff');
  px(g, 10, 10, '#c84fff'); px(g, 11, 10, '#c84fff');
  // искри около него
  px(g, 6, 6, '#c84fff'); px(g, 16, 9, '#6a4f9e'); px(g, 7, 12, '#6a4f9e');
  outlineSprite(g, '#10141c');
  return g.canvas;
}

function genStall(canopy) {
  const g = mk(26, 24);
  // тезгях
  rc(g, 2, 15, 22, 6, '#4a3c2d');
  rc(g, 2, 15, 22, 1, '#5c4a36');
  rc(g, 3, 21, 2, 2, '#33291f'); rc(g, 21, 21, 2, 2, '#33291f');
  // стълбове
  rc(g, 2, 5, 2, 10, '#3a2f24'); rc(g, 22, 5, 2, 10, '#3a2f24');
  // навес на райета
  for (let x = 0; x < 24; x++) {
    const col = ((x / 3) | 0) % 2 === 0 ? canopy[0] : canopy[1];
    rc(g, 1 + x, 2 + (x % 2 === 0 ? 0 : 0), 1, 4, col);
  }
  rc(g, 0, 6, 26, 1, '#33291f');
  rc(g, 1, 1, 24, 1, canopy[1]);
  outlineSprite(g, '#10141c');
  return g.canvas;
}
function genVendor(type) {
  const g = mk(16, 20);
  const skin = '#d9a878';
  if (type === 'weapon') { // ковач: плешив, брада, кожена престилка, чук
    rc(g, 5, 9, 8, 7, '#6e4a2f'); rc(g, 6, 10, 6, 5, '#7d5636'); // престилка
    rc(g, 3, 9, 2, 4, skin); rc(g, 13, 9, 2, 4, skin);
    rc(g, 14, 4, 1, 6, '#8a93a3'); rc(g, 13, 3, 3, 2, '#6b7690'); // чук
    rc(g, 5, 2, 6, 5, skin);
    rc(g, 5, 6, 6, 3, '#4a3626'); // брада
    px(g, 6, 4, '#1a1d26'); px(g, 9, 4, '#1a1d26');
    rc(g, 5, 16, 2, 3, '#3a3040'); rc(g, 9, 16, 2, 3, '#3a3040');
  } else if (type === 'armor') { // бронар: в лъскава броня
    rc(g, 4, 9, 8, 7, '#8a97ad'); rc(g, 5, 10, 3, 3, '#b8c4d8');
    rc(g, 3, 9, 2, 5, '#67738c'); rc(g, 12, 9, 2, 5, '#67738c');
    rc(g, 5, 2, 6, 5, skin); rc(g, 4, 1, 8, 2, '#8a97ad');
    px(g, 6, 4, '#1a1d26'); px(g, 9, 4, '#1a1d26');
    rc(g, 6, 6, 4, 1, '#8a6a4a');
    rc(g, 4, 16, 2, 3, '#3a3040'); rc(g, 9, 16, 2, 3, '#3a3040');
  } else if (type === 'potion') { // алхимичка: зелена роба с качулка
    rc(g, 4, 8, 8, 11, '#2f4a35'); rc(g, 4, 8, 8, 2, '#3e5c44');
    rc(g, 5, 2, 6, 6, '#3e5c44');
    rc(g, 6, 4, 4, 3, skin);
    px(g, 6, 5, '#1a1d26'); px(g, 9, 5, '#1a1d26');
    rc(g, 13, 10, 2, 3, '#3b82f6'); px(g, 13, 9, '#c9d1d9'); // колба
    rc(g, 3, 10, 1, 4, '#2f4a35');
  } else { // бижутер: пурпурен кафтан, златни бижута
    rc(g, 4, 8, 8, 11, '#5c2a5e'); rc(g, 4, 8, 8, 2, '#7a3a7d');
    rc(g, 5, 2, 6, 5, skin);
    rc(g, 4, 1, 8, 2, '#7a3a7d'); px(g, 8, 0, '#e8c04a');
    px(g, 6, 4, '#1a1d26'); px(g, 9, 4, '#1a1d26');
    rc(g, 6, 9, 4, 1, '#e8c04a'); px(g, 8, 10, '#ffd23b'); // огърлица
    rc(g, 13, 9, 2, 2, '#e8c04a');
  }
  outlineSprite(g, '#10141c');
  return g.canvas;
}
function genPortal() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const g = mk(26, 30);
    // каменна арка
    rc(g, 2, 6, 4, 22, '#4a505e'); rc(g, 20, 6, 4, 22, '#4a505e');
    rc(g, 2, 4, 22, 4, '#565d6e');
    rc(g, 4, 2, 18, 3, '#4a505e');
    rc(g, 2, 6, 1, 22, '#6b7283'); rc(g, 23, 6, 1, 22, '#3a4050');
    px(g, 3, 12, '#3a4050'); px(g, 21, 18, '#3a4050');
    // руни
    px(g, 3, 9, f === 0 ? '#b34fff' : '#6a2f9e'); px(g, 22, 15, f === 1 ? '#b34fff' : '#6a2f9e'); px(g, 12, 3, f === 2 ? '#b34fff' : '#6a2f9e');
    // портална мъгла (пикселни ивици, без градиент)
    for (let y = 8; y < 28; y++) {
      for (let x = 6; x < 20; x++) {
        const wave = Math.sin(y * 0.7 + f * 2.1 + x * 0.3);
        if (wave > 0.55) px(g, x, y, '#2a1444');
        else if (wave > 0.1) px(g, x, y, '#1a0d2e');
        else px(g, x, y, '#120a20');
      }
    }
    for (let i = 0; i < 6; i++) { // искри
      const x = 7 + ((i * 5 + f * 3) % 12), y = 10 + ((i * 7 + f * 5) % 16);
      px(g, x, y, i % 2 ? '#b34fff' : '#7a4fd0');
    }
    outlineSprite(g, '#10141c');
    frames.push(g.canvas);
  }
  return frames;
}

// ---------- МИРХОЛД: сгради, стена, кула, порта ----------
// палитра: сив камък, кафява кал/дърво, тъмни покриви, едно топло оранжево (фенери/прозорци)

// ================= 2.5D СГРАДИ: изометрични тела върху 2x2 клетки =================
// Основата е ромб 64x32 (= точно 2x2-те блокирани клетки), две видими стени
// (СЗ-фасада с врата и СИ-страница) и пирамидален покрив с късо било.
// Котва: pyo=16 — дъното на спрайта ляга на южния връх на футпринта.

// долният ръб на "тавана" за колона x (ромб 64x32 с горен връх на (32, oy))
function iso2EdgeY(oy, x) { return x < 32 ? oy + 16 + (x >> 1) : oy + 48 - (x >> 1); }

// общата снага: стени + основа + ДВУСКАТЕН покрив със стария силует
// (билото върви по дълбочината: триъгълен фронтон на СИ-стената, скат над фасадата)
function iso2Body(g, R, oy, wallH, roofH, pal) {
  const N = 8 + roofH; // редове на ската (половин клетка дълбочина + височината на билото)
  // стените: колона по колона от долните ръбове на тавана надолу
  for (let x = 0; x < 64; x++) {
    const sw = x < 32, ey = iso2EdgeY(oy, x);
    for (let k = 1; k <= wallH; k++) {
      let col = sw ? pal.wallSW : pal.wallSE;
      if (k === 1 || k === ((wallH / 2) | 0)) col = pal.beam;   // пояси като старите
      else if (k >= wallH - 2) col = pal.stone;                 // каменна основа
      if (k === wallH) col = pal.stoneD;
      px(g, x, ey + k, col);
    }
  }
  // шум по мазилката
  for (let i = 0; i < 40; i++) {
    const x = (R() * 64) | 0, ey = iso2EdgeY(oy, x);
    const k = 2 + ((R() * (wallH - 5)) | 0);
    px(g, x, ey + k, x < 32 ? pal.wallSWd : pal.wallSEd);
  }
  // вертикални стойки по фасадата (както в старата визия)
  for (const cx2 of [0, 1, 10, 21, 31, 32, 62, 63]) {
    const ey = iso2EdgeY(oy, cx2);
    for (let k = 1; k <= wallH - 3; k++) px(g, cx2, ey + k, pal.beam);
  }
  // ТРИЪГЪЛНИЯТ ФРОНТОН на СИ-стената (дясно) — старият силует, видян отстрани
  for (let x = 32; x < 64; x++) {
    const ey = iso2EdgeY(oy, x);
    const ph = Math.max(0, Math.round((roofH + 1) * (1 - Math.abs(x - 47.5) / 15.5)));
    for (let k = 0; k < ph; k++) px(g, x, ey - k, pal.wallSE);
    if (ph > 0) {
      px(g, x, ey - ph, pal.rB); px(g, x, ey - ph - 1, pal.rD);  // покривен кант по ската
      if (ph > 1) px(g, x, ey - ph + 1, pal.beam);               // гредата под стрехата
    }
  }
  { const mx = 47, ey = iso2EdgeY(oy, mx);                       // таванско прозорче
    rc(g, mx - 1, ey - (roofH >> 1) - 2, 3, 2, '#171310'); px(g, mx, ey - (roofH >> 1) - 1, '#8a6420'); }
  // СКАТЪТ над фасадата: старият покрив, изтеглен по дълбочината към билото
  for (let s = 0; s < N; s++) {
    const dx = Math.round(16 * s / N);
    for (let x = 0; x < 32; x++) {
      const ey = iso2EdgeY(oy, x);
      px(g, x + dx, ey - s, s % 2 ? pal.rA : pal.rB);
    }
  }
  // текстура + светло било
  for (let i = 0; i < 16; i++) {
    const x = 4 + ((R() * 40) | 0), s2 = 1 + ((R() * (N - 2)) | 0);
    px(g, x + Math.round(16 * s2 / N), iso2EdgeY(oy, Math.min(31, Math.max(0, x))) - s2, pal.rC);
  }
  for (let x = 0; x < 32; x++) {
    px(g, x + 16, iso2EdgeY(oy, x) - N, pal.rD);       // билото
    px(g, x + 16, iso2EdgeY(oy, x) - N - 1, pal.rD);   // загатнат заден скат —
    px(g, x + 16, iso2EdgeY(oy, x) - N - 2, pal.rB);   // покривът има гръб,
    px(g, x + 16, iso2EdgeY(oy, x) - N - 3, '#1a1e26'); // не е хартия
  }
}
// врата на СЗ-фасадата (колони x0..x0+w-1, височина dh от земята)
function iso2Door(g, oy, wallH, x0, w, dh) {
  for (let x = x0; x < x0 + w; x++) {
    const ey = iso2EdgeY(oy, x);
    for (let k = wallH - dh; k <= wallH - 1; k++) px(g, x, ey + k, k === wallH - dh ? '#241f1a' : '#1a140e');
  }
  const mx = x0 + (w >> 1), mey = iso2EdgeY(oy, mx);
  px(g, x0 + w - 2, mey + wallH - (dh >> 1), '#9a9da5'); // дръжката
}
// прозорец върху стена: x0..x0+w-1, от ред top до top+h по колоната
function iso2Win(g, oy, x0, w, top, h, warm) {
  for (let x = x0; x < x0 + w; x++) {
    const ey = iso2EdgeY(oy, x);
    for (let k = top; k < top + h; k++) px(g, x, ey + k, '#171310');
  }
  if (warm) {
    const mx = x0 + 1, ey = iso2EdgeY(oy, mx);
    px(g, mx, ey + top + 1, '#e8a84d'); px(g, mx + 1, ey + top + 2, '#c98a3b');
  }
}
const ISO_PAL_HOUSE = v => ({
  wallSW: '#6b6252', wallSWd: '#5d5546', wallSE: '#57503f', wallSEd: '#4a4436',
  beam: '#382d20', stone: '#565a62', stoneD: '#3c4046',
  rA: v ? '#584426' : '#39404a', rB: v ? '#463619' : '#2d333c', rC: v ? '#6a5430' : '#454e5a', rD: v ? '#3c2f16' : '#232830',
});

// ЖИЛИЩНА КЪЩА (t0 едноетажна, t1 двуетажна) — старата визия + странична стена (2.5D)
function genMirHouse(R, v, twoStory) {
  const wallH = twoStory ? 30 : 18, roofH = 12, oy = 14;
  const g = mk(64, oy + 32 + wallH);
  const pal = ISO_PAL_HOUSE(v);
  // КОМИНЪТ: рисува се ПРЕДИ снагата и наднича иззад ската (никакъв шев),
  // двойно по-висок, за да се вижда добре зад билото
  rc(g, 30, 3, 4, 14, '#565a62');
  rc(g, 30, 3, 1, 14, '#6d7280'); rc(g, 33, 3, 1, 14, '#4a4e56');
  px(g, 31, 6, '#3a3e46'); px(g, 32, 9, '#3a3e46'); px(g, 31, 12, '#3a3e46'); // фуги
  rc(g, 29, 2, 6, 2, '#4a4e56'); rc(g, 29, 2, 6, 1, '#6d7280');               // капак-плоча
  rc(g, 31, 1, 2, 1, '#171310'); px(g, 30, 1, '#2b2f36');                     // отворът и саждите
  iso2Body(g, R, oy, wallH, roofH, pal);
  iso2Door(g, oy, wallH, 10, 8, 11);
  iso2Win(g, oy, 3, 5, twoStory ? 19 : 6, 4, true);       // фасаден прозорец (долен етаж)
  iso2Win(g, oy, 36, 5, twoStory ? 19 : 6, 4, false);     // страничен прозорец
  if (twoStory) {
    iso2Win(g, oy, 4, 5, 5, 4, true);                     // горният етаж
    iso2Win(g, oy, 22, 5, 5, 4, false);
    iso2Win(g, oy, 38, 5, 5, 4, true);
  }
  if (v) for (let x = 1; x < 31; x += 3) px(g, x + 1, iso2EdgeY(oy, x) + 1, pal.rB); // рошав край на сламата
  outlineSprite(g, '#10131c');
  return g.canvas;
}

// ТАБЕЛАТА на занаята: дъска 12x12 с цвят и символ (ползва се от магазин-сградите)
function genShopSign(vtype) {
  const g = mk(12, 12);
  const sign = { weapon: '#8f2a3a', armor: '#2a4a8f', potion: '#2f6e3a', jewel: '#6e2a8f', exchange: '#5a6472' }[vtype] || '#8f2a3a';
  rc(g, 0, 0, 12, 12, sign);
  strokeRect(g, 0, 0, 12, 12, '#241f1a', 1);
  const IC = '#e8e4d0';
  if (vtype === 'weapon') {      // диагонален меч
    px(g, 9, 2, IC); px(g, 8, 3, IC); px(g, 7, 4, IC); px(g, 6, 5, IC); px(g, 5, 6, IC);
    px(g, 4, 8, IC); px(g, 3, 9, IC); px(g, 5, 8, '#c9a23b'); px(g, 3, 6, '#c9a23b'); px(g, 4, 7, '#8a6420');
  } else if (vtype === 'armor') { // щит
    rc(g, 4, 3, 5, 2, '#aab6c8'); rc(g, 3, 4, 7, 3, '#aab6c8'); rc(g, 4, 7, 5, 1, '#8a94a5');
    rc(g, 5, 8, 3, 1, '#8a94a5'); px(g, 6, 9, '#6a7485'); px(g, 6, 5, '#c93a4a');
  } else if (vtype === 'potion') { // колба
    px(g, 6, 2, IC); rc(g, 5, 3, 3, 2, IC); rc(g, 4, 5, 5, 4, '#4fd0a0'); rc(g, 5, 8, 3, 1, '#2f8a68');
    px(g, 5, 5, '#a8f0d8');
  } else if (vtype === 'exchange') { // ВЕЗНИ на сарафина
    rc(g, 6, 2, 1, 5, IC); rc(g, 3, 3, 7, 1, IC); px(g, 6, 8, IC);
    px(g, 3, 4, '#aab6c8'); px(g, 9, 4, '#aab6c8');
    rc(g, 2, 6, 3, 1, '#c6d0dc'); rc(g, 8, 6, 3, 1, '#c6d0dc');
    px(g, 3, 5, '#8a94a5'); px(g, 9, 5, '#8a94a5');
  } else {                        // руна-камък на Мистика
    px(g, 6, 2, '#e0c0ff'); px(g, 5, 3, '#e0c0ff'); px(g, 7, 3, '#e0c0ff');
    rc(g, 6, 3, 1, 5, '#e0c0ff'); px(g, 4, 5, '#e0c0ff'); px(g, 8, 5, '#e0c0ff');
    px(g, 5, 8, '#b088d8'); px(g, 7, 8, '#b088d8');
  }
  return g.canvas;
}

function genMirShopHouse(vtype, R) {
  // 2.5D магазин: изометричен, wallH 20; табелата е на СИ-стената, банерът на фасадата
  const wallH = 22, roofH = 12, oy = 10;
  const g = mk(64, oy + 32 + wallH);
  const pal = {
    wallSW: '#665e4e', wallSWd: '#585042', wallSE: '#544d3e', wallSEd: '#474133',
    beam: '#382d20', stone: '#565a62', stoneD: '#3c4046',
    rA: '#39404a', rB: '#2d333c', rC: '#454e5a', rD: '#232830',
  };
  iso2Body(g, R, oy, wallH, roofH, pal);
  iso2Door(g, oy, wallH, 11, 9, 13);
  iso2Win(g, oy, 3, 6, 5, 5, true);
  // ФЕНЕРЪТ до вратата (топлият акцент)
  { const ey = iso2EdgeY(oy, 22); px(g, 22, ey + wallH - 10, '#241f1a'); px(g, 22, ey + wallH - 9, '#ffb84d'); px(g, 22, ey + wallH - 8, '#c98a3b'); }
  // вертикален банер на фасадата (квадратните табели са премахнати)
  const banCol = { weapon: '#8f2a3a', armor: '#2a4a8f', potion: '#2f6e3a', jewel: '#6e2a8f', exchange: '#5a6472' }[vtype] || '#8f2a3a';
  for (let x = 25; x < 30; x++) {
    const ey = iso2EdgeY(oy, x);
    for (let k = 2; k <= 15; k++) px(g, x, ey + k, banCol);
    px(g, x, ey + 2, pal.beam);
    if (x % 2 === 1) px(g, x, ey + 15, '#10131c'); // назъбен край
  }
  { const ey = iso2EdgeY(oy, 27); px(g, 26, ey + 6, '#e8e4d0'); px(g, 27, ey + 7, '#c9a23b'); }
  // ЗАНАЯТЧИЙСКИ РЕКВИЗИТ до вратата (на земята пред фасадата)
  const gy = (x) => iso2EdgeY(oy, x) + wallH; // земната линия
  if (vtype === 'weapon') {          // наковалня + жар
    rc(g, 2, gy(4) - 3, 6, 2, '#3c4046'); rc(g, 3, gy(4) - 5, 3, 2, '#565a62');
    px(g, 8, gy(8) - 4, '#ff8a1f'); px(g, 9, gy(9) - 3, '#ffb84d');
  } else if (vtype === 'armor') {    // окачен щит на фасадата
    rc(g, 4, iso2EdgeY(oy, 4) + 6, 5, 4, '#aab6c8'); px(g, 6, iso2EdgeY(oy, 6) + 8, '#c93a4a');
  } else if (vtype === 'potion') {   // шишета на прага
    px(g, 3, gy(3) - 3, '#4fd0a0'); px(g, 5, gy(5) - 3, '#c94f6e'); px(g, 7, gy(7) - 4, '#4f9cff');
  } else if (vtype === 'exchange') { // монети на прага
    px(g, 4, gy(4) - 3, '#d8dee8'); px(g, 6, gy(6) - 3, '#c6d0dc'); px(g, 5, gy(5) - 4, '#f2f6fc');
  } else {                           // кристали на Мистика
    px(g, 4, gy(4) - 3, '#c84fff'); rc(g, 5, gy(5) - 4, 2, 2, '#8a5fd0'); px(g, 7, gy(7) - 3, '#e0b0ff');
  }
  // комин: каменен, слят с левия скат
  for (let cxx = 0; cxx < 4; cxx++) {
    const bot = 20 + (cxx >> 1);
    for (let y = 12; y <= bot; y++) {
      let col = cxx === 0 ? '#6d7280' : cxx === 3 ? '#4a4e56' : '#565a62';
      if (y % 4 === 1 && y > 12) col = '#3a3e46';
      px(g, 20 + cxx, y, col);
    }
  }
  rc(g, 19, 11, 6, 2, '#4a4e56'); rc(g, 19, 11, 6, 1, '#6d7280');
  rc(g, 21, 10, 2, 1, '#171310'); px(g, 23, 10, '#2b2f36');
  outlineSprite(g, '#10131c');
  return g.canvas;
}

// 2.5D гарнизонна кула върху ЕДНА клетка: изометричен кийп 32x100 (pyo=8)
function genMirTower(R) {
  const FH = 62, oy = 22; // фенер+зъбери 0..21, диамант 22..37, лица 38..99
  const g = mk(32, oy + 16 + FH);
  const st = '#5c6068', stD = '#4a4e56', stL = '#6d7280', mort = '#3a3e46';
  // капакът (площадката)
  for (let y = 0; y < 16; y++) { const [x0, w2] = diamondSpan(y); rc(g, x0, oy + y, w2, 1, st); }
  for (let i = 0; i < 20; i++) { const x = (R() * 32) | 0, y = (R() * 16) | 0; if (inDiamond(x, y)) px(g, x, oy + y, R() < 0.5 ? stD : stL); }
  // лицата със зидария
  for (let x = 0; x < 32; x++) {
    const left = x < 16;
    const yb = oy + (left ? 8 + (x >> 1) + 1 : 8 + ((31 - x) >> 1) + 1);
    for (let k = 0; k < FH; k++) {
      const y = yb + k;
      if (y >= oy + 16 + FH) continue;
      let col = left ? '#4e525a' : '#41454d';
      if (k % 6 === 5) col = mort;
      else if (((x + ((k / 6) | 0) * 5) % 10) === 0) col = mort;
      if (k >= FH - 2) col = mort;
      px(g, x, y, col);
    }
    px(g, x, yb, left ? stL : stD);
  }
  for (let k = 0; k < FH; k++) px(g, 16, oy + 16 + k, mort);
  // прозорци с топла светлина + бойници по лицата
  const winSW = (x0, top) => { for (let x = x0; x < x0 + 4; x++) { const yb = oy + 8 + (x >> 1) + 1; for (let k = top; k < top + 5; k++) px(g, x, yb + k, '#171310'); } px(g, x0 + 1, oy + 8 + ((x0 + 1) >> 1) + 1 + top + 1, '#e8a84d'); };
  winSW(5, 10); winSW(9, 30);
  { const x0 = 22; for (let x = x0; x < x0 + 3; x++) { const yb = oy + 8 + ((31 - x) >> 1) + 1; for (let k = 20; k < 26; k++) px(g, x, yb + k, '#12100c'); } }
  // врата с арка на фасадата (долу)
  for (let x = 10; x < 17; x++) { const yb = oy + 8 + (x >> 1) + 1; for (let k = FH - 12; k < FH - 1; k++) px(g, x, yb + k, k === FH - 12 ? '#241f1a' : '#1a140e'); }
  px(g, 15, oy + 8 + 7 + 1 + FH - 6, '#9a9da5');
  // зъбери-корона по задните ръбове на капака
  for (const [mx, my] of [[14, oy - 4], [4, oy + 1], [24, oy + 1], [0, oy + 6], [28, oy + 6]]) {
    rc(g, mx, my, 4, 6, st); px(g, mx, my, stL); px(g, mx + 3, my + 1, stD);
  }
  outlineSprite(g, '#10131c');
  return g.canvas;
}

// за да не скрива героя, когато е встрани). Котва pyo=8 като стенния блок.
// стенен БЛОК-призма 32x(12+16+26): пасва точно на плочката -> стената е едно цяло
// каменна снага (двойна височина) + дървена палисада, издигаща се от пътеката отгоре
function genMirWallBlock(R) {
  const SK = 12, FH = 26;
  const g = mk(32, SK + 16 + FH);
  const top = '#5a5f67', topL = '#6d7280', topD = '#4a4e56';
  const faceL = '#454952', faceR = '#383c44', mort = '#2b2f36';
  // капак (каменна пътека)
  fillDiamond(g, SK, top);
  for (let i = 0; i < 40; i++) {
    const x = (R() * 32) | 0, y = (R() * 16) | 0;
    if (inDiamond(x, y)) px(g, x, SK + y, R() < 0.5 ? topD : topL);
  }
  for (let y = 0; y < 8; y++) {
    const [x0, w] = diamondSpan(y);
    px(g, x0, SK + y, topL); px(g, x0 + w - 1, SK + y, topL);
  }
  // лица със зидария (същата геометрия като стените на подземието)
  for (let x = 0; x < 32; x++) {
    const left = x < 16;
    const yb = SK + (left ? 8 + (x >> 1) + 1 : 8 + ((31 - x) >> 1) + 1);
    for (let k = 0; k < FH; k++) {
      const y = yb + k;
      if (y >= SK + 16 + FH) continue;
      let col = left ? faceL : faceR;
      if (k % 5 === 4) col = mort;
      else if (((x + ((k / 5) | 0) * 4) % 8) === 0) col = mort;
      if (k >= FH - 2) col = mort;
      px(g, x, y, col);
    }
    px(g, x, yb, left ? topL : topD);
  }
  for (let k = 0; k < FH; k++) px(g, 16, SK + 16 + k, mort);
  outlineSprite(g, '#10131c');
  return g.canvas;
}

function genGateTower(R) {
  const FH = 58, oy = 14; // мерлони 0..13, диамант 14..29, лица 30..87 (+2 блока)
  const g = mk(32, oy + 16 + FH); // канвата РАСТЕ с височината (беше 64 — режеше кулите отдолу!)
  const st = '#5a5f67', stD = '#4a4e56', stL = '#6d7280', mort = '#2b2f36';
  // капак
  for (let y = 0; y < 16; y++) { const [x0, w2] = diamondSpan(y); rc(g, x0, oy + y, w2, 1, st); }
  for (let i = 0; i < 30; i++) { const x = (R() * 32) | 0, y = (R() * 16) | 0; if (inDiamond(x, y)) px(g, x, oy + y, R() < 0.5 ? stD : stL); }
  for (let y = 0; y < 8; y++) { const [x0, w2] = diamondSpan(y); px(g, x0, oy + y, stL); px(g, x0 + w2 - 1, oy + y, stL); }
  // лица със зидария
  for (let x = 0; x < 32; x++) {
    const left = x < 16;
    const yb = oy + (left ? 8 + (x >> 1) + 1 : 8 + ((31 - x) >> 1) + 1);
    for (let k = 0; k < FH; k++) {
      const y = yb + k;
      if (y >= oy + 16 + FH) continue;
      let col = left ? '#454952' : '#383c44';
      if (k % 5 === 4) col = mort;
      else if (((x + ((k / 5) | 0) * 4) % 8) === 0) col = mort;
      if (k === FH - 3) col = mort;
      else if (k === FH - 2) col = '#2b2f36';       // тъмна основа —
      else if (k === FH - 1) col = '#20242b';       // кулата стъпва на земята
      px(g, x, y, col);
    }
    px(g, x, yb, left ? stL : stD);
  }
  for (let k = 0; k < FH; k++) px(g, 16, oy + 16 + k, mort);
  // бойница на лицето + факла
  rc(g, 7, oy + 22, 2, 5, '#12100c'); px(g, 7, oy + 21, stD);
  px(g, 24, oy + 20, '#ffb84d'); px(g, 24, oy + 21, '#c98a3b');
  // мерлони-корона по задните ръбове на капака
  for (const [mx, my] of [[14, oy - 18 + 14], [4, oy - 13 + 14], [24, oy - 13 + 14], [0, oy - 8 + 14], [28, oy - 8 + 14]]) {
    rc(g, mx, my, 4, 6, st);
    px(g, mx, my, stL); px(g, mx + 3, my + 1, stD);
    px(g, mx + 1, my + 5, stD);
  }
  outlineSprite(g, '#10131c');
  return g.canvas;
}
// ГРЕДАТА СЪС ЗНАМЕНАТА над прохода (рисува се РАНО — никога не скрива героя)
// канвата е по-висока с прозрачно дъно -> виси във въздуха на нивото на кулите
function genGateBanner(R) {
  const g = mk(68, 64);
  // гредата минава през ЦЕЛИЯ отвор и опира в двете кули
  for (let x = 0; x < 68; x++) {
    const y = 1 + (x >> 1);
    rc(g, x, y, 1, 2, '#382d20');
    if (x % 10 === 0) { px(g, x, y - 1, '#4a3c2c'); px(g, x, y + 2, '#241c12'); }
  }
  // избелели ЧЕРВЕНИ ЗНАМЕНА
  const ban = (x0, col, colD, hgt) => {
    const by0 = 1 + (x0 >> 1) + 2;
    rc(g, x0, by0, 7, hgt, col); rc(g, x0, by0, 7, 1, colD);
    for (let x = x0; x < x0 + 7; x += 2) px(g, x, by0 + hgt, col); // назъбен край
    px(g, x0 + 2, by0 + 4, '#c9a23b'); px(g, x0 + 3, by0 + 5, '#c9a23b'); px(g, x0 + 2, by0 + 6, '#c9a23b');
  };
  ban(16, '#7a2e33', '#8a3a40', 13);
  ban(42, '#6e2a30', '#7e363c', 12);
  outlineSprite(g, '#10131c');
  return g.canvas;
}

// 2.5D ЦЪРКВА върху 2x2 клетки: високи каменни стени, пирамидален покрив,
// камбанария със златен кръст отгоре, розетка и витражи (pyo=16)
function genChurch(R) {
  const wallH = 34, roofH = 14, oy = 26; // над oy стърчи камбанарията
  const g = mk(64, oy + 32 + wallH);
  const pal = {
    wallSW: '#565a62', wallSWd: '#4a4e56', wallSE: '#484c54', wallSEd: '#3e424a',
    beam: '#3a3e46', stone: '#44484f', stoneD: '#33373d',
    rA: '#2d333c', rB: '#232830', rC: '#39404a', rD: '#1c2128',
  };
  // КАМБАНАРИЯТА: рисува се ПРЕДИ покрива и СТЪПВА на билото (гърбът му я подпира)
  rc(g, 34, 12, 12, 24, '#565a62');
  rc(g, 34, 12, 2, 22, '#6d7280'); rc(g, 44, 12, 2, 22, '#4a4e56');
  for (let y = 16; y < 33; y += 4) rc(g, 35, y, 10, 1, '#3a3e46');
  rc(g, 37, 18, 6, 7, '#12100c'); px(g, 39, 20, '#8a8d95'); px(g, 39, 21, '#6a6d75'); // камбаната
  px(g, 37, 17, '#4a4e56'); px(g, 42, 17, '#4a4e56');
  for (let i = 0; i < 5; i++) rc(g, 35 + i, 11 - i * 2, 10 - i * 2, 2, i % 2 ? '#232830' : '#2d333c'); // шпилът
  rc(g, 39, 0, 2, 6, '#c9a23b'); rc(g, 37, 1, 6, 2, '#c9a23b'); px(g, 39, 0, '#e8c04a');   // КРЪСТЪТ
  iso2Body(g, R, oy, wallH, roofH, pal);
  // контрафорси по фасадата
  for (const cx2 of [6, 24]) { const ey = iso2EdgeY(oy, cx2); for (let k = 2; k <= wallH - 2; k++) { px(g, cx2, ey + k, '#6d7280'); px(g, cx2 + 1, ey + k, '#4a4e56'); } }
  // АРКА-ВРАТА в центъра на фасадата
  iso2Door(g, oy, wallH, 12, 8, 14);
  { const ey = iso2EdgeY(oy, 15); px(g, 13, ey + wallH - 15, '#33373d'); px(g, 17, ey + wallH - 15, '#33373d'); }
  // РОЗЕТКАТА — кръгло топло прозорче над вратата
  { const mx = 15, ey = iso2EdgeY(oy, mx);
    const ry = ey + 6;
    px(g, mx, ry - 1, '#c98a3b'); px(g, mx, ry + 1, '#c98a3b'); px(g, mx - 1, ry, '#c98a3b'); px(g, mx + 1, ry, '#c98a3b');
    px(g, mx, ry, '#fff2c0'); }
  // ВИТРАЖИ на СИ-стената (тесни, топли)
  for (const wx of [38, 46, 54]) {
    for (let x = wx; x < wx + 3; x++) { const ey = iso2EdgeY(oy, x); for (let k = 6; k < 15; k++) px(g, x, ey + k, '#171310'); }
    const ey2 = iso2EdgeY(oy, wx + 1); px(g, wx + 1, ey2 + 8, '#e8a84d'); px(g, wx + 1, ey2 + 11, '#8a6420');
  }
  outlineSprite(g, '#10131c');
  return g.canvas;
}

// СВЕЩЕНИКЪТ — фигура в тъмно расо със златен кръст
function genPriest() {
  const g = mk(14, 20);
  rc(g, 4, 6, 6, 12, '#3a3345');            // расото
  rc(g, 4, 6, 2, 12, '#463f52');
  rc(g, 4, 17, 6, 1, '#2a2433');
  rc(g, 5, 2, 4, 4, '#c9a58a'); px(g, 5, 2, '#3a3345'); px(g, 8, 2, '#3a3345'); // лице с качулка
  rc(g, 4, 1, 6, 2, '#3a3345');
  px(g, 6, 9, '#c9a23b'); px(g, 7, 9, '#c9a23b'); px(g, 6, 10, '#c9a23b'); px(g, 7, 10, '#e8c04a'); // кръстчето
  px(g, 3, 10, '#c9a58a'); px(g, 10, 11, '#c9a58a'); // ръце
  outlineSprite(g, '#10131c');
  return g.canvas;
}
// КУТИЯТА ЗА ДАРЕНИЯ — дървена, обкована, с процеп и монета
function genAlmsbox() {
  const g = mk(16, 16);
  rc(g, 2, 6, 12, 8, '#4a3c2c'); rc(g, 2, 6, 12, 1, '#5c4a34');
  rc(g, 2, 13, 12, 1, '#382d20');
  rc(g, 2, 6, 1, 8, '#5c4a34'); rc(g, 13, 6, 1, 8, '#382d20');
  rc(g, 4, 8, 1, 4, '#6a6d75'); rc(g, 11, 8, 1, 4, '#6a6d75'); // обков
  rc(g, 6, 7, 4, 1, '#171310');                                 // процепът
  px(g, 7, 5, '#d8dee8'); px(g, 8, 4, '#c6d0dc');               // монета над процепа
  rc(g, 3, 14, 10, 1, '#565a62');
  outlineSprite(g, '#10131c');
  return g.canvas;
}

// ПЕЩЕРА-ВХОД към подземието (заменя портала на повърхността); отворът е чист мрак
function genCaveMouth(R) {
  const g = mk(48, 36);
  const rk = '#4e5258', rkD = '#3c4046', rkL = '#61666e', dirt = '#453a2d';
  // скалният хълм — грамада от заоблени камъни
  rc(g, 6, 22, 36, 10, rk);
  rc(g, 4, 26, 40, 6, rk);
  rc(g, 10, 14, 28, 10, rk);
  rc(g, 16, 8, 18, 8, rk);
  rc(g, 20, 5, 10, 4, rk);
  // светлосенки по камъните
  rc(g, 16, 8, 3, 3, rkL); rc(g, 10, 14, 3, 4, rkL); rc(g, 6, 22, 3, 4, rkL); px(g, 21, 5, rkL);
  rc(g, 31, 10, 3, 4, rkD); rc(g, 35, 16, 3, 6, rkD); rc(g, 39, 24, 3, 6, rkD); rc(g, 28, 7, 2, 2, rkD);
  for (let i = 0; i < 26; i++) { const x = 7 + ((R() * 34) | 0), y = 9 + ((R() * 20) | 0); px(g, x, y, R() < 0.5 ? rkD : rkL); }
  // пукнатини
  px(g, 14, 18, rkD); px(g, 15, 19, rkD); px(g, 16, 20, rkD);
  px(g, 33, 20, rkD); px(g, 34, 21, rkD);
  // ОТВОРЪТ — черна паст с арка (само мрак, нищо не наднича отвътре)
  rc(g, 18, 16, 12, 16, '#0a0c10');
  rc(g, 16, 20, 16, 12, '#0a0c10');
  px(g, 17, 18, '#0a0c10'); px(g, 30, 18, '#0a0c10');
  // ръбът на отвора — светъл кант
  px(g, 17, 17, rkL); px(g, 18, 15, rkL); px(g, 29, 15, rkD); px(g, 31, 19, rkD);
  // мъх и камъчета при входа
  px(g, 12, 25, '#4f6a45'); px(g, 13, 24, '#4f6a45'); px(g, 35, 27, '#4f6a45');
  rc(g, 8, 31, 5, 2, rkD); rc(g, 36, 32, 6, 2, rkD); rc(g, 30, 33, 4, 1, rkD);
  rc(g, 14, 33, 20, 2, dirt); // отъпкана пръст пред входа
  outlineSprite(g, '#10131c');
  return g.canvas;
}

// малки менхири за кръга около хенчстоуна (3 варианта)
function genMenhir(v) {
  const g = mk(10, 14);
  const st = '#565a62', stD = '#44484f', stL = '#686d76';
  if (v === 0) {        // висок тесен
    rc(g, 3, 2, 4, 10, st); rc(g, 4, 1, 2, 1, st);
    rc(g, 3, 2, 1, 9, stL); rc(g, 6, 3, 1, 9, stD);
  } else if (v === 1) { // наклонен
    rc(g, 2, 4, 4, 8, st); rc(g, 3, 2, 4, 4, st); rc(g, 4, 1, 2, 2, st);
    rc(g, 3, 2, 1, 3, stL); px(g, 2, 4, stL); rc(g, 6, 5, 1, 6, stD);
  } else {              // нисък объл
    rc(g, 2, 6, 6, 6, st); rc(g, 3, 5, 4, 1, st);
    rc(g, 2, 6, 1, 5, stL); rc(g, 7, 7, 1, 5, stD);
  }
  px(g, 3, 11, '#4f6a45'); px(g, 6, 11, '#4f6a45'); // мъх при основата
  rc(g, 2, 12, 6, 1, stD);
  outlineSprite(g, '#10131c');
  return g.canvas;
}

// ХЕНЧСТОУН — стоящ камък с ВДЪЛБАНА руна (светенето е отделен слой в рендера)
function genHearthstone() {
  const g = mk(26, 34);
  const st = '#5c6068', stD = '#4a4e56', stL = '#6d7280';
  rc(g, 8, 4, 10, 2, st); rc(g, 6, 6, 14, 4, st); rc(g, 5, 10, 16, 18, st);
  rc(g, 6, 28, 14, 2, stD);
  rc(g, 8, 4, 2, 2, stL); rc(g, 6, 6, 2, 4, stL); rc(g, 5, 10, 2, 16, stL); // светъл ръб
  rc(g, 16, 6, 4, 4, stD); rc(g, 18, 10, 3, 18, stD);                        // сянка
  px(g, 7, 26, '#4f6a45'); px(g, 6, 27, '#4f6a45'); px(g, 17, 27, '#4f6a45'); // мъх
  // вдълбаният жлеб на руната (тъмен — светещият знак ляга точно отгоре)
  for (const [x, y] of HEARTH_RUNE_PX) { px(g, 9 + x, 11 + y, '#33373d'); px(g, 9 + x, 12 + y, '#3c4046'); }
  // основа: камъчета
  rc(g, 3, 30, 6, 2, stD); rc(g, 16, 30, 7, 2, stD); rc(g, 10, 31, 6, 1, stD);
  outlineSprite(g, '#10131c');
  return g.canvas;
}
// глифът: два ромба един върху друг (пясъчен часовник) със ставен пиксел
const HEARTH_RUNE_PX = [
  [3, 0], [2, 1], [4, 1], [1, 2], [5, 2], [2, 3], [4, 3], [3, 4],
  [3, 5], [2, 6], [4, 6], [1, 7], [5, 7], [2, 8], [4, 8], [3, 9],
];
// светещият знак: halo (разширен, тъмен циан) + core (ярък) — пулсират в рендера
function genHearthRune() {
  const mkLayer = (col, dilate) => {
    const g = mk(11, 14);
    const set = new Set();
    for (const [x, y] of HEARTH_RUNE_PX) {
      set.add((x + 2) + ':' + (y + 2));
      if (dilate) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set.add((x + 2 + dx) + ':' + (y + 2 + dy));
    }
    for (const key of set) { const [x, y] = key.split(':').map(Number); px(g, x, y, col); }
    return g.canvas;
  };
  return { halo: mkLayer('#2f8a80', true), core: mkLayer('#a8fff2', false) };
}

function genMirPuddle(R) {
  const g = mk(18, 10);
  const w1 = '#3a4450', w2 = '#46525f', w3 = '#525f6d';
  rc(g, 3, 2, 12, 6, w1); rc(g, 1, 4, 16, 3, w1); rc(g, 5, 1, 7, 8, w1);
  rc(g, 4, 3, 5, 1, w2); rc(g, 10, 5, 4, 1, w2); px(g, 6, 6, w2);
  px(g, 5, 3, w3); px(g, 12, 5, w3);                                 // небесен отблясък
  return g.canvas;
}

function initSurfaceSprites() {
  if (Spr.surf) return;
  const R = mulberry32(4242);
  Spr.surf = {
    grass: [0, 1, 2, 3].map(() => genGrass(R, false)),
    dirt: [0, 1].map(() => genGrass(R, true)),
    tree: genTree(R, false),
    deadTree: genTree(R, true),
    rock: genRockS(R),
    tomb: genTomb(R),
    pillar: genPillar(),
    fence: genFence(),
    campfire: genCampfire(),
    stalls: {
      weapon: genStall(['#8f2a3a', '#6e1f2c']),
      armor: genStall(['#2a4a8f', '#1f3a6e']),
      potion: genStall(['#2f6e3a', '#245229']),
      jewel: genStall(['#6e2a8f', '#521f6e']),
    },
    stallTiers: {
      weapon: [1, 2, 3, 4, 5].map(t => genStallTier(t, ['#8f2a3a', '#6e1f2c'], ['#c6d3e6', '#94a1b8', '#e8c04a'])),
      armor: [1, 2, 3, 4, 5].map(t => genStallTier(t, ['#2a4a8f', '#1f3a6e'], ['#94a1b8', '#c6d3e6', '#67738c'])),
      potion: [1, 2, 3, 4, 5].map(t => genStallTier(t, ['#2f6e3a', '#245229'], ['#ff4757', '#3b82f6', '#e8c04a'])),
    },
    mystic: genMysticStand(),
    vendors: {
      weapon: genVendor('weapon'),
      armor: genVendor('armor'),
      potion: genVendor('potion'),
      jewel: genVendor('jewel'),
    },
    portal: genPortal(),
    // МИРХОЛД (2.5D изометрични сгради)
    houses: [genMirHouse(R, 0, false), genMirHouse(R, 1, false)],
    houses2: [genMirHouse(R, 0, true), genMirHouse(R, 1, true)],
    shophouses: {
      weapon: genMirShopHouse('weapon', R),
      armor: genMirShopHouse('armor', R),
      potion: genMirShopHouse('potion', R),
      jewel: genMirShopHouse('jewel', R),
      exchange: genMirShopHouse('exchange', R),
    },
    exchange: genExchangeStand(),
    cave: genCaveMouth(R),                   // входът към всяко подземие
    tower: genMirTower(R),
    wallseg: genMirWallBlock(R),
    gateTower: genGateTower(R),
    gateBanner: genGateBanner(R),
    church: genChurch(R),
    priest: genPriest(),
    almsbox: genAlmsbox(),
    hearth: genHearthstone(),
    hearthRune: genHearthRune(),
    menhirs: [genMenhir(0), genMenhir(1), genMenhir(2)],
    puddle: genMirPuddle(R),
  };
}

// ---------- рисуване с целочислено мащабиране ----------
function blit(ctx2, spr, x, y, flip, alpha) {
  x |= 0; y |= 0;
  if (alpha !== undefined) ctx2.globalAlpha = alpha;
  if (flip) {
    ctx2.save();
    ctx2.translate(x + spr.width * SCALE, y);
    ctx2.scale(-1, 1);
    ctx2.drawImage(spr, 0, 0, spr.width, spr.height, 0, 0, spr.width * SCALE, spr.height * SCALE);
    ctx2.restore();
  } else {
    ctx2.drawImage(spr, 0, 0, spr.width, spr.height, x, y, spr.width * SCALE, spr.height * SCALE);
  }
  if (alpha !== undefined) ctx2.globalAlpha = 1;
}
