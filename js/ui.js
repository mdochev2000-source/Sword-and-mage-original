'use strict';
// ================= ИНТЕРФЕЙС: HUD, минимапа, инвентар, менюта =================

const UI = {
  hotRects: [], invRects: [], equipRects: [], perkRects: [], btnRects: [],
  hoverItem: null, miniCv: null,
};

function fontPx(n) { return (n * SCALE) + 'px "Segoe UI", Verdana, sans-serif'; }
function fontBold(n) { return 'bold ' + (n * SCALE) + 'px "Segoe UI", Verdana, sans-serif'; }

function panel(x, y, w, h) {
  rcx(x, y, w, h, 'rgba(10,13,20,0.92)');
  strokeRect(x, y, w, h, '#3a4456', SCALE);
  strokeRect(x + SCALE, y + SCALE, w - 2 * SCALE, h - 2 * SCALE, '#171c28', SCALE);
}
function rcx(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }
function strokeRect(x, y, w, h, c, lw) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, lw); ctx.fillRect(x, y + h - lw, w, lw);
  ctx.fillRect(x, y, lw, h); ctx.fillRect(x + w - lw, y, lw, h);
}

// ---------- орб (Diablo-стил, пикселна течност) ----------
function drawOrb(cx0, cy0, radArt, frac, kind) {
  const g = mk(radArt * 2 + 2, radArt * 2 + 2);
  const R = radArt, c = R + 1;
  const lvl = (1 - clamp(frac, 0, 1)) * 2 * R;
  const cols = kind === 'hp'
    ? ['#8f1620', '#c22836', '#ff4757', '#ff8a94']
    : ['#173a7a', '#2456a8', '#3b82f6', '#7fb0ff'];
  for (let y = 0; y < 2 * R + 2; y++) for (let x = 0; x < 2 * R + 2; x++) {
    const d = Math.hypot(x - c, y - c);
    if (d > R) continue;
    if (d > R - 1.5) { px(g, x, y, '#454f63'); continue; }         // рамка
    const yy = y - (c - R);
    if (yy > lvl) {
      // течност: вълна отгоре, по-тъмна надолу
      const wave = Math.sin(x * 0.9 + G.time * 4) > 0 ? 1 : 0;
      if (yy < lvl + 1.5 + wave) px(g, x, y, cols[3]);
      else if (yy > 2 * R - 4) px(g, x, y, cols[0]);
      else px(g, x, y, yy > R ? cols[1] : cols[2]);
    } else {
      px(g, x, y, '#10141f');
    }
  }
  // стъклен отблясък
  for (let i = 0; i < 5; i++) px(g, c - R / 2 - i % 2, c - R / 2 - ((i / 2) | 0), 'rgba(255,255,255,0.5)');
  blit(ctx, g.canvas, cx0 - (R + 1) * SCALE, cy0 - (R + 1) * SCALE);
}

// ---------- HUD ----------
// малко шише в даден цвят (за хотбара, тъч бутоните и екрана за избор)
function drawPotionGlyph(cx, cy, col, sc) {
  const S = sc || SCALE;
  ctx.fillStyle = '#c9d1d9'; ctx.fillRect(cx - S, cy - 8 * S, 2 * S, 2 * S);      // тапа
  ctx.fillStyle = '#94a1b8'; ctx.fillRect(cx - 1.5 * S, cy - 6 * S, 3 * S, 2 * S); // гърло
  ctx.fillStyle = col; ctx.fillRect(cx - 4 * S, cy - 4 * S, 8 * S, 8 * S);         // тяло
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(cx - 3 * S, cy - 3 * S, 2 * S, 5 * S);
}
// дефиниция за слот в хотбара според носената отвара
function potionSlot(slot) {
  const p = G.player;
  const key = p.potionSlots && p.potionSlots[slot];
  const def = key ? POTIONS[key] : null;
  return {
    key: String(slot + 1),
    potion: def, emptyPotion: !def,
    cd: def && p.potionCd ? (p.potionCd[slot] || 0) / potionCooldown(p, key) : 0,
    // в лагера бутонът избира коя отвара да е в слота; в подземието я използва
    act: () => { if (G.onSurface) openPotionSelect(slot); else usePotion(slot); },
  };
}
function openPotionSelect(slot) {
  G.potionSelSlot = slot || 0;
  G.state = 'potionsel';
  document.body.classList.add('menu');
}
function setPotionSlot(slot, key) {
  const p = G.player;
  if (!Array.isArray(p.potionSlots)) p.potionSlots = ['hp', 'mp'];
  const other = 1 - slot;
  if (key && p.potionSlots[other] === key) p.potionSlots[other] = p.potionSlots[slot]; // размяна вместо дубликат
  p.potionSlots[slot] = key || null;
  saveProfile();
  Sfx.play('pickup');
}
// екран за избор на двете носени отвари (само в лагера)
function drawPotionSelect() {
  const S = SCALE, p = G.player;
  UI.btnRects = [];
  rcx(0, 0, CW, CH, 'rgba(4,6,11,0.78)');
  const pw = 236 * S, ph = 186 * S, x0 = (CW - pw) / 2, y0 = (CH - ph) / 2;
  panel(x0, y0, pw, ph);
  ctx.textAlign = 'left'; ctx.font = fontBold(9); ctx.fillStyle = '#e8e4d0';
  ctx.fillText('POTIONS — choose the two you carry', x0 + 10 * S, y0 + 14 * S);
  ctx.font = fontPx(6); ctx.fillStyle = '#7d8899';
  ctx.fillText('only in camp · ESC — close', x0 + 10 * S, y0 + 22 * S);
  // ✕
  const cxr = { x: x0 + pw - 20 * S, y: y0 + 4 * S, w: 16 * S, h: 16 * S };
  panel(cxr.x, cxr.y, cxr.w, cxr.h); ctx.textAlign = 'center'; ctx.font = fontBold(9); ctx.fillStyle = '#ff6b7a';
  ctx.fillText('✕', cxr.x + cxr.w / 2, cxr.y + 11.5 * S);
  UI.btnRects.push({ x: cxr.x, y: cxr.y, w: cxr.w, h: cxr.h, act: () => closePotionSelect() });
  // двата слота
  const sw = 40 * S, sy = y0 + 30 * S;
  for (let s = 0; s < 2; s++) {
    const sx = x0 + 20 * S + s * (sw + 18 * S);
    panel(sx, sy, sw, sw);
    if (G.potionSelSlot === s) strokeRect(sx - S, sy - S, sw + 2 * S, sw + 2 * S, '#ffd23b', S);
    const key = p.potionSlots && p.potionSlots[s];
    const def = key ? POTIONS[key] : null;
    if (def) drawPotionGlyph(sx + sw / 2, sy + sw / 2 + 2 * S, def.col, 2.2 * S);
    else { ctx.fillStyle = '#454e63'; ctx.fillRect(sx + sw / 2 - S, sy + sw / 2 - S, 2 * S, 2 * S); }
    ctx.textAlign = 'center'; ctx.font = fontPx(6); ctx.fillStyle = '#a8b2c4';
    ctx.fillText('Slot ' + (s + 1), sx + sw / 2, sy + sw + 8 * S);
    UI.btnRects.push({ x: sx, y: sy, w: sw, h: sw, act: ((si) => () => { G.potionSelSlot = si; })(s) });
  }
  // колекция от отключени отвари
  ctx.textAlign = 'left'; ctx.font = fontPx(6.5); ctx.fillStyle = '#7fd0a0';
  ctx.fillText('Your collection (click — into slot ' + (G.potionSelSlot + 1) + '):', x0 + 10 * S, y0 + 88 * S);
  const owned = (p.potionsOwned && POTION_KEYS.filter(k => p.potionsOwned[k])) || [];
  let ry = y0 + 94 * S; const rw = pw - 20 * S, rh = 15 * S;
  for (const key of owned) {
    const def = POTIONS[key], up = (p.potionUp && p.potionUp[key]) || 0;
    const inSlot = p.potionSlots && p.potionSlots.indexOf(key) !== -1;
    const hov = G.mouse.x >= x0 + 10 * S && G.mouse.x < x0 + 10 * S + rw && G.mouse.y >= ry && G.mouse.y < ry + rh;
    rcx(x0 + 10 * S, ry, rw, rh, hov ? 'rgba(60,70,95,0.5)' : 'rgba(20,25,38,0.6)');
    if (inSlot) strokeRect(x0 + 10 * S, ry, rw, rh, '#7fd0a0', 1);
    drawPotionGlyph(x0 + 18 * S, ry + 9 * S, def.col, S);
    ctx.font = fontPx(6.5); ctx.fillStyle = def.col;
    ctx.fillText(def.n + (up ? ' ' + '★'.repeat(up) : ''), x0 + 28 * S, ry + 7 * S);
    ctx.font = fontPx(5.5); ctx.fillStyle = '#7d8899';
    ctx.fillText(def.d + ' · ' + Math.round(potionCooldown(p, key)) + 's', x0 + 28 * S, ry + 13 * S);
    UI.btnRects.push({ x: x0 + 10 * S, y: ry, w: rw, h: rh, act: ((k) => () => setPotionSlot(G.potionSelSlot, k))(key) });
    ry += rh + 2 * S;
  }
  // изпразни слота
  const eb = { x: x0 + 10 * S, y: ry + 2 * S, w: 74 * S, h: 14 * S };
  panel(eb.x, eb.y, eb.w, eb.h); ctx.textAlign = 'center'; ctx.font = fontBold(6.5); ctx.fillStyle = '#a8b2c4';
  ctx.fillText('Empty the slot', eb.x + eb.w / 2, eb.y + 10 * S);
  UI.btnRects.push({ x: eb.x, y: eb.y, w: eb.w, h: eb.h, act: () => setPotionSlot(G.potionSelSlot, null) });
  ctx.textAlign = 'left';
}
function closePotionSelect() { G.state = 'play'; document.body.classList.remove('menu'); saveProfile(); }
function drawHUD() {
  const p = G.player;
  const S = SCALE;
  UI.hotRects = [];

  // орбове + хотбар долу в средата
  const barW = 200 * S, barH = 34 * S;
  const bx = (CW - barW) / 2, by = CH - barH - 6 * S;
  drawOrb(bx - 8 * S, by + barH - 18 * S, 16, p.hp / p.st.maxhp, 'hp');
  drawOrb(bx + barW + 8 * S, by + barH - 18 * S, 16, p.mp / p.st.maxmp, 'mp');
  ctx.textAlign = 'center';
  ctx.font = fontBold(6);
  ctx.fillStyle = '#e8e4d0';
  ctx.fillText(Math.ceil(p.hp) + '/' + p.st.maxhp, bx - 8 * S, by + barH + 2 * S);
  ctx.fillText(Math.ceil(p.mp) + '/' + p.st.maxmp, bx + barW + 8 * S, by + barH + 2 * S);

  // XP лента
  const xw = barW, xh = 3 * S;
  rcx(bx, by - 2 * S, xw, xh, '#171c28');
  rcx(bx, by - 2 * S, xw * clamp(p.xp / p.xpNext, 0, 1), xh, '#c8a832');
  strokeRect(bx, by - 2 * S, xw, xh, '#3a4456', 1);

  // слотове: оръжие, 3 магии, отскок, отвари
  p.spellCd = p.spellCd || [0, 0, 0];
  const spellSlot = (idx, key, unlocked) => {
    const id = p.activeSpells && p.activeSpells[idx];
    const sp = id && SPELLS[id];
    return {
      key, spell: sp,
      locked: !unlocked, empty: unlocked && !sp,
      info: sp ? sp.cost : null,
      infoCol: sp ? (p.mp >= sp.cost ? '#7fb0ff' : '#ff6b7a') : null,
      cd: sp ? p.spellCd[idx] / sp.cd : 0,
      act: () => castSpell(idx),
    };
  };
  const slots = [
    { key: 'LMB', icon: p.equip.weapon ? p.equip.weapon.icon : 'sword', info: null, act: () => autoMelee() },
    spellSlot(0, 'RMB', true),
    spellSlot(1, '3', G.meta.magic3),
    spellSlot(2, '4', G.meta.magic4),
    { key: 'SP', icon: 'dash', cd: (p.dashCharges || 0) < p.st.dashMax ? (p.dashRegen || 0) / p.st.dashCd : 0, act: () => tryDash() },
    potionSlot(0), potionSlot(1),
  ];
  const sw = 24 * S, gap = 3 * S;
  let sx = bx + (barW - (slots.length * sw + (slots.length - 1) * gap)) / 2;
  for (const s of slots) {
    panel(sx, by, sw, sw);
    if (s.locked) {
      // заключен слот за магия: катинарче (Майсторът го отваря срещу Печат)
      rcx(sx + 2 * S, by + 2 * S, sw - 4 * S, sw - 4 * S, 'rgba(8,10,16,0.55)');
      const cx0 = sx + sw / 2, cy0 = by + sw / 2;
      strokeRect(cx0 - 2 * S, cy0 - 5 * S, 4 * S, 4 * S, '#454e63', S);   // скоба
      rcx(cx0 - 3 * S, cy0 - 1 * S, 6 * S, 5 * S, '#454e63');             // тяло
      rcx(cx0 - S / 2, cy0 + S, S, 2 * S, '#171c28');                     // ключалка
    }
    else if (s.empty) {
      // отключен, но празен: гнездо, чакащо том
      rcx(sx + 2 * S, by + 2 * S, sw - 4 * S, sw - 4 * S, 'rgba(30,20,50,0.5)');
      strokeRect(sx + 5 * S, by + 5 * S, sw - 10 * S, sw - 10 * S, '#6a4f9e', S);
      const pl = 0.4 + 0.25 * Math.sin(G.time * 3);
      ctx.fillStyle = 'rgba(200,79,255,' + pl.toFixed(2) + ')';
      ctx.fillRect(sx + sw / 2 - S, by + sw / 2 - S, 2 * S, 2 * S);
    }
    else if (s.spell) {
      // руна на магията в нейния цвят
      const cx0 = sx + sw / 2, cy0 = by + sw / 2;
      ctx.fillStyle = s.spell.col;
      ctx.beginPath();
      ctx.moveTo(cx0, cy0 - 6 * S); ctx.lineTo(cx0 + 5 * S, cy0); ctx.lineTo(cx0, cy0 + 6 * S); ctx.lineTo(cx0 - 5 * S, cy0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(cx0 - S, cy0 - 3 * S, S, 2 * S);
    }
    else if (s.potion) {
      // флакон в цвета на отварата (без брой — само презареждане)
      drawPotionGlyph(sx + sw / 2, by + sw / 2 + S, s.potion.col);
    }
    else if (s.emptyPotion) {
      // празен слот за отвара (валиден билд: 1 отвара + бъф)
      rcx(sx + 2 * S, by + 2 * S, sw - 4 * S, sw - 4 * S, 'rgba(20,25,38,0.5)');
      ctx.fillStyle = '#454e63';
      ctx.fillRect(sx + sw / 2 - S, by + sw / 2 - S, 2 * S, 2 * S);
    }
    else if (s.icon === 'dash') {
      ctx.font = fontBold(9);
      ctx.fillStyle = '#c9d1d9';
      ctx.fillText('»', sx + sw / 2, by + sw / 2 + 3 * S);
      // пипове за зарядите
      for (let k = 0; k < p.st.dashMax; k++) {
        ctx.fillStyle = k < (p.dashCharges || 0) ? '#ffd23b' : '#454e63';
        ctx.fillRect(sx + 4 * S + k * 5 * S, by + sw - 5 * S, 3 * S, 2 * S);
      }
    }
    else blit(ctx, Spr.icons[s.icon], sx + sw / 2 - 6 * S, by + sw / 2 - 7 * S);
    if (s.cd > 0) rcx(sx, by + sw * (1 - clamp(s.cd, 0, 1)), sw, sw * clamp(s.cd, 0, 1), 'rgba(8,10,16,0.65)');
    ctx.font = fontPx(5);
    ctx.fillStyle = '#7d8899';
    ctx.fillText(s.key, sx + sw / 2, by + 6 * S);
    if (s.info !== null && s.info !== undefined) {
      ctx.font = fontBold(6);
      ctx.fillStyle = s.infoCol || '#e8e4d0';
      ctx.fillText(s.info, sx + sw - 5 * S, by + sw - 3 * S);
    }
    if (s.act) UI.hotRects.push({ x: sx, y: by, w: sw, h: sw, act: s.act });
    sx += sw + gap;
  }

  // горе вляво: етаж/лагер, злато, ниво
  ctx.textAlign = 'left';
  ctx.font = fontBold(8);
  ctx.fillStyle = '#e8e4d0';
  ctx.fillText(G.onSurface ? 'THE CAMP' : 'FLOOR ' + G.depth, 10 * S, 12 * S);
  ctx.font = fontPx(7);
  ctx.fillStyle = '#7d8899';
  ctx.fillText(G.onSurface ? 'of the Exiles' : THEMES[Spr.themeIdx].name, 10 * S, 21 * S);
  blit(ctx, Spr.icons.gold, 10 * S, 25 * S);
  ctx.fillStyle = '#ffd23b';
  ctx.font = fontBold(7);
  ctx.fillText(String(p.gold), 24 * S, 33 * S);
  const hasSeal = G.meta.seals > 0, hasShard = (G.meta.shards || 0) > 0;
  if (hasSeal || hasShard) {
    let cx = 10 * S;
    if (hasSeal) {
      blit(ctx, Spr.icons.seal, cx, 36 * S);
      ctx.fillStyle = '#c84fff';
      ctx.fillText(String(G.meta.seals), cx + 14 * S, 44 * S);
      cx += 34 * S;
    }
    if (hasShard) {
      blit(ctx, Spr.icons.shard, cx, 36 * S);
      ctx.fillStyle = '#57e6c8';
      ctx.fillText(String(G.meta.shards), cx + 14 * S, 44 * S);
    }
  }
  ctx.fillStyle = '#7fd0a0';
  const hlY = (hasSeal || hasShard) ? 54 * S : 43 * S;
  ctx.fillText('Hero level: ' + p.lvl, 10 * S, hlY);
  if (p.inv && p.inv.some(it => it && it.soulstone)) { // носиш Камък на душата — защитен си (видимо в HUD)
    blit(ctx, Spr.icons.soulstone, 66 * S, hlY - 9 * S);
    ctx.fillStyle = '#ff8aa0';
    ctx.font = fontPx(5.5);
    ctx.fillText('SOUL STONE', 79 * S, hlY - 1.5 * S);
  }

  // активни бъфове от отвари: флаконче + лента с оставащото време
  if (p.buffs) {
    const keys = Object.keys(p.buffs);
    let bx0 = 10 * S, byy = ((hasSeal || hasShard) ? 60 : 49) * S;
    for (const bk of keys) {
      const bd = Object.values(POTIONS).find(pp => pp.buff === bk);
      if (!bd) continue;
      const b = p.buffs[bk];
      panel(bx0, byy, 14 * S, 18 * S);
      drawPotionGlyph(bx0 + 7 * S, byy + 8 * S, bd.col, S * 0.85);
      const frac = clamp(b.t / (bd.dur || 10), 0, 1);
      rcx(bx0 + 2 * S, byy + 15 * S, 10 * S, 2 * S, '#171c28');
      rcx(bx0 + 2 * S, byy + 15 * S, 10 * S * frac, 2 * S, bd.col);
      bx0 += 17 * S;
    }
  }

  drawMinimap();

  // босбар
  if (G.bossName) {
    const boss = G.enemies.find(e => e.t.boss && !e.dead);
    if (boss) {
      const bw = Math.min(300 * S, CW * 0.5), bh = 6 * S;
      const bxx = (CW - bw) / 2, byy = 12 * S;
      ctx.textAlign = 'center';
      ctx.font = fontBold(8);
      ctx.fillStyle = '#ff6b7a';
      ctx.fillText(G.bossName, CW / 2, byy - 3 * S);
      rcx(bxx, byy, bw, bh, '#171c28');
      rcx(bxx, byy, bw * clamp(boss.hp / boss.maxhp, 0, 1), bh, '#c22836');
      strokeRect(bxx, byy, bw, bh, '#3a4456', S);
    }
  }

  // подсказка за взаимодействие: на клавиатура "E — ...", на тъч — голям бутон за докосване
  if (G.interactHint) {
    ctx.textAlign = 'center';
    const txt = G.isTouch ? G.interactHint.txt.replace(/^E — /, '') : G.interactHint.txt;
    ctx.font = fontBold(G.isTouch ? 8 : 7);
    const tw = ctx.measureText(txt).width;
    const hx = CW / 2, hy = CH - 52 * S;
    const pad = G.isTouch ? 10 * S : 6 * S, hh = G.isTouch ? 20 * S : 13 * S;
    const rx = hx - tw / 2 - pad, ry = hy - hh + 4 * S;
    rcx(rx, ry, tw + pad * 2, hh, 'rgba(10,13,20,0.9)');
    if (G.isTouch) strokeRect(rx, ry, tw + pad * 2, hh, '#ffd23b', S);
    ctx.fillStyle = '#ffd23b';
    ctx.fillText(txt, hx, hy);
    if (G.isTouch) UI.hotRects.push({ x: rx, y: ry, w: tw + pad * 2, h: hh, act: () => doInteract() });
  }

  // тост съобщение
  if (G.msgT > 0 && G.msg) {
    ctx.textAlign = 'center';
    ctx.font = fontBold(8);
    ctx.globalAlpha = clamp(G.msgT / 0.5, 0, 1);
    const tw = ctx.measureText(G.msg.str).width;
    rcx(CW / 2 - tw / 2 - 8 * S, CH - 76 * S, tw + 16 * S, 14 * S, 'rgba(10,13,20,0.85)');
    ctx.fillStyle = G.msg.color;
    ctx.fillText(G.msg.str, CW / 2, CH - 66 * S);
    ctx.globalAlpha = 1;
  }

  // етикети на предмети по земята (близо до мишката)
  drawGroundLabels();

  // тъч бутони по шаблона (или изрично избран режим "virtual buttons")
  if (useTouchUI() && G.state === 'play') drawTouchControls(false);

  // зъбчато колело за настройки (едро) + чанта за инвентара
  {
    const gy = (G.meta.seals > 0 || (G.meta.shards || 0) > 0) ? 58 * S : 47 * S;
    const gw = 28 * S;
    panel(10 * S, gy, gw, gw);
    const cx0 = 10 * S + gw / 2, cy0 = gy + gw / 2;
    ctx.fillStyle = '#a8b2c4';
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4 + G.time * 0.3;
      ctx.fillRect((cx0 + Math.cos(ang) * 8 * S - 2 * S) | 0, (cy0 + Math.sin(ang) * 8 * S - 2 * S) | 0, 4 * S, 4 * S);
    }
    ctx.beginPath(); ctx.arc(cx0, cy0, 6 * S, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#171c28';
    ctx.beginPath(); ctx.arc(cx0, cy0, 3 * S, 0, Math.PI * 2); ctx.fill();
    UI.hotRects.push({ x: 10 * S, y: gy, w: gw, h: gw, act: () => openSettings() });

    // чанта (отваря инвентара — на телефона няма клавиш I)
    const bx2 = 10 * S + gw + 4 * S;
    panel(bx2, gy, gw, gw);
    const bcx = bx2 + gw / 2, bcy = gy + gw / 2;
    rcx(bcx - 8 * S, bcy - 4 * S, 16 * S, 11 * S, '#6e4a2f');            // торба
    rcx(bcx - 8 * S, bcy - 4 * S, 16 * S, 2 * S, '#8f6a42');
    rcx(bcx - 5 * S, bcy - 8 * S, 10 * S, 4 * S, '#5c3d26');             // капак
    rcx(bcx - 2 * S, bcy - 2 * S, 4 * S, 3 * S, '#e8c04a');              // катарама
    UI.hotRects.push({ x: bx2, y: gy, w: gw, h: gw, act: () => { G.state = 'inventory'; document.body.classList.add('menu'); } });
  }

  // червен пулс при поражение
  if (G.hurtFlash > 0) {
    ctx.fillStyle = 'rgba(180,30,45,' + (0.25 * G.hurtFlash) + ')';
    ctx.fillRect(0, 0, CW, CH);
  }
  ctx.textAlign = 'left';
}

function drawGroundLabels() {
  const S = SCALE;
  const p = G.player;
  // с мишка — етикет само под курсора; с контролер/тъч няма курсор, затова
  // показваме сами имената на всички предмети около героя (като задържан Alt в PoE).
  // Ключово: в „авто" режим на компютър useMouseAim() е true дори с контролер,
  // затова гледаме и дали падът е бил използван скоро (реалния вход в момента).
  const autoNear = useTouchUI() || !useMouseAim() || padRecent();
  const R = 3.4; // радиус около героя, в който имената изгряват сами
  // събираме видимите етикети и ги подреждаме по близост, за да не се застъпват хаотично
  const labels = [];
  for (const g of G.ground) {
    if (!g.item) continue;
    let d;
    if (autoNear) { if (!p) continue; d = dist(p.x, p.y, g.x, g.y); if (d > R) continue; }
    else { d = dist(G.mouse.wx, G.mouse.wy, g.x, g.y); if (d > 1) continue; }
    labels.push({ g, d });
  }
  labels.sort((a, b) => (a.g.y + a.g.x) - (b.g.y + b.g.x));
  ctx.font = fontBold(6);
  ctx.textAlign = 'center';
  for (const L of labels) {
    const g = L.g;
    const sx = isoX(g.x, g.y) + G.camRX, sy = isoY(g.x, g.y) + G.camRY - (g.z || 0) * S;
    // най-близкият (в авто-режим) е ярък, останалите леко избледняват на разстояние
    const near = autoNear ? clamp(1 - L.d / (R + 0.6), 0.4, 1) : 1;
    const name = g.item.name + (g.item.lvl ? ' · ' + g.item.lvl : '');
    const tw = ctx.measureText(name).width;
    ctx.globalAlpha = near;
    rcx(sx - tw / 2 - 3 * S, sy - 27 * S, tw + 6 * S, 11 * S, 'rgba(10,13,20,0.9)');
    strokeRect(sx - tw / 2 - 3 * S, sy - 27 * S, tw + 6 * S, 11 * S, Items.rarityCol(g.item), Math.max(1, S * 0.5));
    ctx.fillStyle = Items.rarityCol(g.item);
    ctx.fillText(name, sx, sy - 19 * S);
    ctx.globalAlpha = 1;
  }
}

// ---------- минимапа ----------
function drawMinimap() {
  const m = G.map, S = SCALE;
  const cell = Math.max(2, Math.round(S * 1.25));
  const mw = m.w * cell, mh = m.h * cell;
  const mx = CW - mw - 8 * S, my = 8 * S;
  if (!UI.miniCv || UI.miniCv.width !== m.w) {
    UI.miniCv = document.createElement('canvas');
    UI.miniCv.width = m.w; UI.miniCv.height = m.h;
    G.miniDirty = true;
  }
  if (G.miniDirty) {
    G.miniDirty = false;
    const mg = UI.miniCv.getContext('2d');
    mg.clearRect(0, 0, m.w, m.h);
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
      const idx = j * m.w + i;
      if (!G.explored[idx]) continue;
      const c = m.cells[idx];
      if (G.onSurface) mg.fillStyle = c !== FLOOR ? '#131b15' : (m.path && m.path[idx] ? '#54473a' : '#2c3a2e');
      else mg.fillStyle = c === FLOOR ? '#3a4456' : '#1a202e';
      mg.fillRect(i, j, 1, 1);
    }
  }
  rcx(mx - 2 * S, my - 2 * S, mw + 4 * S, mh + 4 * S, 'rgba(10,13,20,0.8)');
  strokeRect(mx - 2 * S, my - 2 * S, mw + 4 * S, mh + 4 * S, '#3a4456', S);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(UI.miniCv, 0, 0, m.w, m.h, mx, my, mw, mh);
  // точки
  const dot = (x, y, c, s2) => rcx(mx + x * cell - s2 / 2, my + y * cell - s2 / 2, s2, s2, c);
  for (const pr of G.props) {
    if (pr.broken) continue;
    const idx = Math.floor(pr.y) * m.w + Math.floor(pr.x);
    if (!G.explored[idx]) continue;
    if (pr.kind === 'stairs') dot(pr.x, pr.y, '#7fd0a0', cell * 1.6);
    else if (pr.kind === 'chest' && !pr.opened) dot(pr.x, pr.y, '#ffd23b', cell * 1.3);
    else if (pr.kind === 'fountain') dot(pr.x, pr.y, '#4f9cff', cell * 1.3);
    else if (pr.kind === 'stall') {
      const vc = { weapon: '#d84a5a', armor: '#4f9cff', potion: '#5fd97a', jewel: '#b34fff' };
      dot(pr.x, pr.y, vc[pr.vtype] || '#ffd23b', cell * 1.8);
    }
    else if (pr.kind === 'portal') dot(pr.x, pr.y, '#b34fff', cell * 2);
    else if (pr.kind === 'campfire') dot(pr.x, pr.y, '#ff8a1f', cell * 1.6);
  }
  for (const e of G.enemies) {
    if (e.dead || !tileVisible(Math.floor(e.x), Math.floor(e.y))) continue;
    dot(e.x, e.y, e.t.boss ? '#ff3b3b' : '#c8465a', cell * (e.t.boss ? 2 : 1.2));
  }
  const blink = Math.sin(G.time * 6) > -0.3;
  if (blink) dot(G.player.x, G.player.y, '#ffffff', cell * 1.6);
}

