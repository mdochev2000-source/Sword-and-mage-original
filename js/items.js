'use strict';
// ================= ПРЕДМЕТИ: генерация, рядкост, афикси, тултипи =================

const RARITY = [
  { n: 'Common', col: '#c9d1d9', affixes: 0, w: 46 },
  { n: 'Magic', col: '#4f9cff', affixes: 1, w: 30 },
  { n: 'Rare', col: '#ffd400', affixes: 2, w: 16 },
  { n: 'Epic', col: '#b34fff', affixes: 3, w: 6 },
  { n: 'Legendary', col: '#ff7a1f', affixes: 4, w: 2 },
];

const BASES = [
  // range = обхват в плочки, arc = половин ъгъл на дъгата (рад); g = род за афиксите (m/f/n/pl)
  { slot: 'weapon', type: 'sword', n: 'Sword', g: 'm', dmg: [9, 13], cd: 0.38, range: 1.6, arc: 1.25, icon: 'sword', w: 3 },
  { slot: 'weapon', type: 'axe', n: 'Axe', g: 'f', dmg: [14, 20], cd: 0.55, range: 1.95, arc: 1.75, icon: 'axe', w: 2 },
  { slot: 'weapon', type: 'dagger', n: 'Dagger', g: 'f', dmg: [6, 9], cd: 0.24, range: 1.15, arc: 0.85, icon: 'dagger', w: 2 },
  { slot: 'weapon', type: 'greatsword', n: 'Greatsword', g: 'm', dmg: [17, 23], cd: 0.65, range: 1.9, arc: 1.45, icon: 'greatsword', w: 2 },
  { slot: 'weapon', type: 'spear', n: 'Spear', g: 'n', dmg: [10, 14], cd: 0.42, range: 2.35, arc: 0.6, icon: 'spear', w: 2 },
  { slot: 'weapon', type: 'chains', n: 'Chain Blades', g: 'pl', dmg: [8, 12], cd: 0.5, range: 2.75, arc: 2.4, icon: 'chains', w: 2 },
  { slot: 'armor', type: 'armor', n: 'Mail', g: 'f', armor: [3, 6], icon: 'armor', w: 3 },
  { slot: 'ring', type: 'ring', n: 'Ring', g: 'm', icon: 'ring', w: 2 },
  { slot: 'amulet', type: 'amulet', n: 'Amulet', g: 'm', icon: 'amulet', w: 2 },
];

