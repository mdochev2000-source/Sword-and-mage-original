'use strict';
// ================= ГЛАВЕН ЦИКЪЛ: вход, ъпдейт, рендер =================

var cv, ctx, CW, CH;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  computeScale();
  CW = Math.floor(window.innerWidth * dpr);
  CH = Math.floor(window.innerHeight * dpr);
  cv.width = CW;
  cv.height = CH;
  cv.style.width = window.innerWidth + 'px';
  cv.style.height = window.innerHeight + 'px';
  ctx.imageSmoothingEnabled = false;
  vignetteCv = null;
  // телефон в портрет -> подкана за завъртане (играта е правена за пейзаж)
  G.portrait = G.isTouch && window.innerHeight > window.innerWidth;
  if (G.portrait && G.state === 'play') { G.state = 'pause'; document.body.classList.add('menu'); }
}

// ---------- вход ----------
function setupInput() {
  const dpr = () => window.devicePixelRatio || 1;
  window.addEventListener('keydown', e => {
    // спираме прелистване от тези клавиши; но при въвеждане на име Space трябва да мине в полето
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && !(e.code === 'Space' && G.state === 'newchar')) e.preventDefault();
    if (e.repeat) { G.keys[e.code] = true; return; }
    G.keys[e.code] = true;
    Sfx.init(); Sfx.resume();

    if (G.state === 'newchar') { G.nameKbOn = false; return; } // физическа клавиатура -> скрий виртуалната; пишем в полето

    // прихващане на нов клавиш в екрана за биндове
    if (G.state === 'binds' && G.bindWait && G.bindWait.dev === 'kb') {
      if (e.code !== 'Escape') assignBind('kb', G.bindWait.action, e.code);
      G.bindWait = null;
      e.preventDefault();
      return;
    }

    if (e.code === kbBind('mute')) { const m = Sfx.toggleMute(); toast(m ? 'Sound: off' : 'Sound: on', '#7d8899'); return; }

    switch (G.state) {
      case 'title':
        if (e.code === 'Enter' || e.code === 'Space') {
          G.delArm = null; // да не остане „въоръжено" триене от предишен път
          if (loadCharList().some(c => c)) G.state = 'charselect';
          else { G.state = 'newchar'; startNameInput(); }
        }
        break;
      case 'dead':
        if (e.code === 'Enter' || e.code === 'Space') respawnAtCamp();
        break;
      case 'shop':
        if (e.code === 'Escape' || e.code === kbBind('interact')) closeShop();
        break;
      case 'play': {
        if (e.code === 'Escape') { G.state = 'pause'; document.body.classList.add('menu'); break; }
        if (e.code === 'Tab') { G.state = 'inventory'; document.body.classList.add('menu'); break; }
        const act = actionForKey(e.code);
        if (act === 'dash') tryDash();
        else if (act === 'potion1') usePotion(0);
        else if (act === 'potion2') usePotion(1);
        else if (act === 'spell1') castSpell(0);
        else if (act === 'spell2') castSpell(1);
        else if (act === 'spell3') castSpell(2);
        else if (act === 'interact') doInteract();
        else if (act === 'inventory') { G.state = 'inventory'; document.body.classList.add('menu'); }
        else if (act === 'spellbook') openSpellbook();
        else if (act === 'skilltree') openSkillTree();
        else if (act === 'settings') openSettings();
        break;
      }
      case 'spellbook':
        if (e.code === 'Escape' || e.code === kbBind('spellbook')) { if (G.sbConfirm) G.sbConfirm = null; else closeSpellbook(); }
        break;
      case 'skilltree':
        if (e.code === 'Escape' || e.code === kbBind('skilltree')) closeSkillTree();
        break;
      case 'stats':
        if (e.code === 'Escape' || e.code === kbBind('inventory') || e.code === 'Tab') closeStats();
        break;
      case 'descend':
      case 'charselect':
        if (e.code === 'Escape') { G.delArm = null; G.state = G.state === 'descend' ? 'play' : 'title'; if (G.state === 'play') document.body.classList.remove('menu'); }
        break;
      case 'inventory':
        if (e.code === kbBind('inventory') || e.code === 'Escape' || e.code === 'Tab') { G.invSel = null; G.state = 'play'; document.body.classList.remove('menu'); }
        break;
      case 'pause':
        if (e.code === 'Escape' || e.code === 'Enter') { G.state = 'play'; document.body.classList.remove('menu'); }
        break;
      case 'levelup':
        if (G.time - (G.levelupOpenedAt || 0) < 0.3) break; // защита от инерционно натискане
        if (e.code === 'Digit1') applyPerk(0);
        else if (e.code === 'Digit2') applyPerk(1);
        else if (e.code === 'Digit3') applyPerk(2);
        else if (e.code === 'ArrowLeft' || e.code === kbBind('left')) G.perkSel = clamp((G.perkSel || 0) - 1, 0, 2);
        else if (e.code === 'ArrowRight' || e.code === kbBind('right')) G.perkSel = clamp((G.perkSel || 0) + 1, 0, 2);
        else if (e.code === 'Enter' || e.code === 'Space') applyPerk(G.perkSel || 0);
        break;
      case 'settings':
        if (e.code === 'Escape') closeSettings();
        break;
      case 'inputmode':
        if (e.code === 'Escape') G.state = 'settings';
        break;
      case 'binds':
        if (e.code === 'Escape') { if (G.bindWait) G.bindWait = null; else { saveProfile(); G.state = 'settings'; } }
        break;
      case 'potionsel':
        if (e.code === 'Escape') closePotionSelect();
        break;
      case 'ctrledit':
        if (e.code === 'Escape') { saveProfile(); G.state = 'settings'; }
        break;
    }
  });
  window.addEventListener('keyup', e => { G.keys[e.code] = false; });
  window.addEventListener('blur', () => {
    G.keys = Object.create(null);
    G.mouse.down = G.mouse.rdown = false;
    G.joy = null; G.atkHold = null; G.fireHold = null;
    if (G.state === 'play') { G.state = 'pause'; document.body.classList.add('menu'); }
  });

  cv.addEventListener('mousemove', e => {
    const r = cv.getBoundingClientRect();
    G.mouse.x = (e.clientX - r.left) * (CW / r.width);
    G.mouse.y = (e.clientY - r.top) * (CH / r.height);
    if (G.state === 'ctrledit' && G.editDrag && G.editDrag.touchId === null) ctrlEditMove(G.mouse.x, G.mouse.y);
    if (G.state === 'settings' && G.setDrag && UI.volRect) Sfx.setVolume((G.mouse.x - UI.volRect.x) / UI.volRect.w);
  });
  cv.addEventListener('mousedown', e => {
    // без preventDefault канвасът краде фокуса от скритото поле за име
    e.preventDefault();
    Sfx.init(); Sfx.resume();
    const r = cv.getBoundingClientRect();
    G.mouse.x = (e.clientX - r.left) * (CW / r.width);
    G.mouse.y = (e.clientY - r.top) * (CH / r.height);
    handlePress(G.mouse.x, G.mouse.y, e.button);
  });
  window.addEventListener('mouseup', e => {
    if (e.button === 0) { G.mouse.down = false; G.editDrag = null; G.setDrag = false; }
    if (e.button === 2) G.mouse.rdown = false;
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  setupTouch();
  window.addEventListener('gamepadconnected', e => {
    toast('Controller: ' + (e.gamepad.id || '').slice(0, 30), '#7fd0a0');
    Sfx.play('pickup');
  });
  window.addEventListener('gamepaddisconnected', () => {
    G.pad = null; G.padAtkHold = false;
    padCentered = []; padRestId = -1; padPrev = []; // друг контролер да се калибрира наново
  });
}

// общ вход за мишка и тъч
function handlePress(mx, my, button) {
  if (button === 0) {
    switch (G.state) {
      case 'newchar':
        if (G.nameKbOn && UI.kbKeys) {
          // клик по виртуален клавиш
          for (const k of UI.kbKeys) if (mx >= k.x && mx < k.x + k.w && my >= k.y && my < k.y + k.h) { G.kbRow = k.r; G.kbCol = k.c; activateNameKey(); return; }
          break;
        }
        for (const b of UI.btnRects) if (mx >= b.x && mx < b.x + b.w && my >= b.y && my < b.y + b.h) { b.act(); break; }
        if (typeof nameInputEl !== 'undefined' && nameInputEl && G.state === 'newchar') nameInputEl.focus(); // клавиатурата винаги пише в полето
        break;
      case 'title':
      case 'dead':
      case 'charselect':
      case 'spellbook':
      case 'skilltree':
      case 'stats':
      case 'descend':
      case 'inputmode':
      case 'binds':
      case 'potionsel':
        for (const b of UI.btnRects) if (mx >= b.x && mx < b.x + b.w && my >= b.y && my < b.y + b.h) { b.act(); break; }
        break;
      case 'shop': shopClick(mx, my); break;
      case 'play': {
        let usedHot = false;
        for (const hb of UI.hotRects) if (mx >= hb.x && mx < hb.x + hb.w && my >= hb.y && my < hb.y + hb.h) { if (hb.act) hb.act(); usedHot = true; }
        // виртуалните бутони работят и с мишка, ако този режим е избран
        if (!usedHot && useTouchUI()) {
          const id = ctrlHit(mx, my, false);
          if (id && id !== 'joy') { ctrlPress(id); usedHot = true; }
        }
        if (!usedHot) G.mouse.down = true;
        break;
      }
      case 'inventory': inventoryClick(mx, my); break;
      case 'levelup': levelupClick(mx, my); break;
      case 'pause': G.state = 'play'; document.body.classList.remove('menu'); break;
      case 'settings': settingsPress(mx, my); break;
      case 'ctrledit': ctrlEditPress(mx, my); break;
    }
  } else if (button === 2) {
    if (G.state === 'play') G.mouse.rdown = true;
    else if (G.state === 'inventory') inventoryDrop(mx, my);
  }
}

// ---------- тъч управление: джойстик вляво, атака вдясно, бутоните от хотбара ----------
let _lockTried = false;
function tryLockLandscape() {
  if (_lockTried || !G.isTouch) return;
  _lockTried = true;
  try {
    const el = document.documentElement;
    Promise.resolve(el.requestFullscreen && el.requestFullscreen())
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
      .catch(() => {});
  } catch (e) {}
}
function touchPos(t) {
  // мащабираме през реалния размер на канваса, не през devicePixelRatio —
  // в Android WebView те могат да се разминават и допирът "уцелва" встрани
  const r = cv.getBoundingClientRect();
  return { x: (t.clientX - r.left) * (CW / r.width), y: (t.clientY - r.top) * (CH / r.height) };
}
function setupTouch() {
  cv.addEventListener('touchstart', e => {
    e.preventDefault();
    Sfx.init(); Sfx.resume();
    tryLockLandscape();
    for (const t of e.changedTouches) {
      const p0 = touchPos(t);
      if (G.state === 'ctrledit') {
        // видим маркер къде играта регистрира допира (за диагностика на място)
        (G.touchMarks = G.touchMarks || []).push({ x: p0.x, y: p0.y, t: G.time });
        if (G.touchMarks.length > 8) G.touchMarks.shift();
        ctrlEditPress(p0.x, p0.y, t.identifier);
        continue;
      }
      if (G.state !== 'play') {
        // магазин: влаченето по списъка със стока скролва; тапът (без влачене) селектира на touchend
        if (G.state === 'shop' && UI.shopListRect && p0.x >= UI.shopListRect.x && p0.x < UI.shopListRect.x + UI.shopListRect.w && p0.y >= UI.shopListRect.y && p0.y < UI.shopListRect.y + UI.shopListRect.h) {
          G.shopDrag = { id: t.identifier, sy: p0.y, sScroll: G.shopScroll || 0, moved: false, tapX: p0.x, tapY: p0.y };
          continue;
        }
        handlePress(p0.x, p0.y, 0); continue;
      }
      let hot = false;
      for (const hb of UI.hotRects) if (p0.x >= hb.x && p0.x < hb.x + hb.w && p0.y >= hb.y && p0.y < hb.y + hb.h) { if (hb.act) hb.act(); hot = true; }
      if (hot) continue;
      // допир директно върху обекта за взаимодействие (продавач, портал, сандък...)
      if (G.interactHint) {
        const pr = G.interactHint.pr;
        const psx = isoX(pr.x, pr.y) + G.camRX, psy = isoY(pr.x, pr.y) + G.camRY - 10 * SCALE;
        if (Math.hypot(p0.x - psx, p0.y - psy) < TW * 0.9) { doInteract(); continue; }
      }
      const id = ctrlHit(p0.x, p0.y, false);
      if (id === 'joy' && !G.joy) {
        const c = ctrlLayout().joy;
        G.joy = { id: t.identifier, sx: c.x, sy: c.y, dx: p0.x - c.x, dy: p0.y - c.y };
      } else if (id === 'atk' && G.atkHold === null) {
        G.atkHold = t.identifier;
        autoMelee();
      } else if (id === 'm1' && G.fireHold === null) {
        G.fireHold = t.identifier;
        tryFireballAuto();
      } else if (id) {
        ctrlPress(id);
      }
    }
  }, { passive: false });
  cv.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const p0 = touchPos(t);
      if (G.state === 'ctrledit' && G.editDrag && G.editDrag.touchId === t.identifier) { ctrlEditMove(p0.x, p0.y); continue; }
      if (G.state === 'settings' && G.setDrag && UI.volRect) { Sfx.setVolume((p0.x - UI.volRect.x) / UI.volRect.w); continue; }
      if (G.state === 'shop' && G.shopDrag && G.shopDrag.id === t.identifier) {
        const dy = p0.y - G.shopDrag.sy;
        if (Math.abs(dy) > 4 * SCALE) G.shopDrag.moved = true;
        G.shopScroll = G.shopDrag.sScroll - dy; // clamp-ва се в drawShop
        continue;
      }
      if (G.joy && t.identifier === G.joy.id) {
        G.joy.dx = p0.x - G.joy.sx;
        G.joy.dy = p0.y - G.joy.sy;
      }
    }
  }, { passive: false });
  const touchEnd = e => {
    for (const t of e.changedTouches) {
      if (G.shopDrag && G.shopDrag.id === t.identifier) {
        if (!G.shopDrag.moved) handlePress(G.shopDrag.tapX, G.shopDrag.tapY, 0); // тап без влачене -> селектирай
        G.shopDrag = null;
      }
      if (G.joy && t.identifier === G.joy.id) G.joy = null;
      if (t.identifier === G.atkHold) G.atkHold = null;
      if (t.identifier === G.fireHold) G.fireHold = null;
      if (G.editDrag && G.editDrag.touchId === t.identifier) G.editDrag = null;
      G.setDrag = false;
    }
  };
  cv.addEventListener('touchend', touchEnd);
  cv.addEventListener('touchcancel', touchEnd);
  // колелце на мишката — скрол в магазина (десктоп)
  cv.addEventListener('wheel', e => {
    if (G.state === 'shop' && UI.shopListRect && UI.shopListRect.maxScroll > 0) {
      G.shopScroll = clamp((G.shopScroll || 0) + Math.sign(e.deltaY) * 24 * SCALE, 0, UI.shopListRect.maxScroll);
      e.preventDefault();
    }
  }, { passive: false });
}