// ---------- инвентар ----------
const SLOT_NAMES = { weapon: 'Weapon', armor: 'Armor', ring: 'Ring', ring2: 'Ring 2', amulet: 'Amulet', spell: 'Spell Tome', spell1: 'Spell', spell2: 'Spell', spell3: 'Spell' };
function drawInventory() {
  const p = G.player, S = SCALE;
  UI.invRects = []; UI.equipRects = []; UI.invDropRect = null; UI.invEquipRect = null; UI.invUnequipRect = null;
  // по-широка мрежа (повече колони) -> по-широк и по-нисък прозорец; на мобилно го качваме нагоре
  const GX = 138, CELL = 28; // мрежата почва на GX art px от x0; клетка 26 + 2 разстояние
  const maxCols = Math.max(4, Math.floor((CW / S - GX - 22) / CELL)); // да се побере на екрана
  const cols = Math.min(8, maxCols);
  const invRows = Math.ceil(G.meta.invSlots / cols);
  const pw = (GX + cols * CELL + 12) * S;
  const ph = Math.max(196, 34 + invRows * CELL) * S + (G.isTouch ? 20 * S : 0);
  const x0 = (CW - pw) / 2;
  const hudReserve = G.isTouch ? 104 * S : 0; // място долу за хотбара/лентите (само мобилно)
  const y0 = Math.max(6 * S, (CH - hudReserve - ph) / 2);
  panel(x0, y0, pw, ph);
  ctx.textAlign = 'left';
  ctx.font = fontBold(9);
  ctx.fillStyle = '#e8e4d0';
  ctx.fillText('HERO', x0 + 10 * S, y0 + 14 * S);
  ctx.font = fontPx(6);
  ctx.fillStyle = '#7d8899';
  ctx.fillText(G.isTouch ? 'tap an item or gear, then the button below' : 'click item — equip · click gear — unequip · right-click — drop', x0 + 60 * S, y0 + 14 * S);
  // ✕ за затваряне
  const cxr = { x: x0 + pw - 20 * S, y: y0 + 4 * S, w: 16 * S, h: 16 * S };
  panel(cxr.x, cxr.y, cxr.w, cxr.h);
  ctx.font = fontBold(9);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b7a';
  ctx.fillText('✕', cxr.x + cxr.w / 2, cxr.y + 11.5 * S);
  ctx.textAlign = 'left';
  UI.invCloseRect = cxr;

  // екипировка (5 слота: оръжие, броня, 2 пръстена, амулет)
  let ey = y0 + 24 * S;
  const slotW = 24 * S;
  for (const slot of ['weapon', 'armor', 'ring', 'ring2', 'amulet']) {
    panel(x0 + 10 * S, ey, slotW, slotW);
    const it = p.equip[slot];
    if (it) {
      blit(ctx, Spr.icons[it.icon], x0 + 10 * S + slotW / 2 - 6 * S, ey + slotW / 2 - 6 * S);
      strokeRect(x0 + 10 * S, ey, slotW, slotW, Items.rarityCol(it), S);
      if (G.equipSel === slot) strokeRect(x0 + 10 * S - S, ey - S, slotW + 2 * S, slotW + 2 * S, '#ffd23b', S); // избран за сваляне
      UI.equipRects.push({ x: x0 + 10 * S, y: ey, w: slotW, h: slotW, item: it, slot, equip: true });
    }
    ctx.font = fontPx(5.5);
    ctx.fillStyle = '#7d8899';
    ctx.fillText(SLOT_NAMES[slot], x0 + 10 * S, ey + slotW + 6 * S);
    ey += 32 * S;
  }

  // статистики
  const st = p.st;
  const lines = [
    ['Damage', Math.round(st.dmg)],
    ['Attacks/sec', (1 / st.atkCd).toFixed(2)],
    ['Armor', st.armor + ' (' + Math.round(100 * st.armor / (st.armor + 50)) + '%)'],
    ['Crit', Math.round(st.crit) + '% (x' + st.critd.toFixed(1) + ')'],
    ['Life Steal', st.vamp + '%'],
    ['Speed', Math.round(st.spd * 10) / 10],
    ['Gold Bonus', Math.round(st.gold) + '%'],
    ['Experience', p.xp + ' / ' + p.xpNext],
  ];
  let ly = y0 + 30 * S;
  ctx.font = fontPx(6.5);
  for (const [k, v] of lines) {
    ctx.fillStyle = '#7d8899';
    ctx.fillText(k, x0 + 52 * S, ly);
    ctx.fillStyle = '#e8e4d0';
    ctx.textAlign = 'right';
    ctx.fillText(String(v), x0 + 128 * S, ly);
    ctx.textAlign = 'left';
    ly += 11 * S;
  }
  // активни магии (от Книгата) — клик отваря Книгата
  ly += 4 * S;
  ctx.fillStyle = '#7d8899';
  ctx.fillText('Spells:', x0 + 52 * S, ly);
  const spw = 16 * S;
  for (let si = 0; si < 3; si++) {
    const rx = x0 + 76 * S + si * (spw + 3 * S), ry2 = ly - 11 * S;
    const unlocked = si === 0 || (si === 1 ? G.meta.magic3 : G.meta.magic4);
    panel(rx, ry2, spw, spw);
    const id = p.activeSpells && p.activeSpells[si];
    if (!unlocked) {
      rcx(rx + 2 * S, ry2 + 2 * S, spw - 4 * S, spw - 4 * S, 'rgba(8,10,16,0.55)');
      rcx(rx + spw / 2 - 2 * S, ry2 + spw / 2 - S, 4 * S, 3 * S, '#454e63');
    } else if (id) {
      const sp = SPELLS[id];
      ctx.fillStyle = sp.col;
      ctx.beginPath();
      ctx.moveTo(rx + spw / 2, ry2 + 3 * S); ctx.lineTo(rx + spw - 3 * S, ry2 + spw / 2);
      ctx.lineTo(rx + spw / 2, ry2 + spw - 3 * S); ctx.lineTo(rx + 3 * S, ry2 + spw / 2);
      ctx.closePath(); ctx.fill();
    }
    UI.invRects.push({ x: rx, y: ry2, w: spw, h: spw, openBook: true });
  }
  ly += 16 * S; // отстояние, за да не се застъпват гнездата с бутона
  // бутони: Книга с магии и Дърво с умения
  const bkw = 76 * S, bkh = 13 * S;
  panel(x0 + 52 * S, ly - 8 * S, bkw, bkh);
  ctx.fillStyle = '#8ab0ff';
  ctx.font = fontBold(6.5);
  ctx.fillText('SPELLBOOK (B)', x0 + 56 * S, ly + 1 * S);
  UI.invRects.push({ x: x0 + 52 * S, y: ly - 8 * S, w: bkw, h: bkh, openBook: true });
  ly += 15 * S;
  panel(x0 + 52 * S, ly - 8 * S, bkw, bkh);
  ctx.fillStyle = (p.skillPoints || 0) > 0 ? '#ffd23b' : '#7fd0a0';
  ctx.fillText('SKILLS (' + (p.skillPoints || 0) + ' pts) (T)', x0 + 56 * S, ly + 1 * S);
  UI.invRects.push({ x: x0 + 52 * S, y: ly - 8 * S, w: bkw, h: bkh, openTree: true });
  ly += 15 * S;
  // дарбите от вдигане на ниво
  ctx.font = fontPx(6.5);
  ctx.fillStyle = '#7d8899';
  ctx.fillText('Perks (from level-ups):', x0 + 52 * S, ly);
  ly += 9 * S;
  ctx.fillStyle = '#7fd0a0';
  const perkStr = Object.keys(p.perks).map(id => {
    const perk = PERKS.find(pp => pp.id === id);
    return (perk ? perk.n : id) + (p.perks[id] > 1 ? ' x' + p.perks[id] : '');
  }).join(', ') || 'none yet — level up';
  wrapText(perkStr, x0 + 52 * S, ly, 80 * S, 8 * S);

  // мрежа с предмети (капацитетът расте при Мистика)
  const gx0 = x0 + GX * S, gy0 = y0 + 24 * S;
  const rows2 = invRows, cw2 = 26 * S, gp = 2 * S;
  for (let r = 0; r < rows2; r++) for (let c = 0; c < cols; c++) {
    if (r * cols + c >= G.meta.invSlots) break;
    const i = r * cols + c;
    const rx = gx0 + c * (cw2 + gp), ry = gy0 + r * (cw2 + gp);
    panel(rx, ry, cw2, cw2);
    const it = p.inv[i];
    if (it) {
      blit(ctx, Spr.icons[it.icon], rx + cw2 / 2 - 6 * S, ry + cw2 / 2 - 6 * S);
      strokeRect(rx, ry, cw2, cw2, Items.rarityCol(it), S);
      if (G.invSel === i) strokeRect(rx - S, ry - S, cw2 + 2 * S, cw2 + 2 * S, '#ffd23b', S); // избран за сравнение
      if (it.lvl) { // нивото на предмета — долу вдясно
        ctx.font = fontPx(4.5);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#a8b2c4';
        ctx.fillText(it.lvl, rx + cw2 - 2 * S, ry + cw2 - 2 * S);
        ctx.textAlign = 'left';
      }
      UI.invRects.push({ x: rx, y: ry, w: cw2, h: cw2, item: it, idx: i });
    }
  }

  // тултип и сравнение
  UI.hoverItem = null;
  const mx = G.mouse.x, my = G.mouse.y;
  if (G.equipSel && p.equip[G.equipSel]) {
    // избран ЕКИПИРАН предмет: инфо стои на екрана до второ докосване / бутона „свали"
    const r = UI.equipRects.find(rr => rr.slot === G.equipSel);
    if (r) drawTooltip(p.equip[G.equipSel], r.x + r.w + 4 * S, r.y + r.h / 2, true);
  } else if (G.isTouch && G.invSel !== null && G.invSel !== undefined && p.inv[G.invSel]) {
    // избран с докосване: сравнението стои на екрана до второ докосване
    const r = UI.invRects.find(rr => rr.idx === G.invSel);
    if (r) drawTooltip(p.inv[G.invSel], r.x - 4 * S, r.y + r.h / 2, false);
  } else {
    for (const r of [...UI.invRects, ...UI.equipRects]) {
      if (!r.item) continue;
      if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) { UI.hoverItem = r; break; }
    }
    if (UI.hoverItem) drawTooltip(UI.hoverItem.item, mx, my, UI.hoverItem.equip);
  }

  // тъч: явни бутони „екипирай / изхвърли" за избрания предмет (долу под мрежата)
  if (G.isTouch && G.invSel !== null && G.invSel !== undefined && p.inv[G.invSel]) {
    const selIt = p.inv[G.invSel];
    const bw = 53 * S, bh = 14 * S, by = y0 + ph - bh - 4 * S;
    const canEq = selIt.slot !== 'spell';
    const eqR = { x: gx0, y: by, w: bw, h: bh };
    panel(eqR.x, eqR.y, eqR.w, eqR.h);
    strokeRect(eqR.x, eqR.y, eqR.w, eqR.h, canEq ? '#7fd0a0' : '#454e63', S);
    ctx.font = fontBold(6.5); ctx.textAlign = 'center';
    ctx.fillStyle = canEq ? '#7fd0a0' : '#5a6478';
    ctx.fillText('EQUIP', eqR.x + bw / 2, by + 9.5 * S);
    UI.invEquipRect = canEq ? eqR : null;
    const drR = { x: gx0 + bw + 4 * S, y: by, w: bw, h: bh };
    panel(drR.x, drR.y, drR.w, drR.h);
    strokeRect(drR.x, drR.y, drR.w, drR.h, '#ff6b7a', S);
    ctx.fillStyle = '#ff6b7a';
    ctx.fillText('DROP', drR.x + bw / 2, by + 9.5 * S);
    UI.invDropRect = drR;
    ctx.textAlign = 'left';
  }

  // бутон „свали" за избрания ЕКИПИРАН предмет (долу вляво, под екипировката)
  if (G.equipSel && p.equip[G.equipSel]) {
    const bw = 62 * S, bh = 14 * S, by = y0 + ph - bh - 4 * S, bx = x0 + 10 * S;
    panel(bx, by, bw, bh);
    strokeRect(bx, by, bw, bh, '#ffb454', S);
    ctx.font = fontBold(6.5); ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb454';
    ctx.fillText('UNEQUIP', bx + bw / 2, by + 9.5 * S);
    ctx.textAlign = 'left';
    UI.invUnequipRect = { x: bx, y: by, w: bw, h: bh };
  }
}