// афикси: ключ -> [мин, макс на ниво 1], име, формат
// pool: 'pre' = префикс (сила) | 'suf' = суфикс (помощен). Предметът тегли по равно от двата пула.
const AFFIXES = {
  // ---- ПРЕФИКСИ (сила) ----
  dmg:     { r: [2, 5],   n: 'damage',                  pre: 'Cruel',        pref: 'Cruel',        pool: 'pre' },
  crit:    { r: [3, 7],   n: '% crit chance',          pre: 'Precise',         pref: 'Precise',          pct: true, pool: 'pre' },
  critd:   { r: [10, 25], n: '% crit damage',          pre: 'Savage',        pref: 'Savage',        pct: true, pool: 'pre' },
  aspd:    { r: [5, 10],  n: '% attack speed',    pre: 'Furious',       pref: 'Furious',        pct: true, pool: 'pre' },
  spellDmg:{ r: [5, 12],  n: '% spell damage',      pre: 'Arcane', pref: 'Arcane',  pct: true, pool: 'pre' },
  range:   { r: [4, 8],   n: '% weapon range',  pre: 'Reaching',       pref: 'Reaching',        pct: true, pool: 'pre' },
  thorns:  { r: [2, 5],   n: 'thorns damage',        pre: 'Spiked',        pref: 'Spiked',        pool: 'pre' },
  // ---- СУФИКСИ (помощни) ----
  hp:      { r: [10, 25], n: 'max life',           pre: 'Hardy',         pref: 'Hardy',         pool: 'suf' },
  mp:      { r: [8, 18],  n: 'max mana',            pre: 'Wise',         pref: 'Wise',          pool: 'suf' },
  armor:   { r: [2, 4],   n: 'armor',                 pre: 'Stony',       pref: 'Stony',        pool: 'suf' },
  spd:     { r: [4, 8],   n: '% speed',             pre: 'Swift',          pref: 'Swift',          pct: true, pool: 'suf' },
  vamp:    { r: [1, 3],   n: '% life steal',     pre: 'Vampiric',     pref: 'Vampiric',      pct: true, pool: 'suf' },
  gold:    { r: [10, 25], n: '% gold',               pre: 'Greedy',         pref: 'Greedy',          pct: true, pool: 'suf' },
  spellCd: { r: [4, 8],   n: '% spell cooldown', pre: 'Tireless',    pref: 'Tireless',       pct: true, pool: 'suf' },
  spellCost:{ r: [4, 8],  n: '% cheaper spells',     pre: 'Thrifty',      pref: 'Thrifty',      pct: true, pool: 'suf' },
  dashCd:  { r: [5, 10],  n: '% dash cooldown', pre: 'Whirling',    pref: 'Whirling',        pct: true, pool: 'suf' },
  hpRegen: { r: [1, 2],   n: 'life per second',       pre: 'Vital',     pref: 'Vital',      pool: 'suf' },
  mpRegen: { r: [1, 2],   n: 'mana per second',        pre: 'Flowing',        pref: 'Flowing',        pool: 'suf' },
  xp:      { r: [5, 12],  n: '% experience',                pre: 'Seasoned',        pref: 'Seasoned',         pct: true, pool: 'suf' },
  potionPow:{ r: [6, 14], n: '% potion power',    pre: 'Alchemical',    pref: 'Alchemical',     pct: true, pool: 'suf' },
};
// разделени пулове за теглене
const AFFIX_PRE = Object.keys(AFFIXES).filter(k => AFFIXES[k].pool === 'pre');
const AFFIX_SUF = Object.keys(AFFIXES).filter(k => AFFIXES[k].pool === 'suf');
// тегли `count` афикса: половината от префиксите, половината от суфиксите (при 1 -> произволен пул)
function rollAffixes(depth, count, slot, valMult) {
  const mult = (1 + 0.11 * (depth - 1)) * (valMult || 1);
  const mkAff = k => { const a = AFFIXES[k]; return { k, v: Math.max(1, Math.round(rnd(a.r[0], a.r[1]) * mult)), up: 0 }; };
  const forSlot = arr => arr.filter(k => !(slot === 'weapon' && k === 'armor')); // бронята не пада на оръжие
  const pre = forSlot(AFFIX_PRE.slice()), suf = forSlot(AFFIX_SUF.slice());
  const out = [];
  const take = (pool, n) => { for (let i = 0; i < n && pool.length; i++) out.push(mkAff(pool.splice((Math.random() * pool.length) | 0, 1)[0])); };
  if (count === 1) take(Math.random() < 0.5 ? pre : suf, 1);
  else { const nPre = Math.ceil(count / 2); take(pre, nPre); take(suf, count - nPre); }
  return out;
}

const LEGENDARY_NAMES = {
  sword: 'Fang of the Abyss', axe: 'Axe of the Forebears', dagger: 'Serpent\'s Tooth',
  greatsword: 'Gravedigger of Kings', spear: 'Sting of the Dawn', chains: 'Chains of Chaos',
  armor: 'Mail of the Exile', ring: 'Ring of Fate', amulet: 'Heart of the Void',
};

// на английски прилагателното е с една форма за всички родове (g вече не се ползва)
function affixForm(a, g) {
  return a.pre;
}