// ---------- контролер (Gamepad API — GameSir и стандартни падове) ----------
// Схема: ляв стик/D-pad — движение · десен стик — прицел · A — атака · B — отскок
// X — действие (E) · Y — магия 1 · RB — магия 2 · RT — магия 3 · LB/LT — отвари · Start — настройки · Back — инвентар
let padPrev = [];
let padMenuV = false, padMenuH = false; // латчове за стъпка на курсора в менютата
let padCentered = [], padRestId = -1;   // кои оси са били в покой (истински стик) — маха самоходенето
function closeTopMenu() {
  switch (G.state) {
    case 'stats': closeStats(); break; // връща в инвентара
    case 'inventory': case 'spellbook': case 'skilltree':
      if (G.state === 'spellbook' && G.sbConfirm) { G.sbConfirm = null; break; } // първо затвори потвърждението
      G.invSel = null; G.sbConfirm = null; G.state = 'play'; document.body.classList.remove('menu'); break;
    case 'settings': closeSettings(); break; // записва (вкл. силата на звука)
    case 'shop': closeShop(); break;
    case 'binds': saveProfile(); G.state = 'settings'; break;
    case 'inputmode': G.state = 'settings'; break;
    case 'potionsel': closePotionSelect(); break;
    case 'pause': G.state = 'play'; document.body.classList.remove('menu'); break;
    case 'charselect': G.delArm = null; G.state = 'title'; break;
  }
}
function pollGamepad() {
  if (!navigator.getGamepads) return;
  let gp = null;
  try { for (const p2 of navigator.getGamepads()) if (p2 && p2.connected) { gp = p2; break; } } catch (e) {}
  G.padInfo = gp ? { id: gp.id, mapping: gp.mapping, buttons: gp.buttons.length, axes: gp.axes.map(a => +a.toFixed(2)) } : null;
  // във ВСЯКО меню контролерът трябва да работи дори ако режимът не е „контролер"
  // (иначе избереш kbm/touch от Управление и се заключваш без изход с пад)
  const watchOnly = !!menuNavStates[G.state];
  if (!gp || (!usePad() && !watchOnly)) { G.pad = null; G.padAtkHold = false; G.padLive = null; return; }
  // жива диагностика: последният натиснат бутон (за прозореца "Управление")
  for (let i = 0; i < gp.buttons.length; i++) {
    const b = gp.buttons[i];
    if (b && (b.pressed || b.value > 0.5)) { G.padLastBtn = i; G.padLastBtnT = G.time; }
  }
  // живо състояние за диаграмата на контролера (екран "Биндове")
  G.padLive = {
    btns: gp.buttons.map(b => !!(b && (b.pressed || b.value > 0.5))),
    axes: [gp.axes[0] || 0, gp.axes[1] || 0, gp.axes[2] || 0, gp.axes[3] || 0],
  };
  if (G.state === 'binds' && G.bindWait) {
    // чакаме нов бинд: следващият пад-бутон се лови; Back(8) отказва; при чакане на КЛАВИШ — B отказва
    for (let i = 0; i < gp.buttons.length; i++) {
      const b = gp.buttons[i];
      const now = !!(b && (b.pressed || b.value > 0.5));
      const fresh = now && !padPrev[i];
      // G.bindWait може да стане null след първия бутон в същия кадър -> винаги проверявай
      if (fresh && G.bindWait && G.bindWait.dev === 'pad' && i === 8) { G.bindWait = null; Sfx.play('deny'); }
      else if (fresh && G.bindWait && G.bindWait.dev === 'pad') { assignBind('pad', G.bindWait.action, i); G.bindWait = null; }
      else if (fresh && G.bindWait && G.bindWait.dev === 'kb' && i === 1) { G.bindWait = null; Sfx.play('deny'); }
      padPrev[i] = now;
    }
    return;
  }
  // (binds/inputmode без чакащ бинд продължават към общата навигация по-долу)
  const pressed = i => { const b = gp.buttons[i]; return !!(b && (b.pressed || b.value > 0.5)); };
  // --- срещу самоходене: широка радиална мъртва зона + пренебрегване на „заклещени" оси ---
  // Клавиатурата дава точни цели стойности, затова там няма проблем; при контролер
  // дрейфът и грешно мапнати оси (тригер/ос, която в покой стои на ±1) караха героя да върви сам.
  const DEAD = 0.35;
  if (padRestId !== gp.index) { padRestId = gp.index; padCentered = []; } // нов контролер -> ново обучение
  // ос се приема за истинска (стик), само ако ПОНЕ ВЕДНЪЖ е била близо до покой;
  // ос, която винаги стои на екстремна стойност, е грешно мапната и се пренебрегва
  for (let i = 0; i < 4; i++) if (Math.abs(gp.axes[i] || 0) < DEAD) padCentered[i] = true;
  const useAx = i => padCentered[i] ? (gp.axes[i] || 0) : 0;
  let lx = useAx(0), ly = useAx(1);
  // десен стик за прицел — само при стандартно мапване (иначе тригер на ос 2/3 краде прицела)
  let ax = 0, ay = 0;
  if (gp.mapping === 'standard') { ax = useAx(2); ay = useAx(3); }
  if (Math.hypot(lx, ly) < DEAD) { lx = 0; ly = 0; }
  if (Math.hypot(ax, ay) < DEAD) { ax = 0; ay = 0; }
  let mx = lx, my = ly;
  // D-pad също движи
  if (pressed(14)) mx = -1; if (pressed(15)) mx = 1;
  if (pressed(12)) my = -1; if (pressed(13)) my = 1;
  G.pad = { mx, my };
  if (mx || my || ax || ay) G.padUseT = G.time; // падът е активен -> мишката отстъпва прицела
  const edge = i => { const now = pressed(i); const was = padPrev[i]; padPrev[i] = now; if (now && !was) { G.padUseT = G.time; return true; } return false; };
  const pb = id => padBind(id); // текущият бинд на действието (може да е сменен)
  G.padAtkHold = G.state === 'play' && pb('attack') != null && pressed(pb('attack'));
  if (G.state === 'play') {
    G.menuState = null; // напуснали сме менютата -> следващото отваряне е „свежо" (пази от фалшив спусък)
    const on = id => pb(id) != null && edge(pb(id));
    if (on('dash')) tryDash();
    if (on('interact')) doInteract();
    if (on('spell1')) castSpell(0);
    if (on('spell2')) castSpell(1);
    if (on('spell3')) castSpell(2);
    if (on('potion1')) usePotion(0);
    if (on('potion2')) usePotion(1);
    if (on('settings')) openSettings();
    if (on('inventory')) { G.state = 'inventory'; document.body.classList.add('menu'); }
    if (on('spellbook')) openSpellbook();
    if (on('skilltree')) openSkillTree();
    // прицел с десния стик (екранен вектор -> световен ъгъл)
    if ((ax || ay) && G.player) {
      const a = ax / (TW / 2), b = ay / (TH / 2);
      G.player.aimA = Math.atan2((b - a) / 2, (a + b) / 2);
      G.padAimT = G.time;
    }
  } else if (G.state === 'levelup') {
    const guard = G.time - (G.levelupOpenedAt || 0) < 0.3;
    // курсор: ляв стик/D-pad наляво-надясно (d-pad вкарва mx=±1)
    if (mx <= -0.5) { if (!padMenuH) { G.perkSel = clamp((G.perkSel || 0) - 1, 0, 2); padMenuH = true; Sfx.play('coin'); } }
    else if (mx >= 0.5) { if (!padMenuH) { G.perkSel = clamp((G.perkSel || 0) + 1, 0, 2); padMenuH = true; Sfx.play('coin'); } }
    else padMenuH = false;
    // потвърждение: A (бутон 0) винаги + бутонът на „атака" (ако е пренасочен)
    const cb = pb('attack');
    let confirmPressed = edge(0);
    if (cb != null && cb !== 0) confirmPressed = edge(cb) || confirmPressed;
    if (!guard && confirmPressed) applyPerk(G.perkSel || 0);
    edge(1); edge(9); edge(2); edge(3); edge(5); // поглъщаме останалите
  } else if (G.state === 'newchar' && (G.nameKbOn || (
      // реален вход от контролера (стик/D-pad/бутон) връща виртуалната клавиатура;
      // само padRecent() не стига — иначе не можеш да минеш на физическа клавиатура
      Math.abs(mx) > 0.5 || Math.abs(my) > 0.5 || pressed(0) || pressed(1) || pressed(2) || pressed(3) || pressed(12) || pressed(13) || pressed(14) || pressed(15)
    ))) {
    // ---- виртуална клавиатура: 2D навигация по клавишите ----
    const justOpened = !G.nameKbOn; // това натискане само отваря клавиатурата -> не пиши още
    G.nameKbOn = true;
    const rows = NAMEKB;
    if (G.kbRow == null) { G.kbRow = 1; G.kbCol = 0; }
    if (my <= -0.5) { if (!padMenuV) { G.kbRow = (G.kbRow - 1 + rows.length) % rows.length; padMenuV = true; Sfx.play('coin'); } }
    else if (my >= 0.5) { if (!padMenuV) { G.kbRow = (G.kbRow + 1) % rows.length; padMenuV = true; Sfx.play('coin'); } }
    else padMenuV = false;
    G.kbCol = clamp(G.kbCol, 0, rows[G.kbRow].length - 1);
    if (mx <= -0.5) { if (!padMenuH) { G.kbCol = (G.kbCol - 1 + rows[G.kbRow].length) % rows[G.kbRow].length; padMenuH = true; Sfx.play('coin'); } }
    else if (mx >= 0.5) { if (!padMenuH) { G.kbCol = (G.kbCol + 1) % rows[G.kbRow].length; padMenuH = true; Sfx.play('coin'); } }
    else padMenuH = false;
    // A / бинда на „атака" -> избери клавиш; B -> изтрий
    const cb = pb('attack');
    let confirmPressed = edge(0);
    if (cb != null && cb !== 0) confirmPressed = edge(cb) || confirmPressed;
    if (confirmPressed && !justOpened) activateNameKey(); // на кадъра на отваряне не пишем стой буква
    if (edge(1) && !justOpened) nameBackspace();
    edge(9); edge(2); edge(3); edge(5); edge(7); // поглъщаме
  } else {
    // ---- обща навигация във всяко меню (пространствено, по разположение) ----
    const nav = menuNavStates[G.state];
    let navConfirmed = false;
    const focus = nav ? menuFocusRects() : null;
    if (nav && focus && focus.length) {
      const n = focus.length;
      const fresh = G.menuState !== G.state; // първи кадър в това меню
      if (fresh) {
        G.menuState = G.state; G.menuSel = 0;
        // синхронизираме padPrev с текущо държаните бутони, за да не даде задържан бутон
        // фалшив „преден фронт" и да потвърди нещо на кадъра на влизане
        for (let i = 0; i < gp.buttons.length; i++) padPrev[i] = pressed(i);
      }
      G.menuSel = clamp(G.menuSel || 0, 0, n - 1);
      // вертикално движение (пространствено)
      if (my <= -0.5) { if (!padMenuV) { G.menuSel = navSpatial(focus, G.menuSel, 'up'); padMenuV = true; Sfx.play('coin'); } }
      else if (my >= 0.5) { if (!padMenuV) { G.menuSel = navSpatial(focus, G.menuSel, 'down'); padMenuV = true; Sfx.play('coin'); } }
      else padMenuV = false;
      G.menuSel = clamp(G.menuSel, 0, n - 1);
      const selRect = focus[G.menuSel];
      if (selRect && selRect.kind === 'volume') {
        // на реда „Звук" ляво/дясно мени силата плавно (не мести курсора)
        const cvol = (G.meta.volume !== undefined ? G.meta.volume : 0.8);
        if (mx <= -0.5) Sfx.setVolume(cvol - 0.02);
        else if (mx >= 0.5) Sfx.setVolume(cvol + 0.02);
        padMenuH = false;
      } else {
        // хоризонтално (пространствено — за решетки/табове)
        if (mx <= -0.5) { if (!padMenuH) { G.menuSel = navSpatial(focus, G.menuSel, 'left'); padMenuH = true; Sfx.play('coin'); } }
        else if (mx >= 0.5) { if (!padMenuH) { G.menuSel = navSpatial(focus, G.menuSel, 'right'); padMenuH = true; Sfx.play('coin'); } }
        else padMenuH = false;
      }
      // потвърждение: A (бутон 0) винаги + бутонът на „атака"; не на кадъра на влизане
      const cb = pb('attack');
      let confirmPressed = edge(0);
      if (cb != null && cb !== 0) confirmPressed = edge(cb) || confirmPressed;
      if (!fresh && confirmPressed) {
        const r = focus[G.menuSel];
        if (r && r.kind !== 'volume') { menuConfirm(r); Sfx.play('pickup'); navConfirmed = true; }
      }
      // Y (бутон 3) в инвентара -> изхвърли фокусирания предмет
      if (!fresh && G.state === 'inventory' && edge(3)) {
        const r = focus[G.menuSel];
        if (r && r.item && r.idx != null) { inventoryDrop(r.x + r.w / 2, r.y + r.h / 2); Sfx.play('open'); }
      }
    } else { G.menuState = null; padMenuV = padMenuH = false; }
    if (!navConfirmed && (edge(1) || edge(9))) closeTopMenu();
    // защита: ако при смъртта държиш бутона за атака, да не прескочи екрана със статистиките
    if (G.state === 'dead' && (G.deadT || 0) > 0.4 && edge(0)) respawnAtCamp();
    if (G.state === 'title' && !nav && edge(0)) {
      if (loadCharList().some(c => c)) G.state = 'charselect';
      else { G.state = 'newchar'; startNameInput(); }
    }
    edge(2); edge(3); edge(5);
    if (!nav) edge(0); // в не-навигируемите менюта поглъщаме A, за да няма фалшив спусък
  }
}