function wrapText(str, x, y, maxW, lineH) {
  const words = str.split(' ');
  let line = '';
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lineH;
      line = w + ' ';
    } else line += w + ' ';
  }
  if (line) ctx.fillText(line, x, y);
}

// един панел с данни за предмет; връща размерите си
function tooltipPanel(it, x, y, header, extraLines) {
  const S = SCALE;
  const lines = Items.statLines(it);
  const extra = extraLines || [];
  const w = 96 * S;
  const h = (26 + (header ? 9 : 0) + lines.length * 9 + extra.length * 9) * S;
  panel(x, y, w, h);
  ctx.textAlign = 'left';
  let ly = y + 11 * S;
  if (header) {
    ctx.font = fontBold(6);
    ctx.fillStyle = header === 'NEW' ? '#7fd0a0' : '#a8b2c4';
    ctx.fillText(header, x + 6 * S, ly);
    ly += 9 * S;
  }
  ctx.font = fontBold(7);
  ctx.fillStyle = Items.rarityCol(it);
  ctx.fillText(it.name, x + 6 * S, ly);
  ly += 8 * S;
  ctx.font = fontPx(5.5);
  ctx.fillStyle = it.uid ? '#ff7a1f' : '#7d8899';
  ctx.fillText((it.lvl ? 'Level ' + it.lvl + ' · ' : '') + (it.uid ? 'UNIQUE' : RARITY[it.rarity].n) + ' · ' + (SLOT_NAMES[it.slot] || ''), x + 6 * S, ly);
  ly += 10 * S;
  ctx.font = fontPx(6);
  for (const L of lines) { ctx.fillStyle = L.c; ctx.fillText(L.s, x + 6 * S, ly); ly += 9 * S; }
  for (const L of extra) { ctx.fillStyle = L.c; ctx.fillText(L.s, x + 6 * S, ly); ly += 9 * S; }
  return { w, h };
}

function drawTooltip(it, mx, my, isEquipped) {
  const S = SCALE;
  const p = G.player;
  // срещу какво сравняваме: за пръстен — заетия слот, който би бил сменен
  let cur = null;
  if (!isEquipped) {
    if (it.slot === 'ring') cur = (p.equip.ring && p.equip.ring2) ? p.equip.ring : null;
    else cur = p.equip[it.slot];
    if (it.slot === 'ring' && !cur && (p.equip.ring || p.equip.ring2)) cur = p.equip.ring || p.equip.ring2;
  }
  const cmp = [];
  if (cur && it.slot === 'weapon') {
    const d = Math.round(it.dmg / it.cd - cur.dmg / cur.cd);
    if (d) cmp.push({ s: (d > 0 ? '+' : '') + d + ' damage/sec vs equipped', c: d > 0 ? '#7fd0a0' : '#ff6b7a' });
  }
  if (cur && it.slot === 'armor') {
    const d = it.armor - cur.armor;
    if (d) cmp.push({ s: (d > 0 ? '+' : '') + d + ' armor vs equipped', c: d > 0 ? '#7fd0a0' : '#ff6b7a' });
  }
  const w = 96 * S;
  const estH = (26 + 9 + 5 * 9) * S;
  let x = mx + 10 * S, y = my + 6 * S;
  if (x + w + (cur ? w + 4 * S : 0) > CW) x = mx - w - 10 * S - (cur ? w + 4 * S : 0);
  if (x < 2 * S) x = 2 * S;
  if (y + estH > CH) y = Math.max(2 * S, CH - estH - 4 * S);
  // сравнение: НОВО + НОСЕНО едно до друго
  const main = tooltipPanel(it, x, y, cur && !isEquipped ? 'NEW' : null, cmp);
  if (cur && !isEquipped) tooltipPanel(cur, x + main.w + 4 * S, y, 'EQUIPPED');
}

function equipItem(idx) {
  const p = G.player;
  const it = p.inv[idx];
  if (!it) return;
  // пръстените имат два слота: първо празния, иначе сменяме първия
  let slot = it.slot;
  if (it.slot === 'ring') slot = !p.equip.ring ? 'ring' : (!p.equip.ring2 ? 'ring2' : 'ring');
  // томовете се разчитат само при Майстора
  if (it.slot === 'spell') {
    toast('Take the tome to Master Zahari to decipher it.', '#c84fff');
    Sfx.play('deny');
    return;
  }
  if (it.slot === 'soulstone') { // работи от чантата — не се екипира
    toast('The Soul Stone works from your bag — no need to equip.', '#ff8aa0');
    Sfx.play('deny');
    return;
  }
  const old = p.equip[slot];
  p.equip[slot] = it;
  p.inv.splice(idx, 1);
  if (old) p.inv.push(old);
  calcStats(p);
  Sfx.play('pickup');
}
function inventoryClick(mx, my) {
  const p = G.player;
  if (UI.invCloseRect && mx >= UI.invCloseRect.x && mx < UI.invCloseRect.x + UI.invCloseRect.w && my >= UI.invCloseRect.y && my < UI.invCloseRect.y + UI.invCloseRect.h) {
    G.invSel = null; G.equipSel = null;
    G.state = 'play';
    document.body.classList.remove('menu');
    return;
  }
  // тъч бутони: изхвърли / екипирай избрания предмет
  if (G.invSel != null && p.inv[G.invSel]) {
    const dr = UI.invDropRect, er = UI.invEquipRect;
    if (dr && mx >= dr.x && mx < dr.x + dr.w && my >= dr.y && my < dr.y + dr.h) {
      const it = p.inv[G.invSel];
      p.inv.splice(G.invSel, 1);
      spawnDrop(p.x, p.y, { item: it, t: -2 }); // гратис, да не се вдигне веднага
      Sfx.play('open');
      G.invSel = null;
      return;
    }
    if (er && mx >= er.x && mx < er.x + er.w && my >= er.y && my < er.y + er.h) {
      equipItem(G.invSel);
      G.invSel = null;
      return;
    }
  }
  // бутон „свали" за избрания екипиран предмет
  if (UI.invUnequipRect && G.equipSel && p.equip[G.equipSel]) {
    const u = UI.invUnequipRect;
    if (mx >= u.x && mx < u.x + u.w && my >= u.y && my < u.y + u.h) { unequipItem(G.equipSel); return; }
  }
  // клик върху ЕКИПИРАН предмет: 1-во натискане -> инфо + бутон; 2-ро върху същия -> сваля
  for (const r of UI.equipRects) {
    if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) {
      if (G.equipSel === r.slot) unequipItem(r.slot);
      else { G.equipSel = r.slot; G.invSel = null; }
      return;
    }
  }
  for (const r of UI.invRects) {
    if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) {
      G.equipSel = null;
      if (r.openBook) { openSpellbook(); return; }
      if (r.openTree) { openSkillTree(); return; }
      if (G.isTouch && !padRecent()) {
        // само на тъч (без контролер): първо докосване — сравнение; второ върху същия — екипиране
        if (G.invSel === r.idx) { equipItem(r.idx); G.invSel = null; }
        else G.invSel = r.idx;
      } else {
        equipItem(r.idx); // мишка/контролер — директно екипиране
      }
      return;
    }
  }
  G.invSel = null;
  G.equipSel = null;
}
function unequipItem(slot) {
  const p = G.player;
  const it = p.equip[slot];
  if (!it) { G.equipSel = null; return; }
  if (p.inv.length >= G.meta.invSlots) { toast('Inventory is full!', '#ff6b7a'); Sfx.play('deny'); return; }
  p.inv.push(it);
  p.equip[slot] = null;
  calcStats(p);
  Sfx.play('pickup');
  G.equipSel = null;
}
function inventoryDrop(mx, my) {
  const p = G.player;
  // десен клик върху екипиран предмет -> сваля го в инвентара
  for (const r of UI.equipRects) {
    if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) { unequipItem(r.slot); return; }
  }
  for (const r of UI.invRects) {
    if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) {
      p.inv.splice(r.idx, 1);
      spawnDrop(p.x, p.y, { item: r.item, t: -2 }); // гратис да не се вдигне веднага
      Sfx.play('open');
      return;
    }
  }
}

// ---------- магазин ----------
function drawShop() {
  const S = SCALE, p = G.player;
  const def = VENDOR_DEFS[G.shopVendor];
  const isMystic = G.shopVendor === 'jewel';
  const stock = G.shops[G.shopVendor] || [];
  UI.shopRects = [];
  UI.shopInvRects = [];
  UI.enchPotRects = [];
  const invRows = Math.ceil(G.meta.invSlots / 4);
  const pw = 268 * S;
  // Мистикът има раздел за омагьосване -> малко по-висок панел
  const ph = isMystic ? Math.min(CH - 16, 228 * S) : Math.max(182, 48 + invRows * 26) * S;
  const x0 = (CW - pw) / 2, y0 = (CH - ph) / 2;
  panel(x0, y0, pw, ph);

  const lvl = (G.meta.vendorLvl && G.meta.vendorLvl[G.shopVendor]) || 1;
  ctx.textAlign = 'left';
  ctx.font = fontBold(9);
  ctx.fillStyle = '#ffd23b';
  ctx.fillText(def.name + (isMystic ? '' : '  ·  ' + STALL_NAMES[lvl - 1]), x0 + 10 * S, y0 + 14 * S);
  ctx.font = fontPx(6);
  ctx.fillStyle = '#7d8899';
  ctx.fillText('"' + def.flavor + '"   |   E / ESC — close', x0 + 10 * S, y0 + 23 * S);
  // злато и печати
  blit(ctx, Spr.icons.gold, x0 + pw - 58 * S, y0 + 6 * S);
  ctx.font = fontBold(8);
  ctx.fillStyle = '#ffd23b';
  ctx.fillText(String(p.gold), x0 + pw - 44 * S, y0 + 15 * S);
  if (isMystic || G.meta.seals > 0) {
    blit(ctx, Spr.icons.seal, x0 + pw - 58 * S, y0 + 18 * S);
    ctx.fillStyle = '#c84fff';
    ctx.fillText(String(G.meta.seals), x0 + pw - 44 * S, y0 + 27 * S);
  }
  if (isMystic || (G.meta.shards || 0) > 0) {
    blit(ctx, Spr.icons.shard, x0 + pw - 58 * S, y0 + 30 * S);
    ctx.fillStyle = '#57e6c8';
    ctx.fillText(String(G.meta.shards || 0), x0 + pw - 44 * S, y0 + 39 * S);
  }
  // ✕ за затваряне (важно за тъч — там няма E/ESC)
  const cxr = { x: x0 + pw - 22 * S, y: y0 + 4 * S, w: 16 * S, h: 16 * S };
  panel(cxr.x, cxr.y, cxr.w, cxr.h);
  ctx.font = fontBold(9);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b7a';
  ctx.fillText('✕', cxr.x + cxr.w / 2, cxr.y + 11.5 * S);
  ctx.textAlign = 'left';
  UI.shopCloseRect = cxr;

  const rowW = 128 * S, rowH = 18 * S;
  let ry = y0 + 40 * S;
  let hoverStockItem = null;

  if (isMystic) {
    // --- Мистикът: отключвания срещу Печати на Бездната ---
    ctx.font = fontBold(6.5);
    ctx.fillStyle = '#c84fff';
    ctx.fillText('THE POWER OF SEALS (click — take)', x0 + 10 * S, y0 + 35 * S);
    const offers = mysticOffers();
    for (const of2 of offers) {
      const hov = G.mouse.x >= x0 + 8 * S && G.mouse.x < x0 + 8 * S + rowW && G.mouse.y >= ry && G.mouse.y < ry + rowH;
      rcx(x0 + 8 * S, ry, rowW, rowH, hov ? 'rgba(80,50,110,0.5)' : 'rgba(30,20,50,0.6)');
      if (hov) strokeRect(x0 + 8 * S, ry, rowW, rowH, '#6a4f9e', 1);
      blit(ctx, Spr.icons.seal, x0 + 11 * S, ry + 3 * S);
      ctx.font = fontPx(6.5);
      ctx.fillStyle = '#e8e4d0';
      ctx.fillText(of2.t, x0 + 26 * S, ry + 8 * S);
      ctx.fillStyle = '#7d8899';
      ctx.font = fontPx(5.5);
      ctx.fillText(of2.d, x0 + 26 * S, ry + 15 * S);
      ctx.textAlign = 'right';
      ctx.font = fontBold(6.5);
      ctx.fillStyle = of2.cost === 0 ? '#7fd0a0' : (G.meta.seals >= of2.cost ? '#c84fff' : '#ff6b7a');
      ctx.fillText(of2.cost === 0 ? 'free' : of2.cost + ' seal' + (of2.cost > 1 ? 's' : ''), x0 + 8 * S + rowW - 4 * S, ry + 11 * S);
      ctx.textAlign = 'left';
      UI.shopRects.push({ x: x0 + 8 * S, y: ry, w: rowW, h: rowH, entry: { unlock: of2 } });
      ry += rowH + 2 * S;
    }
    if (!offers.length) {
      ctx.fillStyle = '#7d8899';
      ctx.font = fontPx(6.5);
      ctx.fillText('Everything structural is unlocked.', x0 + 10 * S, ry + 8 * S);
      ry += rowH;
    }
    // --- омагьосване на ОТВАРИ (осколки): -12% презареждане / +12% сила на ниво ---
    UI.enchPotRects = [];
    ry += 4 * S;
    ctx.font = fontBold(6.5); ctx.fillStyle = '#57e6c8';
    ctx.fillText('POTIONS (click — upgrade, shards)', x0 + 10 * S, ry); ry += 6 * S;
    const ownedP = POTION_KEYS.filter(k => p.potionsOwned && p.potionsOwned[k]);
    for (const key of ownedP) {
      if (ry + rowH > y0 + ph - 8 * S) break; // не излизаме извън панела
      const pd = POTIONS[key], up = (p.potionUp && p.potionUp[key]) || 0, maxed = up >= 3, cost = potionEnchantCost(up);
      const hov = G.mouse.x >= x0 + 8 * S && G.mouse.x < x0 + 8 * S + rowW && G.mouse.y >= ry && G.mouse.y < ry + rowH;
      rcx(x0 + 8 * S, ry, rowW, rowH, (hov && !maxed) ? 'rgba(40,90,80,0.5)' : 'rgba(20,35,32,0.6)');
      if (hov && !maxed) strokeRect(x0 + 8 * S, ry, rowW, rowH, '#57e6c8', 1);
      drawPotionGlyph(x0 + 15 * S, ry + 9 * S, pd.col);
      ctx.textAlign = 'left'; ctx.font = fontPx(6.5); ctx.fillStyle = pd.col;
      ctx.fillText(pd.n + ' ' + '★'.repeat(up) + '☆'.repeat(3 - up), x0 + 26 * S, ry + 8 * S);
      ctx.font = fontPx(5.5); ctx.fillStyle = '#7d8899';
      ctx.fillText(maxed ? 'fully upgraded' : '−12% cd · +12% power', x0 + 26 * S, ry + 15 * S);
      if (!maxed) {
        ctx.textAlign = 'right'; ctx.font = fontBold(6.5);
        ctx.fillStyle = (G.meta.shards || 0) >= cost ? '#57e6c8' : '#ff6b7a';
        ctx.fillText(cost + ' shd', x0 + 8 * S + rowW - 4 * S, ry + 11 * S);
        ctx.textAlign = 'left';
        UI.enchPotRects.push({ x: x0 + 8 * S, y: ry, w: rowW, h: rowH, key });
      }
      ry += rowH + 2 * S;
    }
  } else {
  // --- стока (ляво) ---
  ctx.font = fontBold(6.5);
  ctx.fillStyle = '#a8b2c4';
  ctx.fillText('WARES (click — buy)', x0 + 10 * S, y0 + 35 * S);
  for (const entry of stock) {
    const hov = G.mouse.x >= x0 + 8 * S && G.mouse.x < x0 + 8 * S + rowW && G.mouse.y >= ry && G.mouse.y < ry + rowH;
    rcx(x0 + 8 * S, ry, rowW, rowH, hov ? 'rgba(60,70,95,0.5)' : 'rgba(20,25,38,0.7)');
    if (hov) strokeRect(x0 + 8 * S, ry, rowW, rowH, '#5a677f', 1);
    ctx.font = fontPx(6.5);
    if (entry.potion) {
      const pd = POTIONS[entry.potion];
      drawPotionGlyph(x0 + 15 * S, ry + 9 * S, pd.col);
      ctx.fillStyle = pd.col;
      ctx.fillText(pd.n + ' (unlock)', x0 + 26 * S, ry + 8 * S);
      ctx.fillStyle = '#7d8899';
      ctx.font = fontPx(5.5);
      ctx.fillText(pd.d, x0 + 26 * S, ry + 15 * S);
    } else {
      blit(ctx, Spr.icons[entry.item.icon], x0 + 11 * S, ry + 3 * S);
      ctx.fillStyle = Items.rarityCol(entry.item);
      ctx.fillText(entry.item.name, x0 + 26 * S, ry + 8 * S);
      ctx.fillStyle = '#7d8899';
      ctx.font = fontPx(5.5);
      const st = entry.item.dmg ? entry.item.dmg + ' damage' : entry.item.armor ? entry.item.armor + ' armor' : RARITY[entry.item.rarity].n;
      ctx.fillText(st + (entry.item.affixes.length ? ' · +' + entry.item.affixes.length + ' properties' : ''), x0 + 26 * S, ry + 15 * S);
    }
    ctx.textAlign = 'right';
    ctx.font = fontBold(6.5);
    ctx.fillStyle = p.gold >= entry.price ? '#ffd23b' : '#ff6b7a';
    ctx.fillText(entry.price + ' g', x0 + 8 * S + rowW - 4 * S, ry + 11 * S);
    ctx.textAlign = 'left';
    UI.shopRects.push({ x: x0 + 8 * S, y: ry, w: rowW, h: rowH, entry });
    if (hov && entry.item) hoverStockItem = entry.item;
    ry += rowH + 2 * S;
  }
  if (!stock.length) {
    ctx.fillStyle = '#5a677f';
    ctx.font = fontPx(6.5);
    ctx.fillText('Sold out. Come back after your next death.', x0 + 10 * S, ry + 8 * S);
    ry += 12 * S;
  }
  // ред за надграждане на сергията
  if (lvl < 5) {
    const cost = VENDOR_UP_COST[lvl];
    const hovU = G.mouse.x >= x0 + 8 * S && G.mouse.x < x0 + 8 * S + rowW && G.mouse.y >= ry && G.mouse.y < ry + rowH;
    rcx(x0 + 8 * S, ry, rowW, rowH, hovU ? 'rgba(60,90,60,0.5)' : 'rgba(25,40,28,0.7)');
    if (hovU) strokeRect(x0 + 8 * S, ry, rowW, rowH, '#7fd0a0', 1);
    ctx.font = fontBold(6.5);
    ctx.fillStyle = '#7fd0a0';
    ctx.fillText('⌂ Upgrade: ' + STALL_NAMES[lvl - 1] + ' → ' + STALL_NAMES[lvl], x0 + 12 * S, ry + 8 * S);
    ctx.font = fontPx(5.5);
    ctx.fillStyle = '#7d8899';
    ctx.fillText('more and stronger wares', x0 + 12 * S, ry + 15 * S);
    ctx.textAlign = 'right';
    ctx.font = fontBold(6.5);
    ctx.fillStyle = p.gold >= cost ? '#ffd23b' : '#ff6b7a';
    ctx.fillText(cost + ' g', x0 + 8 * S + rowW - 4 * S, ry + 11 * S);
    ctx.textAlign = 'left';
    UI.shopRects.push({ x: x0 + 8 * S, y: ry, w: rowW, h: rowH, entry: { upgrade: G.shopVendor } });
  }
  } // end търговска част

  // === десен панел: избор на предмет + действия (продан/ниво при продавачите, афикси/омагьосване при Захари) ===
  UI.enchAffixRects = [];
  UI.shopActRects = [];
  let hoverSell = null;
  const gx0 = x0 + 146 * S, gy0 = y0 + 40 * S;
  const cols = 4, cw2 = 24 * S, gp = 2 * S, rw = 114 * S;
  const gridItems = [];
  if (isMystic) {
    for (const slot of ['weapon', 'armor', 'ring', 'ring2', 'amulet']) { const it = p.equip[slot]; if (it && it.affixes && it.affixes.length) gridItems.push(it); }
    for (const it of p.inv) if (it.slot !== 'spell' && it.affixes && it.affixes.length) gridItems.push(it);
  } else {
    for (const it of p.inv) gridItems.push(it);
    for (const slot of ['weapon', 'armor', 'ring', 'ring2', 'amulet']) { const it = p.equip[slot]; if (it && vendorUpgradesSlot(G.shopVendor, it.slot)) gridItems.push(it); }
  }
  if (G.selItem && gridItems.indexOf(G.selItem) === -1) G.selItem = null;
  ctx.font = fontBold(6.5);
  ctx.fillStyle = isMystic ? '#57e6c8' : '#a8b2c4';
  ctx.fillText(isMystic ? 'ENCHANTING (shards)' : 'YOUR ITEMS (choose)', gx0, y0 + 35 * S);
  let gi = 0;
  for (const it of gridItems) {
    const rx = gx0 + (gi % cols) * (cw2 + gp), ryy = gy0 + ((gi / cols) | 0) * (cw2 + gp);
    panel(rx, ryy, cw2, cw2);
    blit(ctx, Spr.icons[it.icon], rx + cw2 / 2 - 6 * S, ryy + cw2 / 2 - 6 * S);
    strokeRect(rx, ryy, cw2, cw2, Items.rarityCol(it), S);
    if (G.selItem === it) strokeRect(rx - S, ryy - S, cw2 + 2 * S, cw2 + 2 * S, isMystic ? '#57e6c8' : '#ffd23b', S);
    UI.shopInvRects.push({ x: rx, y: ryy, w: cw2, h: cw2, item: it });
    if (G.mouse.x >= rx && G.mouse.x < rx + cw2 && G.mouse.y >= ryy && G.mouse.y < ryy + cw2) hoverSell = it;
    gi++;
  }
  let ay = gy0 + (Math.ceil(gridItems.length / cols) || 1) * (cw2 + gp) + 6 * S;
  if (!gridItems.length) { ctx.font = fontPx(5.5); ctx.fillStyle = '#5a677f'; wrapText(isMystic ? 'No items with affixes.' : 'Inventory is empty.', gx0, gy0 + 8 * S, rw, 8 * S); }
  else if (!G.selItem) { ctx.font = fontPx(5.5); ctx.fillStyle = '#7d8899'; wrapText(isMystic ? 'Choose an item to upgrade an affix or enchant it.' : 'Choose an item to sell or level up.', gx0, ay + 4 * S, rw, 8 * S); }
  else {
    const sit = G.selItem;
    ctx.textAlign = 'left'; ctx.font = fontPx(6); ctx.fillStyle = Items.rarityCol(sit);
    ctx.fillText((sit.name || '').slice(0, 24), gx0, ay); ay += 10 * S;
    if (isMystic) {
      sit.affixes.forEach((a, ai) => {
        const d = AFFIXES[a.k]; if (!d) return;
        const maxed = (a.up || 0) >= 3, cost = enchantCost(a), rh = 14 * S;
        const hov = G.mouse.x >= gx0 && G.mouse.x < gx0 + rw && G.mouse.y >= ay && G.mouse.y < ay + rh;
        rcx(gx0, ay, rw, rh, (hov && !maxed) ? 'rgba(40,90,80,0.5)' : 'rgba(20,35,32,0.6)');
        if (hov && !maxed) strokeRect(gx0, ay, rw, rh, '#57e6c8', 1);
        ctx.textAlign = 'left'; ctx.font = fontPx(5.5); ctx.fillStyle = '#e8e4d0';
        const stars = '★'.repeat(a.up || 0) + '☆'.repeat(3 - (a.up || 0));
        ctx.fillText('+' + a.v + ' ' + d.n + ' ' + stars, gx0 + 3 * S, ay + 6 * S);
        ctx.font = fontPx(5); ctx.fillStyle = maxed ? '#7fd0a0' : ((G.meta.shards || 0) >= cost ? '#57e6c8' : '#ff6b7a');
        ctx.fillText(maxed ? 'fully upgraded' : '→ ' + Math.max(a.v + 1, Math.round(a.v * 1.15)) + '   (' + cost + ' shd)', gx0 + 3 * S, ay + 12 * S);
        if (!maxed) UI.enchAffixRects.push({ x: gx0, y: ay, w: rw, h: rh, ai });
        ay += rh + 2 * S;
      });
      // бутон „Омагьосай" (преправяне на всички афикси)
      ay += 2 * S;
      const canScr = (G.meta.shards || 0) >= 10, bh = 17 * S;
      rcx(gx0, ay, rw, bh, 'rgba(50,30,70,0.6)');
      strokeRect(gx0, ay, rw, bh, canScr ? '#b34fff' : '#5a677f', 1);
      ctx.font = fontBold(6); ctx.fillStyle = canScr ? '#c084ff' : '#7d8899';
      ctx.fillText('Enchant — reroll the affixes', gx0 + 3 * S, ay + 7 * S);
      ctx.font = fontPx(5); ctx.fillStyle = '#a8b2c4';
      ctx.fillText('10 shards · resets upgrades', gx0 + 3 * S, ay + 14 * S);
      UI.shopActRects.push({ x: gx0, y: ay, w: rw, h: bh, act: 'scramble' });
    } else {
      const inInv = p.inv.indexOf(sit) !== -1;
      if (inInv) {
        const bh = 15 * S;
        rcx(gx0, ay, rw, bh, 'rgba(60,40,20,0.6)'); strokeRect(gx0, ay, rw, bh, '#e8c04a', 1);
        ctx.font = fontBold(6); ctx.fillStyle = '#ffd23b';
        ctx.fillText('Sell for ' + shopSellPrice(sit) + ' g', gx0 + 3 * S, ay + 9 * S);
        UI.shopActRects.push({ x: gx0, y: ay, w: rw, h: bh, act: 'sell' });
        ay += bh + 3 * S;
      }
      if (vendorUpgradesSlot(G.shopVendor, sit.slot)) {
        const cap = itemLevelCap(G.shopVendor);
        if ((sit.lvl || 1) < cap) {
          const cost = itemUpgradeCost(sit), nv = itemUpgradePreview(sit), can = p.gold >= cost, bh2 = 20 * S;
          rcx(gx0, ay, rw, bh2, 'rgba(30,50,60,0.6)'); strokeRect(gx0, ay, rw, bh2, can ? '#8ab0ff' : '#5a677f', 1);
          ctx.font = fontBold(6); ctx.fillStyle = can ? '#8ab0ff' : '#7d8899';
          ctx.fillText('Level up ' + (sit.lvl || 1) + ' → ' + ((sit.lvl || 1) + 1), gx0 + 3 * S, ay + 7 * S);
          ctx.font = fontPx(5); ctx.fillStyle = '#a8b2c4';
          const num = nv.dmg != null ? (sit.dmg + '→' + nv.dmg + ' damage')
            : nv.armor != null ? (sit.armor + '→' + nv.armor + ' armor')
            : nv.aff ? (nv.aff.from + '→' + nv.aff.to + ' ' + (AFFIXES[nv.aff.k] ? AFFIXES[nv.aff.k].n : ''))
            : 'stronger';
          ctx.fillText(num + ' · ' + cost + ' g', gx0 + 3 * S, ay + 14 * S);
          UI.shopActRects.push({ x: gx0, y: ay, w: rw, h: bh2, act: 'levelup' });
        } else { ctx.font = fontPx(5); ctx.fillStyle = '#5a677f'; ctx.fillText('Level ' + cap + ' — upgrade the stall.', gx0 + 3 * S, ay + 6 * S); }
      }
    }
  }

  // тултипи
  if (hoverStockItem) drawTooltip(hoverStockItem, G.mouse.x, G.mouse.y, false);
  else if (hoverSell && !isMystic && p.inv.indexOf(hoverSell) !== -1) {
    drawTooltip(hoverSell, G.mouse.x, G.mouse.y, false);
  }

  // потвърждение за необратимо действие (омагьосване)
  if (G.shopConfirm) {
    UI.shopConfirmRects = [];
    rcx(x0, y0, pw, ph, 'rgba(4,6,11,0.82)');
    const mw = 180 * S, mh = 84 * S, mx0 = x0 + (pw - mw) / 2, my0 = y0 + (ph - mh) / 2;
    panel(mx0, my0, mw, mh);
    ctx.textAlign = 'center'; ctx.font = fontBold(7.5); ctx.fillStyle = '#e8e4d0';
    ctx.fillText('Enchanting (irreversible)', mx0 + mw / 2, my0 + 14 * S);
    ctx.font = fontPx(6); ctx.fillStyle = '#a8b2c4';
    wrapTextCentered('All affixes will be rerolled and upgrades reset. Are you sure?', mx0 + mw / 2, my0 + 26 * S, mw - 16 * S, 9 * S);
    const bw = 66 * S, bh = 16 * S, by = my0 + mh - 22 * S;
    const yb = { x: mx0 + mw / 2 - bw - 5 * S, y: by, w: bw, h: bh };
    const nb = { x: mx0 + mw / 2 + 5 * S, y: by, w: bw, h: bh };
    panel(yb.x, yb.y, yb.w, yb.h); ctx.font = fontBold(7); ctx.fillStyle = '#c084ff'; ctx.fillText('Enchant', yb.x + yb.w / 2, yb.y + 11 * S);
    panel(nb.x, nb.y, nb.w, nb.h); ctx.fillStyle = '#a8b2c4'; ctx.fillText('Cancel', nb.x + nb.w / 2, nb.y + 11 * S);
    ctx.textAlign = 'left';
    UI.shopConfirmRects = [{ x: yb.x, y: yb.y, w: yb.w, h: yb.h, act: 'yes' }, { x: nb.x, y: nb.y, w: nb.w, h: nb.h, act: 'no' }];
  }
}
function shopClick(mx, my) {
  const hit = r => r && mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h;
  // модалът за потвърждение е с приоритет
  if (G.shopConfirm) {
    for (const r of UI.shopConfirmRects || []) if (hit(r)) {
      if (r.act === 'yes') enchantScramble(G.shopConfirm.item);
      G.shopConfirm = null; return;
    }
    return;
  }
  if (hit(UI.shopCloseRect)) { closeShop(); return; }
  for (const r of UI.shopRects) if (hit(r)) { shopBuy(r.entry); return; }
  for (const r of UI.enchPotRects || []) if (hit(r)) { enchantPotion(r.key); return; } // вдигане на отвара (Захари)
  // действия върху избрания предмет
  for (const r of UI.shopActRects || []) if (hit(r)) {
    const sit = G.selItem;
    if (r.act === 'sell') { const idx = G.player.inv.indexOf(sit); if (idx !== -1) { shopSell(idx); G.selItem = null; } }
    else if (r.act === 'levelup') upgradeItemLevel(sit, G.shopVendor);
    else if (r.act === 'scramble') { if (sit) G.shopConfirm = { item: sit }; }
    return;
  }
  // афикс редове (Захари)
  for (const r of UI.enchAffixRects || []) if (hit(r)) { enchantAffix(G.selItem, r.ai); return; }
  // избор на предмет от грида
  for (const r of UI.shopInvRects) if (hit(r)) { G.selItem = r.item; Sfx.play('pickup'); return; }
}

