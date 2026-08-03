'use strict';
// ================= СЪЩЕСТВА: герой, врагове, AI, битка, снаряди, частици =================

const ENEMY_TYPES = {
  slime:    { hp: 26, dmg: 8,  spd: 1.7, xp: 8,  r: 0.32, aggro: 6,  range: 0.85, atkCd: 1.2, windup: 0.4, spr: 'slime',    anim: 2, animSpd: 3.5 },
  bat:      { hp: 14, dmg: 6,  spd: 3.3, xp: 7,  r: 0.25, aggro: 7,  range: 0.7,  atkCd: 1.0, windup: 0.25, spr: 'bat',     anim: 2, animSpd: 10, fly: true },
  skeleton: { hp: 40, dmg: 12, spd: 2.5, xp: 13, r: 0.3,  aggro: 8,  range: 1.05, atkCd: 1.3, windup: 0.45, spr: 'skeleton', anim: 4, animSpd: 7 },
  archer:   { hp: 30, dmg: 11, spd: 2.2, xp: 14, r: 0.3,  aggro: 9,  range: 6.5,  atkCd: 1.9, windup: 0.55, spr: 'archer',  anim: 4, animSpd: 7, ranged: 'arrow', keep: 4.5 },
  shaman:   { hp: 36, dmg: 13, spd: 2.0, xp: 18, r: 0.3,  aggro: 9,  range: 6.0,  atkCd: 2.3, windup: 0.6, spr: 'shaman',   anim: 4, animSpd: 5, ranged: 'bolt', keep: 4, blink: true },
  brute:    { hp: 95, dmg: 20, spd: 1.9, xp: 30, r: 0.42, aggro: 7,  range: 1.3,  atkCd: 1.7, windup: 0.65, spr: 'brute',   anim: 4, animSpd: 5, aoe: 1.0 },
  wraith:   { hp: 50, dmg: 15, spd: 2.9, xp: 26, r: 0.3,  aggro: 10, range: 0.95, atkCd: 1.1, windup: 0.35, spr: 'wraith',  anim: 4, animSpd: 6, ghost: true, fly: true },
  totem:    { hp: 45, dmg: 10, spd: 0,   xp: 10, r: 0.35, aggro: 99, range: 7,   atkCd: 2.4, windup: 0.6, spr: 'totem',   anim: 2, animSpd: 3, ranged: 'bolt', keep: 0, static: true },
};
const ENEMY_NAMES = {
  slime: 'Slime', bat: 'Bat', skeleton: 'Skeleton', archer: 'Skeleton Archer',
  shaman: 'Shaman', brute: 'Brute', wraith: 'Ghost', totem: 'Totem',
};

// ---------- БОСОВЕ: отделна структура с фази и сигнатурни механики ----------
// пазители на всеки 5-и етаж (ротация от 3), архибос на всеки 10-и
const BOSS_TYPES = {
  bonek: { name: 'BONE KING', spr: 'boss', hp: 340, dmg: 24, spd: 2.1, r: 0.55, range: 1.7, atkCd: 2.2, windup: 0.8, aoe: 1.9, xp: 140, sig: 'adds', anim: 4, animSpd: 5 },
  golem: { name: 'BLOOD GOLEM', spr: 'boss2', hp: 440, dmg: 30, spd: 1.7, r: 0.6, range: 1.8, atkCd: 2.6, windup: 1.0, aoe: 2.3, xp: 160, sig: 'zones', anim: 4, animSpd: 4 },
  lich: { name: 'ARCHLICH', spr: 'boss3', hp: 280, dmg: 18, spd: 2.3, r: 0.5, range: 7, atkCd: 1.9, windup: 0.7, xp: 160, sig: 'totems', ranged: 'bolt', spread: 5, keep: 4.5, blink: true, fly: true, anim: 4, animSpd: 5 },
  arch: { name: 'THE LORD OF THE ABYSS', spr: 'boss4', hp: 560, dmg: 30, spd: 2.3, r: 0.6, range: 1.8, atkCd: 2.4, windup: 0.9, aoe: 2.0, xp: 320, sig: 'charge', anim: 4, animSpd: 5 },
};
const BOSS_POOL = ['bonek', 'golem', 'lich'];

// ---------- ЕЛИТНИ МОДИФИКАТОРИ: флаг върху елита, не нов вид враг ----------
const ELITE_MODS = {
  volatile: { n: 'Volatile' },     // при смърт: закъснял взрив
  shielded: { n: 'Shielded' },    // първият удар се поглъща
  mender: { n: 'Mender' },        // лекува съседите си
  firetrail: { n: 'Firetrail' }, // оставя горяща следа
  swift: { n: 'Swift' },        // по-бърз и по-яростен
};

// проверка за уникална сила в екипировката
function hasPowerEq(p, uid) {
  for (const s of ['weapon', 'armor', 'ring', 'ring2', 'amulet']) {
    if (p.equip[s] && p.equip[s].uid === uid) return true;
  }
  return false;
}
function hasPower(uid) { return G.player ? hasPowerEq(G.player, uid) : false; }

// ---------- герой ----------
function newPlayer() {
  const startWeapon = { id: 0, slot: 'weapon', type: 'sword', icon: 'sword', rarity: 0, name: 'Rusty Sword', dmg: 10, cd: 0.38, range: 1.6, arc: 1.25, affixes: [] };
  const p = {
    x: 0, y: 0, r: 0.3,
    hp: 100, mp: 40,
    lvl: 1, xp: 0, xpNext: 30,
    dirUp: false, flip: false, moving: false, animT: 0,
    atkT: 0, atkAnim: 0, meleeHitT: -1, aimA: 0,
    dashT: 0, dashCd: 0, dashA: 0,
    iframes: 0, hurtT: 0, sinceHit: 99,
    // отвари: постоянни флакони с презареждане. В началото само hp и mp, в двата слота.
    potionsOwned: { hp: true, mp: true },       // кои отвари са отключени (завинаги)
    potionSlots: ['hp', 'mp'],                  // двете носени отвари
    potionUp: {},                               // ниво на омагьосване на всяка (0-3)
    potionCd: [0, 0],                           // презареждане на двата слота
    buffs: {},                                  // активни бъфове -> { t: оставащо, pow: сила }
    gold: 0,
    equip: { weapon: startWeapon, armor: null, ring: null, ring2: null, amulet: null, soulstone: null },
    spellsKnown: { fireball: true },            // колекцията е завинаги
    activeSpells: ['fireball', null, null],     // трите активни магии
    activePassives: [null, null],               // двата ПАСИВНИ слота (аури — работят постоянно, резервират мана)
    spellLvl: { fireball: 1 },                  // ниво на всяка известна магия (1..3) — постоянно, като дървото
    spellCd: [0, 0, 0], dashCharges: 1,
    skills: {}, skillPoints: 0,                 // дървото с умения (губи се при смърт)
    usedSecondChance: false,
    inv: [],
    perks: {},
    st: null,
  };
  calcStats(p);
  p.hp = p.st.maxhp; p.mp = p.st.maxmp;
  return p;
}

function perkCount(p, id) { return p.perks[id] || 0; }

function calcStats(p) {
  const w = p.equip.weapon;
  const sum = k => {
    let v = 0;
    for (const slot of ['weapon', 'armor', 'ring', 'ring2', 'amulet']) {
      const it = p.equip[slot];
      if (it) for (const a of it.affixes) if (a.k === k) v += a.v;
    }
    return v;
  };
  const st = {};
  const sk = id => skillCount(p, id);
  // активни бъфове от отвари: buff('rage') връща силата (pow) ако е активен, иначе 0
  const buff = k => (p.buffs && p.buffs[k]) ? p.buffs[k].pow : 0;
  st.dmg = ((w ? w.dmg : 7) + 1.6 * (p.lvl - 1) + sum('dmg')) * (1 + 0.14 * perkCount(p, 'might')) * (1 + 0.08 * sk('sw1')) * (1 + 0.25 * buff('rage'));
  st.atkCd = (w ? w.cd : 0.4) / ((1 + sum('aspd') / 100) * (1 + 0.12 * perkCount(p, 'fury')) * (1 + 0.1 * sk('sw2')) * (1 + 0.20 * buff('swift')));
  st.range = w ? w.range : 1.3; // обхватът идва САМО от размера на оръжието (без афикси/пъркове)
  st.arc = (w && w.arc) || 1.2;
  st.maxhp = Math.round((100 + 12 * (p.lvl - 1) + sum('hp') + 30 * perkCount(p, 'vit')) * (1 + 0.12 * sk('bd1')));
  st.maxmp = 40 + 4 * (p.lvl - 1) + sum('mp') + 25 * perkCount(p, 'arcane') + 25 * sk('mg1');
  st.armor = (p.equip.armor ? p.equip.armor.armor : 0) + sum('armor') + 6 * perkCount(p, 'stone') + 5 * sk('bd2') + Math.round(15 * buff('stone'));
  st.spd = 4.3 * (1 + sum('spd') / 100) * (1 + 0.08 * perkCount(p, 'haste')) * (1 + 0.06 * sk('bd3')) * (1 + 0.20 * buff('swift'));
  st.noKnock = hasPowerEq(p, 'golemskin') || !!(p.buffs && p.buffs.stone); // неизбутваем
  st.crit = Math.min(60, 5 + sum('crit') + 7 * perkCount(p, 'precision') + 8 * sk('sw3'));
  st.critd = 1.5 + sum('critd') / 100 + 0.25 * sk('sw4') + (hasPowerEq(p, 'kingseye') ? 0.4 : 0);
  st.dashMax = 1 + (G.meta.dash2 ? 1 : 0);
  st.vamp = sum('vamp') + 3 * perkCount(p, 'vamp');
  st.gold = sum('gold') + 30 * perkCount(p, 'greed');
  st.spellMult = (1 + 0.2 * perkCount(p, 'arcane')) * (1 + 0.2 * sk('mg4')) * (1 + sum('spellDmg') / 100);
  st.costMult = (1 - 0.15 * sk('mg3')) * (1 - sum('spellCost') / 100);
  st.spellCdMult = Math.max(0.4, 1 - sum('spellCd') / 100); // % презареждане на магии
  st.dashCd = 1.25 * Math.pow(0.7, perkCount(p, 'shadow')) * (1 - sum('dashCd') / 100);
  st.mpRegen = 2.4 + 1.5 * sk('mg2') + sum('mpRegen');
  st.hpRegen = 1 * sk('bd4') + sum('hpRegen') + (buff('regen') ? st.maxhp * 0.03 * buff('regen') : 0); // Отвара на живеца
  st.thorns = sum('thorns');       // отвърнати щети (както при 'golemskin')
  st.xpFind = sum('xp');           // % опит
  st.potionPow = sum('potionPow'); // % сила на отварите
  st.doubleStrike = 0.2 * sk('sw5');
  st.freeCast = 0.15 * sk('mg5');
  // ---- ПАСИВНИ магии (аури): резервират мана (50/100/150 по ниво) и дават постоянни ефекти ----
  const pasLv = id => {
    if (!p.activePassives || p.activePassives.indexOf(id) === -1) return 0;
    if (!p.spellsKnown || !p.spellsKnown[id]) return 0;
    return (p.spellLvl && p.spellLvl[id]) || 1;
  };
  st.reservedMp = 0;
  if (p.activePassives) for (const id of p.activePassives) if (id && p.spellsKnown && p.spellsKnown[id]) st.reservedMp += 50 * ((p.spellLvl && p.spellLvl[id]) || 1);
  st.maxmp = Math.max(10, st.maxmp - st.reservedMp);
  const hLv = pasLv('haste');
  if (hLv) {
    const hb = [0, 0.10, 0.15, 0.20][hLv];
    st.spd *= 1 + hb;
    st.atkCd /= 1 + hb;
    if (hLv >= 3) st.dashCd *= 0.85; // Tempest
  }
  const wLv = pasLv('wrath');
  if (wLv) {
    const wb = [0, 0.12, 0.18, 0.25][wLv];
    st.dmg *= 1 + wb;
    st.spellMult *= 1 + wb;
    if (wLv >= 3) st.crit = Math.min(60, st.crit + 8); // Cataclysm
  }
  p.st = st;
  p.hp = Math.min(p.hp, st.maxhp);
  p.mp = Math.min(p.mp, st.maxmp);
}
// пасивна магия в слот (и научена)?
function hasPassive(id) {
  const p = G.player;
  return !!(p && p.activePassives && p.activePassives.indexOf(id) !== -1 && p.spellsKnown && p.spellsKnown[id]);
}
function passiveLv(id) {
  const p = G.player;
  return hasPassive(id) ? ((p.spellLvl && p.spellLvl[id]) || 1) : 0;
}

function giveXp(amount) {
  const p = G.player;
  p.xp += Math.round(amount * (1 + ((p.st && p.st.xpFind) || 0) / 100)); // афикс „% опит"
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.lvl++;
    p.skillPoints = (p.skillPoints || 0) + 1; // точка за дървото с умения
    p.xpNext = Math.round(p.xpNext * 1.42 + 12);
    G.levelupQueue++;
  }
  if (G.levelupQueue > 0 && G.state === 'play') openLevelup();
}
function openLevelup() {
  G.levelupQueue--;
  calcStats(G.player);
  G.player.hp = Math.min(G.player.st.maxhp, G.player.hp + Math.round(G.player.st.maxhp * 0.3));
  G.player.mp = G.player.st.maxmp;
  G.levelupChoices = rollPerkChoices();
  G.levelupOpenedAt = G.time;
  G.perkSel = 0;               // курсор за контролер/клавиатура
  G.state = 'levelup';
  document.body.classList.add('menu'); // системен курсор върху панела
  Sfx.play('level');
  burst(G.player.x, G.player.y, ['#ffd23b', '#fff2a0', '#7fd0a0'], 26, 4, 0.8);
  addText(G.player.x, G.player.y, '+', '#ffd23b', true);
}
function applyPerk(i) {
  const perk = G.levelupChoices[i];
  if (!perk) return;
  G.player.perks[perk.id] = (G.player.perks[perk.id] || 0) + 1;
  calcStats(G.player);
  if (perk.id === 'vit') G.player.hp = Math.min(G.player.st.maxhp, G.player.hp + 30);
  G.levelupChoices = null;
  toast(perk.n + ': ' + perk.d, '#7fd0a0');
  if (G.levelupQueue > 0) openLevelup();
  else { G.state = 'play'; document.body.classList.remove('menu'); }
}

// ---------- колизии ----------
function hitsWall(x, y, r, ghost) {
  if (!ghost) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r);
    const y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      if (cellAt(i, j) !== FLOOR) {
        const cx = clamp(x, i, i + 1), cy = clamp(y, j, j + 1);
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
      }
    }
  } else {
    // призраците минават през стени, но не и извън картата
    if (x < 1.2 || y < 1.2 || x > G.map.w - 1.2 || y > G.map.h - 1.2) return true;
  }
  // плътен реквизит
  for (const pr of G.props) {
    if (!pr.solid) continue;
    const d2 = (x - pr.x) * (x - pr.x) + (y - pr.y) * (y - pr.y);
    const rr = r + pr.r;
    if (d2 < rr * rr) return true;
  }
  return false;
}
function collideMove(e, dx, dy, ghost) {
  // разбий бързи стъпки (отскок/силно отблъскване) на под-стъпки, да не тунелират през плътни врати/стени
  const len = Math.abs(dx) + Math.abs(dy);
  if (len > 0.4) {
    const n = Math.ceil(len / 0.4);
    for (let k = 0; k < n; k++) collideMove(e, dx / n, dy / n, ghost);
    return;
  }
  if (dx) { const nx = e.x + dx; if (!hitsWall(nx, e.y, e.r, ghost)) e.x = nx; }
  if (dy) { const ny = e.y + dy; if (!hitsWall(e.x, ny, e.r, ghost)) e.y = ny; }
}

// линия на видимост между две точки (по средата на плочките)
function losClear(x0, y0, x1, y1, forFov) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(d / 0.2));
  const ti = Math.floor(x1), tj = Math.floor(y1);
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    const ci = Math.floor(x), cj = Math.floor(y);
    if (cellAt(ci, cj) !== FLOOR) {
      return !!forFov && ci === ti && cj === tj;
    }
  }
  return true;
}

function computeFOV() {
  if (G.onSurface) return; // на повърхността всичко се вижда постоянно
  const m = G.map, p = G.player;
  G.visible.fill(0);
  const cx = Math.floor(p.x), cy = Math.floor(p.y);
  for (let j = cy - FOV_R; j <= cy + FOV_R; j++) for (let i = cx - FOV_R; i <= cx + FOV_R; i++) {
    if (i < 0 || j < 0 || i >= m.w || j >= m.h) continue;
    const dx = i + 0.5 - p.x, dy = j + 0.5 - p.y;
    if (dx * dx + dy * dy > FOV_R * FOV_R) continue;
    if (losClear(p.x, p.y, i + 0.5, j + 0.5, true)) {
      const idx = j * m.w + i;
      G.visible[idx] = 1;
      G.explored[idx] = 1;
    }
  }
  G.miniDirty = true; // минимапата да се преначертае с новоизследваното
}
function tileVisible(i, j) {
  const m = G.map;
  if (i < 0 || j < 0 || i >= m.w || j >= m.h) return false;
  return G.visible[j * m.w + i] === 1;
}

