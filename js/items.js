'use strict';
// ================= ПРЕДМЕТИ: генерация, рядкост, афикси, тултипи =================

const RARITY = [
  { n: 'Обикновен', col: '#c9d1d9', affixes: 0, w: 46 },
  { n: 'Магически', col: '#4f9cff', affixes: 1, w: 30 },
  { n: 'Рядък', col: '#ffd400', affixes: 2, w: 16 },
  { n: 'Епичен', col: '#b34fff', affixes: 3, w: 6 },
  { n: 'Легендарен', col: '#ff7a1f', affixes: 4, w: 2 },
];

const BASES = [
  // range = обхват в плочки, arc = половин ъгъл на дъгата (рад); g = род за афиксите (m/f/n/pl)
  { slot: 'weapon', type: 'sword', n: 'Меч', g: 'm', dmg: [9, 13], cd: 0.38, range: 1.6, arc: 1.25, icon: 'sword', w: 3 },
  { slot: 'weapon', type: 'axe', n: 'Брадва', g: 'f', dmg: [14, 20], cd: 0.55, range: 1.95, arc: 1.75, icon: 'axe', w: 2 },
  { slot: 'weapon', type: 'dagger', n: 'Кама', g: 'f', dmg: [6, 9], cd: 0.24, range: 1.15, arc: 0.85, icon: 'dagger', w: 2 },
  { slot: 'weapon', type: 'greatsword', n: 'Двуръчен меч', g: 'm', dmg: [17, 23], cd: 0.65, range: 1.9, arc: 1.45, icon: 'greatsword', w: 2 },
  { slot: 'weapon', type: 'spear', n: 'Копие', g: 'n', dmg: [10, 14], cd: 0.42, range: 2.35, arc: 0.6, icon: 'spear', w: 2 },
  { slot: 'weapon', type: 'chains', n: 'Верижни остриета', g: 'pl', dmg: [8, 12], cd: 0.5, range: 2.75, arc: 2.4, icon: 'chains', w: 2 },
  { slot: 'armor', type: 'armor', n: 'Ризница', g: 'f', armor: [3, 6], icon: 'armor', w: 3 },
  { slot: 'ring', type: 'ring', n: 'Пръстен', g: 'm', icon: 'ring', w: 2 },
  { slot: 'amulet', type: 'amulet', n: 'Амулет', g: 'm', icon: 'amulet', w: 2 },
];

