'use strict';
// ================= ПОВЪРХНОСТТА: отворен свят "Лагерът на изгнаниците" =================

const VENDOR_DEFS = {
  weapon: { name: 'Ковачът Драган', flavor: 'Стомана, закалена в кръв.', slots: ['weapon'] },
  armor:  { name: 'Бронарят Богдан', flavor: 'Желязо между теб и зъбите им.', slots: ['armor'] },
  potion: { name: 'Алхимичката Яна', flavor: 'Отвари и дрънкулки — всичко за оцеляване.', slots: ['ring', 'amulet'] },
  jewel:  { name: 'Майсторът Захари', flavor: 'Не продавам вещи. Строя пътища към силата.', slots: [] },
};
const VENDOR_UP_COST = [0, 300, 900, 2700, 8000]; // цена в злато за ниво 2..5 (индекс = текущо ниво)
const STALL_NAMES = ['количка', 'малка палатка', 'палатка', 'голяма палатка', 'шатра'];

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
      portal: { x: cx + 9, y: cy + 9 },          // югоизток — гробището
    };

    // пътеки от лагера до всяка точка
    const carvePath = (ax, ay, bx, by) => {
      let x = ax, y = ay;
      const step = () => { path[y * w + x] = 1; if (x + 1 < w) path[y * w + x + 1] = 1; };
      while (x !== bx) { step(); x += x < bx ? 1 : -1; }
      while (y !== by) { step(); y += y < by ? 1 : -1; }
      step();
    };
    for (const k of ['weapon', 'armor', 'potion', 'jewel', 'portal']) {
      carvePath(spots.camp.x, spots.camp.y, spots[k].x, spots[k].y);
    }

    const props = [];
    const used = new Set();
    const noProp = (x, y, r) => { for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) used.add(j * w + i); };
    // пазим свободно около опорните точки (повече място за големите палатки)
    for (const k in spots) noProp(spots[k].x, spots[k].y, k === 'camp' || k === 'portal' ? 2 : 3);

    // лагерен огън
    props.push({ kind: 'campfire', x: spots.camp.x + 0.5, y: spots.camp.y + 0.5, r: 0.4, solid: true });
    // портал (вход към Бездната)
    props.push({ kind: 'portal', x: spots.portal.x + 0.5, y: spots.portal.y + 0.5, r: 0.55, solid: false });

    // търговци: сергия + продавач отпред-вдясно (за да не го скриват големите палатки)
    for (const vt of ['weapon', 'armor', 'potion', 'jewel']) {
      const s = spots[vt];
      props.push({ kind: 'stall', vtype: vt, x: s.x + 0.5, y: s.y + 0.5, r: 0.6, solid: true });
      props.push({ kind: 'vendor', vtype: vt, x: s.x + 1.6, y: s.y + 1.1, r: 0.3, solid: true, name: VENDOR_DEFS[vt].name });
    }

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
};

// ---------- магазини ----------
function shopItemPrice(it) {
  if (it.slot === 'spell') return 60 + (it.lvl || 1) * 6; // томовете имат добра цена
  let base = it.dmg ? it.dmg * 3 : it.armor ? it.armor * 7 : 30;
  const wgt = {
    dmg: 3, hp: 0.9, mp: 0.9, armor: 5, spd: 2.5, aspd: 2.2, crit: 3, critd: 1.1, vamp: 9, gold: 1.2,
    spellDmg: 2.5, range: 2, thorns: 4, spellCd: 2.5, spellCost: 2.5, dashCd: 2, hpRegen: 8, mpRegen: 6, xp: 1.5, potionPow: 2,
  };
  for (const a of it.affixes) base += a.v * (wgt[a.k] || 1);
  return Math.max(15, Math.round(base * (1 + it.rarity * 0.45)));
}
function shopSellPrice(it) { return Math.max(3, Math.round(shopItemPrice(it) * 0.35)); }
function potionPrice(key) { return (POTIONS[key] && POTIONS[key].price) || 0; } // еднократна цена за отключване

// стоката зависи от нивото на сергията: повече, по-редки и по-дълбоки предмети
function genShopStock(vtype) {
  const def = VENDOR_DEFS[vtype];
  if (vtype === 'jewel') return []; // Мистикът търгува с печати, не със стока
  const lvl = (G.meta.vendorLvl && G.meta.vendorLvl[vtype]) || 1;
  const depthCap = [4, 8, 14, 22, 999][lvl - 1];
  const rarCap = Math.min(4, lvl);
  const depth = clamp(Math.min(G.meta.bestDepth, depthCap), 1, 99);
  const boost = lvl * 3;
  const items = [];
  const genSlots = (slots, count) => {
    for (let i = 0; i < count; i++) {
      let it = null;
      for (let tries = 0; tries < 30; tries++) {
        const cand = Items.gen(depth, boost, rarCap);
        if (slots.includes(cand.slot)) { it = cand; break; }
      }
      if (it) items.push({ item: it, price: shopItemPrice(it) });
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
  } else {
    genSlots(def.slots, 2 + lvl);
  }
  items.sort((a, b) => (a.potion ? -1 : b.potion ? 1 : a.price - b.price));
  return items;
}