// ---------- A* по решетката ----------
function findPath(sx, sy, tx, ty) {
  const m = G.map, w = m.w;
  const s = sy * w + sx, t = ty * w + tx;
  if (s === t) return [];
  // заключените врати на съкровищницата са плътни -> A* да не маршрутира през тях (иначе враг засяда на вратата)
  let blocked = null;
  if (G.vault && !G.vaultUnlocked && G.props) {
    blocked = new Set();
    for (const pr of G.props) if (pr.kind === 'vaultdoor' && pr.solid && !pr.broken) blocked.add(Math.floor(pr.y) * w + Math.floor(pr.x));
  }
  const open = [s];
  const openSet = new Set([s]); // паралелна проверка за членство (по-бърза от open.includes)
  const came = new Map();
  const gS = new Map([[s, 0]]);
  const fS = new Map([[s, Math.abs(tx - sx) + Math.abs(ty - sy)]]);
  let iter = 0;
  while (open.length && iter++ < 1100) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if ((fS.get(open[i]) || 1e9) < (fS.get(open[bi]) || 1e9)) bi = i;
    const cur = open.splice(bi, 1)[0];
    openSet.delete(cur);
    if (cur === t) {
      const path = [];
      let c = t;
      while (c !== s) { path.push({ x: c % w + 0.5, y: ((c / w) | 0) + 0.5 }); c = came.get(c); }
      return path.reverse();
    }
    const cx = cur % w, cy = (cur / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (cellAt(nx, ny) !== FLOOR) continue;
      const ni = ny * w + nx;
      if (blocked && blocked.has(ni)) continue; // не през заключена врата на съкровищница
      const ng = gS.get(cur) + 1;
      if (ng < (gS.get(ni) === undefined ? 1e9 : gS.get(ni))) {
        came.set(ni, cur);
        gS.set(ni, ng);
        fS.set(ni, ng + Math.abs(tx - nx) + Math.abs(ty - ny));
        if (!openSet.has(ni)) { open.push(ni); openSet.add(ni); }
      }
    }
  }
  return null;
}

// ---------- щети ----------
function damagePlayer(amount, sx, sy) {
  const p = G.player;
  if (p.iframes > 0 || G.state !== 'play') return;
  const red = p.st.armor / (p.st.armor + 50);
  let dmg = Math.max(1, Math.round(amount * (1 - red) * rnd(0.9, 1.1)));
  // Магичен щит поглъща пръв
  if (p.ward > 0) {
    const absorbed = Math.min(p.ward, dmg);
    p.ward -= absorbed;
    dmg -= absorbed;
    addText(p.x, p.y, 'SHIELD', '#8ab0ff');
    burst(p.x, p.y, ['#8ab0ff', '#c9d1d9'], 6, 2.5, 0.3);
    if (p.ward <= 0 && (p.wardLv || 1) >= 3) wardShatter(); // „Shards": счупването избухва
    if (dmg <= 0) { p.iframes = 0.3; return; }
  }
  p.hp -= dmg;
  p.iframes = 0.55;
  p.hurtT = 0.25;
  p.sinceHit = 0;
  G.hurtFlash = 0.4;
  G.shake = Math.min(8, G.shake + 4);
  addText(p.x, p.y, '-' + dmg, '#ff6b7a');
  burst(p.x, p.y, ['#8a1c2a', '#c22836'], 8, 3, 0.4);
  Sfx.play('hurt');
  // неизбутваем: Кожата на голема / Отвара на камъка / Arcane Shield „Unshakable" (ниво 2) докато щитът държи
  if (sx !== undefined && !(p.st && p.st.noKnock) && !(p.ward > 0 && (p.wardLv || 1) >= 2)) {
    const a = Math.atan2(p.y - sy, p.x - sx);
    collideMove(p, Math.cos(a) * 0.25, Math.sin(a) * 0.25);
  }
  if (p.hp <= 0) {
    // Втори шанс (умение): веднъж на спускане оцеляваш
    if (skillCount(p, 'bd5') && !p.usedSecondChance) {
      p.usedSecondChance = true;
      p.hp = Math.round(p.st.maxhp * 0.3);
      p.iframes = 1.5;
      toast('SECOND CHANCE! Fate holds you back.', '#5fd97a');
      burst(p.x, p.y, ['#5fd97a', '#fff2a0'], 24, 4, 0.8);
      Sfx.play('level');
      return;
    }
    // Камък на душата: платеното съживяване се харчи СЛЕД безплатното умение
    // първо от екип-слота (под амулета), после от чантата (стари записи)
    const si = (p.equip && p.equip.soulstone) ? -2 : p.inv.findIndex(it => it && it.soulstone);
    if (si !== -1) {
      if (si === -2) { p.equip.soulstone = null; calcStats(p); } else p.inv.splice(si, 1);
      p.hp = Math.round(p.st.maxhp * 0.5);
      p.iframes = 1.5;
      toast('The Soul Stone shatters — pulled back from death!', '#ff6b7a');
      burst(p.x, p.y, ['#c22836', '#ff8aa0', '#ffd0e0'], 28, 4.5, 0.9);
      Sfx.play('level'); Sfx.play('potion');
      return;
    }
    p.hp = 0;
    playerDie();
  }
}
function playerDie() {
  G.state = 'dead';
  G.deadT = 0;
  G.player.hurtT = 0;
  G.interactHint = null;
  G.mouse.down = G.mouse.rdown = false;
  G.meta.deaths++;
  G.meta.totalKills += G.kills;
  G.meta.bestDepth = Math.max(G.meta.bestDepth, G.maxDepth);
  saveProfile();
  Sfx.play('die');
  Sfx.play('roar');
  burst(G.player.x, G.player.y, ['#c22836', '#8a1c2a', '#c6d3e6'], 40, 5, 1);
  G.shake = 10;
  saveBest();
  document.body.classList.add('menu');
}

function damageEnemy(e, dmg, isCrit, kbA, kbF) {
  if (e.dormant) {
    // спящият бос е неуязвим, докато не влезеш в стаята му
    addText(e.x, e.y, 'ENTER THE ROOM', '#7d8899');
    return;
  }
  if (e.shield) {
    // Щитоносец: първият удар се поглъща
    e.shield = false;
    e.flash = 0.15;
    addText(e.x, e.y, 'SHIELD', '#8ab0ff');
    burst(e.x, e.y, ['#8ab0ff', '#c9d1d9'], 8, 3, 0.35);
    Sfx.play('deny');
    e.aggro = true;
    return;
  }
  // Ice Bolt „Brittle" (ниво 2): забавените поемат +25% от ВСИЧКО
  if (e.slowT > 0 && spellLv(G.player, 'icebolt') >= 2) dmg *= 1.25;
  e.hp -= dmg;
  e.flash = 0.12;
  e.aggro = true;
  if (isCrit && hasPower('kingseye')) {
    // Окото на кралете: критовете ронят злато
    const g = Math.max(1, Math.round(1 + G.depth * 0.6));
    G.player.gold += g;
    addText(e.x, e.y + 0.3, '+' + g, '#ffd23b');
    if (chance(0.4)) Sfx.play('coin');
  }
  addText(e.x, e.y, Math.round(dmg) + (isCrit ? '!' : ''), isCrit ? '#ffd23b' : '#ffffff', isCrit);
  if (kbA !== undefined && !e.t.boss) {
    collideMove(e, Math.cos(kbA) * (kbF || 0.22), Math.sin(kbA) * (kbF || 0.22), e.t.ghost);
  }
  burst(e.x, e.y, e.t.spr === 'slime' ? ['#46c86e', '#2a8f4a'] : ['#8a1c2a', '#c22836'], 6, 3, 0.35);
  if (e.hp <= 0) killEnemy(e);
  else Sfx.play(isCrit ? 'crit' : 'hit');
}
function killEnemy(e) {
  e.dead = true;
  G.kills++;
  if (e.plagued) addHazard({ type: 'poison', x: e.x, y: e.y, t: 0, life: 3, r: 0.9, dps: 6 + G.depth * 0.4 }); // Poison „Plague": ражда нов малък облак
  if (e.keyGuardian && G.vault && !G.vaultUnlocked) { // Съкровищница: ключът пада -> вратите се отварят
    G.vaultUnlocked = true;
    for (const pr of G.props) if (pr.kind === 'vaultdoor') { pr.opened = true; pr.solid = false; }
    toast('The Key Guardian falls — the Vault opens!', '#ffd23b');
    Sfx.play('level'); Sfx.play('open');
    G.miniDirty = true;
  }
  G.hitStop = Math.max(G.hitStop, 0.045);
  G.shake = Math.min(8, G.shake + 1.5);
  Sfx.play('die');
  const p = G.player;
  // Избухващ елит: закъснял взрив със сигнал
  if (e.mod === 'volatile') {
    addHazard({ type: 'blast', x: e.x, y: e.y, t: 0, delay: 0.9, r: 1.5, dmg: e.dmg * 1.2 });
    toast('About to explode!', '#ff8a1f');
  }
  // перкове при убийство
  if (perkCount(p, 'harvest') && dist(p.x, p.y, e.x, e.y) < p.st.range + 1) {
    p.hp = Math.min(p.st.maxhp, p.hp + p.st.maxhp * 0.03);
  }
  if (perkCount(p, 'frenzy')) p.frenzyT = 3;
  burst(e.x, e.y, e.t.spr === 'slime' ? ['#46c86e', '#a8f0c0', '#2a8f4a'] : ['#c22836', '#8a1c2a', '#d8d3c0'], e.t.boss ? 50 : 16, 4, 0.7);
  if (!e.t.fly) G.decals.push({ x: e.x, y: e.y, v: rndi(0, 2) });
  if (G.decals.length > 200) G.decals.shift();
  if (e.summoned) return; // призованите не дават нищо
  const mult = (e.elite ? 2.2 : 1) * (e.t.boss ? 6 : 1);
  giveXp(Math.round(e.t.xp * (1 + 0.22 * (G.depth - 1)) * (e.elite ? 2 : 1) * (e.t.boss ? 3 : 1)));
  // плячка
  for (const d of Items.rollDrop(G.depth, mult, p.st.gold)) spawnDrop(e.x, e.y, d);
  if (e.elite && chance(0.06)) spawnDrop(e.x, e.y, { item: genTome() });
  // Осколки на Бездната (единна валута): обикновен моб 15%, елит 2 гарантирано; босовете — по-долу
  if (!e.t.boss) {
    // осколките растат с дълбочината (както златото), за да не се наказва слизането надолу
    if (e.elite) spawnDrop(e.x, e.y, { shard: Math.round(2 + G.depth / 5) });
    else if (chance(0.15)) spawnDrop(e.x, e.y, { shard: Math.round(1 + G.depth / 10) });
  }
  if (e.t.boss) {
    for (let i = 0; i < 2; i++) spawnDrop(e.x, e.y, { item: Items.gen(G.depth, 25) });
    if (chance(0.4)) spawnDrop(e.x, e.y, { item: genTome() });
    if (G.meta.legendPool && (e.kind === 'arch' || chance(0.25))) spawnDrop(e.x, e.y, { item: genUnique(G.depth) });
    if (G.depth % 10 === 0) {
      spawnDrop(e.x, e.y, { seal: 2 });      // архибос: 2 Печата на Бездната (НЕ растат с етажа)
      spawnDrop(e.x, e.y, { shard: Math.round(25 + G.depth * 1.5) });    // + осколки, растящи с дълбочината
      // портал към лагера: прибираш се без да губиш нивото и уменията си
      // (слага се на валидна подова плочка, за да не се озове в стена = неизползваем)
      const pp = freeFloorNear(e.x, e.y - 1.2);
      G.props.push({ kind: 'homeportal', x: pp.x, y: pp.y, r: 0.55, solid: false });
      toast('A portal to camp has opened!', '#8ab0ff');
    } else {
      // пазител (Костен крал/Кървав голем/Архилич — етаж 5/15/25) -> осколки, растящи с дълбочината
      spawnDrop(e.x, e.y, { shard: Math.round(15 + G.depth) });
    }
    // отпечатваме стълбите и стаята
    for (const pr of G.props) if (pr.kind === 'stairs') pr.sealed = false;
    unlockBossRoom();
    toast('The Guardian has fallen! The stairs are open.', '#7fd0a0');
    G.bossName = null;
    Sfx.play('level');
    // слугите умират с господаря си
    for (const a of G.enemies) if (a.summoned && !a.dead) { a.dead = true; burst(a.x, a.y, ['#6a4f9e', '#c84fff'], 8, 3, 0.4); }
  }
}
function spawnDrop(x, y, d) {
  let nx = x + rnd(-0.3, 0.3), ny = y + rnd(-0.3, 0.3);
  if (cellAt(Math.floor(nx), Math.floor(ny)) !== FLOOR) { nx = x; ny = y; } // не в стена
  G.ground.push({
    x: nx, y: ny, z: 10, vz: rnd(20, 45),
    gold: d.gold, potion: d.potion, item: d.item, seal: d.seal, shard: d.shard, t: d.t || 0,
  });
}