// ---------- УНИКАТИ: отделен дроп-пул с фиксирани сили + случайни афикси отгоре ----------
const UNIQUES = [
  {
    uid: 'whisper', type: 'dagger', slot: 'weapon', icon: 'dagger', name: 'Whisper in the Dark',
    dmg: [8, 11], cd: 0.24, range: 1.15, arc: 0.85,
    power: 'Guaranteed crit for 1.5s after a dash and against enemies that haven\'t spotted you.',
  },
  {
    uid: 'golemskin', type: 'armor', slot: 'armor', icon: 'armor', name: 'Golem\'s Hide',
    armor: [7, 10],
    power: 'Nothing can knock you back. You reflect 30% of melee damage.',
  },
  {
    uid: 'mountain', type: 'axe', slot: 'weapon', icon: 'axe', name: 'Wrath of the Mountain',
    dmg: [16, 22], cd: 0.55, range: 1.95, arc: 1.75,
    power: 'Your hits knock back hard. An enemy slammed into a wall takes double damage.',
  },
  {
    uid: 'kingseye', type: 'ring', slot: 'ring', icon: 'ring', name: 'Eye of Kings',
    power: '+40% crit damage. Crits shake gold loose from enemies.',
  },
  {
    uid: 'gravedigger', type: 'greatsword', slot: 'weapon', icon: 'greatsword', name: 'Gravedigger of Kings',
    dmg: [19, 25], cd: 0.65, range: 1.9, arc: 1.45,
    power: '+60% damage to enemies below 30% life. The execution shakes the ground.',
  },
  {
    uid: 'dawnsting', type: 'spear', slot: 'weapon', icon: 'spear', name: 'Sting of the Dawn',
    dmg: [12, 16], cd: 0.42, range: 2.35, arc: 0.6,
    power: 'Pierces every enemy along the strike line, not just the first.',
  },
  {
    uid: 'chaosbind', type: 'chains', slot: 'weapon', icon: 'chains', name: 'Chains of Chaos',
    dmg: [10, 14], cd: 0.5, range: 2.75, arc: 2.4,
    power: 'Your hits pull enemies toward you instead of knocking them away.',
  },
];

// генерира конкретен уникат: фиксирана сила + 1-2 случайни афикса отгоре
function genUnique(depth, uid) {
  const def = uid ? UNIQUES.find(u => u.uid === uid) : pick(UNIQUES);
  const mult = 1 + 0.13 * (depth - 1);
  const it = { id: Items._id++, uid: def.uid, slot: def.slot, type: def.type, icon: def.icon, rarity: 4, lvl: depth, name: def.name, power: def.power, affixes: [] };
  if (def.dmg) { it.dmg = Math.round(rnd(def.dmg[0], def.dmg[1]) * mult); it.cd = def.cd; it.range = def.range; it.arc = def.arc; }
  if (def.armor) it.armor = Math.round(rnd(def.armor[0], def.armor[1]) * mult);
  it.affixes = rollAffixes(depth, rndi(1, 2), def.slot, 1.3); // 1-2 случайни афикса, разделени пре/суф
  return it;
}

// омагьосване (преправяне): хвърля наново ВСИЧКИ афикси — брой и рядкост се пазят, up се нулира.
// Уникатите се преправят (случайните им афикси), но фиксираната им сила (power) НЕ се пипа.
function rerollAffixes(it) {
  const count = it.affixes ? it.affixes.length : 0;
  if (!count) return;
  const valMult = it.uid ? 1.3 : (it.rarity === 4 ? 1.35 : 1);
  it.affixes = rollAffixes(it.lvl || (G.depth || 1), count, it.slot, valMult); // rollAffixes слага up:0
  // името се преизчислява от новия префикс (уникати и оранжеви пазят фиксираното си име)
  if (!it.uid && it.rarity < 4) {
    const base = BASES.find(b => b.type === it.type);
    const nameAff = it.affixes.find(a => AFFIXES[a.k].pool === 'pre') || it.affixes[0];
    if (base && nameAff) it.name = affixForm(AFFIXES[nameAff.k], base.g) + ' ' + base.n.toLowerCase();
  }
}