// ---------- КНИГА С МАГИИ: колекцията е завинаги, избираш 3 активни ----------
function drawSpellbook() {
  const S = SCALE, p = G.player;
  UI.btnRects = [];
  rcx(0, 0, CW, CH, 'rgba(4,6,11,0.75)');
  const pw = 262 * S, ph = 230 * S;
  const x0 = (CW - pw) / 2, y0 = (CH - ph) / 2;
  panel(x0, y0, pw, ph);
  ctx.textAlign = 'left';
  ctx.font = fontBold(9);
  ctx.fillStyle = '#8ab0ff';
  ctx.fillText('SPELLBOOK', x0 + 10 * S, y0 + 14 * S);
  ctx.font = fontPx(6);
  ctx.fillStyle = '#7d8899';
  ctx.fillText('tap spell: view · tap again: equip  |  ESC — close', x0 + 78 * S, y0 + 14 * S);
  // ✕
  const cxr = { x: x0 + pw - 20 * S, y: y0 + 4 * S, w: 16 * S, h: 16 * S };
  panel(cxr.x, cxr.y, cxr.w, cxr.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b7a';
  ctx.font = fontBold(9);
  ctx.fillText('✕', cxr.x + cxr.w / 2, cxr.y + 11.5 * S);
  UI.btnRects.push({ x: cxr.x, y: cxr.y, w: cxr.w, h: cxr.h, act: () => closeSpellbook() });

  // трите активни слота
  const asw = 24 * S;
  for (let i = 0; i < 3; i++) {
    const ax = x0 + 10 * S + i * (asw + 6 * S), ay = y0 + 22 * S;
    const unlocked = i === 0 || (i === 1 ? G.meta.magic3 : G.meta.magic4);
    panel(ax, ay, asw, asw);
    if (G.sbSel === i) strokeRect(ax - S, ay - S, asw + 2 * S, asw + 2 * S, '#ffd23b', S);
    if (!unlocked) {
      rcx(ax + 2 * S, ay + 2 * S, asw - 4 * S, asw - 4 * S, 'rgba(8,10,16,0.55)');
      rcx(ax + asw / 2 - 2 * S, ay + asw / 2 - S, 4 * S, 4 * S, '#454e63');
    } else {
      const id = p.activeSpells[i];
      if (id) {
        const sp = SPELLS[id];
        ctx.fillStyle = sp.col;
        ctx.beginPath();
        ctx.moveTo(ax + asw / 2, ay + 5 * S); ctx.lineTo(ax + asw - 5 * S, ay + asw / 2);
        ctx.lineTo(ax + asw / 2, ay + asw - 5 * S); ctx.lineTo(ax + 5 * S, ay + asw / 2);
        ctx.closePath(); ctx.fill();
      }
      UI.btnRects.push({ x: ax, y: ay, w: asw, h: asw, act: ((idx) => () => { G.sbSel = idx; })(i) });
    }
    ctx.font = fontPx(5.5);
    ctx.fillStyle = '#7d8899';
    ctx.textAlign = 'center';
    ctx.fillText(['RMB', '3', '4'][i], ax + asw / 2, ay + asw + 6 * S);
    ctx.textAlign = 'left';
  }

  // всички магии: 4 колони х 2 реда, с описание
  const ids = Object.keys(SPELLS);
  const cw2 = 60 * S, chh = 56 * S, gp = 3 * S;
  const gx0 = x0 + 10 * S, gy0 = y0 + 58 * S;
  ids.forEach((id, k) => {
    const col = k % 4, row = (k / 4) | 0;
    const rx = gx0 + col * (cw2 + gp), ry = gy0 + row * (chh + gp);
    const known = !!p.spellsKnown[id];
    const sp = SPELLS[id];
    panel(rx, ry, cw2, chh);
    const hov = G.mouse.x >= rx && G.mouse.x < rx + cw2 && G.mouse.y >= ry && G.mouse.y < ry + chh;
    if (hov && known) strokeRect(rx, ry, cw2, chh, '#ffd23b', S);
    const active = p.activeSpells.indexOf(id);
    if (active !== -1) strokeRect(rx, ry, cw2, chh, SPELLS[id].col, S);
    // руна
    ctx.globalAlpha = known ? 1 : 0.3;
    ctx.fillStyle = known ? sp.col : '#454e63';
    const rcx0 = rx + cw2 / 2, rcy0 = ry + 12 * S;
    ctx.beginPath();
    ctx.moveTo(rcx0, rcy0 - 6 * S); ctx.lineTo(rcx0 + 5 * S, rcy0); ctx.lineTo(rcx0, rcy0 + 6 * S); ctx.lineTo(rcx0 - 5 * S, rcy0);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = fontBold(6);
    ctx.fillStyle = known ? '#e8e4d0' : '#5a677f';
    ctx.fillText(sp.n, rcx0, ry + 25 * S);
    ctx.font = fontPx(5);
    ctx.fillStyle = known ? '#a8b2c4' : '#454e63';
    wrapTextCentered(sp.d, rcx0, ry + 33 * S, cw2 - 8 * S, 6.5 * S);
    ctx.fillStyle = known ? '#7fb0ff' : '#454e63';
    ctx.fillText(known ? (sp.cost + ' mana · ' + sp.cd + 's') : 'give a tome to Zahari', rcx0, ry + chh - 5 * S);
    if (known) { // ниво на магията горе-вдясно (2=зелено, 3=лилаво)
      const lv = spellLv(p, id);
      ctx.textAlign = 'right';
      ctx.font = fontPx(4.5);
      ctx.fillStyle = lv >= 3 ? '#c9a0ff' : lv >= 2 ? '#7fd0a0' : '#5a677f';
      ctx.fillText(lv + '/3', rx + cw2 - 3 * S, ry + 7 * S);
    }
    ctx.textAlign = 'left';
    if (known) UI.btnRects.push({ x: rx, y: ry, w: cw2, h: chh, act: ((sid) => () => { if (G.sbSpell === sid) assignSpell(sid); else G.sbSpell = sid; })(id) }); // 1-во докосване: покажи ъпгрейда; 2-ро: екипирай
  });

  // ---- ДЕТАЙЛ + НАДГРАЖДАНЕ на избраната магия (с осколки) ----
  let sel = G.sbSpell;
  if (!sel || !p.spellsKnown[sel]) sel = p.activeSpells.find(s => s && p.spellsKnown[s]) || Object.keys(p.spellsKnown)[0];
  G.sbSpell = sel;
  const dy = y0 + 178 * S, dh = 46 * S;
  panel(x0 + 8 * S, dy, pw - 16 * S, dh);
  if (sel) {
    const lv = spellLv(p, sel), sp = SPELLS[sel];
    ctx.textAlign = 'left';
    ctx.font = fontBold(7); ctx.fillStyle = sp.col;
    ctx.fillText(sp.n + '   ' + lv + '/3', x0 + 12 * S, dy + 11 * S);
    ctx.font = fontPx(5); ctx.fillStyle = '#7fd0a0';
    const taken = [];
    for (let t = 0; t < lv - 1; t++) taken.push('✓ ' + SPELL_UP[sel][t].n);
    ctx.fillText(taken.join('    ') || 'base spell', x0 + 12 * S, dy + 19 * S);
    if (lv >= 3) {
      ctx.font = fontBold(6.5); ctx.fillStyle = '#7fd0a0';
      ctx.fillText('Fully upgraded (3/3)', x0 + 12 * S, dy + 32 * S);
    } else {
      const up = SPELL_UP[sel][lv - 1], cost = SPELL_UP_COST[lv - 1], have = G.meta.shards || 0, afford = have >= cost;
      ctx.font = fontBold(6); ctx.fillStyle = '#e8e4d0';
      ctx.fillText('Next — ' + up.n, x0 + 12 * S, dy + 29 * S);
      ctx.font = fontPx(5); ctx.fillStyle = '#a8b2c4';
      wrapText(up.d, x0 + 12 * S, dy + 37 * S, pw - 92 * S, 6 * S);
      const bw = 62 * S, bh = 18 * S, bxu = x0 + pw - bw - 14 * S, byu = dy + dh / 2 - bh / 2;
      panel(bxu, byu, bw, bh);
      strokeRect(bxu, byu, bw, bh, afford ? '#c9a0ff' : '#454e63', S);
      ctx.textAlign = 'center';
      ctx.font = fontBold(6); ctx.fillStyle = afford ? '#c9a0ff' : '#5a677f';
      ctx.fillText('Upgrade · ' + cost, bxu + bw / 2, byu + 8 * S);
      ctx.font = fontPx(5); ctx.fillStyle = afford ? '#57e6c8' : '#ff6b7a';
      ctx.fillText(afford ? ('you have ' + have) : ('need ' + (cost - have) + ' more'), bxu + bw / 2, byu + 14.5 * S);
      ctx.textAlign = 'left';
      UI.btnRects.push({ x: bxu, y: byu, w: bw, h: bh, act: ((s, c, af) => () => { if (af) G.sbConfirm = { spell: s, cost: c }; else { toast('You need ' + c + ' Abyss Shards.', '#ff6b7a'); Sfx.play('deny'); } })(sel, cost, afford) });
    }
  }

  // ---- потвърждение при покупка (700 осколки не бива с едно случайно натискане) ----
  if (G.sbConfirm) {
    rcx(0, 0, CW, CH, 'rgba(4,6,11,0.6)');
    const mw = 158 * S, mh = 66 * S, mx0 = (CW - mw) / 2, my0 = (CH - mh) / 2;
    panel(mx0, my0, mw, mh);
    const cf = G.sbConfirm;
    ctx.textAlign = 'center';
    ctx.font = fontBold(7); ctx.fillStyle = '#e8e4d0';
    ctx.fillText('Upgrade for ' + cf.cost + ' shards?', CW / 2, my0 + 16 * S);
    ctx.font = fontPx(5.5); ctx.fillStyle = '#a8b2c4';
    ctx.fillText('Permanent — survives death.', CW / 2, my0 + 27 * S);
    const bw2 = 58 * S, bh2 = 16 * S, gap = 8 * S, by2 = my0 + mh - bh2 - 8 * S;
    const yesX = CW / 2 - bw2 - gap / 2, noX = CW / 2 + gap / 2;
    panel(yesX, by2, bw2, bh2); strokeRect(yesX, by2, bw2, bh2, '#c9a0ff', S);
    ctx.font = fontBold(6.5); ctx.fillStyle = '#c9a0ff';
    ctx.fillText('Upgrade', yesX + bw2 / 2, by2 + 10.5 * S);
    panel(noX, by2, bw2, bh2); strokeRect(noX, by2, bw2, bh2, '#7d8899', S);
    ctx.fillStyle = '#a8b2c4';
    ctx.fillText('Cancel', noX + bw2 / 2, by2 + 10.5 * S);
    ctx.textAlign = 'left';
    UI.btnRects = [ // докато модалът стои, само двата бутона са активни
      { x: yesX, y: by2, w: bw2, h: bh2, act: () => buySpellLevel(cf.spell) },
      { x: noX, y: by2, w: bw2, h: bh2, act: () => { G.sbConfirm = null; } },
    ];
  }
}
function buySpellLevel(spell) {
  const p = G.player;
  const cur = spellLv(p, spell);
  G.sbConfirm = null;
  if (cur >= 3) return;
  const cost = SPELL_UP_COST[cur - 1];
  if ((G.meta.shards || 0) < cost) { toast('You need ' + cost + ' Abyss Shards.', '#ff6b7a'); Sfx.play('deny'); return; }
  G.meta.shards -= cost;
  p.spellLvl = p.spellLvl || {};
  p.spellLvl[spell] = cur + 1;
  const up = SPELL_UP[spell][cur - 1];
  toast(SPELLS[spell].n + ' → ' + up.n + '!', '#c9a0ff');
  Sfx.play('level');
  saveProfile();
}
function wrapTextCentered(str, cx0, y, maxW, lineH) {
  const words = str.split(' ');
  let line = '', ly = y;
  for (const w of words) {
    if (ctx.measureText(line + ' ' + w).width > maxW && line) {
      ctx.fillText(line, cx0, ly);
      ly += lineH;
      line = w;
    } else line = line ? line + ' ' + w : w;
  }
  if (line) ctx.fillText(line, cx0, ly);
}
function assignSpell(id) {
  const p = G.player;
  const i = G.sbSel || 0;
  const unlocked = i === 0 || (i === 1 ? G.meta.magic3 : G.meta.magic4);
  if (!unlocked) { toast('This slot is locked — see the Master.', '#c84fff'); return; }
  // ако магията вече е в друг слот — разменяме
  const other = p.activeSpells.indexOf(id);
  if (other !== -1) p.activeSpells[other] = p.activeSpells[i];
  p.activeSpells[i] = id;
  Sfx.play('pickup');
  saveProfile();
}
function openSpellbook() {
  G.sbSel = 0;
  G.sbConfirm = null;
  G.state = 'spellbook';
  document.body.classList.add('menu');
}
function closeSpellbook() {
  G.sbConfirm = null;
  G.state = 'play';
  document.body.classList.remove('menu');
  saveProfile();
}

// ---------- ДЪРВО С УМЕНИЯ ----------
function drawSkillTree() {
  const S = SCALE, p = G.player;
  UI.btnRects = [];
  rcx(0, 0, CW, CH, 'rgba(4,6,11,0.78)');
  const pw = 250 * S, ph = 196 * S;
  const x0 = (CW - pw) / 2, y0 = (CH - ph) / 2;
  panel(x0, y0, pw, ph);
  ctx.textAlign = 'left';
  ctx.font = fontBold(9);
  ctx.fillStyle = '#7fd0a0';
  ctx.fillText('SKILL TREE', x0 + 10 * S, y0 + 14 * S);
  ctx.font = fontPx(6);
  ctx.fillStyle = '#ffd23b';
  ctx.fillText('points: ' + (p.skillPoints || 0), x0 + 84 * S, y0 + 14 * S);
  ctx.fillStyle = '#7d8899';
  ctx.fillText('kept forever; reset at the Master', x0 + 112 * S, y0 + 14 * S);
  const cxr = { x: x0 + pw - 20 * S, y: y0 + 4 * S, w: 16 * S, h: 16 * S };
  panel(cxr.x, cxr.y, cxr.w, cxr.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b7a';
  ctx.font = fontBold(9);
  ctx.fillText('✕', cxr.x + cxr.w / 2, cxr.y + 11.5 * S);
  UI.btnRects.push({ x: cxr.x, y: cxr.y, w: cxr.w, h: cxr.h, act: () => closeSkillTree() });

  const colW = 76 * S;
  SKILL_TREE.forEach((br, bi) => {
    const bx = x0 + 10 * S + bi * (colW + 6 * S);
    ctx.textAlign = 'center';
    ctx.font = fontBold(8);
    ctx.fillStyle = br.col;
    ctx.fillText(br.n, bx + colW / 2, y0 + 30 * S);
    ctx.font = fontPx(4.5);
    ctx.fillStyle = '#5a677f';
    ctx.fillText('grows from the bottom up', bx + colW / 2, y0 + 36 * S);
    br.nodes.forEach((nd, ni) => {
      // най-слабите са НАЙ-ДОЛУ, капстоунът — най-горе; купува се отдолу нагоре
      const ny = y0 + 38 * S + (br.nodes.length - 1 - ni) * 31 * S;
      const cost = ni + 1; // ниво в клона 1..5: по-силните умения струват повече точки
      const bought = !!(p.skills && p.skills[nd.id]);
      const prevOk = ni === 0 || !!(p.skills && p.skills[br.nodes[ni - 1].id]);
      const canBuy = !bought && prevOk && (p.skillPoints || 0) >= cost;
      // свързваща линия към предишното (което стои ПОД това)
      if (ni > 0) {
        ctx.fillStyle = bought || prevOk ? br.col : '#2a3140';
        ctx.fillRect((bx + colW / 2 - S / 2) | 0, ny + 26 * S, S, 5 * S);
      }
      panel(bx + 3 * S, ny, colW - 6 * S, 26 * S);
      if (bought) strokeRect(bx + 3 * S, ny, colW - 6 * S, 26 * S, br.col, S);
      else if (canBuy) strokeRect(bx + 3 * S, ny, colW - 6 * S, 26 * S, '#ffd23b', S);
      ctx.font = fontBold(6.5);
      ctx.fillStyle = bought ? br.col : canBuy ? '#e8e4d0' : '#5a677f';
      ctx.fillText(nd.n, bx + colW / 2, ny + 9 * S);
      ctx.font = fontPx(5);
      ctx.fillStyle = bought ? '#a8b2c4' : '#5a677f';
      wrapTextCentered(nd.d, bx + colW / 2, ny + 16 * S, colW - 12 * S, 6 * S);
      if (!bought) { // цена в точки — горе вдясно на клетката
        ctx.font = fontBold(5.5);
        ctx.textAlign = 'right';
        ctx.fillStyle = (prevOk && (p.skillPoints || 0) >= cost) ? '#ffd23b' : '#5a677f';
        ctx.fillText(cost + 'p', bx + colW - 6 * S, ny + 8 * S);
        ctx.textAlign = 'center';
      }
      if (canBuy) UI.btnRects.push({ x: bx + 3 * S, y: ny, w: colW - 6 * S, h: 26 * S, act: ((node) => () => buySkill(node))(nd) });
    });
  });
  ctx.textAlign = 'left';
}
function buySkill(nd) {
  const p = G.player;
  const cost = skillCost(nd.id);
  if ((p.skillPoints || 0) < cost) return;
  p.skills = p.skills || {};
  p.skills[nd.id] = true;
  p.skillPoints -= cost;
  calcStats(p);
  toast(nd.n + ': ' + nd.d, '#7fd0a0');
  Sfx.play('level');
}
function openSkillTree() {
  G.state = 'skilltree';
  document.body.classList.add('menu');
}
function closeSkillTree() {
  G.state = 'play';
  document.body.classList.remove('menu');
}

// ---------- избор на перка ----------
function drawLevelup() {
  const S = SCALE;
  UI.perkRects = [];
  rcx(0, 0, CW, CH, 'rgba(4,6,11,0.6)');
  ctx.textAlign = 'center';
  ctx.font = fontBold(12);
  ctx.fillStyle = '#ffd23b';
  ctx.fillText('LEVEL UP!', CW / 2, CH / 2 - 66 * S);
  ctx.font = fontPx(7);
  ctx.fillStyle = '#a8b2c4';
  ctx.fillText('Choose a perk  ·  you also get +1 Skill Tree point', CW / 2, CH / 2 - 54 * S);
  const cw2 = 74 * S, chh = 74 * S, gap = 10 * S;
  const total = 3 * cw2 + 2 * gap;
  let x = (CW - total) / 2;
  const y = CH / 2 - 40 * S;
  if (G.perkSel == null) G.perkSel = 0;
  // мишката движи курсора — но само когато НЕ ползваме контролер (иначе би прегазвала пада)
  if (!padRecent()) {
    for (let i = 0; i < 3; i++) {
      const px = (CW - total) / 2 + i * (cw2 + gap);
      if (G.mouse.x >= px && G.mouse.x < px + cw2 && G.mouse.y >= y && G.mouse.y < y + chh) G.perkSel = i;
    }
  }
  G.perkSel = clamp(G.perkSel, 0, 2);
  for (let i = 0; i < 3; i++) {
    const perk = G.levelupChoices[i];
    const sel = i === G.perkSel;
    panel(x, y, cw2, chh);
    if (sel) {
      // ясен маркер: единична жълта рамка (както при мишка)
      strokeRect(x, y, cw2, chh, '#ffd23b', S);
    }
    ctx.font = fontBold(10);
    ctx.fillStyle = sel ? '#ffd23b' : '#e8e4d0';
    ctx.fillText(String(i + 1), x + cw2 / 2, y + 14 * S);
    ctx.font = fontBold(7.5);
    ctx.fillStyle = '#7fd0a0';
    ctx.fillText(perk.n, x + cw2 / 2, y + 28 * S);
    // описанието се пренася на редове В картата
    ctx.font = fontPx(6);
    ctx.fillStyle = '#a8b2c4';
    wrapTextCentered(perk.d, x + cw2 / 2, y + 40 * S, cw2 - 10 * S, 8 * S);
    const lvlHave = perkCount(G.player, perk.id);
    if (lvlHave > 0) {
      ctx.fillStyle = '#7d8899';
      ctx.font = fontPx(5.5);
      ctx.fillText('you have x' + lvlHave, x + cw2 / 2, y + chh - 6 * S);
    }
    UI.perkRects.push({ x, y, w: cw2, h: chh, idx: i });
    x += cw2 + gap;
  }
  // ред с подсказки — какъв бутон какво прави (според реалния вход в момента)
  const pr = padRecent();
  drawControlHints(CW / 2, y + chh + 16 * S, [
    pr ? { b: '◀ ▶', t: 'select' } : { b: '1 2 3', t: 'select' },
    pr ? { b: padGlyph('attack', 'A'), t: 'confirm' } : { b: 'click', t: 'confirm' },
  ]);
  ctx.textAlign = 'left';
}

// глиф за бутон на контролера според текущия бинд (за подсказките)
const PAD_GLYPHS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', '↑', '↓', '←', '→'];
function padGlyph(actionId, fallback) {
  const idx = padBind(actionId);
  return (idx != null && PAD_GLYPHS[idx]) ? PAD_GLYPHS[idx] : (fallback || '?');
}
// --- елементите за навигация с контролер във всяко меню ---
// повечето менюта ги пазят в UI.btnRects (с act()); решетките (инвентар/магазин) ползват
// собствените си масиви, а потвърждението вика съществуващата click-функция по центъра
function menuFocusRects() {
  if (G.state === 'inventory') return [UI.invCloseRect, ...(UI.equipRects || []), ...(UI.invRects || [])].filter(Boolean);
  if (G.state === 'shop') {
    if (G.shopConfirm) return (UI.shopConfirmRects || []).filter(Boolean); // модалът поглъща навигацията
    return [UI.shopCloseRect, ...(UI.shopRects || []), ...(UI.enchPotRects || []), ...(UI.shopInvRects || []), ...(UI.shopActRects || []), ...(UI.enchAffixRects || [])].filter(Boolean);
  }
  return UI.btnRects || [];
}
function menuConfirm(r) {
  if (!r) return;
  // btnRects носят act() функция; магазинните рект-ове носят act като СТРИНГ ('sell'/'levelup'/'scramble'/'yes'/'no')
  if (typeof r.act === 'function') { r.act(); return; }
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  if (G.state === 'inventory') inventoryClick(cx, cy);
  else if (G.state === 'shop') shopClick(cx, cy); // разпознава стринг-act-овете
}
// избор на следващ елемент по посока (пространствено — работи и за списъци, и за решетки)
function navSpatial(rects, cur, dir) {
  if (!rects || !rects.length) return cur || 0;
  const c = rects[cur] || rects[0];
  const ccx = c.x + c.w / 2, ccy = c.y + c.h / 2;
  let best = -1, bestScore = Infinity;
  for (let i = 0; i < rects.length; i++) {
    if (i === cur) continue;
    const r = rects[i];
    const dx = (r.x + r.w / 2) - ccx, dy = (r.y + r.h / 2) - ccy;
    let along, perp;
    if (dir === 'up') { if (dy >= -1) continue; along = -dy; perp = Math.abs(dx); }
    else if (dir === 'down') { if (dy <= 1) continue; along = dy; perp = Math.abs(dx); }
    else if (dir === 'left') { if (dx >= -1) continue; along = -dx; perp = Math.abs(dy); }
    else { if (dx <= 1) continue; along = dx; perp = Math.abs(dy); }
    const score = along + perp * 2.5; // предпочита право по посоката, наказва отклонение
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return best >= 0 ? best : cur;
}
// маркер на избрания елемент във всяко меню + подсказки (само при активен контролер)
function drawMenuCursor() {
  if (!menuNavStates[G.state]) return;
  if (!padRecent()) return; // само при активен контролер (важи и на тъч устройство с контролер)
  if (G.state === 'binds' && G.bindWait) return; // чакаме нов клавиш/бутон — без маркер
  const rects = menuFocusRects();
  if (!rects.length) return;
  const S = SCALE;
  const i = clamp(G.menuSel || 0, 0, rects.length - 1);
  const r = rects[i];
  if (!r) return;
  // в инвентара/магазина рамката е ЗЕЛЕНА (като бинднатите бутони) — да не се бърка
  // със златистите (легендарни) предмети; другаде остава единична златна
  const grid = (G.state === 'inventory' || G.state === 'shop');
  if (grid) strokeRect(r.x - S, r.y - S, r.w + 2 * S, r.h + 2 * S, '#7fd0a0', S); // рамка около предмета
  else strokeRect(r.x, r.y, r.w, r.h, '#ffd23b', S);
  // тултип за фокусирания предмет (инвентар/магазин), понеже няма мишка
  // (стоката за купуване държи предмета в r.entry.item, а не в r.item)
  const ti = r.item || (r.entry && r.entry.item);
  if (ti) drawTooltip(ti, r.x + r.w + 4 * S, r.y + r.h / 2, !!r.equip);
  const volSel = r.kind === 'volume';
  drawControlHints(CW / 2, CH - 9 * S, volSel ? [
    { b: '◀ ▶', t: 'volume' },
    { b: 'B', t: 'back' },
    { b: '✛', t: 'move' },
  ] : [
    { b: padGlyph('attack', 'A'), t: 'select' },
    { b: 'B', t: 'back' },
    { b: '✛', t: 'move' },
  ]);
}
// централизиран ред с подсказки „бутон — действие"
function drawControlHints(cx, cy, items) {
  const S = SCALE;
  ctx.textAlign = 'left';
  ctx.font = fontPx(6);
  const pad = 4 * S, bh = 11 * S, gapB = 5 * S, gapPair = 10 * S;
  // измерваме обща ширина
  let totalW = 0;
  const parts = items.map(it => {
    ctx.font = fontBold(6);
    const bw = ctx.measureText(it.b).width + pad * 2;
    ctx.font = fontPx(6);
    const tw = ctx.measureText(it.t).width;
    const w = bw + 4 * S + tw;
    totalW += w + gapPair;
    return { it, bw, tw, w };
  });
  totalW -= gapPair;
  let x = cx - totalW / 2;
  for (const p of parts) {
    // капсула с буквата на бутона
    rcx(x, cy - bh + 2 * S, p.bw, bh, 'rgba(30,36,52,0.95)');
    strokeRect(x, cy - bh + 2 * S, p.bw, bh, '#5a677f', Math.max(1, S * 0.5));
    ctx.font = fontBold(6);
    ctx.fillStyle = '#ffd23b';
    ctx.textAlign = 'center';
    ctx.fillText(p.it.b, x + p.bw / 2, cy - 0.5 * S);
    // текст на действието
    ctx.font = fontPx(6);
    ctx.fillStyle = '#a8b2c4';
    ctx.textAlign = 'left';
    ctx.fillText(p.it.t, x + p.bw + 4 * S, cy - 0.5 * S);
    x += p.w + gapPair;
  }
  ctx.textAlign = 'left';
}
function levelupClick(mx, my) {
  if (G.time - (G.levelupOpenedAt || 0) < 0.3) return; // защита от случаен клик
  for (const r of UI.perkRects) {
    if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) { applyPerk(r.idx); return; }
  }
}

// ---------- заглавен екран ----------
let logoCv = null;
function makeLogo() {
  // един ред: "sword" едро (стомана) + "and" дребно + "MAGE" едро (синьо-лилаво)
  const mea = mk(10, 10);
  mea.font = 'bold 24px Verdana, "Segoe UI", sans-serif';
  const w1 = Math.ceil(mea.measureText('sword').width);
  const w2 = Math.ceil(mea.measureText('MAGE').width);
  mea.font = 'bold 13px Verdana, "Segoe UI", sans-serif';
  const wa = Math.ceil(mea.measureText('and').width);
  const W = w1 + wa + w2 + 16, H = 40;

  // "sword" (стоманени ленти, едро)
  const l1 = mk(w1 + 2, 28);
  l1.font = 'bold 24px Verdana, "Segoe UI", sans-serif';
  l1.textBaseline = 'alphabetic';
  l1.fillStyle = '#ffffff';
  l1.fillText('sword', 1, 22);
  l1.globalCompositeOperation = 'source-atop';
  rc(l1, 0, 0, w1 + 2, 6, '#e8ecf4');
  rc(l1, 0, 6, w1 + 2, 6, '#c2cddd');
  rc(l1, 0, 12, w1 + 2, 6, '#98a5bb');
  rc(l1, 0, 18, w1 + 2, 5, '#7c8aa8');
  rc(l1, 0, 23, w1 + 2, 5, '#5a677f');
  l1.globalCompositeOperation = 'source-over';
  outlineSprite(l1, '#10131c');

  // "and" (дребно, приглушена стомана)
  const la = mk(wa + 2, 16);
  la.font = 'bold 13px Verdana, "Segoe UI", sans-serif';
  la.textBaseline = 'alphabetic';
  la.fillStyle = '#ffffff';
  la.fillText('and', 1, 12);
  la.globalCompositeOperation = 'source-atop';
  rc(la, 0, 0, wa + 2, 5, '#c9d1d9');
  rc(la, 0, 5, wa + 2, 5, '#8a97ad');
  rc(la, 0, 10, wa + 2, 6, '#5f6a84');
  la.globalCompositeOperation = 'source-over';
  outlineSprite(la, '#10131c');

  // "MAGE" (синьо, преливащо към лилаво надолу)
  const l2 = mk(w2 + 2, 28);
  l2.font = 'bold 24px Verdana, "Segoe UI", sans-serif';
  l2.textBaseline = 'alphabetic';
  l2.fillStyle = '#ffffff';
  l2.fillText('MAGE', 1, 22);
  l2.globalCompositeOperation = 'source-atop';
  rc(l2, 0, 0, w2 + 2, 6, '#d8e6ff');
  rc(l2, 0, 6, w2 + 2, 6, '#8ab0ff');
  rc(l2, 0, 12, w2 + 2, 6, '#5c78e8');
  rc(l2, 0, 18, w2 + 2, 5, '#5a5ac8');
  rc(l2, 0, 23, w2 + 2, 5, '#4a3f9e');
  l2.globalCompositeOperation = 'source-over';
  outlineSprite(l2, '#10131c');

  const g = mk(W, H);
  const xa = w1 + 7, x2 = w1 + wa + 14;
  // сянка за дълбочина (общата базова линия е ред 22 при y=0)
  g.globalAlpha = 0.55;
  g.drawImage(whiteVersion(l1.canvas), 1, 2);
  g.drawImage(whiteVersion(la.canvas), xa + 1, 12);
  g.drawImage(whiteVersion(l2.canvas), x2 + 1, 2);
  g.globalCompositeOperation = 'source-in';
  rc(g, 0, 0, W, H, '#0a0c14');
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.drawImage(l1.canvas, 0, 0);
  g.drawImage(la.canvas, xa, 10);  // базова линия: 10+12 = 22
  g.drawImage(l2.canvas, x2, 0);

  // пикселен меч под целия надпис
  const sy = 31;
  const bx0 = 4, bx1 = W - 26;
  rc(g, bx0, sy, bx1 - bx0, 2, '#c6d3e6');
  rc(g, bx0, sy + 1, bx1 - bx0, 1, '#8a97ad');
  px(g, bx0 - 3, sy, '#ffffff'); px(g, bx0 - 2, sy, '#e8ecf4'); px(g, bx0 - 1, sy, '#e8ecf4');
  px(g, bx0 - 2, sy + 1, '#aab6cc'); px(g, bx0 - 1, sy + 1, '#aab6cc');
  rc(g, bx1, sy - 2, 2, 6, '#e8c04a');
  rc(g, bx1 + 2, sy, 8, 2, '#7d5636');
  rc(g, bx1 + 10, sy - 1, 3, 4, '#e8c04a');
  px(g, bx1 + 11, sy, '#5c78e8');
  logoCv = g.canvas;
}
// спокойните въглени от край до край — общ фон за заглавието и менюто с героите
function drawEmbers() {
  const S = SCALE;
  const LAYERS = [[0.72, 0.2], [0.80, 0.32], [0.88, 0.48], [0.96, 0.68]];
  for (const [by, p] of LAYERS) {
    if (chance(p)) {
      addParticle({
        fx: rnd(0, 1), by, x: 0, y: rnd(-8, 8), z: 0,
        vx: rnd(-1, 1), vy: 0, vz: rnd(4, 12),
        grav: -4, t: 0, life: rnd(2, 4),
        col: pick(['#ff8a1f', '#ffd23b', '#ff8a1f', '#ffd23b', '#5a677f', '#8ab0ff', '#5c78e8', '#8ab0ff']),
        size: by > 0.85 && chance(0.2) ? 2 : 1,
      });
    }
  }
  for (const pa of G.particles) {
    if (pa.fx === undefined) continue;
    const sx = pa.fx * CW + pa.x * 10 * S;
    const sy = CH * (pa.by || 0.72) - pa.z * S * 3 - pa.y * S;
    if (sy > CH) continue;
    ctx.globalAlpha = clamp(1 - pa.t / pa.life, 0, 1) * 0.8;
    rcx(sx, sy, pa.size * S, pa.size * S, pa.col);
  }
  ctx.globalAlpha = 1;
}

function drawTitle() {
  const S = SCALE;
  UI.btnRects = [];
  rcx(0, 0, CW, CH, '#05070c');
  drawEmbers();

  // версия на сглобката (само в онлайн билда) — малко, в долния десен ъгъл, за проверка коя версия гледаш
  if (typeof window !== 'undefined' && window.__BUILD__) {
    ctx.textAlign = 'right';
    ctx.font = fontPx(5);
    ctx.fillStyle = 'rgba(125,136,153,0.65)';
    ctx.fillText('v ' + window.__BUILD__, CW - 5 * S, CH - 5 * S);
    ctx.textAlign = 'left';
  }

  if (!logoCv) makeLogo();
  const lw = logoCv.width, lscale = Math.min(4 * S, Math.floor(CW * 0.85 / lw)) || S;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(logoCv, 0, 0, lw, logoCv.height, (CW - lw * lscale) / 2 | 0, CH * 0.22 | 0, lw * lscale, logoCv.height * lscale);

  ctx.textAlign = 'center';

  if (UI.titleProfT === undefined || G.time - UI.titleProfT > 1) { UI.titleProf = loadProfile(); UI.titleProfT = G.time; }
  const prof = UI.titleProf;
  const btn = (label, by, btnW, act, small) => {
    const bx = (CW - btnW) / 2;
    const btnH = (small ? 14 : 18) * S;
    const hov = G.mouse.x >= bx && G.mouse.x < bx + btnW && G.mouse.y >= by && G.mouse.y < by + btnH;
    panel(bx, by, btnW, btnH);
    if (hov) strokeRect(bx, by, btnW, btnH, '#ffd23b', S);
    ctx.font = fontBold(small ? 7 : 9);
    ctx.fillStyle = hov ? '#ffd23b' : (small ? '#a8b2c4' : '#e8e4d0');
    ctx.fillText(label, CW / 2, by + (small ? 9.5 : 12.5) * S);
    UI.btnRects.push({ x: bx, y: by, w: btnW, h: btnH, act });
  };
  // изчистено: само логото и двата бутона
  const anyChar = loadCharList().some(c => c);
  btn('CONTINUE', CH * 0.56, 100 * S, () => {
    G.delArm = null; // да не остане „въоръжено" триене
    if (anyChar) { G.state = 'charselect'; }
    else { G.state = 'newchar'; startNameInput(); }
  });
  btn('NEW GAME', CH * 0.56 + 26 * S, 100 * S, () => {
    G.delArm = null;
    const list = loadCharList();
    const free = list.findIndex(c => !c);
    if (free === -1) { toast('You have 3 heroes — delete one from "Continue".', '#ff6b7a'); G.state = 'charselect'; return; }
    G.newSlot = free;
    G.state = 'newchar';
    startNameInput();
  }, true);
  ctx.textAlign = 'left';
}

// ---------- избор на герой (до 3) ----------
function drawCharSelect() {
  const S = SCALE;
  UI.btnRects = [];
  rcx(0, 0, CW, CH, '#05070c');
  drawEmbers(); // ефектът от началния екран краси и героите
  ctx.textAlign = 'center';
  ctx.font = fontBold(11);
  ctx.fillStyle = '#e8e4d0';
  ctx.fillText('CHOOSE A HERO', CW / 2, CH * 0.16);
  const list = loadCharList();
  const rw = 170 * S, rh = 30 * S;
  let y = CH * 0.24;
  for (let i = 0; i < 3; i++) {
    const c = list[i];
    const x = (CW - rw) / 2;
    panel(x, y, rw, rh);
    if (c) {
      const hov = G.mouse.x >= x && G.mouse.x < x + rw - 24 * S && G.mouse.y >= y && G.mouse.y < y + rh;
      if (hov) strokeRect(x, y, rw, rh, '#ffd23b', S);
      ctx.font = fontBold(9);
      ctx.fillStyle = hov ? '#ffd23b' : '#e8e4d0';
      ctx.textAlign = 'left';
      ctx.fillText(c.name, x + 10 * S, y + 13 * S);
      ctx.font = fontPx(6);
      ctx.fillStyle = '#7d8899';
      ctx.fillText('gold ' + c.gold + ' · floor ' + c.depth + ' · deaths ' + c.deaths, x + 10 * S, y + 23 * S);
      ctx.textAlign = 'center';
      UI.btnRects.push({ x, y, w: rw - 26 * S, h: rh, act: ((slot) => () => startGame(slot))(i) });
      // изтриване (две натискания за сигурност)
      const armed = G.delArm === i;
      ctx.font = fontBold(8);
      ctx.fillStyle = armed ? '#ff6b7a' : '#5a677f';
      ctx.fillText(armed ? '?!' : '✕', x + rw - 13 * S, y + rh / 2 + 3 * S);
      UI.btnRects.push({ x: x + rw - 24 * S, y, w: 24 * S, h: rh, act: ((slot) => () => {
        if (G.delArm === slot) { deleteChar(slot); G.delArm = null; toast('Hero deleted.', '#7d8899'); }
        else { G.delArm = slot; toast('Press ✕ again to delete.', '#ff6b7a'); }
      })(i) });
    } else {
      ctx.font = fontPx(7);
      ctx.fillStyle = '#3a4456';
      ctx.fillText('— empty slot —', CW / 2, y + rh / 2 + 2 * S);
      UI.btnRects.push({ x, y, w: rw, h: rh, act: ((slot) => () => { G.newSlot = slot; G.state = 'newchar'; startNameInput(); })(i) });
    }
    y += rh + 8 * S;
  }
  const bx = (CW - 60 * S) / 2;
  panel(bx, y + 4 * S, 60 * S, 16 * S);
  ctx.font = fontBold(8);
  ctx.fillStyle = '#a8b2c4';
  ctx.fillText('Back', CW / 2, y + 15 * S);
  UI.btnRects.push({ x: bx, y: y + 4 * S, w: 60 * S, h: 16 * S, act: () => { G.state = 'title'; G.delArm = null; } });
  ctx.textAlign = 'left';
}

// ---------- нов герой: поле за име (скрит DOM input за клавиатурата на телефона) ----------
let nameInputEl = null;
function startNameInput() {
  G.newName = '';
  // ако сме дошли с контролер -> показваме виртуалната клавиатура; иначе класически екран
  G.nameKbOn = padRecent();
  G.kbRow = 1; G.kbCol = 0; // старт върху „Q"
  if (!nameInputEl) {
    nameInputEl = document.createElement('input');
    nameInputEl.type = 'text';
    nameInputEl.maxLength = 14;
    nameInputEl.style.cssText = 'position:fixed;top:0;left:0;opacity:0.01;width:10px;height:10px;border:0;padding:0;z-index:10;pointer-events:none;';
    document.body.appendChild(nameInputEl);
    nameInputEl.addEventListener('input', () => { G.newName = nameInputEl.value; });
    nameInputEl.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') confirmNewChar();
      if (ev.key === 'Escape') { G.state = 'title'; nameInputEl.blur(); }
    });
  }
  nameInputEl.value = '';
  setTimeout(() => nameInputEl.focus(), 50);
}
function confirmNewChar() {
  const name = (G.newName || '').trim();
  if (!name) { toast('Name your hero.', '#ff6b7a'); if (nameInputEl) nameInputEl.focus(); return; }
  if (nameInputEl) nameInputEl.blur();
  G.keys = Object.create(null); // да не тръгне героят сам от буквите на името
  G.mouse.down = G.mouse.rdown = false;
  startGame(G.newSlot !== undefined ? G.newSlot : 0, name);
}
// ---------- виртуална клавиатура за име (само латиница, за контролер) ----------
const NAMEKB = [
  '1234567890'.split('').map(v => ({ v, k: 'ch' })),
  'QWERTYUIOP'.split('').map(v => ({ v, k: 'ch' })),
  'ASDFGHJKL'.split('').map(v => ({ v, k: 'ch' })),
  'ZXCVBNM'.split('').map(v => ({ v, k: 'ch' })),
  [{ v: 'SPACE', k: 'space', w: 66 }, { v: '⌫', k: 'del', w: 30 }],
  [{ v: 'Create', k: 'ok', w: 78 }, { v: 'Back', k: 'cancel', w: 78 }],
];
function typeNameChar(ch) {
  const name = G.newName || '';
  if (name.length >= 14) { Sfx.play('deny'); return; }
  if (/[a-z]/i.test(ch)) ch = name.length === 0 ? ch.toUpperCase() : ch.toLowerCase(); // първата буква главна
  if (ch === ' ' && (name.length === 0 || name.slice(-1) === ' ')) { Sfx.play('deny'); return; }
  G.newName = name + ch;
  if (nameInputEl) nameInputEl.value = G.newName;
  Sfx.play('pickup');
}
function nameBackspace() {
  if (!G.newName) { Sfx.play('deny'); return; }
  G.newName = G.newName.slice(0, -1);
  if (nameInputEl) nameInputEl.value = G.newName;
  Sfx.play('coin');
}
function activateNameKey() {
  const row = NAMEKB[G.kbRow]; if (!row) return;
  const key = row[G.kbCol]; if (!key) return;
  if (key.k === 'ch') typeNameChar(key.v);
  else if (key.k === 'space') typeNameChar(' ');
  else if (key.k === 'del') nameBackspace();
  else if (key.k === 'ok') confirmNewChar();
  else if (key.k === 'cancel') { G.state = 'title'; if (nameInputEl) nameInputEl.blur(); }
}
function drawNameKeyboard(topY) {
  const S = SCALE;
  UI.kbKeys = [];
  const kw = 16 * S, kh = 16 * S, gap = 3 * S;
  let y = topY;
  for (let r = 0; r < NAMEKB.length; r++) {
    const row = NAMEKB[r];
    const rh = r >= 4 ? 17 * S : kh;
    let rowW = 0;
    for (const key of row) rowW += (key.w ? key.w * S : kw) + gap;
    rowW -= gap;
    let x = Math.round((CW - rowW) / 2);
    for (let c = 0; c < row.length; c++) {
      const key = row[c];
      const w = key.w ? key.w * S : kw;
      const selHere = G.kbRow === r && G.kbCol === c;
      panel(x, y, w, rh);
      if (selHere) strokeRect(x, y, w, rh, '#ffd23b', S); // единична жълта рамка (както при мишка)
      ctx.font = fontBold(key.k === 'ch' ? 8 : 6.5);
      ctx.fillStyle = selHere ? '#ffd23b' : key.k === 'ok' ? '#7fd0a0' : key.k === 'cancel' ? '#e0a458' : '#e8e4d0';
      ctx.textAlign = 'center';
      ctx.fillText(key.v, x + w / 2, y + rh / 2 + 3 * S);
      UI.kbKeys.push({ x, y, w, h: rh, r, c });
      x += w + gap;
    }
    y += rh + gap;
  }
}
function drawNewChar() {
  const S = SCALE;
  UI.btnRects = [];
  UI.kbKeys = [];
  rcx(0, 0, CW, CH, '#05070c');
  drawEmbers();
  ctx.textAlign = 'center';

  // --- режим контролер: виртуална клавиатура (само латиница) ---
  if (G.nameKbOn) {
    ctx.font = fontBold(11);
    ctx.fillStyle = '#e8e4d0';
    ctx.fillText('NEW HERO', CW / 2, CH * 0.08);
    const fw = 170 * S, fh = 20 * S;
    const fx = (CW - fw) / 2, fy = CH * 0.14;
    panel(fx, fy, fw, fh);
    strokeRect(fx, fy, fw, fh, '#8ab0ff', S);
    ctx.font = fontBold(9);
    ctx.fillStyle = G.newName ? '#e8e4d0' : '#5a677f';
    const caret = Math.floor(G.time * 2) % 2 === 0 ? '|' : ' ';
    ctx.fillText((G.newName || 'hero name') + (G.newName ? caret : ''), CW / 2, fy + 13.5 * S);
    drawNameKeyboard(fy + fh + 12 * S);
    drawControlHints(CW / 2, CH - 9 * S, [
      { b: padGlyph('attack', 'A'), t: 'select' },
      { b: 'B', t: 'delete' },
      { b: 'D-pad', t: 'move' },
    ]);
    ctx.textAlign = 'left';
    return;
  }

  // --- класически екран (клавиатура / мишка / телефон) ---
  ctx.font = fontBold(11);
  ctx.fillStyle = '#e8e4d0';
  ctx.fillText('NEW HERO', CW / 2, CH * 0.2);
  // героят по средата, уголемен
  if (Spr.player && Spr.player.sword) {
    const spr = Spr.player.sword.down[Math.floor(G.time * 3) % 4];
    const sc = 4 * S;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, 0, 0, spr.width, spr.height, (CW / 2 - spr.width * sc / 2) | 0, (CH * 0.26) | 0, spr.width * sc, spr.height * sc);
  }
  // поле за име
  const fw = 130 * S, fh = 18 * S;
  const fx = (CW - fw) / 2, fy = CH * 0.62;
  panel(fx, fy, fw, fh);
  strokeRect(fx, fy, fw, fh, '#8ab0ff', S);
  ctx.font = fontBold(9);
  ctx.fillStyle = G.newName ? '#e8e4d0' : '#5a677f';
  const caret = Math.floor(G.time * 2) % 2 === 0 ? '|' : ' ';
  ctx.fillText((G.newName || 'hero name') + (G.newName ? caret : ''), CW / 2, fy + 12.5 * S);
  UI.btnRects.push({ x: fx, y: fy, w: fw, h: fh, act: () => { if (nameInputEl) nameInputEl.focus(); } });
  // бутони
  const bw = 74 * S, bh = 18 * S;
  const bx1 = CW / 2 - bw - 5 * S, bx2 = CW / 2 + 5 * S, by2 = fy + 28 * S;
  panel(bx1, by2, bw, bh);
  ctx.fillStyle = '#7fd0a0';
  ctx.fillText('Create', bx1 + bw / 2, by2 + 12.5 * S);
  UI.btnRects.push({ x: bx1, y: by2, w: bw, h: bh, act: () => confirmNewChar() });
  panel(bx2, by2, bw, bh);
  ctx.fillStyle = '#a8b2c4';
  ctx.fillText('Back', bx2 + bw / 2, by2 + 12.5 * S);
  UI.btnRects.push({ x: bx2, y: by2, w: bw, h: bh, act: () => { G.state = 'title'; if (nameInputEl) nameInputEl.blur(); } });
  ctx.textAlign = 'left';
}