// ---------- герой: ъпдейт ----------
function updatePlayer(dt) {
  const p = G.player;
  p.atkT = Math.max(0, p.atkT - dt);
  p.atkAnim = Math.max(0, p.atkAnim - dt);
  p.fireCd = Math.max(0, (p.fireCd || 0) - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  // презареждане на магиите, зарядите на отскока, щитът и опиянението
  p.spellCd = p.spellCd || [0, 0, 0];
  for (let i = 0; i < 3; i++) p.spellCd[i] = Math.max(0, p.spellCd[i] - dt);
  // презареждане на двата слота за отвари
  p.potionCd = p.potionCd || [0, 0];
  p.potionCd[0] = Math.max(0, p.potionCd[0] - dt);
  p.potionCd[1] = Math.max(0, p.potionCd[1] - dt);
  // активни бъфове от отвари — изтичат по време
  if (p.buffs) {
    let expired = false;
    for (const k in p.buffs) { p.buffs[k].t -= dt; if (p.buffs[k].t <= 0) { delete p.buffs[k]; expired = true; } }
    if (expired) calcStats(p);
  }
  p.frenzyT = Math.max(0, (p.frenzyT || 0) - dt);
  if (p.wardT > 0) { p.wardT -= dt; if (p.wardT <= 0) p.ward = 0; }
  // ---- ПАСИВЕН Arcane Shield: постоянен щит, който се презарежда 8с след счупване ----
  if (hasPassive('ward')) {
    p.wardLv = passiveLv('ward');
    if (p.ward > 0) {
      p.wardT = 2;            // не изтича от време, докато аурата е сложена
      p.wardRecharge = 8;
    } else {
      p.wardRecharge = (p.wardRecharge === undefined ? 0 : p.wardRecharge) - dt;
      if (p.wardRecharge <= 0) {
        p.ward = Math.round(30 + p.lvl * 4 + p.st.maxmp * 0.4);
        p.wardT = 2;
        burst(p.x, p.y, ['#c9d1d9', '#8ab0ff'], 10, 2.5, 0.5);
      }
    }
  }
  // ---- ПАСИВЕН Hungry Skull: постоянни орбитални черепи (1, а с „Pack" — 2) ----
  {
    G.orbitals = G.orbitals || [];
    if (hasPassive('skull')) {
      const slv = passiveLv('skull');
      const want = slv >= 2 ? 2 : 1;
      const mine = G.orbitals.filter(o => o.passive);
      for (const o of mine) { o.life = 9e9; o.dmg = spellDmg(0.7); o.leech = slv >= 3; } // поддържаме ги актуални
      for (let k = mine.length; k < want; k++) G.orbitals.push({ t: 0, life: 9e9, a: rnd(Math.PI * 2) + k * Math.PI, dmg: spellDmg(0.7), leech: slv >= 3, passive: true });
      if (mine.length > want) { let extra = mine.length - want; for (let i = G.orbitals.length - 1; i >= 0 && extra > 0; i--) if (G.orbitals[i].passive) { G.orbitals.splice(i, 1); extra--; } }
    } else if (G.orbitals.some(o => o.passive)) {
      G.orbitals = G.orbitals.filter(o => !o.passive); // аурата е свалена
    }
  }
  if ((p.dashCharges || 0) < p.st.dashMax) {
    p.dashRegen = (p.dashRegen === undefined ? p.st.dashCd : p.dashRegen) - dt;
    if (p.dashRegen <= 0) {
      p.dashCharges = (p.dashCharges || 0) + 1;
      p.dashRegen = p.dashCharges < p.st.dashMax ? p.st.dashCd : undefined;
    }
  }
  // орбитален череп
  if (G.orbitals) {
    for (let i = G.orbitals.length - 1; i >= 0; i--) {
      const o = G.orbitals[i];
      o.t += dt;
      o.a += 4 * dt;
      if (o.t > o.life) { G.orbitals.splice(i, 1); continue; }
      const ox = p.x + Math.cos(o.a) * 1.4, oy = p.y + Math.sin(o.a) * 1.4;
      for (const e of G.enemies) {
        if (e.dead || dist(e.x, e.y, ox, oy) > e.r + 0.35) continue;
        if ((e.skullCd || 0) > G.time) continue;
        e.skullCd = G.time + 0.5;
        damageEnemy(e, o.dmg, false, Math.atan2(e.y - p.y, e.x - p.x), 0.15);
        if (o.leech) { p.hp = Math.min(p.st.maxhp, p.hp + o.dmg * 0.5); addText(p.x, p.y, '+' + Math.round(o.dmg * 0.5), '#7fd0a0'); } // Ненаситност

      }
    }
  }
  p.iframes = Math.max(0, p.iframes - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);
  p.sinceHit += dt;
  p.mp = Math.min(p.st.maxmp, p.mp + p.st.mpRegen * dt);
  if (p.sinceHit > 5) p.hp = Math.min(p.st.maxhp, p.hp + 1.2 * dt);
  if (p.st.hpRegen) p.hp = Math.min(p.st.maxhp, p.hp + p.st.hpRegen * dt); // Кръвообращение

  // движение (биндове + стрелките винаги работят) или виртуален джойстик
  let mx = 0, my = 0;
  const K = G.keys;
  if (K[kbBind('up')] || K['ArrowUp']) { mx -= 1; my -= 1; }
  if (K[kbBind('down')] || K['ArrowDown']) { mx += 1; my += 1; }
  if (K[kbBind('left')] || K['ArrowLeft']) { mx -= 1; my += 1; }
  if (K[kbBind('right')] || K['ArrowRight']) { mx += 1; my -= 1; }
  if (G.joy && (Math.abs(G.joy.dx) > 6 || Math.abs(G.joy.dy) > 6)) {
    // екранен вектор -> световни оси на изометрията
    const a = G.joy.dx / (TW / 2), b = G.joy.dy / (TH / 2);
    mx = (a + b) / 2; my = (b - a) / 2;
  }
  if (G.pad && (G.pad.mx || G.pad.my)) {
    // левият стик на контролера
    const a = G.pad.mx / (TW / 2), b = G.pad.my / (TH / 2);
    mx = (a + b) / 2; my = (b - a) / 2;
  }

  if (p.dashT > 0) {
    p.dashT -= dt;
    const s = p.st.spd * 3.6;
    collideMove(p, Math.cos(p.dashA) * s * dt, Math.sin(p.dashA) * s * dt);
    if (chance(0.7)) addParticle({ x: p.x, y: p.y, z: 4, vx: 0, vy: 0, vz: 6, grav: 0, t: 0, life: 0.3, col: '#8a93a3', size: 1 });
    p.moving = true;
  } else if (mx || my) {
    const L = Math.hypot(mx, my);
    const dx = mx / L * p.st.spd * dt, dy = my / L * p.st.spd * dt;
    collideMove(p, dx, dy);
    p.moving = true;
    p.animT += dt;
    if (p.atkAnim <= 0) {
      const sy = mx + my; // екранна вертикална компонента
      p.dirUp = sy < 0;
      const sx = mx - my;
      if (sx !== 0) p.flip = sx < 0;
    }
  } else {
    p.moving = false;
    p.animT = 0;
  }

  // прицел: десен стик на пада > мишка > посока на движение
  const padAiming = G.padAimT && G.time - G.padAimT < 0.6;
  const padActive = G.padUseT && G.time - G.padUseT < 2;
  if (!padAiming) {
    if (useMouseAim() && !padActive) p.aimA = Math.atan2(G.mouse.wy - p.y, G.mouse.wx - p.x);
    else if (mx || my) p.aimA = Math.atan2(my, mx);
  }

  // задържани бутони: мишка, тъч или контролер
  if (G.mouse.down) tryMelee();
  if (G.mouse.rdown) tryFireball();
  if (kbBind('attack') && K[kbBind('attack')]) autoMelee();
  if (G.atkHold !== null) autoMelee();
  if (G.fireHold !== null) tryFireballAuto();
  if (G.padAtkHold) { if (padAiming) tryMelee(); else autoMelee(); }

  // отложен удар на мелето
  if (p.meleeHitT >= 0) {
    p.meleeHitT -= dt;
    if (p.meleeHitT < 0) resolveMelee();
  }
  // ЗАМАХЪТ УДРЯ: острието поразява врага в момента, в който мине през него
  if (p.swingActive) {
    const aimRef = p.swingAimA !== undefined ? p.swingAimA : p.aimA; // заключеният прицел на удара
    const t01 = G.slashFx ? clamp(G.slashFx.t / 0.18, 0, 1) : 1;
    const arc = p.st.arc;
    const swRel = -arc + 2 * arc * t01;                 // текущ ъгъл на острието (спрямо прицела)
    const lo = Math.min(p.swingPrevA, swRel) - 0.3, hi = Math.max(p.swingPrevA, swRel) + 0.3;
    for (const e of G.enemies) {
      if (e.dead || e.swingHit === p.swingId) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d > p.st.range + e.t.r) continue;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      const rel = angDiff(a, aimRef);
      if (rel < lo || rel > hi || Math.abs(rel) > arc + 0.1) continue; // острието още не е стигнало дотам
      if (!losClear(p.x, p.y, e.x, e.y)) continue;
      e.swingHit = p.swingId;
      meleeHitEnemy(e, a);
    }
    // бъчвите се чупят, когато острието ги достигне
    for (const pr of G.props) {
      if (pr.hp === undefined || pr.broken) continue;
      const d = dist(p.x, p.y, pr.x, pr.y);
      if (d > p.st.range + 0.4) continue;
      const a = Math.atan2(pr.y - p.y, pr.x - p.x);
      const rel = angDiff(a, aimRef);
      if (rel < lo - 0.05 || rel > hi + 0.05 || Math.abs(rel) > arc + 0.15) continue;
      breakProp(pr);
    }
    p.swingPrevA = swRel;
    if (t01 >= 1 || p.atkAnim <= 0) p.swingActive = false;
  }

  // ниска кръв — пулс
  if (p.hp < p.st.maxhp * 0.25) {
    p.heartT = (p.heartT || 0) - dt;
    if (p.heartT <= 0) { p.heartT = 0.9; Sfx.play('thump'); }
  }

  // видимост при смяна на плочка
  const ti = Math.floor(p.x), tj = Math.floor(p.y);
  if (ti !== p.lastTi || tj !== p.lastTj) {
    p.lastTi = ti; p.lastTj = tj;
    computeFOV();
  }

  updatePickups(dt);
  updateInteract();
  checkBossRoom();
  updateArena(dt);
}

function tryMelee() {
  const p = G.player;
  if (p.atkT > 0 || p.dashT > 0) return;
  p.atkT = p.st.atkCd * (p.frenzyT > 0 ? 0.75 : 1); // Опиянение
  p.atkAnim = 0.22;
  const w = p.equip.weapon;
  p.swingAimA = p.aimA; // замахът е ЗАКЛЮЧЕН към прицела от началото на удара (като slash ефекта)
  if (w && w.uid === 'dawnsting') {
    p.meleeHitT = 0.08; // Жилото на зората: мигновено пробождане по линия
  } else {
    // САМОТО ОРЪЖИЕ удря: острието поразява враговете, когато мине през тях в замаха
    p.meleeHitT = -1;
    p.swingActive = true;
    p.swingId = (p.swingId || 0) + 1;
    p.swingPrevA = -p.st.arc; // относително спрямо прицела: от -дъга към +дъга
  }
  // обръщане по прицела
  const sdx = Math.cos(p.aimA) - Math.sin(p.aimA);
  const sdy = (Math.cos(p.aimA) + Math.sin(p.aimA)) / 2;
  p.dirUp = sdy < 0;
  if (Math.abs(sdx) > 0.15) p.flip = sdx < 0;
  Sfx.play('swing');
  // ефект дъга — ПО-БЛИЗО и ПО-МАЛЪК (натурален, колкото реалния замах на оръжието)
  G.slashFx = {
    x: p.x + Math.cos(p.aimA) * 0.45 * p.st.range,
    y: p.y + Math.sin(p.aimA) * 0.45 * p.st.range,
    a: p.aimA, t: 0,
    k: p.st.range / 1.6 * (0.62 + p.st.arc * 0.2),
  };
}