// ---------- МАГИИ: пул от томове, носиш 3, намират се из Бездната ----------
const SPELLS = {
  fireball: { n: 'Fireball', cost: 12, cd: 0.45, col: '#ff8a1f', d: 'A fiery projectile that explodes.' },
  icebolt:  { n: 'Ice Bolt', cost: 10, cd: 0.7,  col: '#8ab0ff', d: 'Pierces and slows the enemy.' },
  nova:     { n: 'Frost Nova', cost: 22, cd: 4,   col: '#a8d8ff', d: 'A blast around you — damage and slow.' },
  chain:    { n: 'Chain Lightning', cost: 18, cd: 2.2, col: '#ffd23b', d: 'Lightning that arcs to up to 4 enemies.' },
  poison:   { n: 'Poison Cloud', cost: 20, cd: 5,    col: '#5fd97a', d: 'A cloud that eats away at enemies.' },
  ward:     { n: 'Arcane Shield', cost: 25, cd: 8,      col: '#c9d1d9', d: 'Absorbs the next damage you take.' },
  skull:    { n: 'Hungry Skull', cost: 24, cd: 9,     col: '#d8d3c0', d: 'A skull circles you and bites.' },
  quake:    { n: 'Earthquake', cost: 26, cd: 6,         col: '#a08050', d: 'Shakes and knocks back everything around you.' },
};
function genTome(spellId, depth) {
  const id = spellId || pick(Object.keys(SPELLS));
  return { id: Items._id++, slot: 'spell', spell: id, icon: 'tome', rarity: 2, lvl: depth || G.depth || 1, name: 'Tome: ' + SPELLS[id].n, affixes: [] };
}

// ---------- ОТВАРИ: постоянни флакони с презареждане (не се трупат, не свършват) ----------
// restore = моментално възстановяване; buff = ефект с траене. unlock = ниво на сергията на Яна.
// price = еднократна цена в злато за отключване. cd = презареждане (сек), dur = траене на бъфа (сек).
const POTIONS = {
  hp:    { n: 'Potion of Life', kind: 'restore', cd: 25, col: '#ff4757', unlock: 1, price: 0,    d: '+45% max life',            restore: { hp: 0.45 } },
  mp:    { n: 'Potion of Mana',   kind: 'restore', cd: 25, col: '#3b82f6', unlock: 1, price: 0,    d: '+60% max mana',             restore: { mp: 0.60 } },
  mix:   { n: 'Mixed Elixir',   kind: 'restore', cd: 30, col: '#b34fff', unlock: 2, price: 300,  d: '+40% life AND +40% mana',      restore: { hp: 0.40, mp: 0.40 } },
  rage:  { n: 'Potion of Rage', kind: 'buff',   cd: 45, dur: 10, col: '#e0555a', unlock: 3, price: 400,  d: '+25% damage for 10s',            buff: 'rage' },
  swift: { n: 'Potion of Wind',  kind: 'buff',   cd: 45, dur: 10, col: '#7fd0a0', unlock: 3, price: 500,  d: '+20% movement and attack for 10s', buff: 'swift' },
  stone: { n: 'Potion of Stone',  kind: 'buff',   cd: 45, dur: 10, col: '#a8a090', unlock: 4, price: 800,  d: '+15 armor, unmovable for 10s',  buff: 'stone' },
  focus: { n: 'Potion of Focus',  kind: 'buff',   cd: 45, dur: 10, col: '#8ab0ff', unlock: 4, price: 1000, d: 'spells cost no mana for 10s',     buff: 'focus' },
  regen: { n: 'Potion of Vigor',  kind: 'buff',   cd: 45, dur: 10, col: '#ff8a94', unlock: 5, price: 1500, d: '+3% max life/sec for 10s',  buff: 'regen' },
};
const POTION_KEYS = Object.keys(POTIONS);