// ---------- ъпдейт ----------
function update(dt) {
  pollGamepad();
  G.time += dt;
  G.msgT = Math.max(0, G.msgT - dt);
  G.shake = Math.max(0, G.shake - dt * 18);
  G.hurtFlash = Math.max(0, G.hurtFlash - dt * 2);
  Sfx.updateMusic(dt, G.state === 'play');

  if (G.state === 'play') {
    if (G.hitStop > 0) { G.hitStop -= dt; return; }
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    updateHazards(dt);
    if (G.zaps) for (let i = G.zaps.length - 1; i >= 0; i--) { G.zaps[i].t += dt; if (G.zaps[i].t > 0.18) G.zaps.splice(i, 1); }
    if (G.novaFx) for (let i = G.novaFx.length - 1; i >= 0; i--) { G.novaFx[i].t += dt; if (G.novaFx[i].t > 0.35) G.novaFx.splice(i, 1); }
    // светят ли прозорците за нови нива (ако е дошло по време на друга пауза)
    if (G.levelupQueue > 0 && G.state === 'play' && !G.levelupChoices) openLevelup();
  } else if (G.state === 'transition') {
    G.transT += dt;
    if (G.transT >= 1 && !G.transDone) {
      G.transDone = true;
      startFloor(G.transTarget || G.depth + 1);
    }
    if (G.transT >= 2) {
      G.transDone = false;
      if (document.hasFocus()) { G.state = 'play'; }
      else { G.state = 'pause'; document.body.classList.add('menu'); } // без фокус — направо в пауза
    }
    updateParticles(dt);
  } else if (G.state === 'dead') {
    G.deadT = (G.deadT || 0) + dt;
    updateParticles(dt);
  } else if (G.state === 'title' || G.state === 'charselect' || G.state === 'newchar') {
    // въглените в менютата
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const pa = G.particles[i];
      pa.t += dt;
      pa.z += pa.vz * dt;
      pa.x += pa.vx * dt;
      if (pa.t >= pa.life) G.particles.splice(i, 1);
    }
  }
}