// авто-мерене за тъч управление: удар/кълбо към най-близкия видим враг
function nearestEnemy(maxD) {
  const p = G.player;
  let best = null, bd = maxD;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d < bd && losClear(p.x, p.y, e.x, e.y)) { bd = d; best = e; }
  }
  return best;
}
function autoMelee() {
  const p = G.player;
  const e = nearestEnemy(p.st.range + 1.2);
  if (e) p.aimA = Math.atan2(e.y - p.y, e.x - p.x);
  tryMelee();
}
function tryFireballAuto() { castSpell(0); }
// удар върху ЕДИН враг от близкия бой (ползва се от ЗАМАХА и от уникатите)
function meleeHitEnemy(e, a) {
  const p = G.player;
  const w = p.equip.weapon;
  const mountain = w && w.uid === 'mountain';
  const gravedigger = w && w.uid === 'gravedigger'; // Гробарят на крале: екзекуция
  const chaosbind = w && w.uid === 'chaosbind';      // Окови на хаоса: притегля
  let isCrit = chance(p.st.crit / 100);
  // Шепот в мрака: сигурен крит след отскок / срещу незасякъл те враг
  if (w && w.uid === 'whisper' && ((G.time - (p.lastDashT || -99)) < 1.5 || !e.aggro)) isCrit = true;
  let dmg = p.st.dmg * rnd(0.9, 1.1);
  if (isCrit) dmg *= p.st.critd;
  // Гробарят на крале: +60% щети срещу враг под 30% живот (екзекуция)
  const execute = gravedigger && e.maxhp && e.hp < e.maxhp * 0.3;
  if (execute) dmg *= 1.6;
  // Окови на хаоса: притегля към теб (ъгъл към играча) вместо да отблъсква
  const kbA = chaosbind ? a + Math.PI : a;
  const kbF = chaosbind ? 0.5 : (mountain ? 0.65 : 0.25);
  damageEnemy(e, dmg, isCrit, kbA, kbF);
  // Гробарят на крале: убийство с екзекуция разтриса земята
  if (execute && e.dead) { G.shake = Math.min(9, G.shake + 4); Sfx.play('boom'); addText(e.x, e.y + 0.4, 'EXECUTION', '#ff4757', true); }
  // Втори замах: мигновен повторен удар
  if (!e.dead && p.st.doubleStrike && chance(p.st.doubleStrike)) {
    damageEnemy(e, dmg * 0.8, false, a, 0.1);
    addText(e.x, e.y + 0.5, 'x2', '#d84a5a');
  }
  if (!e.dead) {
    // Гневът на планината: удар в стена = двойни щети
    if (mountain && hitsWall(e.x + Math.cos(a) * 0.18, e.y + Math.sin(a) * 0.18, e.r)) {
      damageEnemy(e, dmg, false);
      addText(e.x, e.y + 0.4, 'SLAM!', '#ff8a1f', true);
      G.shake = Math.min(8, G.shake + 3);
      Sfx.play('boom');
    }
    // перкове при попадение
    if (!e.dead && perkCount(p, 'chill')) e.slowT = Math.max(e.slowT, 1);
    if (!e.dead && perkCount(p, 'burncrit') && isCrit) { e.burnT = 2; e.burnDps = dmg * 0.2; }
    // Chain Lightning „Electrify" (ниво 3): зареденият враг избухва при близък удар
    if (!e.dead && (e.chargedT || 0) > 0) { e.chargedT = 0; castChain(e, spellDmg(0.7), 4, false, false); burst(e.x, e.y, ['#ffd23b', '#fff2a0'], 6, 3, 0.3); }
  }
  if (perkCount(p, 'static')) {
    p.hitCount = (p.hitCount || 0) + 1;
    if (p.hitCount % 5 === 0) castChain(e.dead ? null : e, p.st.dmg * 0.8, 3);
  }
  if (p.st.vamp > 0) p.hp = Math.min(p.st.maxhp, p.hp + dmg * p.st.vamp / 100);
  G.shake = Math.min(6, G.shake + 1);
}
// мигновен удар (само за Жилото на зората — пробожда по линия)
function resolveMelee() {
  const p = G.player;
  const w = p.equip.weapon;
  const dawnsting = w && w.uid === 'dawnsting';
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d > p.st.range + e.t.r) continue;
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    if (dawnsting) {
      // пробожда по правата линия на прицела (перпендикулярна лента), а не в конуса — удря ВСИЧКИ по линията
      const ad = angDiff(a, p.aimA);
      if (Math.abs(ad) > Math.PI / 2 || Math.abs(d * Math.sin(ad)) > 0.7 + e.t.r) continue;
    } else if (Math.abs(angDiff(a, p.aimA)) > p.st.arc) continue;
    if (!losClear(p.x, p.y, e.x, e.y)) continue; // не удряме през стени
    meleeHitEnemy(e, a);
  }
  // чупим бъчви
  for (const pr of G.props) {
    if (pr.hp === undefined || pr.broken) continue;
    const d = dist(p.x, p.y, pr.x, pr.y);
    if (d > p.st.range + 0.4) continue;
    const a = Math.atan2(pr.y - p.y, pr.x - p.x);
    if (Math.abs(angDiff(a, p.aimA)) > p.st.arc + 0.15) continue;
    breakProp(pr);
  }
}
function breakProp(pr) {
  pr.broken = true;
  pr.solid = false;
  burst(pr.x, pr.y, ['#6e4a2f', '#7d5636', '#42331f'], 12, 3.5, 0.5);
  Sfx.play('hit');
  if (chance(0.35)) spawnDrop(pr.x, pr.y, { gold: rndi(2, 6 + G.depth) });
  if (chance(0.06)) spawnDrop(pr.x, pr.y, { gold: rndi(3, 8 + G.depth) }); // отварите вече не падат от бъчви
}
// ---------- активни магии: 3 слота, споделена мана, томовете се намират ----------
function spellDmg(mult) {
  const p = G.player;
  return (p.st.dmg * mult + p.lvl * 1.5) * p.st.spellMult;
}
// ниво на магия (1..3): 2 и 3 се купуват с осколки, дават само промяна в поведението
function spellLv(p, id) { return (p.spellLvl && p.spellLvl[id]) || 1; }
function freezeFx(e) { burst(e.x, e.y, ['#a8d8ff', '#c9e8ff', '#ffffff'], 8, 2.5, 0.4); }
const SPELL_CAST = {
  fireball(p, aim, target, lv) {
    G.projectiles.push({
      kind: 'fireball', from: 'player', lv: lv || 1,
      x: p.x + Math.cos(aim) * 0.5, y: p.y + Math.sin(aim) * 0.5,
      vx: Math.cos(aim) * 11, vy: Math.sin(aim) * 11,
      dmg: spellDmg(1.1), r: 0.25, t: 0,
    });
  },
  icebolt(p, aim, target, lv) {
    G.projectiles.push({
      kind: 'icebolt', from: 'player', lv: lv || 1,
      x: p.x + Math.cos(aim) * 0.5, y: p.y + Math.sin(aim) * 0.5,
      vx: Math.cos(aim) * 13, vy: Math.sin(aim) * 13,
      dmg: spellDmg(0.85), r: 0.22, t: 0, pierce: 2,
    });
  },
  nova(p, aim, target, lv) {
    G.novaFx = G.novaFx || [];
    G.novaFx.push({ x: p.x, y: p.y, t: 0, col: '#8ab0ff', maxR: 2.6 });
    for (const e of G.enemies) {
      if (e.dead || dist(e.x, e.y, p.x, p.y) > 2.6 + e.r) continue;
      e.slowT = 2.5;
      damageEnemy(e, spellDmg(1.2), false, Math.atan2(e.y - p.y, e.x - p.x), 0.2);
    }
    G.shake = Math.min(7, G.shake + 3);
    if (lv >= 2) addHazard({ type: 'icefield', x: p.x, y: p.y, t: 0, life: 5, r: 2.4 });                              // Ледено поле
    if (lv >= 3) addHazard({ type: 'novawave', x: p.x, y: p.y, t: 0, delay: 0.8, life: 0.3, r: 2.6, dmg: spellDmg(2.4) }); // Двойна вълна (двойна щета)
  },
  chain(p, aim, target, lv) {
    castChain(target || null, spellDmg(0.9), lv >= 2 ? 7 : 4, lv >= 2, lv >= 3); // Пренасищане: 7 скока + връщане; Наелектризиране: зарежда
  },
  poison(p, aim, target, lv) {
    const tx = target ? target.x : p.x + Math.cos(aim) * 3;
    const ty = target ? target.y : p.y + Math.sin(aim) * 3;
    addHazard({ type: 'poison', x: tx, y: ty, t: 0, life: 5, r: 1.5, dps: spellDmg(0.4), grow: lv >= 2, plague: lv >= 3 });
  },
  ward(p, aim, target, lv) {
    p.ward = 30 + p.lvl * 4 + p.st.maxmp * 0.4;
    p.wardT = 8;
    p.wardLv = lv || 1;
    burst(p.x, p.y, ['#c9d1d9', '#8ab0ff'], 14, 3, 0.6);
  },
  skull(p, aim, target, lv) {
    G.orbitals = G.orbitals || [];
    const n = lv >= 2 ? 2 : 1; // Глутница: два черепа
    for (let k = 0; k < n; k++) G.orbitals.push({ t: 0, life: 8, a: rnd(Math.PI * 2) + k * Math.PI, dmg: spellDmg(0.7), leech: lv >= 3 }); // Ненаситност
  },
  quake(p, aim, target, lv) {
    G.novaFx = G.novaFx || [];
    G.novaFx.push({ x: p.x, y: p.y, t: 0, col: '#a08050', maxR: 3 });
    for (const e of G.enemies) {
      if (e.dead || dist(e.x, e.y, p.x, p.y) > 3 + e.r) continue;
      damageEnemy(e, spellDmg(1.5), false, Math.atan2(e.y - p.y, e.x - p.x), 0.7);
      if (lv >= 3 && !e.t.boss && !e.dead) e.stunT = Math.max(e.stunT || 0, 1.5); // Съсипване: зашеметяване 1.5с
    }
    for (const pr of G.props) {
      if (pr.hp !== undefined && !pr.broken && dist(pr.x, pr.y, p.x, p.y) < 3) breakProp(pr);
    }
    if (lv >= 2) for (let k = 0; k < 4; k++) { // Пукнатини: разломи, които забавят
      const a = rnd(Math.PI * 2), rr = rnd(1, 2.4);
      addHazard({ type: 'fissure', x: p.x + Math.cos(a) * rr, y: p.y + Math.sin(a) * rr, t: 0, life: 5, r: 0.9 });
    }
    G.shake = 9;
    Sfx.play('boom');
  },
};
// верижна мълния (ползва се и от перка "Static Charge")
function castChain(start, dmg, jumps, revisit, charge) {
  const p = G.player;
  let from = { x: p.x, y: p.y };
  let cur = start || nearestEnemy(6);
  const hit = new Set();
  G.zaps = G.zaps || [];
  let k = dmg;
  while (cur && jumps-- > 0) {
    hit.add(cur);
    G.zaps.push({ x1: from.x, y1: from.y, x2: cur.x, y2: cur.y, t: 0 });
    damageEnemy(cur, k, false);
    if (charge && !cur.dead && !cur.t.boss) cur.chargedT = 6; // Наелектризиране: остава зареден
    if (G.zaps.length > 20) G.zaps.shift();
    k *= 0.8;
    from = cur;
    let best = null, bd = 3.5;
    for (const e of G.enemies) {
      if (e.dead || e === from) continue;          // не скачаме към себе си
      if (!revisit && hit.has(e)) continue;        // Пренасищане: разрешава връщане към вече ударени
      const d = dist(from.x, from.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    cur = best;
  }
}
// Arcane Shield „Shards" (ниво 3): при счупване на щита — взрив с щети и отблъскване наоколо
function wardShatter() {
  const p = G.player;
  burst(p.x, p.y, ['#c9d1d9', '#8ab0ff', '#ffffff'], 22, 5, 0.6);
  G.shake = Math.min(8, G.shake + 3);
  Sfx.play('boom');
  const dmg = spellDmg(1.3);
  for (const e of G.enemies) {
    if (e.dead || dist(e.x, e.y, p.x, p.y) > 2.4 + e.r) continue;
    damageEnemy(e, dmg, false, Math.atan2(e.y - p.y, e.x - p.x), 0.5);
  }
}

function castSpell(i) {
  const p = G.player;
  if (G.state !== 'play') return;
  if (i === 1 && !G.meta.magic3) { toast('This slot is locked — the Master opens it for a Seal.', '#c84fff'); Sfx.play('deny'); return; }
  if (i === 2 && !G.meta.magic4) { toast('This slot is locked — the Master opens it for a Seal.', '#c84fff'); Sfx.play('deny'); return; }
  const spellId = p.activeSpells && p.activeSpells[i];
  if (!spellId) { toast('Empty slot — choose a spell from the Spellbook.', '#7d8899'); Sfx.play('deny'); return; }
  if (SPELLS[spellId] && SPELLS[spellId].passive) { toast('This is a passive aura — it works on its own.', '#7d8899'); Sfx.play('deny'); return; }
  p.spellCd = p.spellCd || [0, 0, 0];
  if (p.spellCd[i] > 0) return;
  const sp = SPELLS[spellId];
  // Ехо: всяка 3-та магия е безплатна; Фокус (умение): -15% цена
  let cost = Math.round(sp.cost * (p.st.costMult || 1));
  if (perkCount(p, 'echo')) {
    p.castCount = (p.castCount || 0) + 1;
    if (p.castCount % 3 === 0) cost = 0;
  }
  if (p.buffs && p.buffs.focus) cost = 0; // Отвара на фокуса: магиите без мана
  if (p.mp < cost) {
    if (perkCount(p, 'bloodcast') && p.hp > cost * 2) { p.hp -= cost; addText(p.x, p.y, '-' + cost, '#c22836'); }
    else { p.spellCd[i] = 0.3; Sfx.play('deny'); return; }
  } else p.mp -= cost;
  // Двойно ехо: шанс без презареждане; иначе базовото презареждане, намалено от афикса spellCd
  p.spellCd[i] = (p.st.freeCast && chance(p.st.freeCast)) ? 0.1 : sp.cd * (p.st.spellCdMult || 1);
  const target = nearestEnemy(9);
  const aim = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.aimA;
  // мишката се цели сама; тъч и контролер ползват авто-мерене
  SPELL_CAST[spellId](p, useMouseAim() ? p.aimA : aim, target, spellLv(p, spellId));
  Sfx.play('fire');
}
// научаване на магия от том — остава завинаги в Книгата
function learnSpell(spellId) {
  const p = G.player;
  if (p.spellsKnown[spellId]) return false;
  p.spellsKnown[spellId] = true;
  p.spellLvl = p.spellLvl || {};
  if (!p.spellLvl[spellId]) p.spellLvl[spellId] = 1; // нова магия започва на ниво 1
  // ако има свободен отключен слот — слагаме я веднага (пасивните -> в пасивен слот)
  if (SPELLS[spellId].passive) {
    p.activePassives = p.activePassives || [null, null];
    for (let i = 0; i < 2; i++) if (!p.activePassives[i]) { p.activePassives[i] = spellId; break; }
    calcStats(p); // резервацията на мана влиза веднага
  } else {
    const unlockedSlots = [true, G.meta.magic3, G.meta.magic4];
    for (let i = 0; i < 3; i++) {
      if (unlockedSlots[i] && !p.activeSpells[i]) { p.activeSpells[i] = spellId; break; }
    }
  }
  toast('New spell: ' + SPELLS[spellId].n + '! Check the Spellbook.', '#8ab0ff');
  Sfx.play('level');
  saveProfile();
  return true;
}
// стар вход (десен бутон) — сега кастира слот 1
function tryFireball() { castSpell(0); }
function tryDash() {
  const p = G.player;
  if (p.dashCd > 0 || G.state !== 'play') return;
  let mx = 0, my = 0;
  const K = G.keys;
  if (K[kbBind('up')] || K['ArrowUp']) { mx -= 1; my -= 1; }
  if (K[kbBind('down')] || K['ArrowDown']) { mx += 1; my += 1; }
  if (K[kbBind('left')] || K['ArrowLeft']) { mx -= 1; my += 1; }
  if (K[kbBind('right')] || K['ArrowRight']) { mx += 1; my -= 1; }
  if (G.joy && (Math.abs(G.joy.dx) > 6 || Math.abs(G.joy.dy) > 6)) {
    const a = G.joy.dx / (TW / 2), b = G.joy.dy / (TH / 2);
    mx = (a + b) / 2; my = (b - a) / 2;
  }
  if (G.pad && (G.pad.mx || G.pad.my)) {
    const a = G.pad.mx / (TW / 2), b = G.pad.my / (TH / 2);
    mx = (a + b) / 2; my = (b - a) / 2;
  }
  // заряди на отскока (вторият се купува при Майстора)
  if ((p.dashCharges || 0) <= 0) return;
  p.dashCharges--;
  if (p.dashRegen === undefined || p.dashRegen <= 0) p.dashRegen = p.st.dashCd;
  p.dashA = (mx || my) ? Math.atan2(my, mx) : G.player.aimA;
  p.dashT = 0.16;
  p.dashCd = p.st.dashCd;
  p.lastDashT = G.time; // за "Whisper in the Dark"
  p.iframes = Math.max(p.iframes, 0.25);
  Sfx.play('dash');
}
// сила и презареждане на отвара според омагьосването (+12% сила / -12% cd на ниво, праг 12с)
function potionEffMult(p, key) { return (1 + 0.12 * ((p.potionUp && p.potionUp[key]) || 0)) * (1 + (p.st.potionPow || 0) / 100); }
function potionCooldown(p, key) { return Math.max(12, POTIONS[key].cd * (1 - 0.12 * ((p.potionUp && p.potionUp[key]) || 0))); }
// usePotion приема ИНДЕКС на слот (0 или 1)
function usePotion(slot) {
  const p = G.player;
  if (G.state !== 'play') return;
  const key = p.potionSlots && p.potionSlots[slot];
  if (!key || !POTIONS[key]) { Sfx.play('deny'); return; }
  p.potionCd = p.potionCd || [0, 0];
  if (p.potionCd[slot] > 0) { Sfx.play('deny'); return; }
  const def = POTIONS[key];
  const eff = potionEffMult(p, key); // включва афикса potionPow (единично броене)
  if (def.kind === 'restore') {
    let did = false;
    if (def.restore.hp && p.hp < p.st.maxhp) { p.hp = Math.min(p.st.maxhp, p.hp + Math.round(p.st.maxhp * def.restore.hp * eff)); did = true; }
    if (def.restore.mp && p.mp < p.st.maxmp) { p.mp = Math.min(p.st.maxmp, p.mp + Math.round(p.st.maxmp * def.restore.mp * eff)); did = true; }
    if (!did) { Sfx.play('deny'); return; } // вече пълен — не хаби презареждането
  } else {
    p.buffs = p.buffs || {};
    p.buffs[def.buff] = { t: def.dur, pow: eff }; // траене + сила (снимка при ползване)
    calcStats(p); // бъфовете влизат в сметката
  }
  p.potionCd[slot] = potionCooldown(p, key);
  burst(p.x, p.y, [def.col, '#ffffff'], 12, 3, 0.6);
  Sfx.play('potion');
}

function updatePickups(dt) {
  const p = G.player;
  for (let i = G.ground.length - 1; i >= 0; i--) {
    const g = G.ground[i];
    g.t += dt;
    // подскок
    if (g.z > 0 || g.vz > 0) {
      g.vz -= 140 * dt;
      g.z += g.vz * dt;
      if (g.z <= 0) { g.z = 0; g.vz = g.vz < -20 ? -g.vz * 0.4 : 0; }
    }
    const d = dist(p.x, p.y, g.x, g.y);
    // злато, печати и осколки се притеглят (отварите вече не падат от земята)
    if ((g.gold || g.seal || g.shard) && d < 1.6 && g.t > 0.4) {
      const a = Math.atan2(p.y - g.y, p.x - g.x);
      g.x += Math.cos(a) * 5 * dt;
      g.y += Math.sin(a) * 5 * dt;
    }
    if (d < 0.5 && g.t > 0.3) {
      if (g.gold) { p.gold += g.gold; addText(g.x, g.y, '+' + g.gold, '#ffd23b'); Sfx.play('coin'); }
      else if (g.seal) {
        const n = (typeof g.seal === 'number' ? g.seal : 1);
        G.meta.seals += n;
        toast('+' + n + ' Abyss Seal! For unlocks at Zahari.', '#c84fff');
        burst(g.x, g.y, ['#c84fff', '#f0b0ff', '#6a4f9e'], 20, 4, 0.8);
        Sfx.play('level');
        saveProfile();
      }
      else if (g.shard) {
        G.meta.shards = (G.meta.shards || 0) + g.shard;
        toast('+' + g.shard + ' Abyss Shard! For enchanting at Zahari.', '#57e6c8');
        burst(g.x, g.y, ['#57e6c8', '#b6f5e6', '#2f8f7d'], 18, 4, 0.7);
        Sfx.play('coin');
        saveProfile();
      }
      else if (g.item) {
        // Камък на живота: МАКСИМУМ ЕДИН — не вдигай втори (екипиран ИЛИ в чантата), за да не се заобикаля с пусни/купи
        if (g.item.soulstone && ((p.equip && p.equip.soulstone) || p.inv.some(it => it && it.soulstone))) {
          if (!g.warned) { toast('You already carry a Soul Stone.', '#7d8899'); g.warned = true; } continue;
        }
        if (p.inv.length >= G.meta.invSlots) { if (!g.warned) { toast('Inventory is full!', '#ff6b7a'); g.warned = true; } continue; }
        p.inv.push(g.item);
        toast(g.item.name, Items.rarityCol(g.item));
        Sfx.play('pickup');
      }
      G.ground.splice(i, 1);
    }
  }
}

function updateInteract() {
  const p = G.player;
  G.interactHint = null;
  const INTERACT = { stairs: 1.25, fountain: 1.25, chest: 1.25, vendor: 1.5, stall: 1.6, portal: 1.7, campfire: 1.4, homeportal: 1.7, vaultdoor: 1.4, arena: 1.7 };
  let best = null, bd = 99;
  for (const pr of G.props) {
    if (pr.broken || pr.flat) continue;
    const reach = INTERACT[pr.kind];
    if (!reach) continue;
    if (pr.kind === 'chest' && pr.opened) continue;
    if (pr.kind === 'vaultdoor' && pr.opened) continue; // отворената врата вече не подсказва
    const d = dist(p.x, p.y, pr.x, pr.y);
    if (d < reach && d < bd) { bd = d; best = pr; }
  }
  if (!best) return;
  if (best.kind === 'stairs') G.interactHint = { pr: best, txt: best.sealed ? 'Sealed — defeat the Guardian!' : 'E — go down' };
  else if (best.kind === 'fountain') {
    // многократен, но всяка глътка поскъпва — реален смисъл за златото
    const price = Math.round((25 + 12 * G.depth) * Math.pow(1.6, best.uses || 0));
    G.interactHint = { pr: best, txt: 'E — drink (' + price + ' gold, full heal)', price };
  }
  else if (best.kind === 'chest') G.interactHint = { pr: best, txt: 'E — open the chest' };
  else if (best.kind === 'vendor' || best.kind === 'stall') {
    G.interactHint = { pr: best, txt: 'E — ' + VENDOR_DEFS[best.vtype].name };
  }
  else if (best.kind === 'portal') G.interactHint = { pr: best, txt: 'E — enter the Abyss (floor ' + (G.checkpoint > 1 ? G.checkpoint : 1) + ')' };
  else if (best.kind === 'homeportal') G.interactHint = { pr: best, txt: 'E — to camp (keep your level and skills)' };
  else if (best.kind === 'campfire') G.interactHint = { pr: best, txt: 'E — rest (full heal)' };
  else if (best.kind === 'vaultdoor') G.interactHint = { pr: best, txt: 'Locked — the Key Guardian holds the key' };
  else if (best.kind === 'arena') G.interactHint = { pr: best, txt: (G.arena && G.arena.state !== 'idle') ? 'Arena — clear the waves!' : 'Arena — step inside to seal the doors' };
}
function doInteract() {
  const h = G.interactHint;
  if (!h) return;
  const pr = h.pr, p = G.player;
  if (pr.kind === 'stairs') {
    if (pr.sealed) { toast('The stairs are sealed! Defeat the Guardian.', '#ff6b7a'); Sfx.play('deny'); return; }
    startTransition();
  } else if (pr.kind === 'fountain') {
    if (p.gold < h.price) { toast('You need ' + h.price + ' gold.', '#ff6b7a'); Sfx.play('deny'); return; }
    p.gold -= h.price;
    pr.uses = (pr.uses || 0) + 1;
    p.hp = p.st.maxhp; p.mp = p.st.maxmp;
    burst(p.x, p.y, ['#4f9cff', '#a8d8ff', '#7fd0a0'], 24, 4, 0.9);
    toast('The spring healed you completely.', '#7fd0a0');
    Sfx.play('potion');
  } else if (pr.kind === 'chest') {
    pr.opened = true;
    pr.solid = false;
    Sfx.play('open');
    const boost = pr.arenaReward ? 30 : 10; // наградата от арената е с повишена рядкост
    spawnDrop(pr.x, pr.y, { gold: rndi(10, 20) + G.depth * 4 });
    spawnDrop(pr.x, pr.y, { item: Items.gen(G.depth, boost) });
    if (pr.arenaReward) { spawnDrop(pr.x, pr.y, { item: Items.gen(G.depth, boost) }); spawnDrop(pr.x, pr.y, { shard: rndi(3, 6) }); }
    else if (chance(0.4)) spawnDrop(pr.x, pr.y, { shard: rndi(1, 3) }); // отварите вече не падат — осколки вместо тях
    burst(pr.x, pr.y, ['#ffd23b', '#fff2a0'], 14, 3, 0.6);
  } else if (pr.kind === 'vaultdoor') {
    if (!pr.opened) { toast('Locked. Slay the Key Guardian to open the Vault.', '#ffd23b'); Sfx.play('deny'); }
  } else if (pr.kind === 'vendor' || pr.kind === 'stall') {
    openShop(pr.vtype);
  } else if (pr.kind === 'portal') {
    saveProfile();
    startTransition(G.checkpoint > 1 ? G.checkpoint : 1); // само контролната точка (смъртта я нулира)
  } else if (pr.kind === 'homeportal') {
    goHomeViaPortal();
  } else if (pr.kind === 'campfire') {
    p.hp = p.st.maxhp; p.mp = p.st.maxmp;
    burst(p.x, p.y, ['#ff8a1f', '#ffd23b', '#7fd0a0'], 18, 3.5, 0.8);
    toast('The fire warmed you. You\'re ready.', '#7fd0a0');
    Sfx.play('potion');
  }
}

// ---------- магазин ----------
function openShop(vtype) {
  // ДНЕВНА стока: при нов ден (на всеки 24 часа) всичко се сменя
  const day = Math.floor(Date.now() / 86400000);
  if (G.shopsDay !== day) { G.shops = {}; G.shopsDay = day; }
  if (!G.shops[vtype]) G.shops[vtype] = genShopStock(vtype);
  G.shopVendor = vtype;
  G.shopScroll = 0; G.selStock = null; G.selItem = null; G.shopDrag = null; // чист старт
  G.state = 'shop';
  document.body.classList.add('menu');
  Sfx.play('open');
}
function closeShop() {
  G.shopVendor = null;
  G.selItem = null; G.selStock = null; G.shopConfirm = null; G.shopDrag = null; G.shopScroll = 0; // изчистваме избора, модала и скрола
  G.state = 'play';
  document.body.classList.remove('menu');
  saveProfile();
}
function shopBuy(entry) {
  const p = G.player;
  if (entry.unlock) { mysticBuy(entry.unlock); return; }
  if (entry.upgrade) { shopUpgrade(entry.upgrade); return; }
  if (p.gold < entry.price) { toast('You don\'t have enough gold.', '#ff6b7a'); Sfx.play('deny'); return; }
  if (entry.potion) {
    // отварите се отключват ЕДНОКРАТНО (после са завинаги)
    if (p.potionsOwned && p.potionsOwned[entry.potion]) { toast('You already have it.', '#7d8899'); Sfx.play('deny'); return; }
    p.gold -= entry.price;
    p.potionsOwned = p.potionsOwned || {};
    p.potionsOwned[entry.potion] = true;
    toast(POTIONS[entry.potion].n + ' — unlocked! Choose it from camp.', '#7fd0a0');
  } else if (entry.soulstone) {
    // Камък на душата: МАКСИМУМ ЕДИН (екипиран ИЛИ в чантата) — иначе напрежението изчезва
    if ((p.equip && p.equip.soulstone) || p.inv.some(it => it && it.soulstone)) { toast('You already carry a Soul Stone.', '#7d8899'); Sfx.play('deny'); return; }
    if (p.inv.length >= G.meta.invSlots) { toast('Inventory is full!', '#ff6b7a'); Sfx.play('deny'); return; }
    p.gold -= entry.price;
    p.inv.push(entry.item);
    const stock = G.shops[G.shopVendor];
    stock.splice(stock.indexOf(entry), 1);
    toast('Soul Stone — it will pull you back once.', '#ff8aa0');
  } else {
    if (p.inv.length >= G.meta.invSlots) { toast('Inventory is full!', '#ff6b7a'); Sfx.play('deny'); return; }
    p.gold -= entry.price;
    p.inv.push(entry.item);
    const stock = G.shops[G.shopVendor];
    stock.splice(stock.indexOf(entry), 1);
    toast('Bought: ' + entry.item.name + '  (−' + entry.price + ' g)', '#7fd0a0'); // известие за покупката
  }
  G.selStock = null; // покупката приключи -> махаме маркировката
  Sfx.play('coin');
  saveProfile();
}
// надграждане на сергия (злато) и отключвания при Мистика (печати)
function shopUpgrade(vtype) {
  const p = G.player;
  const lvl = G.meta.vendorLvl[vtype] || 1;
  if (lvl >= 5) return;
  const cost = VENDOR_UP_COST[lvl];
  if (p.gold < cost) { toast('You need ' + cost + ' gold.', '#ff6b7a'); Sfx.play('deny'); return; }
  p.gold -= cost;
  G.meta.vendorLvl[vtype] = lvl + 1;
  G.shops[vtype] = genShopStock(vtype);
  toast(VENDOR_DEFS[vtype].name + ' — the camp grows! (level ' + (lvl + 1) + ')', '#7fd0a0');
  burst(p.x, p.y, ['#7fd0a0', '#ffd23b'], 16, 3.5, 0.7);
  Sfx.play('level');
  saveProfile();
}
function mysticBuy(offer) {
  if (offer.cost > 0 && G.meta.seals < offer.cost) { toast('You need ' + offer.cost + ' Abyss Seals.', '#ff6b7a'); Sfx.play('deny'); return; }
  if (offer.cost > 0) G.meta.seals -= offer.cost;
  offer.apply();
  burst(G.player.x, G.player.y, ['#c84fff', '#f0b0ff'], 20, 4, 0.8);
  Sfx.play('level');
  saveProfile();
}
// цена в осколки за следващото ниво на афикс (стъпаловидно 15/30/50)
function enchantCost(a) { return [15, 30, 50][a.up || 0] || 50; }
// омагьосване: вдига КОЛКО е силен афиксът (може над нормалния таван), до 3 пъти
function enchantAffix(it, ai) {
  if (!it || !it.affixes) return;
  const a = it.affixes[ai];
  if (!a) return;
  if ((a.up || 0) >= 3) { toast('This affix is fully upgraded (3/3).', '#ff6b7a'); Sfx.play('deny'); return; }
  const cost = enchantCost(a);
  if ((G.meta.shards || 0) < cost) { toast('You need ' + cost + ' Guardian Shards.', '#ff6b7a'); Sfx.play('deny'); return; }
  G.meta.shards -= cost;
  a.v = Math.max(a.v + 1, Math.round(a.v * 1.15)); // +15% (поне +1) — може над тавана на находката
  a.up = (a.up || 0) + 1;
  calcStats(G.player);
  toast((AFFIXES[a.k] ? AFFIXES[a.k].n : 'affix') + ' → ' + a.v + '  (' + a.up + '/3)', '#57e6c8');
  burst(G.player.x, G.player.y, ['#57e6c8', '#b6f5e6'], 16, 3.5, 0.6);
  Sfx.play('level');
  saveProfile();
}
// омагьосване на ОТВАРА при Захари: 3 нива, всяко -12% cd / +12% сила, цена 10/20/35 осколки
function potionEnchantCost(up) { return [10, 20, 35][up] || 35; }
function enchantPotion(key) {
  const p = G.player;
  if (!key || !POTIONS[key] || !(p.potionsOwned && p.potionsOwned[key])) { Sfx.play('deny'); return; }
  p.potionUp = p.potionUp || {};
  const up = p.potionUp[key] || 0;
  if (up >= 3) { toast('This potion is fully upgraded (3/3).', '#ff6b7a'); Sfx.play('deny'); return; }
  const cost = potionEnchantCost(up);
  if ((G.meta.shards || 0) < cost) { toast('You need ' + cost + ' Abyss Shards.', '#ff6b7a'); Sfx.play('deny'); return; }
  G.meta.shards -= cost;
  p.potionUp[key] = up + 1;
  toast(POTIONS[key].n + ' → level ' + (up + 1) + '/3', '#57e6c8');
  burst(p.x, p.y, ['#57e6c8', '#b6f5e6'], 16, 3.5, 0.6);
  Sfx.play('level');
  saveProfile();
}
// ПРЕПРАВЯНЕ (Част 4): хвърля наново всички афикси на предмета — 10 осколки, плоска цена
const SCRAMBLE_COST = 10;
function enchantScramble(it) {
  if (!it || !it.affixes || !it.affixes.length) { toast('This item has no affixes to reforge.', '#ff6b7a'); Sfx.play('deny'); return; }
  if ((G.meta.shards || 0) < SCRAMBLE_COST) { toast('You need ' + SCRAMBLE_COST + ' Abyss Shards.', '#ff6b7a'); Sfx.play('deny'); return; }
  G.meta.shards -= SCRAMBLE_COST;
  rerollAffixes(it);
  calcStats(G.player);
  toast('The affixes have been reforged!', '#57e6c8');
  burst(G.player.x, G.player.y, ['#57e6c8', '#b6f5e6'], 18, 4, 0.7);
  Sfx.play('level');
  saveProfile();
}

// ВДИГАНЕ НА НИВОТО НА ПРЕДМЕТА (Част 5): при съответния продавач, срещу злато
function itemLevelCap(vtype) { return [4, 8, 14, 22, 999][((G.meta.vendorLvl && G.meta.vendorLvl[vtype]) || 1) - 1]; }
function vendorUpgradesSlot(vtype, slot) {
  if (vtype === 'weapon') return slot === 'weapon';   // Ковачът Драган
  if (vtype === 'armor') return slot === 'armor';     // Бронарят Богдан
  if (vtype === 'potion') return slot === 'ring' || slot === 'amulet'; // Алхимичката Яна
  return false;
}
function itemUpgradeCost(it) { return Math.round(50 * ((it.lvl || 1) + 1) * (1 + (it.rarity || 0) * 0.3)); }
// множител при вдигане с 1 ниво (по същия mult като Items.gen)
function itemUpgradeFactor(it) {
  const oldMult = 1 + 0.13 * ((it.lvl || 1) - 1);
  const newMult = 1 + 0.13 * (it.lvl || 1);
  return newMult / oldMult;
}
// преглед на новите числа: оръжие/броня -> базата; пръстен/амулет (без база) -> афиксите
function itemUpgradePreview(it) {
  const f = itemUpgradeFactor(it);
  if (it.dmg || it.armor) return { dmg: it.dmg ? Math.round(it.dmg * f) : null, armor: it.armor ? Math.round(it.armor * f) : null, aff: null };
  // без база (пръстен/амулет): показваме първия афикс като преглед
  const a = it.affixes && it.affixes[0];
  return { dmg: null, armor: null, aff: a ? { k: a.k, from: a.v, to: Math.max(a.v + 1, Math.round(a.v * f)) } : null };
}
function upgradeItemLevel(it, vtype) {
  const p = G.player;
  if (!it || !vendorUpgradesSlot(vtype, it.slot)) { Sfx.play('deny'); return; }
  const cap = itemLevelCap(vtype);
  if ((it.lvl || 1) >= cap) { toast('The stall upgrades to level ' + cap + '. Upgrade it for more.', '#ff6b7a'); Sfx.play('deny'); return; }
  const cost = itemUpgradeCost(it);
  if (p.gold < cost) { toast('You need ' + cost + ' gold.', '#ff6b7a'); Sfx.play('deny'); return; }
  p.gold -= cost;
  const f = itemUpgradeFactor(it);
  const hasBase = !!(it.dmg || it.armor);
  it.lvl = (it.lvl || 1) + 1;
  if (it.dmg) it.dmg = Math.round(it.dmg * f);
  if (it.armor) it.armor = Math.round(it.armor * f);
  // пръстен/амулет нямат база -> вдигаме афиксите им (иначе нивото е безполезно)
  if (!hasBase && it.affixes) for (const a of it.affixes) a.v = Math.max(a.v + 1, Math.round(a.v * f));
  calcStats(p);
  toast((it.name || 'Item') + ' → level ' + it.lvl, '#ffd23b');
  burst(p.x, p.y, ['#ffd23b', '#fff2a0'], 16, 3.5, 0.6);
  Sfx.play('level');
  saveProfile();
}
function mysticOffers() {
  const m = G.meta;
  const out = [];
  if (m.invSlots < 20) out.push({
    t: '+2 inventory slots (' + m.invSlots + ' → ' + Math.min(20, m.invSlots + 2) + ')',
    d: 'room for more loot', cost: 1,
    apply: () => { m.invSlots = Math.min(20, m.invSlots + 2); toast('Inventory grew: ' + m.invSlots + ' slots.', '#7fd0a0'); },
  });
  if (!m.magic3) out.push({
    t: 'Unlock spell slot — 3',
    d: 'ready for a future spell', cost: 1,
    apply: () => { m.magic3 = true; toast('Slot 3 unlocked!', '#c84fff'); },
  });
  else if (!m.magic4) out.push({
    t: 'Unlock spell slot — 4',
    d: 'a third spell in the hotbar', cost: 2,
    apply: () => { m.magic4 = true; toast('Slot 4 unlocked!', '#c84fff'); },
  });
  if (!m.dash2) out.push({
    t: 'Second dash charge',
    d: 'two dashes in a row', cost: 2,
    apply: () => { m.dash2 = true; calcStats(G.player); G.player.dashCharges = G.player.st.dashMax; toast('Your legs remember the wind.', '#7fd0a0'); },
  });
  if (!m.legendPool) out.push({
    t: 'The Path of Relics',
    d: 'uniques begin to drop', cost: 1,
    apply: () => { m.legendPool = true; toast('The Relics of the Abyss awaken!', '#ff7a1f'); },
  });
  // разчитане на донесените томове (даром) — така се отключват магиите
  const p = G.player;
  const seen = new Set();
  p.inv.forEach((it, idx) => {
    if (it.slot !== 'spell' || p.spellsKnown[it.spell] || seen.has(it.spell)) return;
    seen.add(it.spell);
    out.push({
      t: 'Decipher: ' + SPELLS[it.spell].n,
      d: 'the spell stays yours forever', cost: 1,
      apply: () => {
        const k = p.inv.findIndex(x => x.slot === 'spell' && x.spell === it.spell);
        if (k !== -1) p.inv.splice(k, 1);
        learnSpell(it.spell);
      },
    });
  });
  // нулиране на дървото с умения — връща реално вложените точки (по новите цени)
  const spent = skillSpent(p);
  if (spent > 0) out.push({
    t: 'Reset skills (' + spent + ' points back)',
    d: 'the tree clears, the points return', cost: 1,
    apply: () => {
      p.skillPoints = (p.skillPoints || 0) + spent;
      p.skills = {};
      calcStats(p);
      toast('Your mind is a blank slate. +' + spent + ' points.', '#7fd0a0');
    },
  });
  return out;
}
function shopSell(idx) {
  const p = G.player;
  const it = p.inv[idx];
  if (!it) return;
  p.inv.splice(idx, 1);
  p.gold += shopSellPrice(it);
  toast('Sold: ' + it.name + ' (+' + shopSellPrice(it) + ' gold)', '#ffd23b');
  Sfx.play('coin');
  saveProfile();
}

// ---------- врагове ----------
function makeEnemy(kind, t, x, y, hpMult, dmgMult) {
  return {
    kind, t,
    x, y, r: t.r,
    hp: Math.round(t.hp * hpMult), maxhp: Math.round(t.hp * hpMult),
    dmg: t.dmg * dmgMult,
    elite: false,
    state: 'idle', aggro: false,
    atkCd: 0, windupT: 0, flash: 0, animT: rnd(10),
    flip: false, path: null, pathT: 0, dead: false,
    wobble: rnd(Math.PI * 2), blinkCd: 0, roared: false,
    slowT: 0, poisonT: 0, burnT: 0,
  };
}
// най-близката свободна подова плочка (не стена, не плътен реквизит) — за портала/боса
function freeFloorNear(x, y) {
  const solidAt = (i, j) => {
    if (cellAt(i, j) !== FLOOR) return true;
    for (const pr of G.props) if (pr.solid && !pr.broken && Math.floor(pr.x) === i && Math.floor(pr.y) === j) return true;
    return false;
  };
  const i0 = Math.floor(x), j0 = Math.floor(y);
  if (!solidAt(i0, j0)) return { x, y };
  for (let rad = 1; rad <= 8; rad++)
    for (let dj = -rad; dj <= rad; dj++) for (let di = -rad; di <= rad; di++)
      if (Math.abs(di) === rad || Math.abs(dj) === rad) {
        const i = i0 + di, j = j0 + dj;
        if (!solidAt(i, j)) return { x: i + 0.5, y: j + 0.5 };
      }
  return { x, y };
}
function spawnEnemies(spawns) {
  const depthHp = 1 + 0.38 * (G.depth - 1);
  const depthDmg = 1 + 0.26 * (G.depth - 1);
  for (const s of spawns) {
    if (s.bossId) {
      // бос от отделната структура BOSS_TYPES
      const bd = BOSS_TYPES[s.bossId];
      const t = Object.assign({ aggro: 99, xp: bd.xp, boss: true }, bd);
      // предпазна проверка: никога да не спауннем боса залепен/забит в стена
      const bp = freeFloorNear(s.x, s.y);
      const e = makeEnemy(s.bossId, t, bp.x, bp.y, depthHp, depthDmg);
      e.bossDef = bd;
      e.phase = 1;
      e.sigT = 5;       // таймер на сигнатурната механика
      e.dormant = true; // чака в стаята си, докато влезеш
      G.enemies.push(e);
      continue;
    }
    const t = ENEMY_TYPES[s.kind];
    const e = makeEnemy(s.kind, t, s.x, s.y, depthHp * (s.elite ? 2.4 : 1), depthDmg * (s.elite ? 1.5 : 1));
    e.elite = s.elite;
    if (s.elite) {
      // модификатор-флаг върху съществуващия елит
      e.mod = pick(Object.keys(ELITE_MODS));
      if (e.mod === 'shielded') e.shield = true;
      if (e.mod === 'swift') { e.swift = true; }
      if (e.mod === 'firetrail') e.trailT = 0;
      if (e.mod === 'mender') e.mendT = 0;
    }
    if (s.keyGuardian) e.keyGuardian = true; // пази ключа за Съкровищницата
    if (s.arena) e.arena = true;             // враг от вълна на Арената
    G.enemies.push(e);
  }
}
// призоваване по време на бой (адове на Костния крал, тотеми на Архилича)
function summonEnemy(kind, x, y) {
  if (hitsWall(x, y, ENEMY_TYPES[kind].r)) {
    for (let a = 0; a < 8; a++) {
      const nx = x + rnd(-1.5, 1.5), ny = y + rnd(-1.5, 1.5);
      if (!hitsWall(nx, ny, ENEMY_TYPES[kind].r)) { x = nx; y = ny; break; }
    }
  }
  const e = makeEnemy(kind, ENEMY_TYPES[kind], x, y, 1 + 0.38 * (G.depth - 1), 1 + 0.26 * (G.depth - 1));
  e.aggro = true;
  e.summoned = true; // без плячка и без опит — за да не се фарми босът
  G.enemies.push(e);
  burst(x, y, ['#c84fff', '#6a4f9e', '#d8d3c0'], 12, 3.5, 0.5);
  return e;
}

// тих DoT — без нокбек и звуков спам
function damageEnemyDot(e, dmg, col) {
  e.hp -= dmg;
  if (chance(0.35)) addText(e.x, e.y, Math.max(1, Math.round(dmg)), col);
  if (e.hp <= 0 && !e.dead) killEnemy(e);
}

function updateEnemies(dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.atkCd = Math.max(0, e.atkCd - dt);
    e.animT += dt;
    e.pathT -= dt;
    e.blinkCd = Math.max(0, e.blinkCd - dt);
    // ефекти върху врага: забавяне, замразяване/зашеметяване, зареждане, отрова, огън
    e.slowT = Math.max(0, e.slowT - dt);
    e.stunT = Math.max(0, (e.stunT || 0) - dt);
    e.chargedT = Math.max(0, (e.chargedT || 0) - dt);
    if (e.poisonT > 0) {
      e.poisonT -= dt;
      e.dotAcc = (e.dotAcc || 0) + dt;
      if (e.dotAcc >= 0.5) { e.dotAcc -= 0.5; damageEnemyDot(e, (e.poisonDps || 4) * 0.5, '#5fd97a'); }
      if (e.dead) continue;
    }
    if (e.burnT > 0) {
      e.burnT -= dt;
      e.burnAcc = (e.burnAcc || 0) + dt;
      if (e.burnAcc >= 0.5) { e.burnAcc -= 0.5; damageEnemyDot(e, (e.burnDps || 4) * 0.5, '#ff8a1f'); }
      if (e.dead) continue;
    }

    if (e.dormant) continue; // босът чака церемонията по заключването

    const d = dist(e.x, e.y, p.x, p.y);
    const seesPlayer = d < e.t.aggro && losClear(e.x, e.y, p.x, p.y);
    if (seesPlayer) e.aggro = true;
    if (!e.aggro) continue;
    // замразен/зашеметен: нито движение, нито атака (само DoT-ите горе продължават)
    if (e.stunT > 0) {
      e.windupT = 0;
      if (chance(0.35)) addParticle({ x: e.x + rnd(-0.2, 0.2), y: e.y + rnd(-0.2, 0.2), z: 10 + rnd(0, 8), vx: rnd(-3, 3), vy: rnd(-3, 3), vz: 5, grav: 3, t: 0, life: 0.5, col: '#a8d8ff', size: 1 });
      continue;
    }

    // елитни модификатори в действие
    if (e.mod === 'mender') {
      e.mendT -= dt;
      if (e.mendT <= 0) {
        e.mendT = 1;
        for (const a of G.enemies) {
          if (a.dead || a === e || dist(a.x, a.y, e.x, e.y) > 3) continue;
          if (a.hp < a.maxhp) {
            a.hp = Math.min(a.maxhp, a.hp + a.maxhp * 0.03);
            addParticle({ x: a.x, y: a.y, z: 14, vx: 0, vy: 0, vz: 8, grav: -4, t: 0, life: 0.5, col: '#5fd97a', size: 1 });
          }
        }
      }
    }
    if (e.mod === 'firetrail') {
      e.trailT -= dt;
      if (e.trailT <= 0) { e.trailT = 0.35; addHazard({ type: 'fire', x: e.x, y: e.y, t: 0, life: 2.4, r: 0.55, dmg: e.dmg * 0.4 }); }
    }

    if (e.t.boss && !e.roared && seesPlayer) {
      e.roared = true;
      G.bossName = e.bossDef.name;
      toast(e.bossDef.name + ' awakens!', '#ff6b7a');
      Sfx.play('roar');
      G.shake = 8;
    }
    // босова логика: фази + сигнатурна механика
    if (e.bossDef && e.roared) updateBoss(e, dt, d);
    // щурм на Владетеля: прескача нормалния AI
    if (e.chargeState) { updateCharge(e, dt); continue; }

    // прозорец на атака
    if (e.windupT > 0) {
      e.windupT -= dt;
      if (e.windupT <= 0) enemyStrike(e, d);
      continue;
    }

    const inRange = e.t.ranged ? (d < e.t.range && seesPlayer) : (d < e.t.range + p.r);
    if (inRange && e.atkCd <= 0) {
      e.windupT = e.t.windup;
      e.state = 'windup';
      continue;
    }

    // движение
    if (e.t.static) continue; // тотемите не мърдат
    let tx = p.x, ty = p.y;
    let speed = e.t.spd * (e.swift ? 1.45 : 1) * (e.slowT > 0 ? 0.55 : 1);
    const fleeing = e.t.ranged && d < e.t.keep && seesPlayer;
    if (fleeing) {
      // кайтване — отдалечава се
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      tx = e.x + Math.cos(a) * 2; ty = e.y + Math.sin(a) * 2;
    }
    if (e.t.blink && d < 2.2 && e.blinkCd <= 0) {
      // шаманът/личът се телепортира (но НЕ извън запечатаната босова стая)
      for (let att = 0; att < 8; att++) {
        const a = rnd(Math.PI * 2), rr = rnd(3, 4.5);
        const nx = e.x + Math.cos(a) * rr, ny = e.y + Math.sin(a) * rr;
        if (e.bossDef && G.bossRoom && G.bossRoomLocked) {
          const br = G.bossRoom;
          if (nx < br.x + 0.7 || nx > br.x + br.w - 0.7 || ny < br.y + 0.7 || ny > br.y + br.h - 0.7) continue;
        }
        if (e.keyGuardian && G.vault && !G.vaultUnlocked) { // да НЕ се телепортира в собствената си заключена съкровищница
          const vr = G.vault.room;
          if (nx >= vr.x && nx < vr.x + vr.w && ny >= vr.y && ny < vr.y + vr.h) continue;
        }
        if (e.arena && G.arena && G.arena.state !== 'idle') { // да НЕ излиза от запечатаната арена (иначе вълната не се чисти)
          const ar = G.arena.room;
          if (nx < ar.x + 0.7 || nx > ar.x + ar.w - 0.7 || ny < ar.y + 0.7 || ny > ar.y + ar.h - 0.7) continue;
        }
        if (!hitsWall(nx, ny, e.r)) {
          burst(e.x, e.y, ['#c84fff', '#f0b0ff'], 10, 3, 0.4);
          e.x = nx; e.y = ny;
          burst(e.x, e.y, ['#c84fff', '#f0b0ff'], 10, 3, 0.4);
          Sfx.play('tp');
          break;
        }
      }
      e.blinkCd = 3.5;
    }

    let mvx = 0, mvy = 0;
    if (losClear(e.x, e.y, tx, ty) || e.t.ghost) {
      const a = Math.atan2(ty - e.y, tx - e.x);
      mvx = Math.cos(a); mvy = Math.sin(a);
      e.path = null;
    } else if (!fleeing) {
      // път през лабиринта (но не и при бягство — иначе тръгва КЪМ играча)
      if (!e.path || e.pathT <= 0) {
        e.path = findPath(Math.floor(e.x), Math.floor(e.y), Math.floor(p.x), Math.floor(p.y));
        e.pathT = 0.7;
      }
      if (e.path && e.path.length) {
        const wp = e.path[0];
        if (dist(e.x, e.y, wp.x, wp.y) < 0.35) e.path.shift();
        if (e.path.length) {
          const a = Math.atan2(e.path[0].y - e.y, e.path[0].x - e.x);
          mvx = Math.cos(a); mvy = Math.sin(a);
        }
      }
    }
    if (e.kind === 'bat') {
      // хаотично пърхане
      e.wobble += dt * 6;
      const wob = Math.sin(e.wobble) * 0.8;
      const a = Math.atan2(mvy, mvx) + wob * 0.5;
      mvx = Math.cos(a); mvy = Math.sin(a);
    }
    if (mvx || mvy) {
      collideMove(e, mvx * speed * dt, mvy * speed * dt, e.t.ghost);
      const sx = mvx - mvy;
      if (Math.abs(sx) > 0.1) e.flip = sx < 0;
      e.state = 'chase';
    }
  }

  // меко разбутване между врагове
  for (let i = 0; i < G.enemies.length; i++) {
    const a = G.enemies[i];
    if (a.dead) continue;
    for (let j = i + 1; j < G.enemies.length; j++) {
      const b = G.enemies[j];
      if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy, rr = a.r + b.r;
      if (d2 > 0.0001 && d2 < rr * rr) {
        const d = Math.sqrt(d2), push = (rr - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        collideMove(a, -nx * push, -ny * push, a.t.ghost);
        collideMove(b, nx * push, ny * push, b.t.ghost);
      }
    }
  }
  // изчистване
  for (let i = G.enemies.length - 1; i >= 0; i--) if (G.enemies[i].dead) G.enemies.splice(i, 1);
}

// ---------- босова стая: запечатва се при влизане, отваря се с победата ----------
function checkBossRoom() {
  const p = G.player, br = G.bossRoom;
  if (!br || G.bossRoomLocked) return;
  const boss = G.enemies.find(e => e.bossDef && !e.dead);
  if (!boss) return;
  // трябва да си навътре в стаята, не на прага
  if (p.x > br.x + 0.9 && p.x < br.x + br.w - 0.9 && p.y > br.y + 0.9 && p.y < br.y + br.h - 0.9) {
    lockBossRoom(boss);
  }
}
function lockBossRoom(boss) {
  const br = G.bossRoom, m = G.map;
  G.bossRoomLocked = true;
  G.bossGates = [];
  // зазиждаме всеки подов вход по ръба около стаята
  for (let i = br.x - 1; i <= br.x + br.w; i++) {
    for (const j of [br.y - 1, br.y + br.h]) {
      const idx = j * m.w + i;
      if (m.cells[idx] === FLOOR) { m.cells[idx] = WALL; G.bossGates.push(idx); }
    }
  }
  for (let j = br.y; j < br.y + br.h; j++) {
    for (const i of [br.x - 1, br.x + br.w]) {
      const idx = j * m.w + i;
      if (m.cells[idx] === FLOOR) { m.cells[idx] = WALL; G.bossGates.push(idx); }
    }
  }
  boss.dormant = false;
  boss.aggro = true;
  boss.roared = true;
  G.bossName = boss.bossDef.name;
  toast(boss.bossDef.name + ' — the room is sealed!', '#ff6b7a');
  Sfx.play('roar');
  Sfx.play('boom');
  G.shake = 9;
  computeFOV();
  G.miniDirty = true;
}
function unlockBossRoom() {
  if (!G.bossGates || !G.bossGates.length) return;
  for (const idx of G.bossGates) G.map.cells[idx] = FLOOR;
  G.bossGates = [];
  G.bossRoomLocked = false;
  G.bossRoom = null;
  computeFOV();
  G.miniDirty = true;
  toast('The room\'s seal has broken.', '#7fd0a0');
}

// ---------- АРЕНА: доброволна стая, запечатва се при влизане, 3 вълни, после награда ----------
function arenaKind() {
  const pool = ['slime', 'skeleton', 'bat'];
  if (G.depth >= 3) pool.push('archer');
  if (G.depth >= 5) pool.push('shaman');
  if (G.depth >= 6) pool.push('brute');
  if (G.depth >= 8) pool.push('wraith');
  return pick(pool);
}
function spawnArenaWave(n) {
  const r = G.arena.room;
  const cfg = [{ n: 4, e: 0 }, { n: 5, e: 1 }, { n: 6, e: 2 }][n - 1];
  const specs = [];
  for (let k = 0; k < cfg.n; k++) {
    const pos = freeFloorNear(r.x + 1 + Math.random() * (r.w - 2), r.y + 1 + Math.random() * (r.h - 2));
    specs.push({ kind: arenaKind(), x: pos.x, y: pos.y, elite: k < cfg.e, arena: true });
  }
  spawnEnemies(specs);
}
function startArena() {
  const a = G.arena, r = a.room, m = G.map;
  a.state = 'wave'; a.wave = 1; a.gates = [];
  for (let i = r.x - 1; i <= r.x + r.w; i++) for (const j of [r.y - 1, r.y + r.h]) { const idx = j * m.w + i; if (m.cells[idx] === FLOOR) { m.cells[idx] = WALL; a.gates.push(idx); } }
  for (let j = r.y; j < r.y + r.h; j++) for (const i of [r.x - 1, r.x + r.w]) { const idx = j * m.w + i; if (m.cells[idx] === FLOOR) { m.cells[idx] = WALL; a.gates.push(idx); } }
  spawnArenaWave(1);
  toast('Arena — Wave 1 / 3!', '#ff8a1f');
  Sfx.play('roar'); Sfx.play('boom'); G.shake = 8;
  computeFOV(); G.miniDirty = true;
}
function finishArena() {
  const a = G.arena, r = a.room;
  for (const idx of a.gates) G.map.cells[idx] = FLOOR;
  a.gates = [];
  const ai = G.props.findIndex(pr => pr.kind === 'arena'); if (ai >= 0) G.props.splice(ai, 1);
  const pos = freeFloorNear(r.x + (r.w >> 1) + 0.5, r.y + (r.h >> 1) + 0.5);
  G.props.push({ kind: 'chest', x: pos.x, y: pos.y, r: 0.4, solid: true, opened: false, arenaReward: true });
  toast('Arena cleared! Claim your reward.', '#7fd0a0');
  Sfx.play('level'); G.shake = 6;
  G.arena = null;
  computeFOV(); G.miniDirty = true;
}
function updateArena(dt) {
  const a = G.arena; if (!a) return;
  const p = G.player, r = a.room;
  if (a.state === 'idle') {
    if (p.x > r.x + 0.7 && p.x < r.x + r.w - 0.7 && p.y > r.y + 0.7 && p.y < r.y + r.h - 0.7) startArena();
    return;
  }
  if (a.state === 'wave') {
    if (!G.enemies.some(e => !e.dead && e.arena)) { // само враговете на арената броят
      if (a.wave >= 3) finishArena();
      else { a.state = 'pause'; a.timer = 2; }
    }
  } else if (a.state === 'pause') {
    a.timer -= dt;
    if (a.timer <= 0) { a.wave++; spawnArenaWave(a.wave); a.state = 'wave'; toast('Wave ' + a.wave + ' / 3!', '#ff8a1f'); Sfx.play('roar'); }
  }
}

// ---------- босове: фази по % живот + сигнатурни механики ----------
function updateBoss(e, dt, d) {
  const p = G.player;
  // фази: 100-66 / 66-33 / под 33
  const frac = e.hp / e.maxhp;
  const ph = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (ph > e.phase) {
    e.phase = ph;
    G.shake = 9;
    Sfx.play('roar');
    burst(e.x, e.y, ['#c22836', '#c84fff', '#ffd23b'], 30, 5, 0.8);
    toast(e.bossDef.name + ' — phase ' + ph + '!', '#ff6b7a');
    e.sigT = Math.min(e.sigT, 1.5); // фазата веднага показва зъби
  }
  e.sigT -= dt;
  if (e.sigT > 0) return;
  const sig = e.bossDef.sig;
  if (sig === 'adds') {
    // Костен крал: вика костеливи слуги
    const alive = G.enemies.filter(a => a.summoned && !a.dead && a.kind === 'skeleton').length;
    const want = Math.min(1 + e.phase, 5 - alive);
    for (let i = 0; i < want; i++) summonEnemy('skeleton', e.x + rnd(-2, 2), e.y + rnd(-2, 2));
    if (want > 0) { toast('Rise and serve!', '#a39d8a'); Sfx.play('tp'); }
    e.sigT = 15 - e.phase * 2;
  } else if (sig === 'zones') {
    // Кървав голем: кипяща кръв по пода
    for (let i = 0; i < 1 + e.phase; i++) {
      addHazard({ type: 'blood', x: p.x + rnd(-2.5, 2.5), y: p.y + rnd(-2.5, 2.5), t: 0, delay: 0.85, life: 5.5, r: 1.05, dmg: e.dmg * 0.6 });
    }
    Sfx.play('fire');
    e.sigT = 9.5 - e.phase;
  } else if (sig === 'totems') {
    // Архилич: тотеми, които стрелят
    const alive = G.enemies.filter(a => a.kind === 'totem' && !a.dead).length;
    for (let i = alive; i < 2; i++) summonEnemy('totem', e.x + rnd(-3, 3), e.y + rnd(-3, 3));
    if (alive < 2) toast('The totems drink the light!', '#c84fff');
    e.sigT = 17 - e.phase * 2;
  } else if (sig === 'charge') {
    // Владетелят: телеграфиран щурм (във фаза 3 — двоен)
    e.chargesLeft = e.phase >= 3 ? 2 : 1;
    e.chargeState = { phase: 'tele', t: 0, dir: Math.atan2(p.y - e.y, p.x - e.x) };
    e.sigT = 8.5 - e.phase;
  }
}
function updateCharge(e, dt) {
  const p = G.player;
  const cs = e.chargeState;
  cs.t += dt;
  if (cs.phase === 'tele') {
    cs.dir = Math.atan2(p.y - e.y, p.x - e.x); // следи до последно
    if (cs.t > 0.85) { cs.phase = 'dash'; cs.t = 0; Sfx.play('dash'); }
    return;
  }
  const spd = 13;
  const ox = e.x, oy = e.y;
  collideMove(e, Math.cos(cs.dir) * spd * dt, Math.sin(cs.dir) * spd * dt);
  if (e.phase >= 2 && chance(0.55)) addHazard({ type: 'fire', x: e.x, y: e.y, t: 0, life: 2, r: 0.5, dmg: e.dmg * 0.4 });
  if (p.iframes <= 0 && dist(e.x, e.y, p.x, p.y) < e.r + p.r + 0.25) damagePlayer(e.dmg * 1.4, e.x, e.y);
  const stuck = Math.abs(e.x - ox) < 0.002 && Math.abs(e.y - oy) < 0.002;
  if (cs.t > 0.75 || stuck) {
    G.shake = 8;
    Sfx.play('boom');
    burst(e.x, e.y, ['#5c78e8', '#8ab0ff', '#454e63'], 16, 4.5, 0.5);
    if (e.chargesLeft > 1) { e.chargesLeft--; e.chargeState = { phase: 'tele', t: 0.4, dir: Math.atan2(p.y - e.y, p.x - e.x) }; }
    else e.chargeState = null;
  }
}

// ---------- зони по пода (огън, кръв, отрова, закъснели взривове) ----------
function addHazard(h) {
  G.hazards = G.hazards || [];
  G.hazards.push(h);
  // при препълване маркирай най-стария мъртъв (updateHazards го филтрира) — да не shift-ваме масива по време на цикъл
  if (G.hazards.length > 120) G.hazards[0].dead = true;
}
function updateHazards(dt) {
  if (!G.hazards) return;
  const p = G.player;
  // маркираме мъртви и филтрираме НАКРАЯ — безопасно е, защото damagePlayer/damageEnemy тук
  // могат да извикат addHazard (plague/volatile/wardShatter) и да разместят масива по време на цикъла
  let anyDead = false;
  for (let i = G.hazards.length - 1; i >= 0; i--) {
    const h = G.hazards[i];
    if (h.dead) { anyDead = true; continue; }
    h.t += dt;
    if (h.delay && h.t < h.delay) continue; // телеграф — още не пари
    if (h.type === 'blast') {
      // еднократен взрив (избухващ елит) — маркираме мъртъв ПРЕДИ щетите (те може да добавят хазарди)
      h.dead = true; anyDead = true;
      if (dist(p.x, p.y, h.x, h.y) < h.r + p.r) damagePlayer(h.dmg, h.x, h.y);
      burst(h.x, h.y, ['#ff8a1f', '#ffd23b', '#c22836'], 22, 5, 0.5);
      G.shake = Math.min(8, G.shake + 3);
      Sfx.play('boom');
      continue;
    }
    if (h.type === 'novawave') {
      // Frost Nova „Double Wave": еднократна втора вълна с двойна щета
      h.dead = true; anyDead = true;
      G.novaFx = G.novaFx || [];
      G.novaFx.push({ x: h.x, y: h.y, t: 0, col: '#8ab0ff', maxR: h.r });
      for (const e of G.enemies) {
        if (e.dead || dist(e.x, e.y, h.x, h.y) > h.r + e.r) continue;
        e.slowT = Math.max(e.slowT, 2);
        damageEnemy(e, h.dmg, false, Math.atan2(e.y - h.y, e.x - h.x), 0.2);
      }
      G.shake = Math.min(7, G.shake + 2);
      Sfx.play('boom');
      continue;
    }
    if (h.t - (h.delay || 0) > h.life) { h.dead = true; anyDead = true; continue; }
    if (h.grow && h.r < 3) h.r += dt * 0.5; // Poison „Spread": облакът се разраства
    h.tick = (h.tick || 0) - dt;
    if (h.tick <= 0) {
      h.tick = 0.5;
      if (h.type === 'poison') {
        // нашата отрова — разяжда враговете
        for (const e of G.enemies) {
          if (e.dead) continue;
          if (dist(e.x, e.y, h.x, h.y) < h.r + e.r) { e.poisonT = 1.1; e.poisonDps = h.dps; if (h.plague) e.plagued = true; }
        }
      } else if (h.type === 'pyre') {
        // Fireball „Scorched Earth": горяща земя — пали враговете
        for (const e of G.enemies) {
          if (e.dead) continue;
          if (dist(e.x, e.y, h.x, h.y) < h.r + e.r) { e.burnT = 0.7; e.burnDps = h.dps; }
        }
      } else if (h.type === 'icefield' || h.type === 'fissure') {
        // Ледено поле / Пукнатини: забавят враговете вътре
        for (const e of G.enemies) {
          if (e.dead) continue;
          if (dist(e.x, e.y, h.x, h.y) < h.r + e.r) e.slowT = Math.max(e.slowT, 0.8);
        }
      } else if (dist(p.x, p.y, h.x, h.y) < h.r + p.r) {
        damagePlayer(h.dmg || 8, h.x, h.y); // огън/кръв на враговете пари играча (firetrail/blood)
      }
    }
  }
  if (anyDead) G.hazards = G.hazards.filter(h => !h.dead);
}

function enemyStrike(e, dNow) {
  const p = G.player;
  e.atkCd = e.t.atkCd * (e.swift ? 0.7 : 1) * (e.bossDef ? 1 - 0.1 * (e.phase - 1) : 1);
  e.state = 'chase';
  const d = dist(e.x, e.y, p.x, p.y);
  if (e.t.ranged) {
    if (!losClear(e.x, e.y, p.x, p.y)) return;
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    const spd = e.t.ranged === 'arrow' ? 9 : 7;
    const n = e.t.spread || (e.kind === 'shaman' ? 3 : 1);
    const shots = [];
    for (let i = 0; i < n; i++) shots.push((i - (n - 1) / 2) * 0.22);
    for (const off of shots) {
      G.projectiles.push({
        kind: e.t.ranged, from: 'enemy',
        x: e.x + Math.cos(a) * 0.4, y: e.y + Math.sin(a) * 0.4,
        vx: Math.cos(a + off) * spd, vy: Math.sin(a + off) * spd,
        dmg: e.dmg, r: 0.2, t: 0,
      });
    }
    Sfx.play(e.t.ranged === 'arrow' ? 'swing' : 'fire');
  } else if (e.t.aoe) {
    // тежък размах около себе си
    burst(e.x, e.y, ['#ff8a1f', '#ffd23b', '#8a93a3'], 18, 4.5, 0.5);
    G.shake = Math.min(9, G.shake + 4);
    Sfx.play('boom');
    if (d < e.t.aoe + e.t.range * 0.6 + p.r && losClear(e.x, e.y, p.x, p.y)) {
      damagePlayer(e.dmg, e.x, e.y);
      if (hasPower('golemskin')) damageEnemy(e, e.dmg * 0.3, false); // тръни
      if (p.st.thorns > 0 && !e.dead) damageEnemy(e, p.st.thorns, false); // афикс „отвърнати щети"
    }
  } else {
    if (d < e.t.range + p.r + 0.25 && losClear(e.x, e.y, p.x, p.y)) {
      damagePlayer(e.dmg, e.x, e.y);
      if (hasPower('golemskin')) damageEnemy(e, e.dmg * 0.3, false);
      if (p.st.thorns > 0 && !e.dead) damageEnemy(e, p.st.thorns, false); // афикс „отвърнати щети"
    }
  }
}

// ---------- снаряди ----------
function updateProjectiles(dt) {
  const p = G.player;
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr = G.projectiles[i];
    pr.t += dt;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    let kill = false;
    if (pr.t > 3) kill = true;
    if (cellAt(Math.floor(pr.x), Math.floor(pr.y)) !== FLOOR) {
      kill = true;
      if (pr.kind === 'fireball') {
        // връщаме кълбото на последната свободна позиция, за да има splash покрай стената
        const bx = pr.x - pr.vx * dt, by = pr.y - pr.vy * dt;
        if (cellAt(Math.floor(bx), Math.floor(by)) === FLOOR) { pr.x = bx; pr.y = by; }
        explodeFireball(pr);
      }
      else burst(pr.x, pr.y, ['#8a93a3', '#5a6272'], 5, 2.5, 0.3);
    } else if (pr.from === 'player') {
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (dist(pr.x, pr.y, e.x, e.y) < e.t.r + pr.r) {
          if (pr.kind === 'fireball') { explodeFireball(pr); kill = true; }
          else if (pr.kind === 'icebolt') {
            // пронизва и забавя, продължава до 2 допълнителни цели
            pr.hitSet = pr.hitSet || new Set();
            if (!pr.hitSet.has(e)) {
              pr.hitSet.add(e);
              if ((pr.lv || 1) >= 3 && !e.t.boss) { e.stunT = Math.max(e.stunT || 0, 1.5); freezeFx(e); } // Вкочаняване
              else e.slowT = Math.max(e.slowT, 1.5);
              damageEnemy(e, pr.dmg * rnd(0.9, 1.1), chance(G.player.st.crit / 200), Math.atan2(e.y - pr.y, e.x - pr.x), 0.1);
              pr.pierce--;
              if (pr.pierce < 0) { kill = true; break; } // изчерпан пробив -> спри този кадър (иначе удря всички)
            }
            continue;
          }
          else kill = true;
          break;
        }
      }
      // чупливи предмети
      if (!kill) for (const prop of G.props) {
        if (prop.hp === undefined || prop.broken) continue;
        if (dist(pr.x, pr.y, prop.x, prop.y) < 0.45) {
          if (pr.kind === 'fireball') explodeFireball(pr);
          else breakProp(prop);
          kill = true;
          break;
        }
      }
    } else {
      if (p.iframes <= 0 && dist(pr.x, pr.y, p.x, p.y) < p.r + pr.r + 0.1) {
        damagePlayer(pr.dmg, pr.x - pr.vx * 0.1, pr.y - pr.vy * 0.1);
        kill = true;
      }
    }
    if (pr.kind === 'fireball' && chance(0.6)) {
      addParticle({ x: pr.x, y: pr.y, z: 6, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(2, 8), grav: 10, t: 0, life: 0.3, col: pick(['#ff8a1f', '#ffd23b']), size: 1 });
    }
    if (kill) G.projectiles.splice(i, 1);
  }
}
function explodeFireball(pr) {
  const p = G.player;
  G.explosions = G.explosions || [];
  G.explosions.push({ x: pr.x, y: pr.y, t: 0 });
  burst(pr.x, pr.y, ['#ff8a1f', '#ffd23b', '#ff5a1f'], 20, 5, 0.5);
  G.shake = Math.min(7, G.shake + 3);
  Sfx.play('boom');
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (dist(pr.x, pr.y, e.x, e.y) < 1.25 + e.t.r && losClear(pr.x, pr.y, e.x, e.y)) {
      const isCrit = chance(p.st.crit / 200);
      damageEnemy(e, pr.dmg * rnd(0.9, 1.1) * (isCrit ? p.st.critd : 1), isCrit, Math.atan2(e.y - pr.y, e.x - pr.x), 0.3);
    }
  }
  for (const prop of G.props) {
    if (prop.hp === undefined || prop.broken) continue;
    if (dist(pr.x, pr.y, prop.x, prop.y) < 1.3) breakProp(prop);
  }
  const lv = pr.lv || 1;
  if (lv >= 2) addHazard({ type: 'pyre', x: pr.x, y: pr.y, t: 0, life: 4, r: 1.2, dps: pr.dmg * 0.35 }); // Пепелище: горяща земя
  if (lv >= 3 && !pr.split) { // Разцепване: 3 по-малки кълба встрани (ниво 1 -> без по-нататъшно цепене/палене)
    const base = Math.atan2(pr.vy, pr.vx);
    for (const off of [-1.15, 0, 1.15]) {
      const a = base + off;
      G.projectiles.push({
        kind: 'fireball', from: 'player', lv: 1, split: true,
        x: pr.x + Math.cos(a) * 0.3, y: pr.y + Math.sin(a) * 0.3,
        vx: Math.cos(a) * 9, vy: Math.sin(a) * 9,
        dmg: pr.dmg * 0.5, r: 0.2, t: 0,
      });
    }
  }
}