const Items = {
  _id: 1,

  rollRarity(depth, boost) {
    // претеглен избор с бонус за дълбочина
    const ws = RARITY.map((r, i) => r.w + (i > 0 ? depth * 1.2 + (boost || 0) * (i) : 0));
    let tot = 0; for (const w of ws) tot += w;
    let v = Math.random() * tot;
    for (let i = 0; i < ws.length; i++) { v -= ws[i]; if (v <= 0) return i; }
    return 0;
  },

  gen(depth, boost, maxRar) {
    const base = (() => {
      const tot = BASES.reduce((s, b) => s + b.w, 0);
      let v = Math.random() * tot;
      for (const b of BASES) { v -= b.w; if (v <= 0) return b; }
      return BASES[0];
    })();
    let rar = this.rollRarity(depth, boost);
    if ((base.slot === 'ring' || base.slot === 'amulet') && rar === 0) rar = 1;
    if (maxRar !== undefined) rar = Math.min(rar, maxRar);
    const mult = 1 + 0.13 * (depth - 1);
    // lvl = силата на предмета (дълбочината, на която е създаден); цветът е броят свойства
    const it = { id: this._id++, slot: base.slot, type: base.type, icon: base.icon, rarity: rar, lvl: depth, affixes: [] };
    if (base.dmg) {
      it.dmg = Math.round(rnd(base.dmg[0], base.dmg[1]) * mult * (1 + rar * 0.06));
      it.cd = base.cd; it.range = base.range; it.arc = base.arc;
    }
    if (base.armor) it.armor = Math.round(rnd(base.armor[0], base.armor[1]) * mult * (1 + rar * 0.08));

    const chosen = rollAffixes(depth, RARITY[rar].affixes, base.slot, rar === 4 ? 1.35 : 1);
    it.affixes = chosen;

    // името взима първия ПРЕФИКС (звучи по-естествено), иначе първия наличен афикс
    const nameAff = chosen.find(a => AFFIXES[a.k].pool === 'pre') || chosen[0];
    if (rar === 4) it.name = LEGENDARY_NAMES[base.type] || ('Relic: ' + base.n);
    else if (nameAff) it.name = affixForm(AFFIXES[nameAff.k], base.g) + ' ' + base.n.toLowerCase();
    else it.name = base.n;
    return it;
  },

  // какво пада от враг; mult — множител за елит/босс
  // дропът е нарочно скъперски: екипировката идва главно от сандъци, босове и търговците
  rollDrop(depth, mult, goldFind) {
    const out = [];
    const m = mult || 1;
    if (chance(0.75 * Math.min(1, m))) {
      out.push({ gold: Math.round((4 + depth * 2.6 + rnd(0, 5)) * m * (1 + (goldFind || 0) / 100)) });
    }
    // отварите вече не падат от земята — малко повече злато като компенсация
    if (chance(0.09 * m)) out.push({ gold: Math.round((3 + depth * 1.4) * m * (1 + (goldFind || 0) / 100)) });
    if (chance(0.04 * m)) out.push({ item: this.gen(depth, m > 1 ? 12 : 0) });
    if (chance(0.012 * m)) out.push({ item: genTome() });                       // томове с магии
    if (G.meta.legendPool && chance(m > 1 ? 0.025 : 0.004)) out.push({ item: genUnique(depth) }); // уникати — само с отключен пул
    return out;
  },

  rarityCol(it) { return RARITY[it.rarity].col; },

  statLines(it) {
    const L = [];
    if (it.slot === 'spell') {
      const sp = SPELLS[it.spell];
      L.push({ s: sp.d, c: '#a8b2c4' });
      L.push({ s: sp.cost + ' mana · ' + sp.cd + ' sec cooldown', c: '#7fb0ff' });
      L.push({ s: 'take it to Master Zahari', c: '#c84fff' });
      return L;
    }
    if (it.dmg) L.push({ s: it.dmg + ' damage  (' + (1 / it.cd).toFixed(1) + '/sec)', c: '#e8e4d0' });
    if (it.armor) L.push({ s: it.armor + ' armor', c: '#e8e4d0' });
    for (const a of it.affixes) {
      const d = AFFIXES[a.k];
      if (!d) continue;
      // омагьосаните афикси показват нивото си със звезди, напр. ★★☆
      const stars = (a.up || 0) > 0 ? '  ' + '★'.repeat(a.up) + '☆'.repeat(3 - a.up) : '';
      L.push({ s: '+' + a.v + ' ' + d.n + stars, c: (a.up || 0) > 0 ? '#57e6c8' : '#7fd0a0' });
    }
    if (it.power) {
      // уникална сила — на златни редове, пренесена по думи
      const words = it.power.split(' ');
      let line = '';
      for (const w of words) {
        if ((line + ' ' + w).length > 26) { L.push({ s: line, c: '#ff7a1f' }); line = w; }
        else line = line ? line + ' ' + w : w;
      }
      if (line) L.push({ s: line, c: '#ff7a1f' });
    }
    return L;
  },
};