// ---------- избор на вход в Бездната (след отключена контролна точка) ----------
function drawDescend() {
  const S = SCALE;
  UI.btnRects = [];
  rcx(0, 0, CW, CH, 'rgba(4,6,11,0.7)');
  const pw = 150 * S, ph = 92 * S;
  const x0 = (CW - pw) / 2, y0 = (CH - ph) / 2;
  panel(x0, y0, pw, ph);
  ctx.textAlign = 'center';
  ctx.font = fontBold(9);
  ctx.fillStyle = '#e8e4d0';
  ctx.fillText('WHERE TO, ' + (G.charName || 'stranger').toUpperCase() + '?', CW / 2, y0 + 14 * S);
  const row = (label, y, act) => {
    const rx = x0 + 10 * S, rw = pw - 20 * S, rh = 18 * S;
    const hov = G.mouse.x >= rx && G.mouse.x < rx + rw && G.mouse.y >= y && G.mouse.y < y + rh;
    panel(rx, y, rw, rh);
    if (hov) strokeRect(rx, y, rw, rh, '#ffd23b', S);
    ctx.font = fontBold(8);
    ctx.fillStyle = hov ? '#ffd23b' : '#e8e4d0';
    ctx.fillText(label, CW / 2, y + 12 * S);
    UI.btnRects.push({ x: rx, y, w: rw, h: rh, act });
  };
  row('From the start — Floor 1', y0 + 24 * S, () => { G.state = 'play'; document.body.classList.remove('menu'); startTransition(1); });
  row('Checkpoint — Floor ' + G.checkpoint, y0 + 46 * S, () => { G.state = 'play'; document.body.classList.remove('menu'); startTransition(G.checkpoint); });
  row('Back', y0 + 68 * S, () => { G.state = 'play'; document.body.classList.remove('menu'); });
  ctx.textAlign = 'left';
}