// ---------- частици и текст ----------
function updateParticles(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pa = G.particles[i];
    pa.t += dt;
    if (pa.t >= pa.life) { G.particles.splice(i, 1); continue; }
    pa.x += pa.vx * dt * 0.15;
    pa.y += pa.vy * dt * 0.15;
    pa.vz -= pa.grav * dt;
    pa.z += pa.vz * dt;
    if (pa.z < 0) { pa.z = 0; pa.vz = 0; }
  }
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const t = G.texts[i];
    t.t += dt;
    t.z += 26 * dt;
    if (t.t >= t.life) G.texts.splice(i, 1);
  }
  if (G.explosions) {
    for (let i = G.explosions.length - 1; i >= 0; i--) {
      G.explosions[i].t += dt;
      if (G.explosions[i].t > 0.28) G.explosions.splice(i, 1);
    }
  }
  if (G.slashFx) {
    G.slashFx.t += dt;
    if (G.slashFx.t > 0.18) G.slashFx = null;
  }
  // атмосферни искри: огън (топли) и печатът на Мистика (пурпурни)
  for (const pr of G.props) {
    const fire = (pr.kind === 'brazier' || pr.kind === 'campfire') && !pr.broken;
    const mystic = pr.kind === 'stall' && pr.vtype === 'jewel';
    if (!fire && !mystic) continue;
    if (tileVisible(Math.floor(pr.x), Math.floor(pr.y)) && chance(fire ? 0.04 : 0.025)) {
      addParticle({
        x: pr.x + rnd(-0.15, 0.15), y: pr.y + rnd(-0.15, 0.15), z: 16,
        vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: rnd(8, 16), grav: -6,
        t: 0, life: rnd(0.5, 1.1),
        col: pick(fire ? ['#ff8a1f', '#ffd23b', '#ff5a1f'] : ['#c84fff', '#f0b0ff', '#6a4f9e']),
        size: 1,
      });
    }
  }
}