// ---------- перки при ниво ----------
const PERKS = [
  { id: 'might', n: 'Might', d: '+14% damage' },
  { id: 'vit', n: 'Vitality', d: '+30 max life' },
  { id: 'haste', n: 'Quickness', d: '+8% movement' },
  { id: 'fury', n: 'Rage', d: '+12% attack speed' },
  { id: 'precision', n: 'Accuracy', d: '+7% crit chance' },
  { id: 'vamp', n: 'Vampirism', d: '+3% life steal' },
  { id: 'arcane', n: 'Arcana', d: '+25 mana, +20% fire damage' },
  { id: 'stone', n: 'Stone Skin', d: '+6 armor' },
  { id: 'shadow', n: 'Shadow', d: '-30% dash cooldown' },
  { id: 'greed', n: 'Greed', d: '+30% gold' },
  // капстоуни със синергии — не плоски числа
  { id: 'burncrit', n: 'Burning Crits', d: 'Crits set the enemy ablaze' },
  { id: 'harvest', n: 'Reaping', d: 'A nearby kill restores 3% life' },
  { id: 'frenzy', n: 'Frenzy', d: 'Kill: +25% attack speed for 3s' },
  { id: 'chill', n: 'Cold Blood', d: 'Your hits slow enemies' },
  { id: 'static', n: 'Static Charge', d: 'Every 5th hit releases lightning' },
  { id: 'bloodcast', n: 'Blood Ritual', d: 'Spells can burn life instead of mana' },
  { id: 'echo', n: 'Echo', d: 'Every 3rd spell is free' },
];
// ---------- ДЪРВО С УМЕНИЯ: 3 клона, всяко ниво дава 1 точка; губи се при смърт ----------
const SKILL_TREE = [
  {
    id: 'sword', n: 'SWORD', col: '#d84a5a',
    nodes: [
      { id: 'sw1', n: 'Strength', d: '+8% damage' },
      { id: 'sw2', n: 'Rage', d: '+10% attack speed' },
      { id: 'sw3', n: 'Keen Eye', d: '+8% crit chance' },
      { id: 'sw4', n: 'Butcher', d: '+25% crit damage' },
      { id: 'sw5', n: 'Second Swing', d: '20% chance for the hit to instantly repeat' },
    ],
  },
  {
    id: 'mage', n: 'MAGE', col: '#5c78e8',
    nodes: [
      { id: 'mg1', n: 'Mind', d: '+25 max mana' },
      { id: 'mg2', n: 'Wellspring', d: '+1.5 mana per second' },
      { id: 'mg3', n: 'Focus', d: '-15% spell cost' },
      { id: 'mg4', n: 'Willpower', d: '+20% spell damage' },
      { id: 'mg5', n: 'Double Echo', d: '15% chance the spell skips its cooldown' },
    ],
  },
  {
    id: 'body', n: 'BODY', col: '#5fd97a',
    nodes: [
      { id: 'bd1', n: 'Toughness', d: '+12% max life' },
      { id: 'bd2', n: 'Bark', d: '+5 armor' },
      { id: 'bd3', n: 'Agility', d: '+6% movement' },
      { id: 'bd4', n: 'Circulation', d: '+1 life per second' },
      { id: 'bd5', n: 'Second Chance', d: 'Once per descent, survive a lethal hit at 30% life' },
    ],
  },
];
function skillCount(p, id) { return p.skills && p.skills[id] ? 1 : 0; }
// цена в точки по ниво в клона (отдолу нагоре): по-силните умения струват повече
const SKILL_COST = [1, 2, 3, 4, 5];
function skillCost(id) {
  for (const br of SKILL_TREE) {
    const i = br.nodes.findIndex(n => n.id === id);
    if (i !== -1) return SKILL_COST[i] !== undefined ? SKILL_COST[i] : i + 1;
  }
  return 1;
}
// колко точки са реално вложени в текущите умения (за връщане при нулиране)
function skillSpent(p) {
  let s = 0;
  if (p.skills) for (const id in p.skills) if (p.skills[id]) s += skillCost(id);
  return s;
}

function rollPerkChoices() {
  const pool = PERKS.slice();
  const out = [];
  for (let i = 0; i < 3; i++) out.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  return out;
}