// ---------- смърт ----------
function drawDead() {
  const S = SCALE;
  UI.btnRects = [];
  rcx(0, 0, CW, CH, 'rgba(20,6,10,' + clamp(G.deadT, 0, 0.75) + ')');
  ctx.textAlign = 'center';
  ctx.font = fontBold(16);
  ctx.fillStyle = '#c22836';
  ctx.fillText('YOU DIED', CW / 2, CH * 0.32);
  ctx.font = fontPx(8);
  ctx.fillStyle = '#e8e4d0';
  const mins = Math.floor((performance.now() - G.startTime) / 60000);
  const secs = Math.floor((performance.now() - G.startTime) / 1000) % 60;
  ctx.fillText('Floor: ' + G.maxDepth + '  ·  Kills: ' + G.kills + '  ·  Hero: level ' + G.player.lvl, CW / 2, CH * 0.42);
  ctx.fillStyle = '#7d8899';
  ctx.fillText('Gold: ' + G.player.gold + '  ·  Time: ' + mins + ':' + String(secs).padStart(2, '0'), CW / 2, CH * 0.47);
  if (G.best) {
    ctx.fillStyle = '#c8a832';
    ctx.fillText('Record: floor ' + G.best.depth + ' · ' + G.best.kills + ' kills', CW / 2, CH * 0.53);
  }
  ctx.fillStyle = '#7fd0a0';
  ctx.font = fontPx(7);
  ctx.fillText('Your gold and items survived. The Abyss awaits you from floor 1.', CW / 2, CH * 0.57);
  const btnW = 100 * S, btnH = 18 * S;
  const bx = (CW - btnW) / 2, by = CH * 0.62;
  const hov = G.mouse.x >= bx && G.mouse.x < bx + btnW && G.mouse.y >= by && G.mouse.y < by + btnH;
  panel(bx, by, btnW, btnH);
  if (hov) strokeRect(bx, by, btnW, btnH, '#ffd23b', S);
  ctx.font = fontBold(9);
  ctx.fillStyle = hov ? '#ffd23b' : '#e8e4d0';
  ctx.fillText('TO CAMP (ENTER)', CW / 2, by + 12.5 * S);
  UI.btnRects.push({ x: bx, y: by, w: btnW, h: btnH, act: () => respawnAtCamp() });
  ctx.textAlign = 'left';
}

