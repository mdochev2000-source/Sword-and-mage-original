'use strict';
// ================= ПОВЪРХНОСТТА: отворен свят "Camp of the Exiles" =================

const VENDOR_DEFS = {
  weapon: { name: 'Dragan the Blacksmith', flavor: 'Steel tempered in blood.', slots: ['weapon'] },
  armor:  { name: 'Bogdan the Armorer', flavor: 'Iron between you and their teeth.', slots: ['armor'] },
  potion: { name: 'Yana the Alchemist', flavor: 'Potions and trinkets — everything for survival.', slots: ['ring', 'amulet'] },
  jewel:  { name: 'Master Zahari', flavor: 'I don\'t sell goods. I build paths to power.', slots: [] },
  exchange: { name: 'Kosta the Moneychanger', flavor: 'Hacksilver for coins, coins for treasures.', slots: ['weapon', 'armor', 'ring', 'amulet'] },
};
const VENDOR_UP_COST = [0, 60, 180, 500, 1200]; // цена в СРЕБРО за ниво 2..5 — евтини, защото среброто се събира трудно

// РЪЧНАТА подредба на Мирхолд (от градския dev-едитор, ?editor=1 + F2).
// Наредена на ръка от дизайнера на 2026-08-05 — важи ЗА ВСИЧКИ играчи.
const MIRHOLD_LAYOUT = {"houses":[{"x":25,"y":12,"t":0,"v":0},{"x":33,"y":14,"t":0,"v":1},{"x":15,"y":28,"t":1,"v":0},{"x":11,"y":24,"t":1,"v":1},{"x":26,"y":29,"t":1,"v":0},{"x":30,"y":11,"t":0,"v":1},{"x":15,"y":12,"t":0,"v":0},{"x":12,"y":16,"t":1,"v":1},{"x":34,"y":18,"t":0,"v":0},{"x":13,"y":20,"t":0,"v":1},{"x":33,"y":22,"t":0,"v":0},{"x":30,"y":26,"t":0,"v":1},{"x":9,"y":19,"t":0,"v":0}],"shops":{"weapon":{"x":26,"y":25},"armor":{"x":18,"y":24},"potion":{"x":27,"y":9},"jewel":{"x":18,"y":9},"exchange":{"x":28,"y":17}},"church":{"x":21,"y":14},"tower":{"x":21,"y":20},"cave":{"x":4,"y":37},"travel":{"x":5,"y":31},"decor":[{"k":"deadTree","x":2,"y":2},{"k":"deadTree","x":9,"y":2},{"k":"deadTree","x":17,"y":2},{"k":"rock","x":27,"y":2},{"k":"deadTree","x":35,"y":2},{"k":"deadTree","x":39,"y":2},{"k":"deadTree","x":10,"y":3},{"k":"deadTree","x":11,"y":3},{"k":"deadTree","x":12,"y":3},{"k":"rock","x":37,"y":3},{"k":"deadTree","x":6,"y":4},{"k":"rock","x":14,"y":4},{"k":"deadTree","x":10,"y":5},{"k":"deadTree","x":13,"y":5},{"k":"deadTree","x":37,"y":7},{"k":"deadTree","x":3,"y":6},{"k":"fence","x":14,"y":7},{"k":"rock","x":41,"y":7},{"k":"fence","x":12,"y":8},{"k":"deadTree","x":39,"y":9},{"k":"deadTree","x":2,"y":11},{"k":"deadTree","x":3,"y":11},{"k":"rock","x":4,"y":11},{"k":"deadTree","x":6,"y":11},{"k":"deadTree","x":6,"y":16},{"k":"deadTree","x":43,"y":17},{"k":"deadTree","x":6,"y":19},{"k":"deadTree","x":2,"y":21},{"k":"deadTree","x":3,"y":21},{"k":"deadTree","x":5,"y":21},{"k":"deadTree","x":42,"y":21},{"k":"rock","x":41,"y":24},{"k":"deadTree","x":43,"y":28},{"k":"deadTree","x":39,"y":29},{"k":"deadTree","x":36,"y":30},{"k":"deadTree","x":11,"y":31},{"k":"deadTree","x":37,"y":31},{"k":"deadTree","x":13,"y":34},{"k":"deadTree","x":14,"y":34},{"k":"deadTree","x":32,"y":35},{"k":"deadTree","x":33,"y":35},{"k":"deadTree","x":36,"y":35},{"k":"rock","x":40,"y":37},{"k":"deadTree","x":8,"y":40},{"k":"deadTree","x":38,"y":40},{"k":"rock","x":12,"y":41},{"k":"deadTree","x":38,"y":41},{"k":"rock","x":42,"y":41},{"k":"deadTree","x":8,"y":42}],"sprites":{"tower":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAACcCAYAAADPla2KAAAQAElEQVR4Aczd3a8mWVXH8TqHhjMtovNyJmKYjCagQVBIRMGYGPGWDCbeeKMGY0zUGBOjJlx4wy0XXhr/DBMuuPDCqKDBxDHBF1AChJkMCcz0dPcM09P0OKbdn121qnbt2vXydB/RzvOtvffa67drrVX11FPPy5k5767y39lVLva9WesKClBkff97E/RV7uUKCvCgWReF28voBNe9per5ogDDXoamdrz68QmFO8H11DiLAgx7GZpTF7pa//IolP2r3YvVigIY/n+hPApl/+rju9oCnHCwHn3iqfslV5/asRWvtgAHD5bEf+MTv9098/FnRtiOhXy1XhsFOOFwDjFtKSQYcL9181uazM2bN3O73JQrlv2l54NaZgXIu8gby1WHc7SbKyjslWJ0knh9xMfJzU65YtnfFFWTRYAxU5jOu2KQd5E34Vm0p9oLqe6xI951ilVC+3A0Ai9M510xeLgdPbxa4vWZwvbwKw8rFAd7sHTn0enKU6Fr/GuISy+BlpRza/3Wc788U26tXhvWVtyxNw52UYDGbLnexrTE146cuXKZsv/444/noTZeEbJh2GzscvDYb3aOW3kGbC+2t1B55OLISv72yy+M0rBv72l91npmtUG3c+buFbE4A7qVf338awsJZEWYzb/+m79739E1cKTLVv8I5T7+4I8+ldezJh594l1roeUL6nz9s24+7o6cAf36giixkHF5hNkCwSHGrXbtjGA/GwTWgH0xtc409vDXD+rYzhpX/ANnQP/S1HqO20EEFjs92koyzohaw67s2phTBMS4bvnXtnrc8jlvVY6wtq9Vnm8gqejvtWVye771fB1bOe+A1Jhn09act6rCac1uLrCoowK2SCpatj22klnT1rGJg6+2PlPD7mzVr8lPAUEQB5z0tUt4d+ObmOX8uqV1htTJrKunmXKdZz7+8RxLxNs6UyN5PiVWPGf4wfTWtKycK7fJNn3IZRD8Hnv8nZpNnBlH/DYXSZPWSU3Xt308zwzvLNlLJC9HlDnyZzsPY6tyFuKkRZl0v3PWnlLfW9rbo35tdbfzqt8t/olfEUyU+45czltGziBWKRjXSbOVxKKl7UH6/ZOsreyPd3uutsY68qjnopL5GrCYTAZJI3Xzo0xurRBr9rzACZtTkmwt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","church":"data:image/png;base64,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"},"paths":"AAAAAAAAAAAAAAAAAAAYAAAAAAAGAAAAAIABAAAAAGAAAAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAEAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAgAAAAIAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAQAAAAAAAEAgAAAAAAIAAAAAQACAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAAAABgAYAAAAAYAGAAAgAEABgAAYACAAQAA/P9/AAAAAwAYAAAAAAAGAAAAAIABAAAAAGAAAAAAABgAAAAAAAYAAAAAAAAAAAAAAAAAAA=="};
function mirholdLayout() {
  try {
    const local = JSON.parse(localStorage.getItem('sm_layout_mirhold') || 'null');
    if (local && local.houses) return local; // локалната (на дизайнера) е с предимство
  } catch (e) {}
  return MIRHOLD_LAYOUT;
}
const STALL_NAMES = ['cart', 'small tent', 'tent', 'large tent', 'pavilion'];

const Surface = {
  SIZE: 46,

  generate(seed) {
    const R = mulberry32(seed >>> 0);
    const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    const w = this.SIZE, h = this.SIZE;
    const cells = new Uint8Array(w * h);
    const variant = new Uint8Array(w * h);
    const path = new Uint8Array(w * h);
    const B = 3; // черна гора по ръба
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (i >= B && j >= B && i < w - B && j < h - B) cells[j * w + i] = FLOOR;
      variant[j * w + i] = Math.floor(R() * 4);
    }

    const cx = w >> 1, cy = h >> 1;
    // сгъстен лагер: търговците са на 7-9 плочки от огъня, порталът малко по-далеч
    const spots = {
      camp: { x: cx, y: cy },
      weapon: { x: cx - 8, y: cy - 3 },          // запад
      armor: { x: cx + 8, y: cy - 3 },           // изток
      potion: { x: cx - 6, y: cy + 6 },          // югозапад
      jewel: { x: cx + 1, y: cy - 9 },           // север, при руините
      exchange: { x: cx + 7, y: cy + 4 },        // югоизток — САРАФИНЪТ (сребро и рядкости)
      portal: { x: cx + 9, y: cy + 9 },          // югоизток — гробището
      travel: { x: cx - 9, y: cy + 8 },          // югозапад — порталът към МИРХОЛД
    };

    // пътеки от лагера до всяка точка
    const carvePath = (ax, ay, bx, by) => {
      let x = ax, y = ay;
      const step = () => { path[y * w + x] = 1; if (x + 1 < w) path[y * w + x + 1] = 1; };
      while (x !== bx) { step(); x += x < bx ? 1 : -1; }
      while (y !== by) { step(); y += y < by ? 1 : -1; }
      step();
    };
    for (const k of ['weapon', 'armor', 'potion', 'jewel', 'exchange', 'portal', 'travel']) {
      carvePath(spots.camp.x, spots.camp.y, spots[k].x, spots[k].y);
    }

    const props = [];
    const used = new Set();
    const noProp = (x, y, r) => { for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) used.add(j * w + i); };
    // пазим свободно около опорните точки (повече място за големите палатки)
    for (const k in spots) noProp(spots[k].x, spots[k].y, k === 'camp' || k === 'portal' ? 2 : 3);

    // лагерен огън
    props.push({ kind: 'campfire', x: spots.camp.x + 0.5, y: spots.camp.y + 0.5, r: 0.4, solid: true });
    // пещерата към Бездната (плътна скала — не се минава през нея)
    props.push({ kind: 'portal', x: spots.portal.x + 0.5, y: spots.portal.y + 0.5, r: 0.7, solid: true });
    // хенчстоунът към МИРХОЛД (плътен камък)
    props.push({ kind: 'cityportal', city: 'mirhold', x: spots.travel.x + 0.5, y: spots.travel.y + 0.5, r: 0.45, solid: true });

    // търговци: сергия + продавач отпред-вдясно (за да не го скриват големите палатки)
    for (const vt of ['weapon', 'armor', 'potion', 'jewel']) {
      const s = spots[vt];
      props.push({ kind: 'stall', vtype: vt, x: s.x + 0.5, y: s.y + 0.5, r: 0.6, solid: true });
      props.push({ kind: 'vendor', vtype: vt, x: s.x + 1.6, y: s.y + 1.1, r: 0.3, solid: true, name: VENDOR_DEFS[vt].name });
    }
    // САРАФИНЪТ: тезгях с везните — обменя сечено сребро, продава рядкости
    props.push({ kind: 'stall', vtype: 'exchange', x: spots.exchange.x + 0.5, y: spots.exchange.y + 0.5, r: 0.6, solid: true });

    // гробище около портала
    for (let t = 0; t < 7; t++) {
      const x = spots.portal.x + ri(-4, 3), y = spots.portal.y + ri(-4, 3);
      const idx = y * w + x;
      if (cells[idx] !== FLOOR || used.has(idx) || path[idx]) continue;
      used.add(idx);
      props.push({ kind: 'tomb', x: x + 0.5, y: y + 0.5, r: 0.3, solid: true });
    }
    // руини около бижутера
    for (let t = 0; t < 4; t++) {
      const x = spots.jewel.x + ri(-4, 4), y = spots.jewel.y + ri(-2, 4);
      const idx = y * w + x;
      if (cells[idx] !== FLOOR || used.has(idx) || path[idx]) continue;
      used.add(idx);
      props.push({ kind: 'pillar', x: x + 0.5, y: y + 0.5, r: 0.35, solid: true });
    }
    // огради около лагера (накъсани)
    for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 2], [0, -4], [-4, 0]]) {
      const x = cx + dx, y = cy + dy;
      const idx = y * w + x;
      if (used.has(idx) || path[idx]) continue;
      used.add(idx);
      props.push({ kind: 'fence', x: x + 0.5, y: y + 0.5, r: 0.35, solid: true });
    }

    // гора: гъста по ръба, разредена навътре
    for (let j = B; j < h - B; j++) for (let i = B; i < w - B; i++) {
      const idx = j * w + i;
      if (cells[idx] !== FLOOR || used.has(idx) || path[idx]) continue;
      // без дървета плътно до пътеките
      let nearPath = false;
      for (let dj = -1; dj <= 1 && !nearPath; dj++) for (let di = -1; di <= 1; di++) {
        if (path[(j + dj) * w + (i + di)]) { nearPath = true; break; }
      }
      if (nearPath) { if (R() < 0.03) { props.push({ kind: 'rock', x: i + 0.5, y: j + 0.5, r: 0.3, solid: true }); used.add(idx); } continue; }
      const edgeD = Math.min(i - B, j - B, w - B - 1 - i, h - B - 1 - j);
      const dense = edgeD < 2 ? 0.55 : edgeD < 4 ? 0.2 : 0.07;
      if (R() < dense) {
        used.add(idx);
        props.push({ kind: R() < 0.75 ? 'tree' : (R() < 0.5 ? 'deadTree' : 'rock'), x: i + 0.5, y: j + 0.5, r: 0.38, solid: true });
      }
    }

    return {
      map: { w, h, cells, variant, rooms: [], start: { x: cx + 0.5, y: cy + 1.7 }, path },
      props, spots,
    };
  },

  // ---------- МИРХОЛД: укрепен граничен град на кръстопът (домът на героя) ----------
  // ниска каменна стена с палисада, една порта на юг, кула с фенер в центъра,
  // плътни къщи, кал и локви, голи дървета и изоставени ниви навън, 3 пътя в мъглата
  generateMirhold(seed) {
    const R = mulberry32((seed ^ 0x9e3779b9) >>> 0);
    const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    const w = this.SIZE, h = this.SIZE;
    const cells = new Uint8Array(w * h);
    const variant = new Uint8Array(w * h);
    const path = new Uint8Array(w * h);
    const B = 2;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (i >= B && j >= B && i < w - B && j < h - B) cells[j * w + i] = FLOOR;
      variant[j * w + i] = Math.floor(R() * 4);
    }
    const cx = w >> 1, cy = (h >> 1) - 3; // градът е леко на север — място за кръстопътя на юг
    const RAD = 15; // по-голям град
    const props = [];
    const used = new Set();
    const block = (x, y) => { const idx = y * w + x; cells[idx] = 0; used.add(idx); };

    // СТЕНАТА: каменен пръстен с ДВА входа — порта на юг и задна порта на север.
    // Отворът е 3 клетки; клетките на ±2 остават блокирани — върху тях стъпват кулите на портата.
    const gY = cy + Math.round(RAD / 1.1);  // редът на пръстена точно на юг
    const gNY = cy - Math.round(RAD / 1.1); // и на север
    const gateX = cx;
    for (let j = B; j < h - B; j++) for (let i = B; i < w - B; i++) {
      const d = Math.hypot(i - cx, (j - cy) * 1.1);
      if (d >= RAD - 0.5 && d < RAD + 0.6) {
        const adx = Math.abs(i - gateX);
        const southGap = j > cy + 3, northGap = j < cy - 3;
        if (adx <= 1 && (southGap || northGap)) continue;       // проходът — свободен
        block(i, j);
        if (adx === 2 && (southGap || northGap)) continue;      // кулите на портата заместват стената тук
        props.push({ kind: 'wallseg', x: i + 0.5, y: j + 0.5, r: 0.5, solid: false });
      }
    }
    // портите: ДВЕ отделни кули (всяка със собствена дълбочина — не скриват героя
    // когато е встрани) + греда със знамената, рисувана рано (никога върху героя)
    for (const gy2 of [gY, gNY]) {
      props.push({ kind: 'gatetower', x: gateX - 1.5, y: gy2 + 0.5, r: 0.5, solid: false });
      props.push({ kind: 'gatetower', x: gateX + 2.5, y: gy2 + 0.5, r: 0.5, solid: false });
      props.push({ kind: 'gatebanner', x: gateX + 0.5, y: gy2 + 0.4, r: 0.1, solid: false });
    }

    // СТРУКТУРАТА: ПЛОЩАД в центъра (кулата, огънят и магазините около него),
    // къщите — в пръстен покрай стената, свързани с околовръстна улица.
    // Ако има РЪЧНА подредба от едитора — тя замества позициите на сградите.
    const LAY = mirholdLayout();
    const spots = {
      tower: { x: cx, y: cy - 1 },
      jewel: { x: cx + 4, y: cy - 6 },    // Мистикът — североизточния ръб на площада (север е за църквата)
      weapon: { x: cx - 9, y: cy - 1 },   // ковачницата — западния
      armor: { x: cx + 7, y: cy - 1 },    // бронетворецът — източния
      potion: { x: cx - 6, y: cy + 5 },   // алхимикът — югозападния
      exchange: { x: cx + 4, y: cy + 5 }, // сарафинът — югоизточния
      dungeon: { x: gateX + 5, y: gY + 3 },  // порталът към тъмницата — ИЗВЪН стените, източно от пътя
      travel: { x: gateX - 5, y: gY + 3 },   // хенчстоунът — ИЗВЪН стените, западно от пътя
    };
    if (LAY) {
      if (LAY.tower) spots.tower = { x: LAY.tower.x, y: LAY.tower.y };
      if (LAY.cave) spots.dungeon = { x: LAY.cave.x, y: LAY.cave.y };
      if (LAY.travel) spots.travel = { x: LAY.travel.x, y: LAY.travel.y };
      for (const vt of ['weapon', 'armor', 'potion', 'jewel', 'exchange']) if (LAY.shops && LAY.shops[vt]) spots[vt] = { x: LAY.shops[vt].x, y: LAY.shops[vt].y };
    }
    // улици вътре + пътища навън
    const carve = (ax, ay, bx, by) => {
      let x = ax, y = ay;
      const st = () => { path[y * w + x] = 1; if (x + 1 < w) path[y * w + x + 1] = 1; };
      while (y !== by) { st(); y += y < by ? 1 : -1; }
      while (x !== bx) { st(); x += x < bx ? 1 : -1; }
      st();
    };
    carve(gateX, gY - 1, cx, cy + 1);  // южната порта -> центъра
    carve(gateX, gNY + 1, cx, cy - 1); // задната порта -> центъра
    // ПЛОЩАДЪТ: широка отъпкана зона в сърцето на града
    for (let j = cy - 5; j <= cy + 5; j++) for (let i = cx - 5; i <= cx + 6; i++) {
      if (Math.hypot(i - cx - 0.5, (j - cy) * 1.1) < 4.9) path[j * w + i] = 1;
    }
    // пътеки от площада до всеки магазин
    for (const k of ['weapon', 'armor', 'potion', 'jewel', 'exchange']) carve(cx, cy + 1, spots[k].x, spots[k].y + 2);
    // ДВЕ околовръстни улици — вътрешна (около площада) и външна (при стените);
    // къщите се редят покрай тях от всички страни
    for (const rr of [7.5, 11]) {
      for (let a = 0; a < 84; a++) {
        const ang = a / 84 * Math.PI * 2;
        const x = Math.round(cx + Math.cos(ang) * rr), y = Math.round(cy + Math.sin(ang) * rr / 1.1);
        path[y * w + x] = 1; path[y * w + x + 1] = 1;
      }
    }
    // лъчи от площада към околовръстната (диагоналите)
    for (const ang of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
      const rx2 = Math.round(cx + Math.cos(ang) * 11), ry2 = Math.round(cy + Math.sin(ang) * 11 / 1.1);
      carve(rx2, ry2, cx + Math.round(Math.cos(ang) * 4), cy + Math.round(Math.sin(ang) * 3.6));
    }
    // КРЪСТОПЪТЯТ: 3 пътя потъват в мъглата (юг, югозапад, югоизток) + път на север от задната порта
    const crossY = Math.min(h - B - 2, gY + 4);
    for (let y = gY; y < h - B; y++) { path[y * w + gateX] = 1; path[y * w + gateX + 1] = 1; }
    for (let y = B; y <= gNY; y++) { path[y * w + gateX] = 1; path[y * w + gateX + 1] = 1; }
    let dx2 = gateX, dy2 = crossY;
    while (dx2 > B + 1 && dy2 < h - B - 1) { path[dy2 * w + dx2] = 1; path[dy2 * w + dx2 - 1] = 1; dx2--; if (R() < 0.5) dy2++; }
    dx2 = gateX; dy2 = crossY;
    while (dx2 < w - B - 2 && dy2 < h - B - 1) { path[dy2 * w + dx2] = 1; path[dy2 * w + dx2 + 1] = 1; dx2++; if (R() < 0.5) dy2++; }
    // отбивки към хенчстоуна и портала на тъмницата
    carve(spots.travel.x, spots.travel.y + 1, gateX, gY + 3);
    carve(spots.dungeon.x, spots.dungeon.y + 1, gateX, gY + 3);

    const noProp = (x, y, r) => { for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) used.add(j * w + i); };

    // ТЪРГОВЦИТЕ — в ПОСТРОЙКИ, пасващи на града (не тараби)
    // блокираме 2x2 клетки (48px) — точно колкото са широки стените, БЕЗ невидими зони
    for (const vt of ['weapon', 'armor', 'potion', 'jewel', 'exchange']) {
      const s = spots[vt];
      for (let dj = -1; dj <= 0; dj++) for (let di = 0; di <= 1; di++) block(s.x + di, s.y + dj);
      props.push({ kind: 'shophouse', vtype: vt, x: s.x + 1.0, y: s.y + 0.0, r: 0.6, solid: false, name: VENDOR_DEFS[vt].name });
      noProp(s.x, s.y + 1, 1); // свободно пред вратата
    }
    // КУЛАТА на гарнизона: масивен КИЙП върху 2x2 клетки (като къщите)
    for (let dj = -1; dj <= 0; dj++) for (let di = 0; di <= 1; di++) block(spots.tower.x + di, spots.tower.y + dj);
    props.push({ kind: 'tower', x: spots.tower.x + 1.0, y: spots.tower.y + 0.0, r: 0.6, solid: false });
    // ЦЪРКВАТА на северния ръб на площада (замества огъня): пълно изцеление при
    // свещеника + кутия за дарения (благословия срещу сребро)
    const ch = (LAY && LAY.church) ? { x: LAY.church.x, y: LAY.church.y } : { x: cx - 4, y: cy - 6 };
    for (let dj = -1; dj <= 0; dj++) for (let di = 0; di <= 1; di++) block(ch.x + di, ch.y + dj);
    props.push({ kind: 'church', x: ch.x + 1.0, y: ch.y + 0.0, r: 0.6, solid: false });
    // свещеникът и кутията са премахнати (дизайнерът има друга идея за тях)
    noProp(ch.x, ch.y + 1, 2);
    carve(ch.x, ch.y + 2, cx, cy);
    // ПОРТАЛИ (извън стените): тъмницата на гарнизона + хенчстоунът с кръг от менхири
    // ПЛЪТНИ са — героят не минава през скалата на пещерата, нито през камъка
    props.push({ kind: 'portal', dungeon: 'mirhold', x: spots.dungeon.x + 0.5, y: spots.dungeon.y + 0.5, r: 0.7, solid: true });
    props.push({ kind: 'cityportal', city: 'camp', x: spots.travel.x + 0.5, y: spots.travel.y + 0.5, r: 0.45, solid: true });
    noProp(spots.dungeon.x, spots.dungeon.y, 1);
    noProp(spots.travel.x, spots.travel.y, 2);
    for (let k = 0; k < 8; k++) { // кръгът от малки камъни; пролука откъм пътеката (изток)
      const a = k * Math.PI / 4 + Math.PI / 8;
      if (Math.cos(a) > 0.75) continue;
      props.push({ kind: 'menhir', v: k % 3, x: spots.travel.x + 0.5 + Math.cos(a) * 1.8, y: spots.travel.y + 0.5 + Math.sin(a) * 1.8, r: 0.26, solid: true });
    }

    // ЖИЛИЩНИ КЪЩИ: гъсто и естествено НАВСЯКЪДЕ около площада — от ръба му до
    // стените, с врата към улица. Площадът остава открит. 2x2 клетки колизия.
    if (LAY && LAY.houses && LAY.houses.length) {
      // РЪЧНАТА подредба от едитора: къщите са точно където са оставени
      for (const hh of LAY.houses) {
        for (let dj = -1; dj <= 0; dj++) for (let di = 0; di <= 1; di++) block(hh.x + di, hh.y + dj);
        props.push({ kind: 'house', t: hh.t || 0, v: hh.v || 0, x: hh.x + 1.0, y: hh.y + 0.0, r: 0.6, solid: false });
      }
    } else {
    const candidates = [];
    for (let y = cy - RAD + 3; y <= cy + RAD - 4; y++) for (let x = cx - RAD + 3; x <= cx + RAD - 3; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.1);
      if (d < 6.2 || d > RAD - 2.2) continue; // без площада; чак до стената
      // улица на юг пред вратата (1-2 реда) — къщата гледа към пътя
      let street = false;
      for (let di = 0; di <= 1 && !street; di++) if (path[(y + 1) * w + (x + di)] || path[(y + 2) * w + (x + di)]) street = true;
      if (street) candidates.push({ x, y });
    }
    for (let i = candidates.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; const t = candidates[i]; candidates[i] = candidates[j]; candidates[j] = t; }
    let placed = 0;
    for (const c of candidates) {
      if (placed >= 24) break;
      let free = true;
      for (let dj = -1; dj <= 1 && free; dj++) for (let di = 0; di <= 1; di++) {
        const idx = (c.y + dj) * w + (c.x + di);
        // улица ПРЕД вратата (dj=1) е добре дошла — пътят пречи само под самата къща
        if (cells[idx] !== FLOOR || used.has(idx) || (dj <= 0 && path[idx])) { free = false; break; }
      }
      if (!free) continue;
      for (let dj = -1; dj <= 0; dj++) for (let di = 0; di <= 1; di++) block(c.x + di, c.y + dj);
      // къщите НЕ се допират: винаги въздух отстрани и отзад
      for (const [ax, ay] of [[c.x - 1, c.y], [c.x + 2, c.y], [c.x - 1, c.y - 1], [c.x + 2, c.y - 1], [c.x, c.y - 2], [c.x + 1, c.y - 2], [c.x - 1, c.y - 2], [c.x + 2, c.y - 2], [c.x - 1, c.y + 1], [c.x + 2, c.y + 1]]) used.add(ay * w + ax);
      props.push({ kind: 'house', t: R() < 0.45 ? 1 : 0, v: placed % 2, x: c.x + 1.0, y: c.y + 0.0, r: 0.6, solid: false });
      placed++;
    }
    // ако покрай улиците не се е побрало достатъчно — допълваме из целия пояс
    let tries = 0;
    while (placed < 18 && tries++ < 600) {
      const x = cx + ri(-RAD + 3, RAD - 3), y = cy + ri(-RAD + 3, RAD - 4);
      const d = Math.hypot(x - cx, (y - cy) * 1.1);
      if (d < 6.2 || d > RAD - 2.2) continue;
      let free = true;
      for (let dj = -1; dj <= 1 && free; dj++) for (let di = 0; di <= 1; di++) {
        const idx = (y + dj) * w + (x + di);
        if (cells[idx] !== FLOOR || used.has(idx) || (dj <= 0 && path[idx])) { free = false; break; }
      }
      if (!free) continue;
      for (let dj = -1; dj <= 0; dj++) for (let di = 0; di <= 1; di++) block(x + di, y + dj);
      for (const [ax, ay] of [[x - 1, y], [x + 2, y], [x - 1, y - 1], [x + 2, y - 1], [x, y - 2], [x + 1, y - 2], [x - 1, y - 2], [x + 2, y - 2], [x - 1, y + 1], [x + 2, y + 1]]) used.add(ay * w + ax);
      props.push({ kind: 'house', t: R() < 0.45 ? 1 : 0, v: placed % 2, x: x + 1.0, y: y + 0.0, r: 0.6, solid: false });
      placed++;
    }
    } // край на автоматичното разположение (без ръчна подредба)
    // ЛОКВИ — по калните пътища и из града
    for (let t = 0; t < 30; t++) {
      const x = ri(B + 1, w - B - 2), y = ri(B + 1, h - B - 2);
      const idx = y * w + x;
      if (cells[idx] !== FLOOR || used.has(idx)) continue;
      if (!path[idx] && R() < 0.65) continue;
      props.push({ kind: 'puddle', x: x + 0.5, y: y + 0.5, r: 0, solid: false, flat: true });
    }
    // създадените от дизайнера спрайтове (бутонът CREATE) — дефиниции + платна
    G.customDefs = (LAY && LAY.custom) ? JSON.parse(JSON.stringify(LAY.custom)) : {};
    if (typeof buildCustomSprites === 'function') buildCustomSprites();
    // навън: голи дървета, накъсани огради (изоставени ниви), камъни.
    // Ако дизайнерът е записал декор в подредбата — той замества процедурния.
    if (LAY && Array.isArray(LAY.decor)) {
      const DR = { tree: 0.38, tree2: 0.38, deadTree: 0.38, deadTree2: 0.38, rock: 0.3, rock2: 0.35, rock3: 0.45, bush: 0.3, bush2: 0.3, tuft: 0, tuft2: 0, fence: 0.35, fence2: 0.35, fence3: 0.35 };
      for (const d2 of LAY.decor) {
        if (d2.k === 'custom') {
          const cd = G.customDefs[d2.id];
          if (!cd) continue;
          props.push({ kind: 'custom', cid: d2.id, bx: d2.x, by: d2.y, cw: cd.cw, ch: cd.ch, x: d2.x + cd.cw / 2, y: d2.y + cd.ch / 2, r: 0.5, solid: !!cd.solid });
          continue;
        }
        props.push({ kind: d2.k, x: d2.x + 0.5, y: d2.y + 0.5, r: DR[d2.k] !== undefined ? DR[d2.k] : 0.35, solid: d2.k !== 'tuft' && d2.k !== 'tuft2' });
      }
    } else {
    for (let j = B; j < h - B; j++) for (let i = B; i < w - B; i++) {
      const idx = j * w + i;
      if (cells[idx] !== FLOOR || used.has(idx) || path[idx]) continue;
      const d = Math.hypot(i - cx, (j - cy) * 1.1);
      if (d < RAD + 1.5) continue;
      let nearPath = false;
      for (let dj = -1; dj <= 1 && !nearPath; dj++) for (let di = -1; di <= 1; di++) if (path[(j + dj) * w + (i + di)]) nearPath = true;
      if (nearPath) continue;
      const r2 = R();
      if (r2 < 0.045) { used.add(idx); props.push({ kind: 'deadTree', x: i + 0.5, y: j + 0.5, r: 0.38, solid: true }); }
      else if (r2 < 0.072) { used.add(idx); props.push({ kind: 'fence', x: i + 0.5, y: j + 0.5, r: 0.35, solid: true }); }
      else if (r2 < 0.084) { used.add(idx); props.push({ kind: 'rock', x: i + 0.5, y: j + 0.5, r: 0.3, solid: true }); }
      else if (r2 < 0.094) { used.add(idx); props.push({ kind: 'bush', x: i + 0.5, y: j + 0.5, r: 0.3, solid: true }); }
      else if (r2 < 0.1) { used.add(idx); props.push({ kind: 'rock2', x: i + 0.5, y: j + 0.5, r: 0.35, solid: true }); }
      else if (r2 < 0.13) { props.push({ kind: r2 < 0.115 ? 'tuft' : 'tuft2', x: i + 0.5, y: j + 0.5, r: 0, solid: false }); }
    }
    }

    // РЪЧНО боядисаните пътища (от четката в едитора) заместват процедурните
    if (LAY && typeof LAY.paths === 'string') {
      try {
        const raw = atob(LAY.paths);
        for (let i = 0; i < path.length; i++) path[i] = (raw.charCodeAt(i >> 3) >> (i & 7)) & 1;
      } catch (e) {}
    }
    return {
      map: { w, h, cells, variant, rooms: [], start: { x: gateX + 0.5, y: gY - 1.5 }, path },
      props, spots,
    };
  },
};