// ---------- преходи между етажи ----------
function startTransition(target) {
  G.state = 'transition';
  G.transT = 0;
  G.transTarget = target === undefined ? G.depth + 1 : target;
  // надписът показва СЛЕДВАЩИЯ етаж още от началото на фейда
  const nd = G.transTarget, ti = themeIndexFor(nd);
  G.transMsg = 'Floor ' + nd + ' — ' + THEMES[ti].name;
  G.transSub = THEMES[ti].sub;
  Sfx.play('stairs');
}
function startFloor(depth) {
  G.onSurface = false;
  G.depth = depth;
  G.maxDepth = Math.max(G.maxDepth, depth);
  G.meta.bestDepth = Math.max(G.meta.bestDepth, depth);
  saveProfile(); // прогресът се пази и при слизане
  const gen = Dungeon.generate(depth, G.runSeed);
  G.map = gen.map;
  G.bossRoom = gen.bossRoom || null;
  G.bossRoomLocked = false;
  G.bossGates = [];
  G.vault = gen.vault || null;                 // Съкровищница (заключена, ключът е у елит)
  G.vaultUnlocked = false;
  G.arena = gen.arena ? { room: gen.arena.room, state: 'idle', wave: 0, timer: 0, gates: [] } : null; // Арена
  G.visible = new Uint8Array(gen.map.w * gen.map.h);
  G.explored = new Uint8Array(gen.map.w * gen.map.h);
  G.props = gen.props;
  G.enemies = [];
  G.projectiles = [];
  G.particles = [];
  G.texts = [];
  G.ground = [];
  G.decals = [];
  G.explosions = [];
  G.slashFx = null;
  G.bossName = null;
  G.hazards = [];
  G.orbitals = [];
  G.zaps = [];
  G.novaFx = [];
  initSprites(gen.theme);
  const p = G.player;
  p.x = gen.map.start.x;
  p.y = gen.map.start.y;
  p.lastTi = -1; p.lastTj = -1;
  p.fireCd = 0;
  spawnEnemies(gen.spawns);
  computeFOV();
  G.camInit = false;
  G.miniDirty = true;
  const th = THEMES[gen.theme];
  G.transMsg = 'Floor ' + depth + ' — ' + th.name;
  G.transSub = th.sub;
}