// ---------- пауза ----------
function drawPause() {
  const S = SCALE;
  rcx(0, 0, CW, CH, 'rgba(4,6,11,0.65)');
  ctx.textAlign = 'center';
  ctx.font = fontBold(13);
  ctx.fillStyle = '#e8e4d0';
  ctx.fillText('PAUSE', CW / 2, CH * 0.4);
  ctx.font = fontPx(7);
  ctx.fillStyle = '#7d8899';
  if (padRecent()) {
    ctx.fillText('Start — resume', CW / 2, CH * 0.47);
    ctx.fillText('left stick move · ' + padGlyph('attack', 'A') + ' attack · ' + padGlyph('dash', 'B') + ' dash · ' + padGlyph('interact', 'X') + ' action · ' + padGlyph('inventory', 'Back') + ' inventory', CW / 2, CH * 0.53);
  } else {
    ctx.fillText('ESC — resume', CW / 2, CH * 0.47);
    ctx.fillText('WASD move · LMB attack · RMB fire · SPACE dash · E action · I inventory', CW / 2, CH * 0.53);
  }
  ctx.textAlign = 'left';
}

// ---------- преход между етажи ----------
function drawTransition() {
  const S = SCALE;
  const t = G.transT;
  let a = 1;
  if (t < 0.4) a = t / 0.4;
  else if (t > 1.6) a = clamp(1 - (t - 1.6) / 0.4, 0, 1);
  rcx(0, 0, CW, CH, 'rgba(4,6,11,' + a + ')');
  if (t > 0.4 && t < 1.7) {
    ctx.textAlign = 'center';
    ctx.globalAlpha = clamp(Math.min(t - 0.4, 1.7 - t) / 0.25, 0, 1);
    ctx.font = fontBold(13);
    ctx.fillStyle = '#e8e4d0';
    ctx.fillText(G.transMsg, CW / 2, CH * 0.46);
    ctx.font = fontPx(7);
    ctx.fillStyle = '#7d8899';
    ctx.fillText(G.transSub || THEMES[Spr.themeIdx].sub, CW / 2, CH * 0.52);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}

// ---------- тъч бутони: подредба по шаблона (дъга вдясно), мести се и оразмерява ----------
const CTRL_DEFS = {
  joy:  { fx: 0.115, fy: 0.775, fr: 0.135, name: 'Joystick' },
  atk:  { fx: 0.905, fy: 0.795, fr: 0.105, name: 'Attack' },
  m1:   { fx: 0.775, fy: 0.875, fr: 0.062, name: 'Fireball' },
  m2:   { fx: 0.728, fy: 0.705, fr: 0.062, name: 'Spell 3' },
  m3:   { fx: 0.772, fy: 0.545, fr: 0.062, name: 'Spell 4' },
  dash: { fx: 0.868, fy: 0.435, fr: 0.06,  name: 'Dash' },
  hp:   { fx: 0.90,  fy: 0.305, fr: 0.055, name: 'Life' },
  mp:   { fx: 0.953, fy: 0.205, fr: 0.055, name: 'Mana' },
};
function ctrlLayout() {
  const out = {};
  for (const id in CTRL_DEFS) {
    const d = CTRL_DEFS[id];
    const c = (G.meta.ctrl && G.meta.ctrl[id]) || d;
    out[id] = { x: c.fx * CW, y: c.fy * CH, r: Math.max(10, c.fr * CH), fx: c.fx, fy: c.fy, fr: c.fr };
  }
  return out;
}
function ctrlHit(px, py, includeAll) {
  const L = ctrlLayout();
  let best = null, bd = 1e9;
  for (const id in L) {
    if (!includeAll) {
      if (id === 'm2' && !G.meta.magic3) continue;
      if (id === 'm3' && !G.meta.magic4) continue;
    }
    const c = L[id];
    const d = Math.hypot(px - c.x, py - c.y);
    if (d < c.r * (id === 'joy' ? 1.35 : 1.15) && d < bd) { bd = d; best = id; }
  }
  return best;
}
function circleBtn(c, fill, stroke, alpha) {
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(2, SCALE);
  ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
}
function cdOverlay(c, frac) {
  if (frac <= 0) return;
  ctx.fillStyle = 'rgba(8,10,16,0.55)';
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.arc(c.x, c.y, c.r - SCALE, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(frac, 0, 1));
  ctx.closePath();
  ctx.fill();
}
function drawTouchControls(editor) {
  const S = SCALE, p = G.player, L = ctrlLayout();
  // джойстик
  const j = L.joy;
  circleBtn(j, 'rgba(200,210,230,0.08)', 'rgba(200,210,230,0.35)');
  let kx = j.x, ky = j.y;
  if (G.joy) {
    const len = Math.hypot(G.joy.dx, G.joy.dy) || 1;
    const cl = Math.min(len, j.r * 0.7);
    kx = j.x + G.joy.dx / len * cl; ky = j.y + G.joy.dy / len * cl;
  }
  ctx.fillStyle = 'rgba(200,210,230,0.4)';
  ctx.beginPath(); ctx.arc(kx, ky, j.r * 0.38, 0, Math.PI * 2); ctx.fill();
  // атака (бял, с иконата на оръжието)
  const a = L.atk;
  circleBtn(a, 'rgba(230,235,245,0.16)', 'rgba(230,235,245,0.55)');
  const wIcon = Spr.icons[(p.equip.weapon && p.equip.weapon.icon) || 'sword'];
  const isc = Math.max(2, Math.round(a.r / 8));
  ctx.drawImage(wIcon, 0, 0, 12, 12, (a.x - 6 * isc) | 0, (a.y - 6 * isc) | 0, 12 * isc, 12 * isc);
  cdOverlay(a, p.atkT / (p.st.atkCd || 1));
  // магии (зелени бутони, руната е в цвета на магията)
  p.spellCd = p.spellCd || [0, 0, 0];
  const drawSpellBtn = (c, idx, unlocked) => {
    if (!unlocked && !editor) return;
    circleBtn(c, 'rgba(80,200,120,0.14)', 'rgba(95,217,122,0.5)');
    const id = p.activeSpells && p.activeSpells[idx];
    const sp = id && SPELLS[id];
    if (sp && unlocked) {
      const rr = c.r * 0.5;
      ctx.fillStyle = sp.col;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - rr); ctx.lineTo(c.x + rr * 0.8, c.y); ctx.lineTo(c.x, c.y + rr); ctx.lineTo(c.x - rr * 0.8, c.y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect((c.x - S) | 0, (c.y - rr * 0.5) | 0, S, 2 * S);
      cdOverlay(c, p.spellCd[idx] / sp.cd);
      ctx.fillStyle = p.mp >= sp.cost ? 'rgba(127,176,255,0.9)' : 'rgba(255,107,122,0.9)';
      ctx.font = fontBold(5);
      ctx.textAlign = 'center';
      ctx.fillText(sp.cost, c.x, c.y + c.r * 0.75);
    } else if (unlocked) {
      const pl = 0.35 + 0.25 * Math.sin(G.time * 3);
      ctx.fillStyle = 'rgba(200,79,255,' + pl.toFixed(2) + ')';
      ctx.fillRect((c.x - S) | 0, (c.y - S) | 0, 2 * S, 2 * S);
    } else {
      ctx.fillStyle = 'rgba(69,78,99,0.9)';
      ctx.fillRect((c.x - 2 * S) | 0, (c.y - S) | 0, 4 * S, 3 * S);
      strokeRect((c.x - 1.5 * S) | 0, (c.y - 3 * S) | 0, 3 * S, 3 * S, 'rgba(69,78,99,0.9)', S);
    }
  };
  drawSpellBtn(L.m1, 0, true);
  drawSpellBtn(L.m2, 1, G.meta.magic3);
  drawSpellBtn(L.m3, 2, G.meta.magic4);
  // отскок (жълт)
  const d = L.dash;
  circleBtn(d, 'rgba(255,210,59,0.14)', 'rgba(255,210,59,0.5)');
  ctx.fillStyle = '#ffd23b';
  ctx.font = fontBold(9);
  ctx.textAlign = 'center';
  ctx.fillText('»', d.x, d.y + 3 * S);
  cdOverlay(d, p.dashCd / (p.st.dashCd || 1));
  // отвари: флакон в цвета на носената отвара + презареждане (без брой)
  const drawPot = (c, slot) => {
    const key = p.potionSlots && p.potionSlots[slot];
    const def = key ? POTIONS[key] : null;
    const col = def ? def.col : '#454e63';
    circleBtn(c, 'rgba(70,75,90,0.16)', col + '8c');
    if (def) drawPotionGlyph(c.x, c.y + c.r * 0.1, col, Math.max(2, Math.round(c.r / 9)));
    if (def && p.potionCd) cdOverlay(c, (p.potionCd[slot] || 0) / potionCooldown(p, key));
  };
  drawPot(L.hp, 0);
  drawPot(L.mp, 1);
  ctx.textAlign = 'left';
}
function ctrlPress(id) {
  switch (id) {
    case 'atk': autoMelee(); break;
    case 'm1': castSpell(0); break;
    case 'm2': castSpell(1); break;
    case 'm3': castSpell(2); break;
    case 'dash': tryDash(); break;
    case 'hp': if (G.onSurface) openPotionSelect(0); else usePotion(0); break;
    case 'mp': if (G.onSurface) openPotionSelect(1); else usePotion(1); break;
  }
}

// ---------- настройки ----------
function openSettings() {
  G.state = 'settings';
  document.body.classList.add('menu');
}
function closeSettings() {
  G.state = 'play';
  document.body.classList.remove('menu');
  saveProfile();
}
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else {
      Promise.resolve(document.documentElement.requestFullscreen())
        .then(() => { if (G.isTouch && screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape'); })
        .catch(() => {});
    }
  } catch (e) {}
}
function drawSettings() {
  const S = SCALE;
  UI.btnRects = [];
  rcx(0, 0, CW, CH, 'rgba(4,6,11,0.72)');
  const pw = 170 * S, ph = 182 * S;
  const x0 = (CW - pw) / 2, y0 = (CH - ph) / 2;
  panel(x0, y0, pw, ph);
  ctx.textAlign = 'left';
  ctx.font = fontBold(9);
  ctx.fillStyle = '#e8e4d0';
  ctx.fillText('SETTINGS', x0 + 10 * S, y0 + 14 * S);
  ctx.font = fontPx(6);
  ctx.fillStyle = '#7d8899';
  ctx.fillText('ESC — close', x0 + 70 * S, y0 + 14 * S);

  const row = (label, y, act) => {
    const rx = x0 + 10 * S, rw = pw - 20 * S, rh = 16 * S;
    const hov = G.mouse.x >= rx && G.mouse.x < rx + rw && G.mouse.y >= y && G.mouse.y < y + rh;
    panel(rx, y, rw, rh);
    if (hov) strokeRect(rx, y, rw, rh, '#ffd23b', S);
    ctx.font = fontBold(7);
    ctx.fillStyle = hov ? '#ffd23b' : '#e8e4d0';
    ctx.textAlign = 'center';
    ctx.fillText(label, x0 + pw / 2, y + 11 * S);
    ctx.textAlign = 'left';
    UI.btnRects.push({ x: rx, y, w: rw, h: rh, act });
  };
  row(document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen', y0 + 22 * S, () => toggleFullscreen());

  // звук: слайдер
  const sy = y0 + 46 * S;
  ctx.font = fontBold(7);
  ctx.fillStyle = '#a8b2c4';
  ctx.fillText('Sound: ' + Math.round((G.meta.volume !== undefined ? G.meta.volume : 0.8) * 100) + '%' + (Sfx.muted ? ' (muted — M)' : ''), x0 + 10 * S, sy);
  const bx = x0 + 10 * S, bw = pw - 20 * S, bh = 8 * S, by2 = sy + 4 * S;
  rcx(bx, by2, bw, bh, '#171c28');
  const vol = G.meta.volume !== undefined ? G.meta.volume : 0.8;
  rcx(bx, by2, bw * vol, bh, '#4f9cff');
  strokeRect(bx, by2, bw, bh, '#3a4456', S);
  rcx(bx + bw * vol - S, by2 - 2 * S, 2 * S, bh + 4 * S, '#c9d1d9');
  UI.volRect = { x: bx, y: by2 - 4 * S, w: bw, h: bh + 8 * S };
  // спирка за курсора на контролера (ляво/дясно мени силата) — вмъква се на правилния ред
  UI.btnRects.push({ x: bx - 2 * S, y: sy - 9 * S, w: bw + 4 * S, h: 25 * S, kind: 'volume', act: () => {} });

  const modeNames = { auto: 'automatic', kbm: 'mouse and keyboard', pad: 'controller', touch: 'virtual buttons' };
  row('Controls: ' + modeNames[inputMode()], y0 + 70 * S, () => { G.state = 'inputmode'; });
  row('Keys and buttons', y0 + 92 * S, () => {
    G.bindTab = G.bindTab || 'kb';
    G.bindWait = null;
    G.state = 'binds';
  });
  row('Control editor', y0 + 114 * S, () => {
    ensureCtrl();
    G.editBackup = JSON.parse(JSON.stringify(G.meta.ctrl)); // за "Cancel"
    G.editSel = null;
    G.state = 'ctrledit';
  });
  // смяна на герой — само от безопасния лагер
  if (G.onSurface) {
    row('Switch hero', y0 + 136 * S, () => {
      saveProfile();
      document.body.classList.add('menu');
      G.delArm = null;
      G.state = 'charselect';
    });
  } else {
    ctx.font = fontPx(6);
    ctx.fillStyle = '#5a677f';
    ctx.textAlign = 'center';
    ctx.fillText('You can only switch hero in camp', CW / 2, y0 + 146 * S);
    ctx.textAlign = 'left';
  }
  row('Close', y0 + 158 * S, () => closeSettings());
}

// ---------- избор на управление ----------
function drawInputMode() {
  const S = SCALE;
  UI.btnRects = [];
  rcx(0, 0, CW, CH, 'rgba(4,6,11,0.75)');
  const pw = 190 * S, ph = 150 * S;
  const x0 = (CW - pw) / 2, y0 = (CH - ph) / 2;
  panel(x0, y0, pw, ph);
  ctx.textAlign = 'left';
  ctx.font = fontBold(9);
  ctx.fillStyle = '#e8e4d0';
  ctx.fillText('CONTROLS', x0 + 10 * S, y0 + 14 * S);
  ctx.font = fontPx(6);
  ctx.fillStyle = '#7d8899';
  ctx.fillText('ESC — back', x0 + 78 * S, y0 + 14 * S);

  const opts = [
    { id: 'auto', n: 'Automatic', d: 'the game decides based on your device' },
    { id: 'kbm', n: 'Mouse and keyboard', d: 'WASD + mouse to aim' },
    { id: 'pad', n: 'Controller', d: 'A attack · B dash · X action · Y/RB/RT spells' },
    { id: 'touch', n: 'Virtual buttons', d: 'on-screen joystick and buttons' },
  ];
  let y = y0 + 22 * S;
  for (const o of opts) {
    const rx = x0 + 10 * S, rw = pw - 20 * S, rh = 20 * S;
    const cur = inputMode() === o.id;
    const hov = G.mouse.x >= rx && G.mouse.x < rx + rw && G.mouse.y >= y && G.mouse.y < y + rh;
    panel(rx, y, rw, rh);
    if (cur) strokeRect(rx, y, rw, rh, '#7fd0a0', S);
    else if (hov) strokeRect(rx, y, rw, rh, '#ffd23b', S);
    ctx.font = fontBold(7.5);
    ctx.fillStyle = cur ? '#7fd0a0' : hov ? '#ffd23b' : '#e8e4d0';
    ctx.fillText((cur ? '● ' : '') + o.n, rx + 6 * S, y + 8.5 * S);
    ctx.font = fontPx(5.5);
    ctx.fillStyle = '#7d8899';
    ctx.fillText(o.d, rx + 6 * S, y + 16 * S);
    UI.btnRects.push({ x: rx, y, w: rw, h: rh, act: ((mid) => () => {
      G.meta.inputMode = mid;
      saveProfile();
      toast('Controls: ' + o.n, '#7fd0a0');
    })(o.id) });
    y += rh + 4 * S;
  }
  // жива диагностика на контролера
  ctx.font = fontPx(6);
  if (G.padInfo) {
    ctx.fillStyle = '#7fd0a0';
    ctx.fillText('Controller: ' + (G.padInfo.id || '').slice(0, 34), x0 + 10 * S, y + 6 * S);
    ctx.fillStyle = '#a8b2c4';
    const lastB = (G.padLastBtnT && G.time - G.padLastBtnT < 2) ? ('button pressed #' + G.padLastBtn) : 'press a button to test';
    ctx.fillText(lastB + ' · sticks: ' + (G.padInfo.axes || []).slice(0, 4).join(', '), x0 + 10 * S, y + 14 * S);
  } else {
    ctx.fillStyle = '#5a677f';
    ctx.fillText('No controller detected — press a button on it.', x0 + 10 * S, y + 6 * S);
  }
  // затвори
  const bx = x0 + pw / 2 - 30 * S, byy = y0 + ph - 18 * S;
  panel(bx, byy, 60 * S, 14 * S);
  ctx.textAlign = 'center';
  ctx.font = fontBold(7.5);
  ctx.fillStyle = '#a8b2c4';
  ctx.fillText('Back', x0 + pw / 2, byy + 10 * S);
  UI.btnRects.push({ x: bx, y: byy, w: 60 * S, h: 14 * S, act: () => { G.state = 'settings'; } });
  ctx.textAlign = 'left';
}
// ---------- биндове: схема на клавиатурата / контролера, свети на живо ----------
const KB_ROWS = [
  { ox: 0, keys: [['Digit1', '1'], ['Digit2', '2'], ['Digit3', '3'], ['Digit4', '4'], ['Digit5', '5'], ['Digit6', '6'], ['Digit7', '7'], ['Digit8', '8'], ['Digit9', '9'], ['Digit0', '0']] },
  { ox: 4, keys: [['KeyQ', 'Q'], ['KeyW', 'W'], ['KeyE', 'E'], ['KeyR', 'R'], ['KeyT', 'T'], ['KeyY', 'Y'], ['KeyU', 'U'], ['KeyI', 'I'], ['KeyO', 'O'], ['KeyP', 'P']] },
  { ox: 8, keys: [['KeyA', 'A'], ['KeyS', 'S'], ['KeyD', 'D'], ['KeyF', 'F'], ['KeyG', 'G'], ['KeyH', 'H'], ['KeyJ', 'J'], ['KeyK', 'K'], ['KeyL', 'L']] },
  { ox: 12, keys: [['KeyZ', 'Z'], ['KeyX', 'X'], ['KeyC', 'C'], ['KeyV', 'V'], ['KeyB', 'B'], ['KeyN', 'N'], ['KeyM', 'M']] },
  { ox: 0, keys: [['Tab', 'TAB', 1.6], ['Space', 'SPACE', 6], ['Enter', 'ENTER', 1.8]] },
];
const PAD_BTN_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →'];
function keyLabel(code) {
  if (code == null) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const m = {
    Space: 'SPACE', Tab: 'TAB', Enter: 'ENTER', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT+', ControlLeft: 'CTRL', ControlRight: 'CTRL+', AltLeft: 'ALT', AltRight: 'ALT+',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', CapsLock: 'CAPS',
  };
  return m[code] || code;
}
function padName(i) { return i == null ? '—' : (PAD_BTN_NAMES[i] || ('#' + i)); }

function drawBinds() {
  const S = SCALE;
  UI.btnRects = [];
  rcx(0, 0, CW, CH, 'rgba(4,6,11,0.82)');
  const tab = G.bindTab || 'kb';
  const pw = Math.min(CW - 8 * S, 300 * S), ph = Math.min(CH - 8 * S, (tab === 'kb' ? 210 : 198) * S);
  const x0 = Math.round((CW - pw) / 2), y0 = Math.round((CH - ph) / 2);
  panel(x0, y0, pw, ph);
  const hovIn = (x, y, w, h) => G.mouse.x >= x && G.mouse.x < x + w && G.mouse.y >= y && G.mouse.y < y + h;
  let hovInfo = null; // "какво прави този бутон" под схемата

  // табове + нулирай + назад
  const tabs = [['kb', 'Keyboard'], ['pad', 'Controller']];
  let tx = x0 + 6 * S;
  for (const t of tabs) {
    const tw = 58 * S, th = 13 * S, ty = y0 + 5 * S;
    const cur = tab === t[0];
    panel(tx, ty, tw, th);
    if (cur) strokeRect(tx, ty, tw, th, '#7fd0a0', S);
    else if (hovIn(tx, ty, tw, th)) strokeRect(tx, ty, tw, th, '#ffd23b', S);
    ctx.font = fontBold(6.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = cur ? '#7fd0a0' : '#e8e4d0';
    ctx.fillText(t[1], tx + tw / 2, ty + 9 * S);
    UI.btnRects.push({ x: tx, y: ty, w: tw, h: th, act: ((id) => () => { G.bindTab = id; G.bindWait = null; })(t[0]) });
    tx += tw + 5 * S;
  }
  const topBtn = (label, w, act, right) => {
    const th = 13 * S, ty = y0 + 5 * S, bx = right;
    panel(bx, ty, w, th);
    if (hovIn(bx, ty, w, th)) strokeRect(bx, ty, w, th, '#ffd23b', S);
    ctx.font = fontBold(6.5);
    ctx.fillStyle = '#a8b2c4';
    ctx.fillText(label, bx + w / 2, ty + 9 * S);
    UI.btnRects.push({ x: bx, y: ty, w, h: th, act });
  };
  topBtn('Back', 40 * S, () => { G.bindWait = null; saveProfile(); G.state = 'settings'; }, x0 + pw - 46 * S);
  topBtn('Reset', 46 * S, () => { resetBinds(tab); toast('Buttons reset to default.', '#7fd0a0'); }, x0 + pw - 97 * S);
  ctx.textAlign = 'left';

  const dy0 = y0 + 24 * S;
  let listY;

  if (tab === 'kb') {
    // ---- схема на клавиатурата ----
    const u = 15, blockW = (10 * u - 1 + 12 + 24 + 3 * u) * S; // основен блок + стрелките
    const dx0 = Math.round(x0 + (pw - blockW) / 2);
    const drawKey = (kx, ky, kw, code, label) => {
      const kh = 13 * S;
      const act = actionForKey(code);
      const down = !!G.keys[code];
      const hov = hovIn(kx, ky, kw, kh);
      rcx(kx, ky, kw, kh, down ? '#ffd23b' : '#171c28');
      strokeRect(kx, ky, kw, kh, down ? '#fff6c8' : act ? '#7fd0a0' : '#3a4456', S);
      ctx.font = fontPx(5);
      ctx.textAlign = 'center';
      ctx.fillStyle = down ? '#1a1206' : act ? '#7fd0a0' : '#8d97a9';
      ctx.fillText(label, kx + kw / 2, ky + 9 * S);
      if (hov) {
        strokeRect(kx, ky, kw, kh, '#ffd23b', S);
        hovInfo = keyLabel(code) + ' — ' + (act ? ACTION_MAP[act].n : (code === 'Escape' ? 'pause (fixed)' : 'unbound'));
        // клик върху зает клавиш започва смяна на неговото действие
        if (act) UI.btnRects.push({ x: kx, y: ky, w: kw, h: kh, act: () => { G.bindWait = { dev: 'kb', action: act }; } });
      }
    };
    for (let r = 0; r < KB_ROWS.length; r++) {
      const row = KB_ROWS[r];
      let kx = dx0 + row.ox * S;
      const ky = dy0 + r * 15 * S;
      for (const k of row.keys) {
        const kw = Math.round((14 * (k[2] || 1) + (k[2] ? (k[2] - 1) : 0)) * S);
        drawKey(kx, ky, kw, k[0], k[1]);
        kx += kw + S;
      }
    }
    // стрелките (винаги движение)
    const ax0 = dx0 + (10 * u + 11) * S;
    drawKey(ax0 + 15 * S, dy0 + 45 * S, 14 * S, 'ArrowUp', '↑');
    drawKey(ax0, dy0 + 60 * S, 14 * S, 'ArrowLeft', '←');
    drawKey(ax0 + 15 * S, dy0 + 60 * S, 14 * S, 'ArrowDown', '↓');
    drawKey(ax0 + 30 * S, dy0 + 60 * S, 14 * S, 'ArrowRight', '→');
    ctx.font = fontPx(5);
    ctx.fillStyle = '#5a677f';
    ctx.textAlign = 'center';
    ctx.fillText('arrow keys always move', ax0 + 22 * S, dy0 + 40 * S);
    listY = dy0 + 5 * 15 * S + 6 * S;
  } else {
    // ---- схема на контролера ----
    const cx = x0 + pw / 2, cy = dy0 + 56 * S;
    const P = G.padLive; // живо състояние от pollGamepad
    const down = i => !!(P && P.btns && P.btns[i]);
    const regions = []; // {x,y,w,h,idx} за посочване с мишката
    const box = (bx, by, bw, bh, idx, glyph) => {
      const px2 = Math.round(cx + bx * S), py2 = Math.round(cy + by * S), w2 = bw * S, h2 = bh * S;
      const act = actionForPad(idx);
      const d = down(idx);
      rcx(px2, py2, w2, h2, d ? '#ffd23b' : '#171c28');
      strokeRect(px2, py2, w2, h2, d ? '#fff6c8' : act ? '#7fd0a0' : '#3a4456', S);
      if (glyph) {
        ctx.font = fontPx(4.5);
        ctx.textAlign = 'center';
        ctx.fillStyle = d ? '#1a1206' : '#8d97a9';
        ctx.fillText(glyph, px2 + w2 / 2, py2 + h2 / 2 + 2 * S);
      }
      regions.push({ x: px2, y: py2, w: w2, h: h2, idx });
    };
    const circ = (bx, by, r, idx, glyph, col) => {
      const px2 = cx + bx * S, py2 = cy + by * S, r2 = r * S;
      const act = actionForPad(idx);
      const d = down(idx);
      ctx.fillStyle = d ? '#ffd23b' : '#171c28';
      ctx.beginPath(); ctx.arc(px2, py2, r2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = d ? '#fff6c8' : act ? '#7fd0a0' : (col || '#3a4456');
      ctx.lineWidth = S;
      ctx.beginPath(); ctx.arc(px2, py2, r2, 0, Math.PI * 2); ctx.stroke();
      if (glyph) {
        ctx.font = fontBold(5);
        ctx.textAlign = 'center';
        ctx.fillStyle = d ? '#1a1206' : (col || '#8d97a9');
        ctx.fillText(glyph, px2, py2 + 2 * S);
      }
      regions.push({ x: px2 - r2, y: py2 - r2, w: r2 * 2, h: r2 * 2, idx });
    };
    // тяло — чист заоблен правоъгълник с ясен кант (без "дръжки", които мътнеят)
    rcx(Math.round(cx - 70 * S), Math.round(cy - 26 * S), 140 * S, 46 * S, '#10141d');
    strokeRect(Math.round(cx - 70 * S), Math.round(cy - 26 * S), 140 * S, 46 * S, '#3a4456', S);
    // тригери и брони
    box(-58, -48, 24, 7, 6, 'LT'); box(34, -48, 24, 7, 7, 'RT');
    box(-58, -38, 24, 7, 4, 'LB'); box(34, -38, 24, 7, 5, 'RB');
    // D-пад (кръст)
    box(-48, -17, 8, 9, 12, '▲'); box(-48, 0, 8, 9, 13, '▼');
    box(-57, -8, 9, 8, 14, '◀'); box(-40, -8, 9, 8, 15, '▶');
    // лицеви бутони (A долу, B дясно, X ляво, Y горе)
    circ(44, 5, 6, 0, 'A', '#7fd07f'); circ(53, -4, 6, 1, 'B', '#e06c5a');
    circ(35, -4, 6, 2, 'X', '#5a9ce0'); circ(44, -13, 6, 3, 'Y', '#e0c05a');
    // Back / Start
    box(-16, -8, 11, 7, 8, 'BK'); box(5, -8, 11, 7, 9, 'ST');
    // стикове (живо отклонение по осите)
    const stick = (bx, by, idx, axX, axY) => {
      circ(bx, by, 9, idx, '');
      const ox2 = P ? clamp(P.axes[axX] || 0, -1, 1) * 4 : 0;
      const oy2 = P ? clamp(P.axes[axY] || 0, -1, 1) * 4 : 0;
      ctx.fillStyle = down(idx) ? '#1a1206' : '#5a677f';
      ctx.beginPath(); ctx.arc(cx + (bx + ox2) * S, cy + (by + oy2) * S, 4 * S, 0, Math.PI * 2); ctx.fill();
    };
    stick(-22, 14, 10, 0, 1);
    stick(22, 14, 11, 2, 3);
    ctx.font = fontPx(5);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5a677f';
    ctx.fillText('left stick / D-pad — move · right stick — aim', cx, cy + 32 * S);
    if (!G.padInfo) {
      ctx.fillStyle = '#e0a458';
      ctx.fillText('No controller detected — press a button on it.', cx, dy0 + 2 * S);
    } else {
      ctx.fillStyle = '#7fd0a0';
      ctx.fillText((G.padInfo.id || '').slice(0, 40), cx, dy0 + 2 * S);
    }
    // посочване с мишката: какво прави бутонът + клик за смяна
    for (const rg of regions) {
      if (hovIn(rg.x, rg.y, rg.w, rg.h)) {
        strokeRect(rg.x, rg.y, rg.w, rg.h, '#ffd23b', S);
        const act = actionForPad(rg.idx);
        hovInfo = padName(rg.idx) + ' — ' + (act ? ACTION_MAP[act].n : 'unbound');
        if (act) UI.btnRects.push({ x: rg.x, y: rg.y, w: rg.w, h: rg.h, act: () => { G.bindWait = { dev: 'pad', action: act }; } });
      }
    }
    listY = cy + 38 * S;
  }

  // ---- списък на действията (клик -> натисни нов бутон) ----
  const acts = tab === 'kb' ? ACTIONS : ACTIONS.filter(a => !['up', 'down', 'left', 'right', 'mute'].includes(a.id));
  const cols = 2, rows = Math.ceil(acts.length / cols);
  const colW = (pw - 18 * S) / cols, rowH = 10 * S;
  for (let i = 0; i < acts.length; i++) {
    const a = acts[i];
    const c = Math.floor(i / rows), r = i % rows;
    const rx = x0 + 6 * S + c * (colW + 6 * S), ry = listY + r * rowH;
    const hov = hovIn(rx, ry, colW, rowH);
    const waiting = G.bindWait && G.bindWait.action === a.id && G.bindWait.dev === tab;
    if (hov || waiting) rcx(rx, ry, colW, rowH, 'rgba(255,210,59,0.08)');
    ctx.font = fontPx(5.5);
    ctx.textAlign = 'left';
    ctx.fillStyle = hov || waiting ? '#ffd23b' : '#a8b2c4';
    ctx.fillText(a.n, rx + 2 * S, ry + 7 * S);
    ctx.textAlign = 'right';
    if (waiting) {
      ctx.fillStyle = (G.time % 0.8 < 0.4) ? '#ffd23b' : '#e0a458';
      ctx.fillText(tab === 'kb' ? 'press a key…' : 'press a button…', rx + colW - 2 * S, ry + 7 * S);
    } else {
      const bound = tab === 'kb' ? keyLabel(kbBind(a.id)) : padName(padBind(a.id));
      ctx.fillStyle = bound === '—' ? '#5a677f' : '#7fd0a0';
      ctx.fillText(bound + (a.id === 'attack' && tab === 'kb' ? ' (mouse)' : ''), rx + colW - 2 * S, ry + 7 * S);
    }
    UI.btnRects.push({ x: rx, y: ry, w: colW, h: rowH, act: ((id) => () => { G.bindWait = { dev: tab, action: id }; })(a.id) });
  }
  ctx.textAlign = 'left';

  // статус ред: посочен бутон / указание
  ctx.font = fontPx(6);
  ctx.textAlign = 'center';
  if (G.bindWait) {
    ctx.fillStyle = '#ffd23b';
    ctx.fillText((G.bindWait.dev === 'kb' ? 'Press a key for "' : 'Press a controller button for "') + ACTION_MAP[G.bindWait.action].n + '"  ·  ' + (G.bindWait.dev === 'pad' ? 'Back / ESC — cancel' : 'ESC / B — cancel'), x0 + pw / 2, y0 + ph - 6 * S);
  } else if (hovInfo) {
    ctx.fillStyle = '#e8e4d0';
    ctx.fillText(hovInfo, x0 + pw / 2, y0 + ph - 6 * S);
  } else {
    ctx.fillStyle = '#5a677f';
    ctx.fillText('Press a button — it lights up on the diagram. Tap an action in the list to rebind it.', x0 + pw / 2, y0 + ph - 6 * S);
  }
  ctx.textAlign = 'left';
}

function settingsPress(mx, my) {
  // мишката ползва плъзгача (volRect), затова пропускаме звуковата спирка тук
  for (const b of UI.btnRects) if (b.kind !== 'volume' && mx >= b.x && mx < b.x + b.w && my >= b.y && my < b.y + b.h) { b.act(); return; }
  if (UI.volRect && mx >= UI.volRect.x && mx < UI.volRect.x + UI.volRect.w && my >= UI.volRect.y && my < UI.volRect.y + UI.volRect.h) {
    G.setDrag = true;
    Sfx.setVolume((mx - UI.volRect.x) / UI.volRect.w);
    Sfx.play('coin');
  }
}

// ---------- редактор на контролите ----------
function ensureCtrl() {
  if (!G.meta.ctrl) {
    G.meta.ctrl = {};
    for (const id in CTRL_DEFS) G.meta.ctrl[id] = { fx: CTRL_DEFS[id].fx, fy: CTRL_DEFS[id].fy, fr: CTRL_DEFS[id].fr };
  }
}
function drawCtrlEdit() {
  const S = SCALE;
  UI.btnRects = [];
  rcx(0, 0, CW, CH, 'rgba(4,6,11,0.55)');
  drawTouchControls(true);
  const L = ctrlLayout();

  // лента с ЕДРИ бутони — в средата на екрана вертикално, далеч от системните
  // жестови зони на Android (горен и долен ръб поглъщат докосвания)
  const bh = 26 * S, by = Math.round(CH * 0.5 - bh / 2);
  const bar = [
    { label: 'Cancel', w: 52 * S, act: () => { G.meta.ctrl = G.editBackup ? JSON.parse(JSON.stringify(G.editBackup)) : null; G.editSel = null; G.editDrag = null; G.state = 'settings'; } },
    { label: 'Reset', w: 60 * S, act: () => { G.meta.ctrl = null; ensureCtrl(); G.editSel = null; } },
    { label: 'Done', w: 58 * S, act: () => { G.editDrag = null; saveProfile(); G.state = 'settings'; toast('Controls saved.', '#7fd0a0'); } },
  ];
  const totW = bar.reduce((s, b) => s + b.w, 0) + (bar.length - 1) * 10 * S;
  let bx = (CW - totW) / 2;
  for (const b of bar) {
    const hov = G.mouse.x >= bx && G.mouse.x < bx + b.w && G.mouse.y >= by && G.mouse.y < by + bh;
    panel(bx, by, b.w, bh);
    if (hov) strokeRect(bx, by, b.w, bh, '#ffd23b', S);
    ctx.font = fontBold(9);
    ctx.fillStyle = hov ? '#ffd23b' : '#e8e4d0';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, bx + b.w / 2, by + 16.5 * S);
    // щедра зона на натискане (+6S от всички страни)
    UI.btnRects.push({ x: bx - 6 * S, y: by - 6 * S, w: b.w + 12 * S, h: bh + 12 * S, act: b.act });
    bx += b.w + 10 * S;
  }
  ctx.font = fontPx(7);
  ctx.fillStyle = '#a8b2c4';
  ctx.fillText(G.editSel ? 'Drag it, or tap − / + next to it.' : 'Tap a button to select it. Drag to move it.', CW / 2, by - 8 * S);
  ctx.textAlign = 'left';

  // маркери: къде играта регистрира допирите (диагностика)
  if (G.touchMarks) {
    for (const m of G.touchMarks) {
      const age = G.time - m.t;
      if (age > 1.2) continue;
      ctx.globalAlpha = clamp(1 - age / 1.2, 0, 1);
      ctx.strokeStyle = '#57e6c8';
      ctx.lineWidth = S;
      ctx.beginPath(); ctx.arc(m.x, m.y, 8 * S + age * 10 * S, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // избраният бутон: златен пръстен + име + ГОЛЕМИ − / + от двете му страни
  if (G.editSel && L[G.editSel]) {
    const c = L[G.editSel];
    ctx.strokeStyle = '#ffd23b';
    ctx.lineWidth = Math.max(2, S);
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 3 * S, 0, Math.PI * 2); ctx.stroke();
    ctx.font = fontBold(7);
    ctx.fillStyle = '#ffd23b';
    ctx.textAlign = 'center';
    ctx.fillText(CTRL_DEFS[G.editSel].name, c.x, c.y - c.r - 18 * S);
    // кръгли − / +
    const rr = 13 * S;
    const mkBtn = (dx, glyph, act) => {
      const px0 = clamp(c.x + dx, rr + 2 * S, CW - rr - 2 * S);
      const py0 = clamp(c.y, rr + 40 * S, CH - rr - 2 * S);
      ctx.fillStyle = 'rgba(20,26,40,0.9)';
      ctx.beginPath(); ctx.arc(px0, py0, rr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd23b';
      ctx.lineWidth = S;
      ctx.beginPath(); ctx.arc(px0, py0, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.font = fontBold(12);
      ctx.fillStyle = '#ffd23b';
      ctx.fillText(glyph, px0, py0 + 4 * S);
      UI.btnRects.push({ x: px0 - rr, y: py0 - rr, w: rr * 2, h: rr * 2, act });
    };
    mkBtn(-(c.r + 20 * S), '−', () => resizeSel(-0.008));
    mkBtn(c.r + 20 * S, '+', () => resizeSel(0.008));
    ctx.textAlign = 'left';
  }
}
function resizeSel(d) {
  if (!G.editSel) { toast('First select a button.', '#7d8899'); return; }
  ensureCtrl();
  const c = G.meta.ctrl[G.editSel];
  c.fr = clamp(c.fr + d, 0.035, 0.22);
}
function ctrlEditPress(mx, my, touchId) {
  for (const b of UI.btnRects) if (mx >= b.x && mx < b.x + b.w && my >= b.y && my < b.y + b.h) { b.act(); return; }
  const id = ctrlHit(mx, my, true);
  if (id) {
    ensureCtrl();
    G.editSel = id;
    const c = ctrlLayout()[id];
    G.editDrag = { id, touchId: touchId === undefined ? null : touchId, ox: mx - c.x, oy: my - c.y };
  } else {
    G.editSel = null;
  }
}
function ctrlEditMove(mx, my) {
  if (!G.editDrag) return;
  const c = G.meta.ctrl[G.editDrag.id];
  c.fx = clamp((mx - G.editDrag.ox) / CW, 0.03, 0.97);
  c.fy = clamp((my - G.editDrag.oy) / CH, 0.06, 0.95);
}

// ---------- винетка с дитеринг (остра, без градиент) ----------
let vignetteCv = null;
function makeVignette() {
  const aw = Math.max(1, Math.ceil(CW / SCALE)), ah = Math.max(1, Math.ceil(CH / SCALE));
  const g = mk(aw, ah);
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
    const nx = x / aw - 0.5, ny = y / ah - 0.5;
    const d = Math.hypot(nx * 1.15, ny * 1.35);
    const v = clamp((d - 0.52) * 2.0, 0, 1) * 0.4;
    if (v > bayer[y % 4][x % 4] / 16) px(g, x, y, 'rgba(3,5,9,0.7)');
  }
  vignetteCv = g.canvas;
}
function drawVignette() {
  if (!vignetteCv) makeVignette();
  if (!vignetteCv.width || !vignetteCv.height) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(vignetteCv, 0, 0, vignetteCv.width, vignetteCv.height, 0, 0, vignetteCv.width * SCALE, vignetteCv.height * SCALE);
}