// ---------- магазини ----------
function shopItemPrice(it) {
  if (it.slot === 'spell') return 20 + (it.lvl || 1) * 2; // томовете имат добра цена
  let base = it.dmg ? it.dmg * 1.5 : it.armor ? it.armor * 3.5 : 15;
  const wgt = {
    dmg: 3, hp: 0.9, mp: 0.9, armor: 5, spd: 2.5, aspd: 2.2, crit: 3, critd: 1.1, vamp: 9, gold: 1.2,
    spellDmg: 2.5, range: 2, thorns: 4, spellCd: 2.5, spellCost: 2.5, dashCd: 2, hpRegen: 8, mpRegen: 6, xp: 1.5, potionPow: 2,
  };
  for (const a of it.affixes) base += a.v * (wgt[a.k] || 1) * 0.5;
  // сребърната икономика: екипировката струва 5-50 сребро според качеството
  return clamp(Math.round(base * (1 + it.rarity * 0.45) * 0.18), 5, 50);
}
function shopSellPrice(it) { return Math.max(3, Math.round(shopItemPrice(it) * 0.35)); }
function potionPrice(key) { return (POTIONS[key] && POTIONS[key].price) || 0; } // еднократна цена за отключване

// детерминистичен RNG за ДНЕВНАТА стока: същият ден + същото ниво на сергията -> същата стока;
// на всеки 24 часа (нов ден) стоката е различна на случаен принцип
function dailyShopRng(vtype) {
  const day = Math.floor(Date.now() / 86400000);
  const lvl = (G.meta.vendorLvl && G.meta.vendorLvl[vtype]) || 1;
  const str = (G.city || 'camp') + ':' + vtype + ':' + day + ':' + lvl; // отделна дневна стока за всеки град
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return function () {
    h += 0x6D2B79F5; let r = Math.imul(h ^ (h >>> 15), 1 | h);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
// ДНЕВЕН КУРС на сарафина: 80%..125%, същият за целия ден, различен всеки ден
function dailyExchangeRate() {
  const day = Math.floor(Date.now() / 86400000);
  const str = 'rate:' + day;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h += 0x6D2B79F5; let r = Math.imul(h ^ (h >>> 15), 1 | h);
  r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
  const u = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return 0.8 + u * 0.45;
}
// стоката зависи от нивото на сергията: повече, по-редки и по-дълбоки предмети
function genShopStock(vtype) {
  const _mr = Math.random;
  Math.random = dailyShopRng(vtype); // дневна стока: rnd/chance/Items.gen стават детерминистични за деня
  try {
  const def = VENDOR_DEFS[vtype];
  if (vtype === 'jewel') return []; // Мистикът търгува с печати, не със стока
  const lvl = (G.meta.vendorLvl && G.meta.vendorLvl[vtype]) || 1;
  // всеки следващ град: ПО-СКЪПА икономика с ПО-ХУБАВИ предмети (нивата на търговците са споделени)
  const cityTier = G.city === 'mirhold' ? 1 : 0;
  const rare = vtype === 'exchange' ? 1 : 0; // сарафинът: по-редки и по-дълбоки стоки, по-солени цени
  const priceMult = (1 + cityTier * 0.35) * (rare ? 1.6 : 1);
  const depthCap = [4, 8, 14, 22, 999][lvl - 1];
  const rarCap = Math.min(4, lvl + (cityTier ? 1 : 0) + rare);
  const depth = clamp(Math.min(G.meta.bestDepth, depthCap) + cityTier * 3 + rare * 4, 1, 99);
  const boost = lvl * 3 + cityTier * 5 + rare * 14;
  const items = [];
  const genSlots = (slots, count) => {
    for (let i = 0; i < count; i++) {
      let it = null;
      for (let tries = 0; tries < 30; tries++) {
        const cand = Items.gen(depth, boost, rarCap);
        if (slots.includes(cand.slot)) { it = cand; break; }
      }
      if (it) items.push({ item: it, price: Math.round(shopItemPrice(it) * priceMult) });
    }
  };
  if (vtype === 'potion') {
    // Яна отключва ЕДНОКРАТНО отвари според нивото на сергията си (не се купуват на бройка)
    const owned = (G.player && G.player.potionsOwned) || {};
    for (const key of POTION_KEYS) {
      const def = POTIONS[key];
      if (def.price > 0 && def.unlock <= lvl && !owned[key]) items.push({ potion: key, price: def.price });
    }
    // + пръстени и амулети (те се и вдигат на ниво тук)
    if (lvl >= 2) genSlots(['ring', 'amulet'], lvl - 1);
    // Камък на душата: само на макс ниво (5) на сергията на Яна — еднократно съживяване
    if (lvl >= 5) items.push({ item: makeSoulStone(), price: 600, soulstone: true });
  } else {
    genSlots(def.slots, 2 + lvl);
  }
  items.sort((a, b) => (a.potion ? -1 : b.potion ? 1 : a.price - b.price));
  return items;
  } finally { Math.random = _mr; } // връщаме истинския RNG
}