function startGame(slot, freshName) {
  G.charSlot = slot;
  G.keys = Object.create(null); // чисто начало за входа
  G.mouse.down = G.mouse.rdown = false;
  G.joy = null; G.atkHold = null; G.fireHold = null;
  G.runSeed = (Math.random() * 0xffffffff) >>> 0;
  G.player = newPlayer();
  G.kills = 0;
  G.maxDepth = 1;
  G.startTime = performance.now();
  G.levelupQueue = 0;
  G.levelupChoices = null;
  G.checkpoint = 1;
  G.heroBank = null;
  if (freshName !== undefined) {
    // чисто нов герой
    G.charName = freshName || 'Exile';
    G.meta = defaultMeta();
    saveProfile();
  }
  const prof = freshName === undefined ? loadProfile() : null;
  if (prof) {
    const p = G.player;
    G.charName = prof.name || 'Exile';
    p.gold = prof.gold || 0;
    // отвари: нови постоянни флакони; стар запис с брой { hp:N, mp:M } -> само отключване
    p.potionsOwned = prof.potionsOwned || { hp: true, mp: true };
    p.potionSlots = (Array.isArray(prof.potionSlots) && prof.potionSlots.length === 2) ? prof.potionSlots : ['hp', 'mp'];
    p.potionUp = prof.potionUp || {};
    p.potionCd = [0, 0]; p.buffs = {};
    // старите натрупани отвари -> малко злато, за да не се усети като загуба
    if (prof.potions && !prof.potionsOwned) p.gold += ((prof.potions.hp || 0) + (prof.potions.mp || 0)) * 15;
    if (prof.equip) p.equip = prof.equip;
    p.inv = prof.inv || [];
    G.meta = mergeMeta(prof.meta);
    G.checkpoint = prof.checkpoint || 1;
    p.spellsKnown = prof.spellsKnown || { fireball: true };
    p.activeSpells = prof.activeSpells || ['fireball', null, null];
    p.activePassives = Array.isArray(prof.activePassives) ? prof.activePassives.slice(0, 2) : [null, null];
    while (p.activePassives.length < 2) p.activePassives.push(null);
    // МИГРАЦИЯ: щитът/черепът вече са пасивни — ако са в активен слот, местим ги в пасивен
    for (let i = 0; i < 3; i++) {
      const sid = p.activeSpells[i];
      if (sid && SPELLS[sid] && SPELLS[sid].passive) {
        p.activeSpells[i] = null;
        for (let j = 0; j < 2; j++) if (!p.activePassives[j]) { p.activePassives[j] = sid; break; }
      }
    }
    // нива на магиите: стар запис без spellLvl -> всички известни магии на ниво 1
    p.spellLvl = (prof.spellLvl && typeof prof.spellLvl === 'object' && !Array.isArray(prof.spellLvl)) ? prof.spellLvl : {};
    for (const _sid in p.spellsKnown) if (p.spellsKnown[_sid]) p.spellLvl[_sid] = p.spellLvl[_sid] || 1;
    // уменията са постоянни (стари записи ги пазеха в hero)
    p.skills = prof.skills || (prof.hero && prof.hero.skills) || {};
    p.skillPoints = prof.skillPoints !== undefined ? prof.skillPoints : ((prof.hero && prof.hero.skillPoints) || 0);
    // стар запис: томове в екипировката -> в Книгата
    for (const sl of ['spell1', 'spell2', 'spell3']) {
      if (p.equip[sl]) {
        if (p.equip[sl].spell) p.spellsKnown[p.equip[sl].spell] = true;
        delete p.equip[sl];
      }
    }
    if (!p.activeSpells[0]) p.activeSpells[0] = 'fireball';
    // банкиран герой (прибран през портала) — нивото и дарбите оцеляват
    if (prof.hero) {
      p.lvl = prof.hero.lvl || 1;
      p.xp = prof.hero.xp || 0;
      p.xpNext = prof.hero.xpNext || 30;
      p.perks = prof.hero.perks || {};
      G.heroBank = prof.hero;
    }
    // предпазваме се от сблъсък на id-та след зареждане
    let mx = 100;
    for (const it of [].concat(p.inv, Object.values(p.equip))) if (it && it.id >= mx) mx = it.id + 1;
    Items._id = mx;
    calcStats(p);
    p.hp = p.st.maxhp; p.mp = p.st.maxmp;
    p.dashCharges = p.st.dashMax;
  }
  startSurface();
  G.state = 'play';
  document.body.classList.remove('menu');
}
// прибиране у дома през портала на арх-боса: нивото и дарбите се БАНКИРАТ
function goHomeViaPortal() {
  const p = G.player;
  G.checkpoint = Math.max(G.checkpoint || 1, G.depth + 1);
  G.heroBank = { lvl: p.lvl, xp: p.xp, xpNext: p.xpNext, perks: p.perks };
  G.meta.bestDepth = Math.max(G.meta.bestDepth, G.maxDepth);
  saveProfile();
  toast('Returned home with their glory. The entrance from floor ' + G.checkpoint + ' is open.', '#7fd0a0');
  startSurface();
  G.state = 'play';
}
function newRun() { startGame(G.charSlot || 0); } // стар вход, ползван от менютата