// афикси: ключ -> [мин, макс на ниво 1], име, формат
// pool: 'pre' = префикс (сила) | 'suf' = суфикс (помощен). Предметът тегли по равно от двата пула.
const AFFIXES = {
  // ---- ПРЕФИКСИ (сила) ----
  dmg:     { r: [2, 5],   n: 'щети',                  pre: 'Жесток',        pref: 'Жестока',        pool: 'pre' },
  crit:    { r: [3, 7],   n: '% крит. шанс',          pre: 'Точен',         pref: 'Точна',          pct: true, pool: 'pre' },
  critd:   { r: [10, 25], n: '% крит. щети',          pre: 'Свиреп',        pref: 'Свирепа',        pct: true, pool: 'pre' },
  aspd:    { r: [5, 10],  n: '% скорост на атака',    pre: 'Яростен',       pref: 'Яростна',        pct: true, pool: 'pre' },
  spellDmg:{ r: [5, 12],  n: '% магически щети',      pre: 'Магьоснически', pref: 'Магьосническа',  pct: true, pool: 'pre' },
  range:   { r: [4, 8],   n: '% обхват на оръжието',  pre: 'Далечен',       pref: 'Далечна',        pct: true, pool: 'pre' },
  thorns:  { r: [2, 5],   n: 'отвърнати щети',        pre: 'Бодлив',        pref: 'Бодлива',        pool: 'pre' },
  // ---- СУФИКСИ (помощни) ----
  hp:      { r: [10, 25], n: 'макс. живот',           pre: 'Здрав',         pref: 'Здрава',         pool: 'suf' },
  mp:      { r: [8, 18],  n: 'макс. мана',            pre: 'Мъдър',         pref: 'Мъдра',          pool: 'suf' },
  armor:   { r: [2, 4],   n: 'броня',                 pre: 'Каменен',       pref: 'Каменна',        pool: 'suf' },
  spd:     { r: [4, 8],   n: '% скорост',             pre: 'Бърз',          pref: 'Бърза',          pct: true, pool: 'suf' },
  vamp:    { r: [1, 3],   n: '% кражба на живот',     pre: 'Вампирски',     pref: 'Вампирска',      pct: true, pool: 'suf' },
  gold:    { r: [10, 25], n: '% злато',               pre: 'Алчен',         pref: 'Алчна',          pct: true, pool: 'suf' },
  spellCd: { r: [4, 8],   n: '% презареждане на магии', pre: 'Неуморен',    pref: 'Неуморна',       pct: true, pool: 'suf' },
  spellCost:{ r: [4, 8],  n: '% по-евтини магии',     pre: 'Пестелив',      pref: 'Пестелива',      pct: true, pool: 'suf' },
  dashCd:  { r: [5, 10],  n: '% презареждане на отскока', pre: 'Вихрен',    pref: 'Вихрена',        pct: true, pool: 'suf' },
  hpRegen: { r: [1, 2],   n: 'живот в секунда',       pre: 'Живителен',     pref: 'Живителна',      pool: 'suf' },
  mpRegen: { r: [1, 2],   n: 'мана в секунда',        pre: 'Бликащ',        pref: 'Бликаща',        pool: 'suf' },
  xp:      { r: [5, 12],  n: '% опит',                pre: 'Опитен',        pref: 'Опитна',         pct: true, pool: 'suf' },
  potionPow:{ r: [6, 14], n: '% сила на отварите',    pre: 'Аптекарски',    pref: 'Аптекарска',     pct: true, pool: 'suf' },
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
  sword: 'Зъбът на Бездната', axe: 'Секира на прадедите', dagger: 'Змийски зъб',
  greatsword: 'Гробарят на крале', spear: 'Жилото на зората', chains: 'Окови на хаоса',
  armor: 'Ризница на изгнаника', ring: 'Кръгът на съдбата', amulet: 'Сърце на пустотата',
};

// склонение на афиксното прилагателно по род: мъжки/женски/среден/множествено
function affixForm(a, g) {
  if (g === 'f') return a.pref;
  if (g === 'n') return a.pref.slice(0, -1) + 'о';   // Жестока -> Жестоко
  if (g === 'pl') return a.pref.slice(0, -1) + 'и';  // Жестока -> Жестоки
  return a.pre;
}