// ---------- камера ----------
function updateCamera() {
  const p = G.player;
  const tx = CW / 2 - isoX(p.x, p.y);
  const ty = CH / 2 - isoY(p.x, p.y) + 20 * SCALE;
  if (!G.camInit) { G.camX = tx; G.camY = ty; G.camInit = true; }
  else {
    G.camX = lerp(G.camX, tx, 0.12);
    G.camY = lerp(G.camY, ty, 0.12);
  }
  let ox = 0, oy = 0;
  if (G.shake > 0) {
    ox = rnd(-1, 1) * G.shake * SCALE * 0.4;
    oy = rnd(-1, 1) * G.shake * SCALE * 0.4;
  }
  G.camRX = Math.round(G.camX + ox);
  G.camRY = Math.round(G.camY + oy);
  // световни координати на мишката
  const a = (G.mouse.x - G.camRX) / (TW / 2);
  const b = (G.mouse.y - G.camRY) / (TH / 2);
  G.mouse.wx = (a + b) / 2;
  G.mouse.wy = (b - a) / 2;
}

// ---------- рендер на света: пул от draw-обекти (без нови closures всеки кадър) ----------
const draws = [];        // преизползван между кадрите (draws.length = 0)
const drawPool = [];     // пул от обекти, за да не се алокират нови всеки кадър
let drawPoolI = 0;
function pushDraw(d) {
  let o = drawPool[drawPoolI];
  if (!o) { o = {}; drawPool[drawPoolI] = o; }
  drawPoolI++;
  o.d = d;
  draws.push(o);
  return o;
}
// рисува един елемент по тип — редът/визуалният резултат е идентичен на старите closures
function drawItem(it) {
  const S = SCALE;
  switch (it.kind) {
    case 'wall':
      if (it.alpha) ctx.globalAlpha = it.alpha;
      ctx.drawImage(it.vis ? it.spr.lit : it.spr.dim, 0, 0, 32, 16 + WALL_HP, it.sx | 0, it.sy | 0, TW, (16 + WALL_HP) * S);
      if (it.alpha) ctx.globalAlpha = 1;
      break;
    case 'stairs': {
      const pr = it.pr;
      ctx.drawImage(it.vis ? Spr.stairs.lit : Spr.stairs.dim, 0, 0, 32, 16, (isoX(Math.floor(pr.x), Math.floor(pr.y)) + G.camRX - TW / 2) | 0, (isoY(Math.floor(pr.x), Math.floor(pr.y)) + G.camRY) | 0, TW, TH);
      if (!pr.sealed && it.vis) {
        const gl = 0.5 + 0.5 * Math.sin(G.time * 3);
        ctx.fillStyle = 'rgba(127,208,160,' + (0.25 * gl) + ')';
        ctx.fillRect(it.sx - S, it.sy + TH / 2 - 10 * S - Math.sin(G.time * 3) * 2 * S, 2 * S, 6 * S);
      }
      break;
    }
    case 'prop':
      if (!it.flat) blit(ctx, Spr.shadow, it.sx - Spr.shadow.width * S / 2, it.sy - Spr.shadow.height * S / 2 + 2 * S, false, it.vis ? 1 : 0.4);
      blit(ctx, it.spr, it.sx - it.spr.width * S / 2, it.sy - it.spr.height * S + (it.flat ? it.spr.height * S / 2 : 4 * S), false, it.vis ? 1 : 0.45);
      break;
    case 'ground': {
      const gitem = it.gitem;
      blit(ctx, Spr.shadow, it.sx - Spr.shadow.width * S / 2, it.sy - Spr.shadow.height * S / 2 + 2 * S);
      blit(ctx, Spr.icons[it.icon], it.sx - 6 * S, it.sy - 12 * S - (gitem.z + it.bobz) * S);
      if (gitem.item && gitem.item.rarity >= 2 && chance(0.05)) {
        addParticle({ x: gitem.x, y: gitem.y, z: 8, vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5), vz: rnd(4, 10), grav: -3, t: 0, life: 0.6, col: Items.rarityCol(gitem.item), size: 1 });
      }
      break;
    }
    case 'enemy': drawEnemy(it.e, it.sx, it.sy); break;
    case 'player': drawPlayer(it.p, it.sx, it.sy); break;
    case 'proj': {
      const pr = it.pr, sx = it.sx, sy = it.sy;
      let spr;
      if (pr.kind === 'fireball') spr = Spr.fireball[Math.floor(G.time * 12) % 2];
      else if (pr.kind === 'bolt') spr = Spr.bolt[Math.floor(G.time * 12) % 2];
      else spr = Spr.arrow;
      if (pr.kind === 'arrow') {
        const sa = Math.atan2((pr.vx + pr.vy) / 2, pr.vx - pr.vy);
        ctx.save();
        ctx.translate(sx | 0, (sy - 8 * S) | 0);
        ctx.rotate(sa);
        ctx.drawImage(spr, 0, 0, spr.width, spr.height, -spr.width * S / 2, -spr.height * S / 2, spr.width * S, spr.height * S);
        ctx.restore();
      } else {
        blit(ctx, spr, sx - spr.width * S / 2, sy - 8 * S - spr.height * S / 2);
      }
      break;
    }
    case 'explosion': {
      const spr = Spr.explosion[it.fr];
      blit(ctx, spr, it.sx - spr.width * S / 2, it.sy - spr.height * S / 2 - 4 * S);
      break;
    }
    case 'slash': {
      const spr = Spr.slash[it.fr];
      const k = it.k;
      ctx.save();
      ctx.translate(it.sx | 0, (it.sy - 8 * S) | 0);
      ctx.rotate(it.sa);
      ctx.scale(k, 0.6 * k);
      ctx.drawImage(spr, 0, 0, spr.width, spr.height, -spr.width * S / 2, -spr.height * S / 2, spr.width * S, spr.height * S);
      ctx.restore();
      break;
    }
    case 'particle': {
      const pa = it.pa;
      ctx.globalAlpha = clamp(1.2 - pa.t / pa.life, 0, 1);
      ctx.fillStyle = pa.col;
      ctx.fillRect(it.sx | 0, it.sy | 0, pa.size * S, pa.size * S);
      ctx.globalAlpha = 1;
      break;
    }
    case 'orbital': {
      const o = it.orb;
      const bs = Spr.bones;
      ctx.drawImage(bs, 7, 1, 5, 5, (it.sx - 5 * S) | 0, (it.sy - 14 * S - Math.sin(o.a * 2) * 2 * S) | 0, 10 * S, 10 * S);
      if (chance(0.3)) addParticle({ x: it.ox, y: it.oy, z: 10, vx: 0, vy: 0, vz: 3, grav: -2, t: 0, life: 0.4, col: '#d8d3c0', size: 1 });
      break;
    }
  }
}