// ---------- до 3 герои, всеки със собствено име и запис ----------
function charKey(slot) { return 'sm_char_' + slot; }
const SAVE_VERSION = 1;
function saveProfile() {
  try {
    const p = G.player;
    const data = JSON.stringify({
      v: SAVE_VERSION,                             // версия на записа — за бъдещи миграции
      name: G.charName || 'Exile',
      gold: p.gold, equip: p.equip, inv: p.inv, meta: G.meta,
      potionsOwned: p.potionsOwned, potionSlots: p.potionSlots, potionUp: p.potionUp, // постоянни отвари
      spellsKnown: p.spellsKnown, activeSpells: p.activeSpells, activePassives: p.activePassives || [null, null], spellLvl: p.spellLvl || {}, // нивата на магиите са ЗАВИНАГИ
      skills: p.skills || {}, skillPoints: p.skillPoints || 0, // дървото е ЗАВИНАГИ
      checkpoint: G.checkpoint || 1,
      hero: G.heroBank || null, // ниво/перкове, спасени през портала у дома
    });
    localStorage.setItem(charKey(G.charSlot || 0), data);
    localStorage.setItem(charKey(G.charSlot || 0) + '_bak', data); // РЕЗЕРВНО копие — пази прогреса при повреден запис
  } catch (e) {}
}
// счупен/липсващ affixes да не срива calcStats
function normItem(it) {
  if (!it || typeof it !== 'object') return;
  if (!Array.isArray(it.affixes)) it.affixes = [];
  // обхватът вече идва САМО от оръжието — старите 'range' афикси отпадат от записите
  for (let i = it.affixes.length - 1; i >= 0; i--) if (it.affixes[i] && it.affixes[i].k === 'range') it.affixes.splice(i, 1);
}
// миграция на запис на герой към текущата версия; при невъзможност -> null
function migrateChar(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  try {
    const v = c.v || 0; // липсва v -> версия 0
    switch (v) {
      case 0: {
        // версия 0: дозапълваме липсващите полета с безопасни стойности и валидираме типове
        if (typeof c.name !== 'string') c.name = 'Exile';
        if (typeof c.gold !== 'number') c.gold = Number(c.gold) || 0;
        if (c.potions == null || typeof c.potions !== 'object') c.potions = { hp: 2, mp: 1 };
        // екипировката е обект със слотове (не масив); нормализираме предметите
        if (c.equip == null || typeof c.equip !== 'object' || Array.isArray(c.equip)) c.equip = {};
        for (const k in c.equip) normItem(c.equip[k]);
        // инвентарът е масив от предмети; махаме счупените записи
        if (!Array.isArray(c.inv)) c.inv = [];
        for (let i = c.inv.length - 1; i >= 0; i--) {
          if (!c.inv[i] || typeof c.inv[i] !== 'object') c.inv.splice(i, 1);
          else normItem(c.inv[i]);
        }
        // spellsKnown е ОБЕКТ, activeSpells е МАСИВ
        if (c.spellsKnown == null || typeof c.spellsKnown !== 'object' || Array.isArray(c.spellsKnown)) c.spellsKnown = { fireball: true };
        if (!Array.isArray(c.activeSpells)) c.activeSpells = ['fireball', null, null];
        if (!Array.isArray(c.activePassives)) c.activePassives = [null, null];
        if (typeof c.checkpoint !== 'number') c.checkpoint = Number(c.checkpoint) || 1;
        // skills/skillPoints/hero/meta имат собствена fallback логика при зареждане — не ги пипаме
        c.v = 1;
      }
      // case 1: тук ще влиза бъдеща миграция (1 -> 2) — case 0 пропада надолу и се верижи
      default:
        break;
    }
    return c;
  } catch (e) { return null; }
}
// четене на запис за слот: първо основния, при липса/повреда — РЕЗЕРВНОТО копие (и го възстановява)
function readCharSlot(slot) {
  try {
    const main = migrateChar(JSON.parse(localStorage.getItem(charKey(slot)) || 'null'));
    if (main) return main;
  } catch (e) {}
  try {
    const bak = migrateChar(JSON.parse(localStorage.getItem(charKey(slot) + '_bak') || 'null'));
    if (bak) {
      try { localStorage.setItem(charKey(slot), JSON.stringify(bak)); } catch (e2) {}
      return bak;
    }
  } catch (e) {}
  return null;
}
function loadCharList() {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const c = readCharSlot(i);
    out.push(c ? { slot: i, name: c.name || 'Exile', gold: c.gold || 0, depth: (c.meta && c.meta.bestDepth) || 1, deaths: (c.meta && c.meta.deaths) || 0 } : null);
  }
  return out;
}
function loadProfile() {
  return readCharSlot(G.charSlot || 0);
}
function wipeProfile() {
  try { localStorage.removeItem(charKey(G.charSlot || 0)); localStorage.removeItem(charKey(G.charSlot || 0) + '_bak'); } catch (e) {}
}
function deleteChar(slot) {
  try { localStorage.removeItem(charKey(slot)); localStorage.removeItem(charKey(slot) + '_bak'); } catch (e) {}
}
// старият единичен запис става герой №1
function migrateOldProfile() {
  try {
    const old = localStorage.getItem('bezdna_profile');
    if (old && !localStorage.getItem(charKey(0))) {
      const c = JSON.parse(old);
      c.name = 'Exile';
      localStorage.setItem(charKey(0), JSON.stringify(c));
      localStorage.removeItem('bezdna_profile');
    }
  } catch (e) {}
}

// ---------- повърхността ----------
function startSurface() {
  G.onSurface = true;
  G.depth = 0;
  if (!G.meta.worldSeed) G.meta.worldSeed = (Math.random() * 0xffffffff) >>> 0;
  const gen = Surface.generate(G.meta.worldSeed);
  G.map = gen.map;
  G.visible = new Uint8Array(gen.map.w * gen.map.h).fill(1);
  G.explored = new Uint8Array(gen.map.w * gen.map.h).fill(1);
  G.props = gen.props;
  G.enemies = [];
  G.projectiles = [];
  G.particles = [];
  G.texts = [];
  G.ground = [];
  G.decals = [];
  G.explosions = [];
  G.slashFx = null;
  G.bossName = null;
  G.hazards = [];
  G.orbitals = [];
  G.zaps = [];
  G.novaFx = [];
  G.bossRoom = null;
  G.bossRoomLocked = false;
  G.bossGates = [];
  G.vault = null; G.vaultUnlocked = false; G.arena = null; // чисти състояния на специалните стаи
  if (G.player) G.player.usedSecondChance = false; // ново спускане — нов Втори шанс
  initSurfaceSprites();
  initSprites(0); // за икони/герой, ако още не са готови
  const p = G.player;
  p.x = gen.map.start.x;
  p.y = gen.map.start.y;
  p.lastTi = -1; p.lastTj = -1;
  p.fireCd = 0;
  p.hp = p.st.maxhp; p.mp = p.st.maxmp;
  G.camInit = false;
  G.miniDirty = true;
  // стоката се опреснява при всяко завръщане
  G.shops = {};
  G.transMsg = 'Camp of the Exiles';
  G.transSub = 'here the dead take their rest';
  saveProfile();
}

// смърт -> ново начало от лагера: злато, предмети и УМЕНИЯТА остават; нивото, дарбите и контролната точка — не
function respawnAtCamp() {
  const p = G.player;
  p.lvl = 1; p.xp = 0; p.xpNext = 30;
  p.perks = {};
  p.usedSecondChance = false;
  G.heroBank = null;   // банкираният герой умира със смъртта
  G.checkpoint = 1;    // входът пак е от етаж 1
  G.levelupQueue = 0;
  G.levelupChoices = null;
  p.buffs = {}; p.potionCd = [0, 0]; // бъфовете/презарежданията не оцеляват смъртта
  calcStats(p);
  p.hp = p.st.maxhp; p.mp = p.st.maxmp;
  G.kills = 0;
  G.startTime = performance.now();
  startSurface();
  G.state = 'play';
  document.body.classList.remove('menu');
  toast('The Abyss spat you out. Your gear survived.', '#7fd0a0');
}

function saveBest() {
  try {
    const cur = JSON.parse(localStorage.getItem('bezdna_best') || 'null');
    const score = G.maxDepth * 1000 + G.kills;
    if (!cur || score > (cur.depth * 1000 + cur.kills)) {
      localStorage.setItem('bezdna_best', JSON.stringify({ depth: G.maxDepth, kills: G.kills, lvl: G.player.lvl }));
    }
    G.best = JSON.parse(localStorage.getItem('bezdna_best') || 'null');
  } catch (e) {}
}
function loadBest() {
  try { G.best = JSON.parse(localStorage.getItem('bezdna_best') || 'null'); } catch (e) { G.best = null; }
}