// ---------- УНИКАТИ: отделен дроп-пул с фиксирани сили + случайни афикси отгоре ----------
const UNIQUES = [
  {
    uid: 'whisper', type: 'dagger', slot: 'weapon', icon: 'dagger', name: 'Шепот в мрака',
    dmg: [8, 11], cd: 0.24, range: 1.15, arc: 0.85,
    power: 'Гарантиран крит 1.5 сек след отскок и срещу врагове, които не са те засекли.',
  },
  {
    uid: 'golemskin', type: 'armor', slot: 'armor', icon: 'armor', name: 'Кожата на голема',
    armor: [7, 10],
    power: 'Никой не може да те избута. Връщаш 30% от близките щети обратно.',
  },
  {
    uid: 'mountain', type: 'axe', slot: 'weapon', icon: 'axe', name: 'Гневът на планината',
    dmg: [16, 22], cd: 0.55, range: 1.95, arc: 1.75,
    power: 'Ударите отблъскват мощно. Враг, блъснат в стена, поема двойни щети.',
  },
  {
    uid: 'kingseye', type: 'ring', slot: 'ring', icon: 'ring', name: 'Окото на кралете',
    power: '+40% критични щети. Критовете ронят злато от враговете.',
  },
  {
    uid: 'gravedigger', type: 'greatsword', slot: 'weapon', icon: 'greatsword', name: 'Гробарят на крале',
    dmg: [19, 25], cd: 0.65, range: 1.9, arc: 1.45,
    power: '+60% щети срещу враг под 30% живот. Екзекуцията разтриса земята.',
  },
  {
    uid: 'dawnsting', type: 'spear', slot: 'weapon', icon: 'spear', name: 'Жилото на зората',
    dmg: [12, 16], cd: 0.42, range: 2.35, arc: 0.6,
    power: 'Пробожда всички врагове по линията на удара, не само първия.',
  },
  {
    uid: 'chaosbind', type: 'chains', slot: 'weapon', icon: 'chains', name: 'Окови на хаоса',
    dmg: [10, 14], cd: 0.5, range: 2.75, arc: 2.4,
    power: 'Ударите притеглят враговете към теб, вместо да ги отблъскват.',
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
  fireball: { n: 'Огнено кълбо', cost: 12, cd: 0.45, col: '#ff8a1f', d: 'Огнен снаряд, който избухва.' },
  icebolt:  { n: 'Ледена стрела', cost: 10, cd: 0.7,  col: '#8ab0ff', d: 'Пронизва и забавя врага.' },
  nova:     { n: 'Мразовит взрив', cost: 22, cd: 4,   col: '#a8d8ff', d: 'Взрив около теб — щети и забавяне.' },
  chain:    { n: 'Верижна мълния', cost: 18, cd: 2.2, col: '#ffd23b', d: 'Мълния, скачаща по до 4 врага.' },
  poison:   { n: 'Отровен облак', cost: 20, cd: 5,    col: '#5fd97a', d: 'Облак, който разяжда враговете.' },
  ward:     { n: 'Магичен щит', cost: 25, cd: 8,      col: '#c9d1d9', d: 'Поглъща следващите щети по теб.' },
  skull:    { n: 'Гладен череп', cost: 24, cd: 9,     col: '#d8d3c0', d: 'Череп кръжи около теб и хапе.' },
  quake:    { n: 'Земетръс', cost: 26, cd: 6,         col: '#a08050', d: 'Разтърсва и отблъсква всичко наоколо.' },
};
function genTome(spellId, depth) {
  const id = spellId || pick(Object.keys(SPELLS));
  return { id: Items._id++, slot: 'spell', spell: id, icon: 'tome', rarity: 2, lvl: depth || G.depth || 1, name: 'Том: ' + SPELLS[id].n, affixes: [] };
}

// ---------- ОТВАРИ: постоянни флакони с презареждане (не се трупат, не свършват) ----------
// restore = моментално възстановяване; buff = ефект с траене. unlock = ниво на сергията на Яна.
// price = еднократна цена в злато за отключване. cd = презареждане (сек), dur = траене на бъфа (сек).
const POTIONS = {
  hp:    { n: 'Отвара на живота', kind: 'restore', cd: 25, col: '#ff4757', unlock: 1, price: 0,    d: '+45% макс. живот',            restore: { hp: 0.45 } },
  mp:    { n: 'Отвара на мана',   kind: 'restore', cd: 25, col: '#3b82f6', unlock: 1, price: 0,    d: '+60% макс. мана',             restore: { mp: 0.60 } },
  mix:   { n: 'Смесен елексир',   kind: 'restore', cd: 30, col: '#b34fff', unlock: 2, price: 300,  d: '+40% живот И +40% мана',      restore: { hp: 0.40, mp: 0.40 } },
  rage:  { n: 'Отвара на яростта', kind: 'buff',   cd: 45, dur: 10, col: '#e0555a', unlock: 3, price: 400,  d: '+25% щети за 10с',            buff: 'rage' },
  swift: { n: 'Отвара на вятъра',  kind: 'buff',   cd: 45, dur: 10, col: '#7fd0a0', unlock: 3, price: 500,  d: '+20% движение и атака за 10с', buff: 'swift' },
  stone: { n: 'Отвара на камъка',  kind: 'buff',   cd: 45, dur: 10, col: '#a8a090', unlock: 4, price: 800,  d: '+15 броня, неизбутваем 10с',  buff: 'stone' },
  focus: { n: 'Отвара на фокуса',  kind: 'buff',   cd: 45, dur: 10, col: '#8ab0ff', unlock: 4, price: 1000, d: 'магиите без мана за 10с',     buff: 'focus' },
  regen: { n: 'Отвара на живеца',  kind: 'buff',   cd: 45, dur: 10, col: '#ff8a94', unlock: 5, price: 1500, d: '+3% макс. живот/сек за 10с',  buff: 'regen' },
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
    if (rar === 4) it.name = LEGENDARY_NAMES[base.type] || ('Реликва: ' + base.n);
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
      L.push({ s: sp.cost + ' мана · ' + sp.cd + ' сек презареждане', c: '#7fb0ff' });
      L.push({ s: 'занеси го на Майстора Захари', c: '#c84fff' });
      return L;
    }
    if (it.dmg) L.push({ s: it.dmg + ' щети  (' + (1 / it.cd).toFixed(1) + '/сек)', c: '#e8e4d0' });
    if (it.armor) L.push({ s: it.armor + ' броня', c: '#e8e4d0' });
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
  { id: 'might', n: 'Мощ', d: '+14% щети' },
  { id: 'vit', n: 'Жизненост', d: '+30 макс. живот' },
  { id: 'haste', n: 'Бързина', d: '+8% движение' },
  { id: 'fury', n: 'Ярост', d: '+12% скорост на атака' },
  { id: 'precision', n: 'Точност', d: '+7% крит. шанс' },
  { id: 'vamp', n: 'Вампиризъм', d: '+3% кражба на живот' },
  { id: 'arcane', n: 'Тайнознание', d: '+25 мана, +20% огнени щети' },
  { id: 'stone', n: 'Каменна кожа', d: '+6 броня' },
  { id: 'shadow', n: 'Сянка', d: '-30% презареждане на отскока' },
  { id: 'greed', n: 'Алчност', d: '+30% злато' },
  // капстоуни със синергии — не плоски числа
  { id: 'burncrit', n: 'Изгарящи критове', d: 'Критовете подпалват врага' },
  { id: 'harvest', n: 'Жътва', d: 'Убийство наблизо връща 3% живот' },
  { id: 'frenzy', n: 'Опиянение', d: 'Убийство: +25% скорост на атака за 3с' },
  { id: 'chill', n: 'Студ в кръвта', d: 'Ударите ти забавят враговете' },
  { id: 'static', n: 'Статичен заряд', d: 'Всеки 5-и удар пуска мълния' },
  { id: 'bloodcast', n: 'Кръвен ритуал', d: 'Магиите може да горят живот вместо мана' },
  { id: 'echo', n: 'Ехо', d: 'Всяка 3-та магия е безплатна' },
];
// ---------- ДЪРВО С УМЕНИЯ: 3 клона, всяко ниво дава 1 точка; губи се при смърт ----------
const SKILL_TREE = [
  {
    id: 'sword', n: 'МЕЧ', col: '#d84a5a',
    nodes: [
      { id: 'sw1', n: 'Сила', d: '+8% щети' },
      { id: 'sw2', n: 'Ярост', d: '+10% скорост на атака' },
      { id: 'sw3', n: 'Точно око', d: '+8% крит. шанс' },
      { id: 'sw4', n: 'Касапин', d: '+25% крит. щети' },
      { id: 'sw5', n: 'Втори замах', d: '20% шанс ударът да се повтори мигновено' },
    ],
  },
  {
    id: 'mage', n: 'МАГ', col: '#5c78e8',
    nodes: [
      { id: 'mg1', n: 'Ум', d: '+25 макс. мана' },
      { id: 'mg2', n: 'Извор', d: '+1.5 мана в секунда' },
      { id: 'mg3', n: 'Фокус', d: '-15% цена на магиите' },
      { id: 'mg4', n: 'Мощ на волята', d: '+20% магически щети' },
      { id: 'mg5', n: 'Двойно ехо', d: '15% шанс магията да не влезе в презареждане' },
    ],
  },
  {
    id: 'body', n: 'ТЯЛО', col: '#5fd97a',
    nodes: [
      { id: 'bd1', n: 'Жилавост', d: '+12% макс. живот' },
      { id: 'bd2', n: 'Кора', d: '+5 броня' },
      { id: 'bd3', n: 'Пъргавина', d: '+6% движение' },
      { id: 'bd4', n: 'Кръвообращение', d: '+1 живот в секунда' },
      { id: 'bd5', n: 'Втори шанс', d: 'Веднъж на спускане оцеляваш смъртен удар с 30% живот' },
    ],
  },
];
function skillCount(p, id) { return p.skills && p.skills[id] ? 1 : 0; }

function rollPerkChoices() {
  const pool = PERKS.slice();
  const out = [];
  for (let i = 0; i < 3; i++) out.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  return out;
}