// ---------- рендер на света ----------
function renderWorld() {
  const m = G.map, S = SCALE;
  const camX = G.camRX, camY = G.camRY;

  // диапазон от плочки, покриващ екрана
  const corners = [[0, 0], [CW, 0], [0, CH], [CW, CH]];
  let minI = 1e9, maxI = -1e9, minJ = 1e9, maxJ = -1e9;
  for (const [sx, sy] of corners) {
    const a = (sx - camX) / (TW / 2), b = (sy - camY) / (TH / 2);
    const wx = (a + b) / 2, wy = (b - a) / 2;
    minI = Math.min(minI, wx); maxI = Math.max(maxI, wx);
    minJ = Math.min(minJ, wy); maxJ = Math.max(maxJ, wy);
  }
  const i0 = Math.max(0, Math.floor(minI) - 2), i1 = Math.min(m.w - 1, Math.ceil(maxI) + 2);
  const j0 = Math.max(0, Math.floor(minJ) - 3), j1 = Math.min(m.h - 1, Math.ceil(maxJ) + 3);

  // --- podove ---
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const idx = j * m.w + i;
    if (!G.explored[idx]) continue;
    if (m.cells[idx] !== FLOOR) continue;
    const vis = G.visible[idx] === 1;
    const sx = isoX(i, j) + camX - TW / 2;
    const sy = isoY(i, j) + camY;
    if (sx > CW || sx + TW < 0 || sy > CH || sy + TH < 0) continue;
    let tile;
    if (G.onSurface) {
      tile = m.path && m.path[idx] ? Spr.surf.dirt[m.variant[idx] % 2] : Spr.surf.grass[m.variant[idx] % 4];
    } else {
      const v = m.variant[idx] % Spr.floor.length;
      tile = vis ? Spr.floor[v].lit : Spr.floor[v].dim;
    }
    ctx.drawImage(tile, 0, 0, 32, 16, sx | 0, sy | 0, TW, TH);
  }

  // --- кръв по пода ---
  for (const d of G.decals) {
    const i = Math.floor(d.x), j = Math.floor(d.y);
    if (i < i0 || i > i1 || j < j0 || j > j1) continue;
    const idx = j * m.w + i;
    if (!G.explored[idx]) continue;
    const spr = Spr.blood[d.v];
    blit(ctx, spr, isoX(d.x, d.y) + camX - spr.width * S / 2, isoY(d.x, d.y) + camY - spr.height * S / 2, false, G.visible[idx] ? 0.85 : 0.4);
  }

  // --- топла светлина около мангалите и огъня (остри ромбове) ---
  for (const pr of G.props) {
    if (!(pr.kind === 'brazier' || pr.kind === 'campfire') || pr.broken) continue;
    const pi = Math.floor(pr.x), pj = Math.floor(pr.y);
    if (!tileVisible(pi, pj)) continue;
    const flick = 0.75 + 0.25 * Math.sin(G.time * 7 + pr.x * 3);
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const i = pi + di, j = pj + dj;
      const dd = Math.hypot(di, dj);
      if (dd > 2.3) continue;
      if (cellAt(i, j) !== FLOOR || !tileVisible(i, j)) continue;
      const a = 0.09 * (1 - dd / 2.6) * flick;
      const sx = isoX(i, j) + camX, sy = isoY(i, j) + camY;
      ctx.fillStyle = 'rgba(255,150,40,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + TW / 2, sy + TH / 2);
      ctx.lineTo(sx, sy + TH);
      ctx.lineTo(sx - TW / 2, sy + TH / 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- зони по пода (огън, кръв, отрова + телеграфи) ---
  if (G.hazards) for (const h of G.hazards) {
    const hx = isoX(h.x, h.y) + camX, hy = isoY(h.x, h.y) + camY;
    if (hx < -TW || hx > CW + TW || hy < -TH || hy > CH + TH) continue;
    const telegraphing = h.delay && h.t < h.delay;
    if (telegraphing || h.type === 'blast') {
      // предупредителен пулсиращ кръг
      ctx.strokeStyle = 'rgba(255,70,70,' + (0.45 + 0.35 * Math.sin(G.time * 14)) + ')';
      ctx.lineWidth = S;
      ctx.beginPath();
      ctx.ellipse(hx, hy, h.r * TW * 0.55, h.r * TH * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    const col = h.type === 'fire' ? ['rgba(255,90,31,0.16)', '#ff8a1f', '#ffd23b']
      : h.type === 'blood' ? ['rgba(194,40,54,0.2)', '#c22836', '#ff4757']
      : ['rgba(95,217,122,0.16)', '#5fd97a', '#2a8f4a'];
    ctx.fillStyle = col[0];
    ctx.beginPath();
    ctx.ellipse(hx, hy, h.r * TW * 0.55, h.r * TH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // пикселни пламъчета/мехури — остри, без градиенти
    for (let k = 0; k < 6; k++) {
      const aa = k * 1.05 + h.x * 3;
      const fx = hx + Math.cos(aa + G.time * (h.type === 'poison' ? 1.2 : 2.5)) * h.r * TW * 0.35;
      const fy = hy + Math.sin(aa + G.time * 2) * h.r * TH * 0.35 - (h.type === 'fire' ? (Math.sin(G.time * 8 + k) > 0 ? 2 * S : 0) : 0);
      ctx.fillStyle = k % 2 ? col[1] : col[2];
      ctx.fillRect(fx | 0, fy | 0, S, S * (h.type === 'fire' ? 2 : 1));
    }
  }

  // --- събиране на обекти за рисуване в дълбочинен ред (пул, без нови closures) ---
  draws.length = 0; drawPoolI = 0;
  // стени (тези пред героя стават полупрозрачни, за да не го скриват)
  const P = G.player;
  const pD = P.x + P.y;
  const psx = isoX(P.x, P.y) + camX, psy = isoY(P.x, P.y) + camY;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const idx = j * m.w + i;
    if (!G.explored[idx] || m.cells[idx] !== WALL) continue;
    const sx = isoX(i, j) + camX - TW / 2;
    const sy = isoY(i, j) + camY - WALL_HP * S;
    if (sx > CW || sx + TW < 0 || sy > CH || sy + (16 + WALL_HP) * S < 0) continue;
    const vis = G.visible[idx] === 1;
    const spr = Spr.wall[m.variant[idx] % Spr.wall.length];
    let alpha = 0;
    if (i + j + 1 > pD) {
      const wcx = sx + TW / 2, wcy = sy + (16 + WALL_HP) * S * 0.55;
      if (Math.abs(wcx - psx) < TW * 1.05 && Math.abs(wcy - psy) < (16 + WALL_HP) * S * 0.85) alpha = 0.42;
    }
    const o = pushDraw(i + j + 1); o.kind = 'wall'; o.alpha = alpha; o.vis = vis; o.spr = spr; o.sx = sx; o.sy = sy;
  }
  // реквизит
  for (const pr of G.props) {
    const i = Math.floor(pr.x), j = Math.floor(pr.y);
    if (i < i0 - 1 || i > i1 + 1 || j < j0 - 1 || j > j1 + 1) continue;
    const idx = j * m.w + i;
    if (!G.explored[idx]) continue;
    const vis = G.visible[idx] === 1;
    if (pr.broken) continue;
    const sx = isoX(pr.x, pr.y) + camX, sy = isoY(pr.x, pr.y) + camY;
    let spr = null;
    if (pr.kind === 'stairs') {
      const o = pushDraw(pr.x + pr.y - 0.98); o.kind = 'stairs'; o.pr = pr; o.vis = vis; o.sx = sx; o.sy = sy;
      continue;
    }
    if (pr.kind === 'brazier') { pr.animT += 0.016; spr = Spr.brazier[Math.floor(G.time * 8 + pr.x * 5) % 3]; }
    else if (pr.kind === 'barrel') spr = Spr.barrel;
    else if (pr.kind === 'crate') spr = Spr.crate;
    else if (pr.kind === 'chest') spr = pr.opened ? Spr.chestOpen : Spr.chest;
    else if (pr.kind === 'vaultdoor') spr = pr.opened ? null : Spr.vaultdoor; // отворената врата изчезва
    else if (pr.kind === 'arena') spr = Spr.arena;
    else if (pr.kind === 'fountain') spr = pr.used ? Spr.fountainDry : Spr.fountain[Math.floor(G.time * 4) % 2];
    else if (pr.kind === 'bones') spr = Spr.bones;
    else if (pr.kind === 'rubble') spr = Spr.rubble;
    else if (pr.kind === 'campfire') spr = Spr.surf.campfire[Math.floor(G.time * 8) % 3];
    else if (pr.kind === 'tree') spr = Spr.surf.tree;
    else if (pr.kind === 'deadTree') spr = Spr.surf.deadTree;
    else if (pr.kind === 'rock') spr = Spr.surf.rock;
    else if (pr.kind === 'tomb') spr = Spr.surf.tomb;
    else if (pr.kind === 'pillar') spr = Spr.surf.pillar;
    else if (pr.kind === 'fence') spr = Spr.surf.fence;
    else if (pr.kind === 'stall') {
      if (pr.vtype === 'jewel') spr = Spr.surf.mystic;
      else spr = Spr.surf.stallTiers[pr.vtype][clamp(((G.meta.vendorLvl && G.meta.vendorLvl[pr.vtype]) || 1) - 1, 0, 4)];
    }
    else if (pr.kind === 'vendor') spr = Spr.surf.vendors[pr.vtype];
    else if (pr.kind === 'portal') spr = Spr.surf.portal[Math.floor(G.time * 4) % 3];
    else if (pr.kind === 'homeportal') { initSurfaceSprites(); spr = Spr.surf.portal[Math.floor(G.time * 4) % 3]; }
    if (!spr) continue;
    const flat = pr.flat;
    const o = pushDraw(pr.x + pr.y + (flat ? -0.6 : 0)); o.kind = 'prop'; o.spr = spr; o.sx = sx; o.sy = sy; o.flat = flat; o.vis = vis;
  }
  // предмети по земята
  for (const gitem of G.ground) {
    const i = Math.floor(gitem.x), j = Math.floor(gitem.y);
    const idx = j * m.w + i;
    if (idx < 0 || !G.explored[idx] || !G.visible[idx]) continue;
    const sx = isoX(gitem.x, gitem.y) + camX, sy = isoY(gitem.x, gitem.y) + camY;
    const icon = gitem.gold ? 'gold' : gitem.potion ? ('potion_' + gitem.potion) : gitem.seal ? 'seal' : gitem.shard ? 'shard' : gitem.item.icon;
    const bobz = (gitem.item || gitem.seal || gitem.shard) ? Math.sin(G.time * 3 + gitem.x * 7) * 1.5 + 2 : 0;
    const o = pushDraw(gitem.x + gitem.y); o.kind = 'ground'; o.icon = icon; o.sx = sx; o.sy = sy; o.gitem = gitem; o.bobz = bobz;
  }
  // врагове
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (!tileVisible(Math.floor(e.x), Math.floor(e.y))) continue;
    const sx = isoX(e.x, e.y) + camX, sy = isoY(e.x, e.y) + camY;
    const o = pushDraw(e.x + e.y); o.kind = 'enemy'; o.e = e; o.sx = sx; o.sy = sy;
  }
  // герой
  {
    const p = G.player;
    const sx = isoX(p.x, p.y) + camX, sy = isoY(p.x, p.y) + camY;
    const o = pushDraw(p.x + p.y); o.kind = 'player'; o.p = p; o.sx = sx; o.sy = sy;
  }
  // снаряди
  for (const pr of G.projectiles) {
    const sx = isoX(pr.x, pr.y) + camX, sy = isoY(pr.x, pr.y) + camY;
    const o = pushDraw(pr.x + pr.y); o.kind = 'proj'; o.pr = pr; o.sx = sx; o.sy = sy;
  }
  // експлозии
  if (G.explosions) for (const ex of G.explosions) {
    const sx = isoX(ex.x, ex.y) + camX, sy = isoY(ex.x, ex.y) + camY;
    const fr = Math.min(2, Math.floor(ex.t / 0.09));
    const o = pushDraw(ex.x + ex.y + 0.5); o.kind = 'explosion'; o.sx = sx; o.sy = sy; o.fr = fr;
  }
  // дъга на удара
  if (G.slashFx) {
    const sf = G.slashFx;
    const sx = isoX(sf.x, sf.y) + camX, sy = isoY(sf.x, sf.y) + camY;
    const fr = Math.min(2, Math.floor(sf.t / 0.06));
    const sa = Math.atan2((Math.cos(sf.a) + Math.sin(sf.a)) / 2, Math.cos(sf.a) - Math.sin(sf.a));
    const o = pushDraw(sf.x + sf.y + 0.6); o.kind = 'slash'; o.sx = sx; o.sy = sy; o.fr = fr; o.sa = sa; o.k = sf.k || 1;
  }
  // частици
  for (const pa of G.particles) {
    const sx = isoX(pa.x, pa.y) + camX, sy = isoY(pa.x, pa.y) + camY - pa.z * S;
    const o = pushDraw(pa.x + pa.y + 0.4); o.kind = 'particle'; o.pa = pa; o.sx = sx; o.sy = sy;
  }

  // орбитален череп
  if (G.orbitals) for (const orb of G.orbitals) {
    const p = G.player;
    const ox = p.x + Math.cos(orb.a) * 1.4, oy = p.y + Math.sin(orb.a) * 1.4;
    const sx = isoX(ox, oy) + camX, sy = isoY(ox, oy) + camY;
    const o = pushDraw(ox + oy + 0.3); o.kind = 'orbital'; o.orb = orb; o.ox = ox; o.oy = oy; o.sx = sx; o.sy = sy;
  }

  draws.sort((a, b) => a.d - b.d);
  for (const it of draws) drawItem(it);

  // верижни мълнии — начупени отсечки
  if (G.zaps) for (const z of G.zaps) {
    const x1 = isoX(z.x1, z.y1) + camX, y1 = isoY(z.x1, z.y1) + camY - 8 * S;
    const x2 = isoX(z.x2, z.y2) + camX, y2 = isoY(z.x2, z.y2) + camY - 8 * S;
    ctx.globalAlpha = clamp(1 - z.t / 0.18, 0, 1);
    ctx.strokeStyle = '#ffd23b';
    ctx.lineWidth = S;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      ctx.lineTo(x1 + (x2 - x1) * t + rnd(-5, 5) * S, y1 + (y2 - y1) * t + rnd(-5, 5) * S);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // вълни от нова/земетръс
  if (G.novaFx) for (const n of G.novaFx) {
    const nx = isoX(n.x, n.y) + camX, ny = isoY(n.x, n.y) + camY;
    const rr = (n.t / 0.35) * n.maxR;
    ctx.globalAlpha = clamp(1 - n.t / 0.35, 0, 1);
    ctx.strokeStyle = n.col;
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.ellipse(nx, ny, rr * TW * 0.55, rr * TH * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // магичният щит на героя
  {
    const p = G.player;
    if (p.ward > 0) {
      const sx = isoX(p.x, p.y) + camX, sy = isoY(p.x, p.y) + camY;
      ctx.strokeStyle = 'rgba(138,176,255,' + (0.35 + 0.2 * Math.sin(G.time * 5)) + ')';
      ctx.lineWidth = S;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 8 * S, 14 * S, 18 * S, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // числа за щети (винаги отгоре)
  for (const t of G.texts) {
    const sx = isoX(t.x, t.y) + camX, sy = isoY(t.x, t.y) + camY - t.z * S;
    const scale = (t.big ? 2 : 1) * S;
    ctx.globalAlpha = clamp((t.life - t.t) / 0.3, 0, 1);
    const w = pixTextW(t.str, scale);
    drawPixText(ctx, t.str, sx - w / 2 + scale, sy + scale, scale, '#0a0c12');
    drawPixText(ctx, t.str, sx - w / 2, sy, scale, t.color);
    ctx.globalAlpha = 1;
  }
}

function drawPlayer(p, sx, sy) {
  const S = SCALE;
  blit(ctx, Spr.shadow, sx - Spr.shadow.width * S / 2, sy - Spr.shadow.height * S / 2 + 2 * S);
  const wt = (p.equip.weapon && Spr.player[p.equip.weapon.type]) ? p.equip.weapon.type : 'sword';
  const set = Spr.player[wt];
  const A = Spr.playerAnchors;
  const hasComp = !!(set.held && set.downNW && A); // компонентна система: тяло + оръжие в дланта
  const attacking = p.atkAnim > 0;
  let spr, anchor = null, atkT01 = 0;
  if (attacking && hasComp) {
    // РЪКАТА замахва в 3 пози, синхронно със slash дъгата; мечът е закачен за дланта ѝ
    atkT01 = G.slashFx ? clamp(G.slashFx.t / 0.18, 0, 1) : clamp(1 - p.atkAnim / 0.22, 0, 1);
    const ph = atkT01 < 0.34 ? 0 : atkT01 < 0.67 ? 1 : 2;
    spr = p.dirUp ? set.atkUpNW[ph] : set.atkDownNW[ph];
    anchor = (p.dirUp ? A.atkUp : A.atkDown)[ph];
  } else if (attacking) {
    const fr = p.atkAnim > 0.11 ? 0 : 1;
    spr = p.dirUp ? set.atkUp[fr] : set.atkDown[fr];
  } else if (p.moving) {
    const fr = Math.floor(p.animT * 9) % 4;
    spr = hasComp ? (p.dirUp ? set.upNW[fr] : set.downNW[fr]) : (p.dirUp ? set.up[fr] : set.down[fr]);
    if (hasComp) anchor = (p.dirUp ? A.up : A.down)[fr];
  } else {
    spr = hasComp ? (p.dirUp ? set.upNW[0] : set.downNW[0]) : (p.dirUp ? set.up[0] : set.down[0]);
    if (hasComp) anchor = (p.dirUp ? A.up : A.down)[0];
    sy += Math.sin(G.time * 2.5) > 0.6 ? S : 0; // леко дишане
  }
  const bx0 = sx - spr.width * S / 2, by0 = sy - spr.height * S + 3 * S; // горе-ляво на тялото
  // ъгълът на оръжието: в покой лек наклон (люлее се с ходенето); при атака — дъгата на удара
  let weaponAng;
  if (attacking && hasComp) {
    const a = p.swingAimA !== undefined ? p.swingAimA : p.aimA; // заключеният прицел на удара
    const sa = Math.atan2((Math.cos(a) + Math.sin(a)) / 2, Math.cos(a) - Math.sin(a)); // екранен ъгъл
    weaponAng = sa - 1.15 + 2.3 * atkT01 + Math.PI / 2; // спрайтът сочи нагоре
  } else {
    weaponAng = (p.flip ? -0.22 : 0.22) + (p.moving ? Math.sin(p.animT * 9) * 0.06 * (p.flip ? -1 : 1) : 0);
  }
  const drawWeapon = () => {
    if (!anchor) return;
    const ax = p.flip ? (spr.width - anchor[0]) : anchor[0]; // котвата се обръща с героя
    const held = set.held;
    ctx.save();
    ctx.translate((bx0 + ax * S) | 0, (by0 + anchor[1] * S) | 0); // ОС: дланта от текущата поза
    ctx.imageSmoothingEnabled = false;
    if (wt === 'chains' && attacking) {
      // GoW стил: острието ИЗЛИТА на верига от дланта; върхът ИЗОСТАВА като камшик и се прибира
      const dirA = weaponAng - Math.PI / 2;            // накъде сочи ръката
      const swing = Math.sin(Math.PI * atkT01);        // 0 -> 1 (среда) -> 0
      const bend = -0.55 * swing;                      // камшично изоставане на върха
      const reach = (8 + 30 * swing) * S;              // разтягане на веригата
      let tx = 0, ty2 = 0;
      for (let li = 1; li <= 6; li++) {                // брънките по извитата дъга
        const f = li / 6;
        const a2 = dirA + bend * f * f;
        tx = Math.cos(a2) * reach * f; ty2 = Math.sin(a2) * reach * f;
        ctx.fillStyle = li % 2 ? '#8a97ad' : '#67738c';
        ctx.fillRect((tx - S) | 0, (ty2 - S) | 0, 2 * S, 2 * S);
      }
      ctx.translate(tx | 0, ty2 | 0);                  // острието на върха на веригата
      ctx.rotate(dirA + bend + Math.PI / 2);
      ctx.drawImage(held, 0, 0, held.width, held.height, (-held.width * S / 2) | 0, (-held.height * S + 8 * S) | 0, held.width * S, held.height * S);
    } else {
      ctx.rotate(weaponAng);
      ctx.drawImage(held, 0, 0, held.width, held.height, (-held.width * S / 2) | 0, (-held.height * S + 4 * S) | 0, held.width * S, held.height * S);
    }
    ctx.restore();
  };
  const flash = p.hurtT > 0.15;
  if (p.iframes > 0 && Math.floor(G.time * 20) % 2 === 0 && p.dashT <= 0) ctx.globalAlpha = 0.5;
  if (hasComp && p.dirUp) drawWeapon(); // с гръб — оръжието е ЗАД тялото
  blit(ctx, flash ? set.white : spr, bx0, by0, p.flip);
  ctx.globalAlpha = 1;
  if (hasComp && !p.dirUp) drawWeapon(); // с лице — оръжието е ПРЕД тялото
}

function drawEnemy(e, sx, sy) {
  const S = SCALE;
  const pack = Spr.enemies[e.t.spr];
  if (!e.t.fly) blit(ctx, Spr.shadow, sx - Spr.shadow.width * S / 2, sy - Spr.shadow.height * S / 2 + 2 * S);
  const frames = pack.frames;
  let fr = Math.floor(e.animT * e.t.animSpd) % frames.length;
  let spr = frames[fr];
  if (e.windupT > 0) {
    const atkMap = { skeleton: 'skeletonAtk', brute: 'bruteAtk', boss: 'bossAtk', boss2: 'boss2Atk', boss3: 'boss3Atk', boss4: 'boss4Atk' };
    if (atkMap[e.t.spr] && Spr.enemies[atkMap[e.t.spr]]) spr = Spr.enemies[atkMap[e.t.spr]];
  }
  const zoff = e.t.fly ? (6 + Math.sin(G.time * 5 + e.wobble) * 2) * S : 0;
  let dy = sy - spr.height * S + 3 * S - zoff;
  if (e.flash > 0) spr = pack.white ? (frames[fr] === pack.frames[0] ? pack.white : whiteFor(e, fr)) : spr;
  // телеграф на атаката: леко треперене
  let ox = 0;
  if (e.windupT > 0 && e.windupT < 0.25) ox = (Math.floor(G.time * 30) % 2 ? 1 : -1) * S;
  if (e.t.ghost) ctx.globalAlpha = 0.82;
  blit(ctx, spr, sx - spr.width * S / 2 + ox, dy, e.flip);
  ctx.globalAlpha = 1;
  if (e.elite) blit(ctx, Spr.crown, sx - Spr.crown.width * S / 2, dy - 5 * S);
  if (e.keyGuardian) { // пулсиращ златен пръстен = ПАЗИТЕЛ НА КЛЮЧА
    ctx.strokeStyle = 'rgba(255,210,59,' + (0.5 + 0.3 * Math.sin(G.time * 5)) + ')';
    ctx.lineWidth = S;
    ctx.beginPath();
    ctx.ellipse(sx, sy, (e.r + 0.3) * TW * 0.5, (e.r + 0.3) * TH * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Щитоносец: син ореол докато щитът стои
  if (e.shield) {
    ctx.strokeStyle = 'rgba(138,176,255,' + (0.5 + 0.3 * Math.sin(G.time * 6)) + ')';
    ctx.lineWidth = S;
    ctx.beginPath();
    ctx.ellipse(sx, sy, (e.r + 0.25) * TW * 0.5, (e.r + 0.25) * TH * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // лента живот при ранен + етикет на модификатора
  if (e.hp < e.maxhp && !e.t.boss) {
    const bw = 14 * S, bh = 2 * S;
    const bx = sx - bw / 2, by = dy - 4 * S;
    ctx.fillStyle = '#10141f';
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#c22836';
    ctx.fillRect(bx, by, bw * clamp(e.hp / e.maxhp, 0, 1), bh);
  }
  if (e.keyGuardian) {
    ctx.font = fontBold(5);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23b';
    ctx.fillText('KEY GUARDIAN', sx, dy - 7 * S);
    ctx.textAlign = 'left';
  } else if (e.mod) {
    ctx.font = fontPx(5);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23b';
    ctx.fillText(ELITE_MODS[e.mod].n, sx, dy - 7 * S);
    ctx.textAlign = 'left';
  }
  // телеграф на щурма на Владетеля: пунктир от ромбчета по посоката
  if (e.chargeState && e.chargeState.phase === 'tele') {
    const cs = e.chargeState;
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.time * 14);
    for (let k = 1; k <= 7; k++) {
      const wx = e.x + Math.cos(cs.dir) * k, wy = e.y + Math.sin(cs.dir) * k;
      if (cellAt(Math.floor(wx), Math.floor(wy)) !== FLOOR) break;
      const zx = isoX(wx, wy) + G.camRX, zy = isoY(wx, wy) + G.camRY;
      ctx.fillStyle = '#5c78e8';
      ctx.beginPath();
      ctx.moveTo(zx, zy - 4 * S); ctx.lineTo(zx + 6 * S, zy); ctx.lineTo(zx, zy + 4 * S); ctx.lineTo(zx - 6 * S, zy);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // телеграф на АоЕ
  if (e.windupT > 0 && e.t.aoe) {
    const r = (e.t.aoe + e.t.range * 0.6) ;
    ctx.strokeStyle = 'rgba(255,60,60,' + (0.5 + 0.3 * Math.sin(G.time * 16)) + ')';
    ctx.lineWidth = S;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * TW * 0.5, r * TH * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}
const _whiteCache = new Map();
function whiteFor(e, fr) {
  const key = e.t.spr + '_' + fr;
  if (!_whiteCache.has(key)) _whiteCache.set(key, whiteVersion(Spr.enemies[e.t.spr].frames[fr]));
  return _whiteCache.get(key);
}

// ---------- рендер ----------
function render() {
  if (CW < 1 || CH < 1) return; // свит прозорец
  ctx.fillStyle = '#04060b';
  ctx.fillRect(0, 0, CW, CH);
  ctx.imageSmoothingEnabled = false;

  if (G.state === 'title') { drawTitle(); drawMenuCursor(); drawCursorSprite(true); return; }
  if (G.state === 'charselect') { drawCharSelect(); drawMenuCursor(); return; }
  if (G.state === 'newchar') { drawNewChar(); return; }

  updateCamera();
  renderWorld();
  drawVignette();
  drawHUD();

  if (G.state === 'inventory') drawInventory();
  else if (G.state === 'stats') drawStats();
  else if (G.state === 'shop') drawShop();
  else if (G.state === 'levelup') drawLevelup();
  else if (G.state === 'pause') drawPause();
  else if (G.state === 'dead') drawDead();
  else if (G.state === 'transition') drawTransition();
  else if (G.state === 'settings') drawSettings();
  else if (G.state === 'ctrledit') drawCtrlEdit();
  else if (G.state === 'spellbook') drawSpellbook();
  else if (G.state === 'skilltree') drawSkillTree();
  else if (G.state === 'descend') drawDescend();
  else if (G.state === 'inputmode') drawInputMode();
  else if (G.state === 'binds') drawBinds();
  else if (G.state === 'potionsel') drawPotionSelect();
  drawMenuCursor(); // маркер за контролер върху списъчните менюта (settings/spellbook/skilltree)

  // телефон в портрет: подкана за завъртане
  if (G.portrait) {
    const S = SCALE;
    ctx.fillStyle = 'rgba(4,6,11,0.94)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = 'center';
    ctx.font = fontBold(24);
    ctx.fillStyle = '#ffd23b';
    ctx.fillText('⟳', CW / 2, CH * 0.42);
    ctx.font = fontBold(10);
    ctx.fillStyle = '#e8e4d0';
    ctx.fillText('Rotate your phone', CW / 2, CH * 0.52);
    ctx.font = fontPx(7);
    ctx.fillStyle = '#7d8899';
    ctx.fillText('sword and MAGE is played in landscape mode', CW / 2, CH * 0.58);
    ctx.textAlign = 'left';
    return;
  }

  drawCursorSprite(G.state !== 'play');
}

function drawCursorSprite(menuMode) {
  if (menuMode || G.isTouch) return; // в менютата и на тъч екран няма курсор
  const S = SCALE;
  blit(ctx, Spr.cursor, G.mouse.x - 5.5 * S, G.mouse.y - 5.5 * S);
}

// ---------- старт ----------
function boot() {
  cv = document.getElementById('game');
  ctx = cv.getContext('2d');
  window.addEventListener('resize', resize);
  resize();
  setupInput();
  migrateOldProfile(); // старият единичен запис става герой №1
  loadBest();
  initSprites(0);

  let last = performance.now();
  function loop(t) {
    requestAnimationFrame(loop); // първо — една хвърлена грешка да не убие цикъла завинаги
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    update(dt);
    render();
  }
  requestAnimationFrame(loop);
}
boot();
