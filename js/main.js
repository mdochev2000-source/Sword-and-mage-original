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
        // ГРАДСКИЯТ ЕДИТОР: само с ?editor=1 в адреса (dev), F2 в Мирхолд
        if (G.pixEdit && (e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { pixUndo(); break; } // UNDO в пиксел-редактора
        if (e.code === 'F2' && G.editorOn && (G.inside || (G.onSurface && G.city === 'mirhold'))) { cityEditToggle(); break; }
        if (e.code === 'Escape' && G.cityEdit) { cityEditToggle(); break; }
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
      case 'savetransfer':
        if (e.code === 'Escape') { closeTransferOverlay(); G.state = 'settings'; }
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
    if (e.button === 0) {
      G.mouse.down = false; G.editDrag = null; G.setDrag = false;
      if (G.editPaint) {
        G.editPaint = false;
        if (G.editPathDirty || G.editDecorDirty || G.editWallDirty) { G.editPathDirty = false; G.editDecorDirty = false; G.editWallDirty = false; saveCityLayout(); }
      }
      if (G.pixPaint) { G.pixPaint = false; pixSaveOverride(); }
      if (G.pixShape && G.pixEdit) { // ЛИНИЯ/ПРАВОЪГЪЛНИК: пускането нанася фигурата
        const eS = G.pixEdit;
        const hitS = pixHitPixel(G.mouse.x, G.mouse.y);
        if (hitS && (eS.tool === 'line' || eS.tool === 'rect')) {
          pixPushHist();
          const cS = eS.spr.getContext('2d'); cS.fillStyle = eS.color;
          for (const [x, y] of pixShapePixels(eS.tool, G.pixShape.x0, G.pixShape.y0, hitS.px, hitS.py)) pixSet(cS, x, y, false);
          pixSaveOverride();
        }
        G.pixShape = null;
      }
      if (G.pixEdit && G.pixEdit.selNew) {           // край на оградяването
        const s = pixNormSel(G.pixEdit.selNew);
        G.pixEdit.sel = (s.x1 > s.x0 || s.y1 > s.y0) ? s : null;
        G.pixEdit.selNew = null;
      }
      if (G.pixEdit && G.pixEdit.selDrag) {           // край на местенето
        pixMoveSel(G.pixEdit.selDrag.dx, G.pixEdit.selDrag.dy);
        G.pixEdit.selDrag = null;
      }
      G.pixPanning = null;
      G.pixSVDrag = false; G.pixHueDrag = false;
      // МАРКИРАНЕ на клетки (CREATE): при пускане рамката става размер на платното
      if (G.createSt && G.createSt.drag) {
        const cd2 = G.createSt.drag;
        G.createSt.cw = Math.min(4, Math.abs(cd2.x1 - cd2.x0) + 1);
        G.createSt.ch = Math.min(4, Math.abs(cd2.y1 - cd2.y0) + 1);
        G.createSt.drag = null; G.createSt.mark = false;
      }
    }
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
        // ГРАДСКИЯТ ЕДИТОР (dev, ?editor=1 + F2) поглъща кликовете
        if (G.cityEdit && cityEditClick(mx, my)) break;
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
      case 'savetransfer': settingsPress(mx, my); break;
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
    if (G.pixEdit && UI.pixZoomRect) {
      const zr = UI.pixZoomRect;
      if (G.mouse.x >= zr.x && G.mouse.x < zr.x + zr.vw && G.mouse.y >= zr.y && G.mouse.y < zr.y + zr.vh) {
        pixZoomStep(e.deltaY > 0 ? -1 : 1);
        e.preventDefault();
        return;
      }
    }
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
    case 'prop': {
      // it.alpha: сградата скрива героя -> полупрозрачна (blit сам управлява globalAlpha)
      const pa = it.alpha ? it.alpha : (it.vis ? 1 : 0.45);
      if (it.pyo !== undefined) {
        // изометрична котва: дъното на призмата стъпва точно на плочката (безшевна стена/порта)
        blit(ctx, it.spr, it.sx - it.spr.width * S / 2, it.sy + it.pyo * S - it.spr.height * S, false, pa);
      } else {
        if (!it.flat) blit(ctx, Spr.shadow, it.sx - Spr.shadow.width * S / 2, it.sy - Spr.shadow.height * S / 2 + 2 * S, false, it.vis ? 1 : 0.4);
        blit(ctx, it.spr, it.sx - it.spr.width * S / 2, it.sy - it.spr.height * S + (it.flat ? it.spr.height * S / 2 : 4 * S), false, pa);
      }
      break;
    }
    case 'hearth': {
      // хенчстоунът: камък + вдълбана руна, върху която пулсира светещият знак с ореол
      blit(ctx, Spr.shadow, it.sx - Spr.shadow.width * S / 2, it.sy - Spr.shadow.height * S / 2 + 2 * S, false, it.vis ? 1 : 0.4);
      const hs = Spr.surf.hearth;
      blit(ctx, hs, it.sx - hs.width * S / 2, it.sy - hs.height * S + 4 * S, false, it.vis ? 1 : 0.45);
      if (it.vis) {
        const rn = Spr.surf.hearthRune;
        const pulse = 0.5 + 0.5 * Math.sin(G.time * 1.7);
        // руната в арта на камъка е на (9,11); слоевете имат 2px рамка -> (7,9)
        const rx = it.sx - hs.width * S / 2 + 7 * S, ry = it.sy - hs.height * S + 4 * S + 9 * S;
        blit(ctx, rn.halo, rx, ry, false, 0.28 + 0.34 * pulse);
        blit(ctx, rn.core, rx, ry, false, 0.62 + 0.38 * pulse);
        ctx.globalAlpha = 1;
      }
      break;
    }
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
    // в Мирхолд блокираните клетки (сгради/стена) също са върху трева — без черни дупки
    if (m.cells[idx] !== FLOOR && !(!G.inside && G.onSurface && G.city === 'mirhold') && !(G.inside && m.cells[idx] === WALL)) continue;
    const vis = G.visible[idx] === 1;
    const sx = isoX(i, j) + camX - TW / 2;
    const sy = isoY(i, j) + camY;
    if (sx > CW || sx + TW < 0 || sy > CH || sy + TH < 0) continue;
    let tile;
    if (G.inside) {
      tile = Spr.int.floor[m.variant[idx] % Spr.int.floor.length];
    } else if (G.onSurface) {
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

  // --- светлина: мангали/огън/фенер (топла), хенчстоун (руническа), портал за прибиране (лилава) ---
  for (const pr of G.props) {
    const hearthGlow = pr.kind === 'cityportal';
    const portalGlow = pr.kind === 'homeportal' || (pr.kind === 'portal' && (!G.onSurface ||
      ((pr.dungeon === 'mirhold' ? (G.mirCheckpoint || 1) : (G.checkpoint || 1)) > 1)));
    if (!(pr.kind === 'brazier' || pr.kind === 'campfire' || pr.kind === 'church' || pr.kind === 'fireplace' || pr.kind === 'candle' || hearthGlow || portalGlow) || pr.broken) continue;
    const pi = Math.floor(pr.x), pj = Math.floor(pr.y);
    if (!tileVisible(pi, pj)) continue;
    const flick = (hearthGlow || portalGlow) ? 0.7 + 0.3 * Math.sin(G.time * 2.2) : 0.75 + 0.25 * Math.sin(G.time * 7 + pr.x * 3);
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const i = pi + di, j = pj + dj;
      const dd = Math.hypot(di, dj);
      if (dd > 2.3) continue;
      if (cellAt(i, j) !== FLOOR || !tileVisible(i, j)) continue;
      const a = ((hearthGlow || portalGlow) ? 0.07 : 0.09) * (1 - dd / 2.6) * flick;
      const sx = isoX(i, j) + camX, sy = isoY(i, j) + camY;
      ctx.fillStyle = (portalGlow ? 'rgba(190,110,255,' : hearthGlow ? 'rgba(90,214,196,' : 'rgba(255,150,40,') + a.toFixed(3) + ')';
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
  G.heroCovered = false;
  if (G.fenceDirty !== false) recomputeFenceMasks(); // снапването на оградите
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
    const spr = G.inside ? { lit: Spr.int.wall[m.variant[idx] % Spr.int.wall.length], dim: Spr.int.wall[m.variant[idx] % Spr.int.wall.length] }
      : Spr.wall[m.variant[idx] % Spr.wall.length];
    let alpha = 0;
    if (i + j + 1 > pD) {
      const wcx = sx + TW / 2, wcy = sy + (16 + WALL_HP) * S * 0.55;
      if (Math.abs(wcx - psx) < TW * 1.05 && Math.abs(wcy - psy) < (16 + WALL_HP) * S * 0.85) alpha = 0.42;
    }
    const o = pushDraw(i + j + 1); o.kind = 'wall'; o.alpha = alpha; o.vis = vis; o.spr = spr; o.sx = sx; o.sy = sy;
  }
  // богатият ефект на портала за прибиране: лилави въгленчета + въртяща се искра
  function portalFx(pr, vis) {
    if (!vis) return;
    if (chance(0.16)) {
      const aa = rnd(0, Math.PI * 2);
      addParticle({
        x: pr.x + Math.cos(aa) * rnd(0.15, 0.8), y: pr.y + Math.sin(aa) * rnd(0.15, 0.8), z: rnd(0, 8),
        vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: rnd(4, 10), grav: -3, t: 0, life: rnd(1.2, 2.4),
        col: pick(['#c84fff', '#e0b0ff', '#8a5fd0', '#e0b0ff', '#f0d8ff']), size: chance(0.2) ? 2 : 1,
      });
    }
    if (chance(0.05)) { // искра, обикаляща рамката
      const oa = G.time * 2.4;
      addParticle({
        x: pr.x + Math.cos(oa) * 0.55, y: pr.y + Math.sin(oa) * 0.28, z: 6 + Math.sin(oa * 2) * 4,
        vx: 0, vy: 0, vz: 1, grav: 0, t: 0, life: 0.5,
        col: '#f0d8ff', size: 1,
      });
    }
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
    else if (pr.kind === 'fence') spr = (Spr.surf.fenceTiles && pr.fm !== undefined) ? Spr.surf.fenceTiles[0][pr.fm] : Spr.surf.fence;
    else if (pr.kind === 'stall') {
      if (pr.vtype === 'jewel') spr = Spr.surf.mystic;
      else if (pr.vtype === 'exchange') spr = Spr.surf.exchange;
      else spr = Spr.surf.stallTiers[pr.vtype][clamp(((G.meta.vendorLvl && G.meta.vendorLvl[pr.vtype]) || 1) - 1, 0, 4)];
    }
    else if (pr.kind === 'vendor') spr = pr.vtype === 'tavern' ? Spr.int.innkeeper : Spr.surf.vendors[pr.vtype];
    else if (pr.kind === 'peddler') spr = Spr.surf.vendors.peddler; // странстващият търговец
    else if (pr.kind === 'exitdoor') spr = Spr.int.door;             // вратата навън
    else if (pr.kind === 'table') spr = Spr.surf.table;
    else if (pr.kind === 'bench') spr = Spr.surf.bench;
    else if (pr.kind === 'stool') spr = Spr.surf.stool;
    else if (pr.kind === 'keg') spr = Spr.surf.keg;
    else if (pr.kind === 'fireplace') spr = Spr.surf.fireplace;
    else if (pr.kind === 'cauldron') spr = Spr.surf.cauldron;
    else if (pr.kind === 'shelf') spr = Spr.surf.shelf;
    else if (pr.kind === 'bedroll') spr = Spr.surf.bedroll;
    else if (pr.kind === 'sacks') spr = Spr.surf.sacks;
    else if (pr.kind === 'candle') spr = Spr.surf.candle;
    else if (pr.kind === 'portal') {
      if (G.onSurface) {
        // на повърхността входът към подземието е ПЕЩЕРА, не портал.
        // Ако имаш активна контролна точка (връщаш се там, откъдето излезе),
        // пещерата свети с лилавия портален ефект — индикатор за продължаване.
        spr = Spr.surf.cave;
        const cp = pr.dungeon === 'mirhold' ? (G.mirCheckpoint || 1) : (G.checkpoint || 1);
        if (cp > 1) portalFx(pr, vis);
      } else {
        spr = Spr.surf.portal[Math.floor(G.time * 4) % 3];
        portalFx(pr, vis);
      }
    }
    else if (pr.kind === 'homeportal') { initSurfaceSprites(); spr = Spr.surf.portal[Math.floor(G.time * 4) % 3]; portalFx(pr, vis); }
    else if (pr.kind === 'cityportal') {
      // ХЕНЧСТОУНЪТ: камък + пулсираща руна + издигащи се въгленчета (като титулния екран)
      if (vis && chance(0.10)) {
        const aa = rnd(0, Math.PI * 2);
        addParticle({
          x: pr.x + Math.cos(aa) * rnd(0.2, 0.9), y: pr.y + Math.sin(aa) * rnd(0.2, 0.9), z: rnd(0, 6),
          vx: rnd(-0.25, 0.25), vy: rnd(-0.25, 0.25), vz: rnd(3, 8), grav: -3, t: 0, life: rnd(1.4, 2.6),
          col: pick(['#3fae9e', '#5cd6c4', '#8af0e0', '#8af0e0', '#d8fff8']), size: chance(0.18) ? 2 : 1,
        });
      }
      const o2 = pushDraw(pr.x + pr.y); o2.kind = 'hearth'; o2.sx = sx; o2.sy = sy; o2.vis = vis;
      continue;
    }
    else if (pr.kind === 'house') spr = (pr.t === 1 ? Spr.surf.houses2 : Spr.surf.houses)[pr.v || 0];
    else if (pr.kind === 'shophouse') spr = Spr.surf.shophouses[pr.vtype];
    else if (pr.kind === 'tower') spr = Spr.surf.tower;
    else if (pr.kind === 'church') spr = Spr.surf.church;
    else if (pr.kind === 'priest') spr = Spr.surf.priest;
    else if (pr.kind === 'almsbox') spr = Spr.surf.almsbox;
    else if (pr.kind === 'wallseg') spr = Spr.surf.wallseg;
    else if (pr.kind === 'gatetower') spr = Spr.surf.gateTower;
    else if (pr.kind === 'gatebanner') spr = Spr.surf.gateBanner;
    else if (pr.kind === 'menhir') spr = Spr.surf.menhirs[(pr.v || 0) % 3];
    else if (pr.kind === 'tree2') spr = Spr.surf.tree2;
    else if (pr.kind === 'rock2') spr = Spr.surf.rock2;
    else if (pr.kind === 'bush') spr = Spr.surf.bushes[0];
    else if (pr.kind === 'bush2') spr = Spr.surf.bushes[1];
    else if (pr.kind === 'tuft') spr = Spr.surf.tufts[0];
    else if (pr.kind === 'tuft2') spr = Spr.surf.tufts[1];
    else if (pr.kind === 'deadTree2') spr = Spr.surf.deadTree2;
    else if (pr.kind === 'rock3') spr = Spr.surf.rock3;
    else if (pr.kind === 'fence2') spr = (Spr.surf.fenceTiles && pr.fm !== undefined) ? Spr.surf.fenceTiles[1][pr.fm] : Spr.surf.fence2;
    else if (pr.kind === 'fence3') spr = (Spr.surf.fenceTiles && pr.fm !== undefined) ? Spr.surf.fenceTiles[2][pr.fm] : Spr.surf.fence3;
    else if (pr.kind === 'puddle') spr = Spr.surf.puddle;
    else if (pr.kind === 'custom') spr = Spr.custom && Spr.custom[pr.cid]; // създаден от дизайнера
    if (!spr) continue;
    const flat = pr.flat;
    const cdef = pr.kind === 'custom' ? (G.customDefs && G.customDefs[pr.cid]) : null;
    // сградите са ВИНАГИ плътни; ако скриват героя, той се дорисува като силует отгоре
    const bigCust = cdef && !pr.flat && (cdef.cw + cdef.ch) > 2; // големите създадени спрайтове крият като сгради (теренът — не)
    if ((pr.kind === 'wallseg' || pr.kind === 'house' || pr.kind === 'shophouse' || pr.kind === 'tower' || pr.kind === 'church' || pr.kind === 'gatetower' || bigCust) && pr.x + pr.y > pD + 0.6) {
      const lift = bigCust ? (cdef.cw + cdef.ch) * 4 : (pr.kind === 'house' || pr.kind === 'shophouse' || pr.kind === 'church' || pr.kind === 'tower') ? 16 : 8;
      const hw = spr.width * S / 2 - 2 * S, hTop = sy + lift * S - spr.height * S + 6 * S, hBot = sy + lift * S - 8 * S;
      if (Math.abs(sx - psx) < hw && psy > hTop && psy < hBot) G.heroCovered = true;
    }
    // гредата със знамената се рисува РАНО (зад всичко в прохода) — никога не скрива героя
    // (създадените спрайтове се подреждат по югозападната клетка, като сградите)
    const o = pushDraw(pr.x + pr.y + (flat ? (cdef ? 0.4 - (cdef.cw + cdef.ch) / 2 : -0.6) : pr.kind === 'gatebanner' ? -2.5 : pr.kind === 'exitdoor' ? 0 : cdef ? (cdef.ch - cdef.cw) / 2 : 0));
    o.kind = 'prop'; o.spr = spr; o.sx = sx; o.sy = sy; o.flat = flat; o.vis = vis;
    // pyo: изометрична котва — дъното ляга на южния връх на футпринта
    o.pyo = (pr.kind === 'wallseg' || pr.kind === 'gatetower') ? 8
      : (pr.kind === 'house' || pr.kind === 'shophouse' || pr.kind === 'church' || pr.kind === 'tower') ? 16
      : pr.kind === 'exitdoor' ? 8
      : cdef ? (cdef.cw + cdef.ch) * 4 : undefined;
    o.alpha = 0;
  }
  // предмети по земята
  for (const gitem of G.ground) {
    const i = Math.floor(gitem.x), j = Math.floor(gitem.y);
    const idx = j * m.w + i;
    if (idx < 0 || !G.explored[idx] || !G.visible[idx]) continue;
    const sx = isoX(gitem.x, gitem.y) + camX, sy = isoY(gitem.x, gitem.y) + camY;
    const icon = gitem.gold ? 'gold_small' : gitem.silver ? SILVER_ITEMS[gitem.silver.k].icon : gitem.potion ? ('potion_' + gitem.potion) : gitem.seal ? 'seal' : gitem.shard ? 'shard' : gitem.item.icon;
    const bobz = (gitem.item || gitem.seal || gitem.shard || gitem.silver) ? Math.sin(G.time * 3 + gitem.x * 7) * 1.5 + 2 : 0;
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
  // героят е скрит зад сграда -> дорисуваме го като полупрозрачен силует НАД нея
  if (G.heroCovered && G.player && G.state !== 'dead') {
    ctx.globalAlpha = 0.42;
    drawPlayer(G.player, psx, psy);
    ctx.globalAlpha = 1;
  }

  // --- МИРХОЛД: дим от комините + ниска мъгла (плоски пиксели, без градиенти) ---
  if (G.onSurface && G.city === 'mirhold') {
    for (const pr of G.props) {
      if (pr.kind !== 'house' && pr.kind !== 'shophouse') continue;
      const pi2 = Math.floor(pr.x), pj2 = Math.floor(pr.y);
      if (pi2 < i0 - 1 || pi2 > i1 + 1 || pj2 < j0 - 1 || pj2 > j1 + 1) continue;
      const sx = isoX(pr.x, pr.y) + camX, sy = isoY(pr.x, pr.y) + camY;
      const h2 = pr.kind === 'house' && pr.t === 1; // двуетажната е по-висока
      const chx = sx + (pr.kind === 'house' ? 0 : -10) * S; // над комина (в средата на покрива)
      const base = sy - (pr.kind === 'house' ? (h2 ? 61 : 49) : 38) * S;
      for (let sm = 0; sm < 4; sm++) {
        const t2 = (G.time * 0.7 + sm * 0.25 + pr.x * 0.13) % 1;
        const a2 = 0.30 * (1 - t2);
        ctx.fillStyle = 'rgba(150,155,165,' + a2.toFixed(2) + ')';
        const wob = Math.sin(G.time * 1.5 + sm * 2 + pr.y) * 2 * S;
        ctx.fillRect((chx + wob) | 0, (base - t2 * 16 * S) | 0, 2 * S, 2 * S);
      }
    }
    // ниска мъгла в далечината — тънки полупрозрачни ленти, бавно пълзящи
    for (let fi = 0; fi < 3; fi++) {
      const fy = CH * (0.30 + fi * 0.22) + Math.sin(G.time * 0.25 + fi * 2.1) * 6 * S;
      ctx.fillStyle = 'rgba(148,156,166,' + (0.045 + fi * 0.01).toFixed(3) + ')';
      ctx.fillRect(0, fy | 0, CW, (10 + fi * 4) * S);
    }
  }

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
  if (G.cityEdit && G.state === 'play') drawCityEditOverlay();

  if (G.state === 'inventory') drawInventory();
  else if (G.state === 'stats') drawStats();
  else if (G.state === 'shop') drawShop();
  else if (G.state === 'levelup') drawLevelup();
  else if (G.state === 'pause') drawPause();
  else if (G.state === 'dead') drawDead();
  else if (G.state === 'transition') drawTransition();
  else if (G.state === 'settings') drawSettings();
  else if (G.state === 'savetransfer') drawSaveTransfer();
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
  if (G.pixEdit) { // в пиксел-редактора: само точка-показалец, без мерник
    rcx(G.mouse.x - 1, G.mouse.y - 1, 3, 3, '#10131c');
    rcx(G.mouse.x, G.mouse.y, 1, 1, '#ffffff');
    return;
  }
  blit(ctx, Spr.cursor, G.mouse.x - 5.5 * S, G.mouse.y - 5.5 * S);
}

// ---------- старт ----------
function boot() {
  cv = document.getElementById('game');
  ctx = cv.getContext('2d');
  // dev-едиторът на града се отключва САМО с ?editor=1 в адреса
  G.editorOn = /[?&]editor=1/.test(location.search);
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

// ================= ГРАДСКИ ЕДИТОР (dev): ?editor=1 + F2 в Мирхолд =================
// Местиш сгради на живо; подредбата се пази локално и се копира като код (COPY),
// който се вгражда в играта (MIRHOLD_LAYOUT) — така става градът ЗА ВСИЧКИ.
const BLD_DEFS = {
  house:     { ax: 1.0, ay: 0.0, cells: (x, y) => [[x, y - 1], [x + 1, y - 1], [x, y], [x + 1, y]] },
  shophouse: { ax: 1.0, ay: 0.0, cells: (x, y) => [[x, y - 1], [x + 1, y - 1], [x, y], [x + 1, y]] },
  church:    { ax: 1.0, ay: 0.0, cells: (x, y) => [[x, y - 1], [x + 1, y - 1], [x, y], [x + 1, y]] },
  tower:     { ax: 1.0, ay: 0.0, cells: (x, y) => [[x, y - 1], [x + 1, y - 1], [x, y], [x + 1, y]] }, // кийпът е 2x2
  gatetower: { ax: 0.5, ay: 0.5, cells: (x, y) => [[x, y]] },              // за диагностика/местене
  wallseg:   { ax: 0.5, ay: 0.5, cells: (x, y) => [[x, y]] },              // сегмент от стената
  portal:    { ax: 0.5, ay: 0.5, cells: () => [], free: true },            // пещерата — мести се свободно
  cityportal:{ ax: 0.5, ay: 0.5, cells: () => [], free: true },            // хенчстоунът — мести се свободно
  tree:      { ax: 0.5, ay: 0.5, cells: () => [], free: true },            // декорите — свободни
  tree2:     { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  deadTree:  { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  rock:      { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  rock2:     { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  bush:      { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  bush2:     { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  tuft:      { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  tuft2:     { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  fence:     { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  deadTree2: { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  rock3:     { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  fence2:    { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  fence3:    { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  puddle:    { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  peddler:   { ax: 0.5, ay: 0.5, cells: () => [], free: true }, // мястото на странстващия търговец
  exitdoor:  { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  tomb:      { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  table:     { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  bench:     { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  stool:     { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  keg:       { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  fireplace: { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  cauldron:  { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  shelf:     { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  bedroll:   { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  sacks:     { ax: 0.5, ay: 0.5, cells: () => [], free: true },
  candle:    { ax: 0.5, ay: 0.5, cells: () => [], free: true },
};
// какво може да се ДОБАВЯ/ТРИЕ с едитора (палитрата) + физика на всяко
const DECOR_KINDS = {
  tree:     { r: 0.38, solid: true },
  tree2:    { r: 0.38, solid: true },
  deadTree: { r: 0.38, solid: true },
  rock:     { r: 0.3, solid: true },
  rock2:    { r: 0.35, solid: true },
  bush:     { r: 0.3, solid: true },
  bush2:    { r: 0.3, solid: true },
  tuft:     { r: 0, solid: false },
  tuft2:    { r: 0, solid: false },
  fence:    { r: 0.35, solid: true },
  deadTree2:{ r: 0.38, solid: true },
  rock3:    { r: 0.45, solid: true },
  fence2:   { r: 0.35, solid: true },
  fence3:   { r: 0.35, solid: true },
  puddle:   { r: 0, solid: false, flat: true }, // ляга НА земята, под всичко
  // МЕБЕЛИ (базата за хана и стаите)
  table:    { r: 0.42, solid: true },
  bench:    { r: 0.34, solid: true },
  stool:    { r: 0.22, solid: true },
  keg:      { r: 0.26, solid: true },
  fireplace:{ r: 0.45, solid: true },
  cauldron: { r: 0.28, solid: true },
  shelf:    { r: 0.38, solid: true },
  bedroll:  { r: 0.4, solid: false },
  sacks:    { r: 0.3, solid: true },
  candle:   { r: 0.16, solid: true },
  exitdoor: { r: 0.2, solid: false },   // вратата навън — слага се и се мести като всичко
  tomb:     { r: 0.3, solid: true },    // надгробна плоча
};
// оградите се СНАПВАТ: маска по съседите (N=1,E=2,S=4,W=8), трите вида се връзват взаимно
const FENCE_SET = { fence: 0, fence2: 1, fence3: 2 };
function recomputeFenceMasks() {
  const cells = new Set();
  for (const pr of G.props) if (FENCE_SET[pr.kind] !== undefined) cells.add(Math.floor(pr.x) + ',' + Math.floor(pr.y));
  for (const pr of G.props) {
    if (FENCE_SET[pr.kind] === undefined) continue;
    const x = Math.floor(pr.x), y = Math.floor(pr.y);
    pr.fm = (cells.has(x + ',' + (y - 1)) ? 1 : 0) | (cells.has((x + 1) + ',' + y) ? 2 : 0)
      | (cells.has(x + ',' + (y + 1)) ? 4 : 0) | (cells.has((x - 1) + ',' + y) ? 8 : 0);
  }
  G.fenceDirty = false;
}
function bldBase(pr) {
  const def = BLD_DEFS[pr.kind];
  return { bx: Math.round(pr.x - def.ax), by: Math.round(pr.y - def.ay) };
}
function cityEditToggle() {
  G.cityEdit = !G.cityEdit;
  G.editSelBld = null;
  if (G.pixPaint) { G.pixPaint = false; pixSaveOverride(); } // щрихът по средата не се губи
  G.pixEdit = null; G.pixPaint = false; G.pixShape = null;
  G.createSt = null; G.pixSVDrag = false; G.pixHueDrag = false;
  toast(G.cityEdit ? 'CITY EDITOR: tap a building, then tap a tile. F2/ESC — exit.' : 'Editor closed. The layout is saved on this device.', '#ffd23b');
}
function bldCellsFree(cellsList, self) {
  const m = G.map;
  const selfDef = self ? BLD_DEFS[self.kind] : null;
  const sb = self ? bldBase(self) : null;
  for (const [x, y] of cellsList) {
    if (x < 3 || y < 3 || x >= m.w - 3 || y >= m.h - 3) return false;
    if (m.cells[y * m.w + x] !== FLOOR) {
      // клетка, заета от САМАТА местена сграда, е позволена
      if (!self || !selfDef.cells(sb.bx, sb.by).some(([a, b]) => a === x && b === y)) return false;
    }
  }
  return true;
}
function moveBuilding(pr, bx, by) {
  if (pr.kind === 'custom') {
    const cd = G.customDefs && G.customDefs[pr.cid]; if (!cd) return;
    const m2 = G.map;
    for (const [x, y] of customCells(cd, bx, by)) {
      if (x < 2 || y < 2 || x >= m2.w - 2 || y >= m2.h - 2 || m2.cells[y * m2.w + x] !== FLOOR) { toast('Cannot place it here.', '#ff6b7a'); Sfx.play('deny'); return; }
    }
    pr.bx = bx; pr.by = by; pr.x = bx + cd.cw / 2; pr.y = by + cd.ch / 2;
    saveCityLayout(); Sfx.play('open');
    return;
  }
  const def = BLD_DEFS[pr.kind];
  const cellsNew = def.cells(bx, by);
  if (def.free) {
    // свободните (пещера/хенчстоун): целта трябва само да е проходима
    const m = G.map;
    if (m.cells[by * m.w + bx] !== FLOOR) { toast('Cannot place it here.', '#ff6b7a'); Sfx.play('deny'); return; }
  } else if (!bldCellsFree(cellsNew, pr)) { toast('Cannot place it here.', '#ff6b7a'); Sfx.play('deny'); return; }
  const m = G.map;
  const sb = bldBase(pr);
  if (!def.free) {
    for (const [x, y] of def.cells(sb.bx, sb.by)) m.cells[y * m.w + x] = FLOOR;
    for (const [x, y] of cellsNew) m.cells[y * m.w + x] = 0;
  }
  const ox = bx + def.ax - pr.x, oy = by + def.ay - pr.y;
  pr.x += ox; pr.y += oy;
  if (FENCE_SET[pr.kind] !== undefined) G.fenceDirty = true;
  if (pr.kind === 'church') for (const q of G.props) if (q.kind === 'priest' || q.kind === 'almsbox') { q.x += ox; q.y += oy; }
  if (pr.kind === 'cityportal') for (const q of G.props) if (q.kind === 'menhir') { q.x += ox; q.y += oy; } // кръгът следва камъка
  saveCityLayout();
  Sfx.play('open');
}
// Записът пази ТРИ предишни копия — нищо не изчезва безвъзвратно.
function saveLayoutSafe(key, L) {
  try {
    const prev = localStorage.getItem(key);
    const txt = JSON.stringify(L);
    if (prev && prev !== txt) {
      localStorage.setItem(key + '_bak3', localStorage.getItem(key + '_bak2') || '');
      localStorage.setItem(key + '_bak2', localStorage.getItem(key + '_bak1') || '');
      localStorage.setItem(key + '_bak1', prev);
    }
    localStorage.setItem(key, txt);
  } catch (e) {}
}
// връща последното запазено копие (за бутона RESTORE)
function restoreLayoutBackup() {
  const key = G.inside ? interiorLayoutKey(G.inside.id) : 'sm_layout_mirhold';
  let src = null;
  for (const suf of ['_bak1', '_bak2', '_bak3']) {
    const v = localStorage.getItem(key + suf);
    if (v && v.length > 2) { src = { suf, v }; break; }
  }
  if (!src) { toast('No backup found.', '#ff6b7a'); Sfx.play('deny'); return; }
  if (G.restoreArm !== key) { G.restoreArm = key; toast('Click RESTORE again to load the previous version.', '#ffd23b'); return; }
  G.restoreArm = null;
  try {
    localStorage.setItem(key + '_bak0', localStorage.getItem(key) || ''); // и сегашното се пази
    localStorage.setItem(key, src.v);
  } catch (e) {}
  if (G.inside) { const id = G.inside.id, ret = G.inside.ret; G.inside = null; enterInterior(id, ret.x, ret.y); }
  else startSurface('mirhold');
  toast('Previous version restored.', '#7fd0a0');
}
function saveCityLayout() {
  if (G.inside) return saveInteriorLayout();
  if (G.city !== 'mirhold') return null; // подредбата е само на Мирхолд — друг град не я пипа
  const L = { houses: [], shops: {}, church: null, tower: null, cave: null, travel: null, decor: [] };
  for (const pr of G.props) {
    if (pr.kind === 'custom') { L.decor.push({ k: 'custom', id: pr.cid, x: pr.bx, y: pr.by }); continue; }
    if (!BLD_DEFS[pr.kind]) continue;
    const { bx, by } = bldBase(pr);
    if (pr.kind === 'house') L.houses.push({ x: bx, y: by, t: pr.t || 0, v: pr.v || 0 });
    else if (pr.kind === 'shophouse') L.shops[pr.vtype] = { x: bx, y: by };
    else if (pr.kind === 'church') L.church = { x: bx, y: by };
    else if (pr.kind === 'tower') L.tower = { x: bx, y: by };
    else if (pr.kind === 'wallseg') (L.walls = L.walls || []).push({ x: bx, y: by });
    else if (pr.kind === 'gatetower') (L.gates = L.gates || []).push({ x: bx, y: by });
    else if (pr.kind === 'peddler') L.peddler = { x: bx, y: by };
    else if (pr.kind === 'portal') L.cave = { x: bx, y: by };
    else if (pr.kind === 'cityportal') L.travel = { x: bx, y: by };
    else if (DECOR_KINDS[pr.kind]) L.decor.push({ k: pr.kind, x: bx, y: by });
  }
  if (G.spriteOverrides && Object.keys(G.spriteOverrides).length) L.sprites = G.spriteOverrides;
  if (G.customDefs && Object.keys(G.customDefs).length) L.custom = G.customDefs; // създадените спрайтове (с рисунките им)
  if (G.spriteNames && Object.keys(G.spriteNames).length) L.names = G.spriteNames;
  // пътищата (боядисани с четката) — целият слой, пакетиран в base64
  try {
    const pb = G.map.path; const bytes = new Uint8Array((pb.length + 7) >> 3);
    for (let i = 0; i < pb.length; i++) if (pb[i]) bytes[i >> 3] |= 1 << (i & 7);
    L.paths = btoa(String.fromCharCode.apply(null, bytes));
  } catch (e) {}
  saveLayoutSafe('sm_layout_mirhold', L);
  return L;
}
// поставяне на СГРАДА от палитрата (за възстановяване и дострояване)
function placeBuildingAt(bk, cellX, cellY, loud) {
  const m = G.map;
  const deny = (msg) => { if (loud) { toast(msg, '#ff6b7a'); Sfx.play('deny'); } };
  const vt = bk.slice(0, 5) === 'shop_' ? bk.slice(5) : null;
  // единичните: църквата, кулата и всеки магазин съществуват само по веднъж
  if (bk === 'church' || bk === 'tower' || vt) {
    for (const pr of G.props) if (vt ? (pr.kind === 'shophouse' && pr.vtype === vt) : pr.kind === bk) {
      if (loud) { toast('Already in the city — use MOVE to relocate it.', '#ffd23b'); Sfx.play('deny'); }
      return;
    }
  }
  if (bk === 'wallseg' || bk === 'gatetower') {
    const idx = cellY * m.w + cellX;
    if (cellX < 3 || cellY < 3 || cellX >= m.w - 3 || cellY >= m.h - 3 || m.cells[idx] !== FLOOR) return deny('Cannot place it here.');
    for (const pr of G.props) if ((pr.kind === 'wallseg' || pr.kind === 'gatetower') && Math.floor(pr.x) === cellX && Math.floor(pr.y) === cellY) return;
    m.cells[idx] = 0;
    G.props.push({ kind: bk, x: cellX + 0.5, y: cellY + 0.5, r: 0.5, solid: false });
    G.editDecorDirty = true;
    if (loud) { saveCityLayout(); G.editDecorDirty = false; Sfx.play('coin'); }
    return;
  }
  const defKind = vt ? 'shophouse' : bk.slice(0, 5) === 'house' ? 'house' : bk;
  const def = BLD_DEFS[defKind];
  if (!def) return;
  const cellsNew = def.cells(cellX, cellY);
  if (!bldCellsFree(cellsNew, null)) return deny('Cannot place it here.');
  for (const [x, y] of cellsNew) m.cells[y * m.w + x] = 0;
  const px2 = cellX + def.ax, py2 = cellY + def.ay;
  if (defKind === 'house') {
    const pp = bk.split('_'); // house,t,v
    G.props.push({ kind: 'house', t: +pp[1] || 0, v: +pp[2] || 0, x: px2, y: py2, r: 0.6, solid: false });
  } else if (vt) {
    G.props.push({ kind: 'shophouse', vtype: vt, x: px2, y: py2, r: 0.6, solid: false, name: (typeof VENDOR_DEFS !== 'undefined' && VENDOR_DEFS[vt]) ? VENDOR_DEFS[vt].name : vt });
  } else {
    G.props.push({ kind: defKind, x: px2, y: py2, r: 0.6, solid: false });
  }
  saveCityLayout();
  Sfx.play('coin');
}
// подредбата на СТАЯТА: мебели (декор + собствени спрайтове) и пикселни корекции
function saveInteriorLayout() {
  const L = { room: G.inside.id, decor: [] }; // белегът коя стая е — за вграждане
  // СТЕНИТЕ на стаята (битова маска, за да не расте записът)
  try {
    const m = G.map, bytes = new Uint8Array((m.cells.length + 7) >> 3);
    for (let i = 0; i < m.cells.length; i++) if (m.cells[i] === WALL) bytes[i >> 3] |= 1 << (i & 7);
    L.w = m.w; L.h = m.h;
    L.walls = btoa(String.fromCharCode.apply(null, bytes));
  } catch (e) {}
  for (const pr of G.props) {
    if (pr.kind === 'custom') { L.decor.push({ k: 'custom', id: pr.cid, x: pr.bx, y: pr.by }); continue; }
    if (DECOR_KINDS[pr.kind]) L.decor.push({ k: pr.kind, x: Math.floor(pr.x), y: Math.floor(pr.y) });
  }
  if (G.customDefs && Object.keys(G.customDefs).length) L.custom = G.customDefs;
  if (G.spriteOverrides && Object.keys(G.spriteOverrides).length) L.sprites = G.spriteOverrides;
  if (G.spriteNames && Object.keys(G.spriteNames).length) L.names = G.spriteNames;
  saveLayoutSafe(interiorLayoutKey(G.inside.id), L);
  return L;
}
function placeDecorAt(cellX, cellY, loud) {
  const m = G.map, idx = cellY * m.w + cellX;
  const kind = G.editPlaceKind;
  if (!kind) { if (loud) toast('Pick an element from the palette first.', '#ffd23b'); return; }
  if (kind.slice(0, 2) === 'b_') { placeBuildingAt(kind.slice(2), cellX, cellY, loud); return; }
  if (kind.slice(0, 5) === 'cust_') {
    const id = kind.slice(5), cd = G.customDefs && G.customDefs[id];
    if (!cd) { G.editPlaceKind = null; if (loud) toast('That sprite no longer exists.', '#ff6b7a'); return; }
    for (const [x, y] of customCells(cd, cellX, cellY)) {
      if (x < 2 || y < 2 || x >= m.w - 2 || y >= m.h - 2 || m.cells[y * m.w + x] !== FLOOR) { if (loud) { toast('Cannot place it here.', '#ff6b7a'); Sfx.play('deny'); } return; }
    }
    for (const pr of G.props) if (pr.kind === 'custom' && pr.cid === id && pr.bx === cellX && pr.by === cellY) return;
    G.props.push({ kind: 'custom', cid: id, bx: cellX, by: cellY, cw: cd.cw, ch: cd.ch, x: cellX + cd.cw / 2, y: cellY + cd.ch / 2, r: 0.5, solid: !!cd.solid && !cd.flat, flat: !!cd.flat });
    G.editDecorDirty = true;
    if (loud) { saveCityLayout(); G.editDecorDirty = false; Sfx.play('coin'); }
    return;
  }
  const B2 = G.inside ? 1 : 2; // в стаята стените са на ред 1 — там също се слага
  if (cellX < B2 || cellY < B2 || cellX >= m.w - B2 || cellY >= m.h - B2 || m.cells[idx] !== FLOOR) { if (loud) { toast('Cannot place it here.', '#ff6b7a'); Sfx.play('deny'); } return; }
  // не дублираме същия вид върху същата клетка (моливът минава много пъти);
  // оградите не се трупат и МЕЖДУ видовете — една клетка носи една ограда
  for (const pr of G.props) {
    const clash = pr.kind === kind || (FENCE_SET[kind] !== undefined && FENCE_SET[pr.kind] !== undefined);
    if (clash && Math.floor(pr.x) === cellX && Math.floor(pr.y) === cellY) return;
  }
  const d = DECOR_KINDS[kind];
  G.props.push({ kind, x: cellX + 0.5, y: cellY + 0.5, r: d.r, solid: d.solid, flat: !!d.flat });
  if (FENCE_SET[kind] !== undefined) G.fenceDirty = true;
  G.editDecorDirty = true;
  if (loud) { saveCityLayout(); G.editDecorDirty = false; Sfx.play('coin'); }
}
function eraseDecorAt(cellX, cellY) {
  const kind = G.editPlaceKind;
  if (!kind) return;
  if (kind.slice(0, 2) === 'b_') {
    const bk = kind.slice(2);
    const vt = bk.slice(0, 5) === 'shop_' ? bk.slice(5) : null;
    for (let i = G.props.length - 1; i >= 0; i--) {
      const pr = G.props[i];
      const match = vt ? (pr.kind === 'shophouse' && pr.vtype === vt)
        : bk.slice(0, 5) === 'house' ? (pr.kind === 'house' && (pr.t || 0) === (+bk.split('_')[1] || 0) && (pr.v || 0) === (+bk.split('_')[2] || 0))
        : pr.kind === bk;
      if (!match || !BLD_DEFS[pr.kind]) continue;
      const { bx, by } = bldBase(pr);
      const cellsL = BLD_DEFS[pr.kind].cells(bx, by);
      if (!cellsL.some(([a, b2]) => a === cellX && b2 === cellY)) continue;
      for (const [x, y] of cellsL) G.map.cells[y * G.map.w + x] = FLOOR;
      G.props.splice(i, 1);
      if (pr.kind === 'gatetower') { // гредата със знамената пада със своята кула
        for (let k2 = G.props.length - 1; k2 >= 0; k2--) { const q = G.props[k2]; if (q.kind === 'gatebanner' && Math.abs(q.y - pr.y) < 1 && Math.abs(q.x - pr.x) <= 2.5) G.props.splice(k2, 1); }
      }
      G.editDecorDirty = true;
      return;
    }
    return;
  }
  if (kind.slice(0, 5) === 'cust_') {
    const id = kind.slice(5), cd = G.customDefs && G.customDefs[id];
    if (!cd) return;
    for (let i = G.props.length - 1; i >= 0; i--) {
      const pr = G.props[i];
      if (pr.kind !== 'custom' || pr.cid !== id) continue;
      if (cellX >= pr.bx && cellX < pr.bx + cd.cw && cellY >= pr.by && cellY < pr.by + cd.ch) { G.props.splice(i, 1); G.editDecorDirty = true; return; }
    }
    return;
  }
  for (let i = G.props.length - 1; i >= 0; i--) {
    const pr = G.props[i];
    if (pr.kind !== kind) continue;                       // гумата пипа САМО избрания вид
    if (Math.floor(pr.x) === cellX && Math.floor(pr.y) === cellY) {
      G.props.splice(i, 1);
      if (FENCE_SET[kind] !== undefined) G.fenceDirty = true;
      G.editDecorDirty = true;
      return;
    }
  }
}
// Прицелът при СЪБАРЯНЕ: блокът на стената се рисува ~20px по-високо от
// клетката си, затова мишката пада в пода ПРЕД нея — търсим стената, която
// окото вижда под курсора.
function pickWallCell() {
  const m = G.map;
  const bx = Math.floor(G.mouse.wx), by = Math.floor(G.mouse.wy);
  for (const [dx, dy] of [[1, 1], [0, 0], [2, 2], [1, 0], [0, 1], [2, 1], [1, 2]]) {
    const x = bx + dx, y = by + dy;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
    if (m.cells[y * m.w + x] === WALL) return { x, y };
  }
  return { x: bx, y: by };
}
// ЗИДАНЕ/СЪБАРЯНЕ на стена в стаята
function paintWallCell(v) {
  const m = G.map;
  const t = v === WALL ? { x: Math.floor(G.mouse.wx), y: Math.floor(G.mouse.wy) } : pickWallCell();
  const cx2 = t.x, cy2 = t.y;
  if (cx2 < 1 || cy2 < 1 || cx2 >= m.w - 1 || cy2 >= m.h - 1) return;
  if (v === WALL && Math.floor(G.player.x) === cx2 && Math.floor(G.player.y) === cy2) return; // не зазиждай героя
  const idx = cy2 * m.w + cx2;
  if (m.cells[idx] === v) return;
  m.cells[idx] = v;
  G.editWallDirty = true;
}
function paintPathCell(v) {
  const m = G.map;
  const cx2 = Math.floor(G.mouse.wx), cy2 = Math.floor(G.mouse.wy);
  if (cx2 < 2 || cy2 < 2 || cx2 >= m.w - 2 || cy2 >= m.h - 2) return;
  const idx = cy2 * m.w + cx2;
  if (m.path[idx] === v) return;
  m.path[idx] = v;
  G.editPathDirty = true; // записваме при пускане на бутона (не на всеки пиксел)
}
function cityEditClick(mx, my) {
  // панелът на пиксел-редактора поглъща кликовете си
  if (G.pixEdit && pixClick(mx, my)) return true;
  // бутоните на лентата
  for (const b of (UI.cityEditBtns || [])) if (mx >= b.x && mx < b.x + b.w && my >= b.y && my < b.y + b.h) { b.act(); return true; }
  const tool = G.editTool || 'move';
  // горната UI зона не е карта — да не редим елементи зад лентата/палитрата
  const uiBand = (tool === 'place' || tool === 'erase') && UI.editPaletteBottom ? UI.editPaletteBottom + 15 * SCALE : 40 * SCALE;
  if (tool !== 'move' && my < uiBand) return true;
  const cellX = Math.floor(G.mouse.wx), cellY = Math.floor(G.mouse.wy);
  // СЪЗДАВАНЕ: панелът поглъща кликовете си; при МАРКИРАНЕ влачиш рамка от клетки
  if (tool === 'create') {
    if (G.pixEdit) return true; // при отворен редактор няма невидимо МАРКИРАНЕ
    const cp = UI.createPanelRect;
    if (cp && mx >= cp.x && mx < cp.x + cp.w && my >= cp.y && my < cp.y + cp.h) return true;
    const st = G.createSt;
    if (st && st.mark) {
      st.drag = { x0: cellX, y0: cellY, x1: cellX, y1: cellY };
      G.editPaint = true;
    }
    return true;
  }
  // ЧЕТКИ за път/трева: боядисваме и започваме влачене
  if (tool === 'path' || tool === 'grass') {
    G.editPaint = true;
    paintPathCell(tool === 'path' ? 1 : 0);
    return true;
  }
  // ЧЕТКИ за стена/под (в стаята)
  if (tool === 'wall' || tool === 'floor') {
    G.editPaint = true;
    paintWallCell(tool === 'wall' ? WALL : FLOOR);
    return true;
  }
  // ДОБАВЯНЕ (клик) — поставя избрания от палитрата елемент;
  // оградите се редят с ВЛАЧЕНЕ (свързват се сами)
  if (tool === 'place') {
    placeDecorAt(cellX, cellY, true);
    if (G.editPlaceKind && FENCE_SET[G.editPlaceKind] !== undefined) G.editPaint = true;
    return true;
  }
  // МОЛИВЪТ: избираш поставен обект -> отваря се пиксел-редакторът за спрайта му
  if (tool === 'pencil') {
    for (const pr of G.props) {
      const key = propSpriteKey(pr);
      if (!key) continue;
      const def = BLD_DEFS[pr.kind];
      let hitP = false;
      if (pr.kind === 'custom') {
        const cd = G.customDefs && G.customDefs[pr.cid];
        hitP = !!cd && cellX >= pr.bx && cellX < pr.bx + cd.cw && cellY >= pr.by && cellY < pr.by + cd.ch;
      } else if (def && !def.free && def.cells) {
        const { bx, by } = bldBase(pr);
        hitP = def.cells(bx, by).some(([a, b]) => a === cellX && b === cellY);
      } else {
        hitP = Math.floor(pr.x) === cellX && Math.floor(pr.y) === cellY;
      }
      if (hitP) { openPixelEditor(key); return true; }
    }
    toast('Click a placed object to edit its pixels.', '#ffd23b');
    return true;
  }
  // ГУМАТА: трие САМО избрания вид (с влачене) — да не стават грешки
  if (tool === 'erase') {
    G.editPaint = true;
    eraseDecorAt(cellX, cellY);
    return true;
  }
  // избор на сграда (клик върху някоя от клетките ѝ; свободните — по собствената им клетка)
  let hit = null;
  for (const pr of G.props) {
    if (pr.kind === 'custom') {
      const cd = G.customDefs && G.customDefs[pr.cid];
      if (cd && cellX >= pr.bx && cellX < pr.bx + cd.cw && cellY >= pr.by && cellY < pr.by + cd.ch) { hit = pr; break; }
      continue;
    }
    const def = BLD_DEFS[pr.kind];
    if (!def) continue;
    const { bx, by } = bldBase(pr);
    if (def.free) {
      // пещерата е широка — хваща се и по съседните клетки
      const rr = pr.kind === 'portal' ? 1 : 0;
      if (Math.abs(cellX - bx) <= rr && Math.abs(cellY - by) <= rr) { hit = pr; break; }
    } else if (def.cells(bx, by).some(([a, b]) => a === cellX && b === cellY)) { hit = pr; break; }
  }
  if (hit) { G.editSelBld = hit === G.editSelBld ? null : hit; Sfx.play('coin'); return true; }
  if (!G.editSelBld) return true;
  moveBuilding(G.editSelBld, cellX, cellY);
  return true;
}
function drawCityEditOverlay() {
  const S = SCALE;
  const diamond = (x, y, col) => {
    const sx = isoX(x, y) + G.camRX, sy = isoY(x, y) + G.camRY;
    ctx.strokeStyle = col; ctx.lineWidth = S;
    ctx.beginPath();
    ctx.moveTo(sx, sy); ctx.lineTo(sx + TW / 2, sy + TH / 2); ctx.lineTo(sx, sy + TH); ctx.lineTo(sx - TW / 2, sy + TH / 2);
    ctx.closePath(); ctx.stroke();
  };
  // клетките на избраната сграда — жълти
  if (G.editSelBld && G.editSelBld.kind === 'custom') {
    const cd = G.customDefs && G.customDefs[G.editSelBld.cid];
    if (cd) {
      for (const [x, y] of customCells(cd, G.editSelBld.bx, G.editSelBld.by)) diamond(x, y, 'rgba(255,210,59,0.9)');
      const cx2 = Math.floor(G.mouse.wx), cy2 = Math.floor(G.mouse.wy);
      const m2 = G.map;
      const ok = customCells(cd, cx2, cy2).every(([x, y]) => x >= 2 && y >= 2 && x < m2.w - 2 && y < m2.h - 2 && m2.cells[y * m2.w + x] === FLOOR);
      diamond(cx2, cy2, ok ? 'rgba(127,208,160,0.9)' : 'rgba(255,107,122,0.9)');
    }
  } else if (G.editSelBld && BLD_DEFS[G.editSelBld.kind]) {
    const { bx, by } = bldBase(G.editSelBld);
    const selCells = BLD_DEFS[G.editSelBld.kind].free ? [[bx, by]] : BLD_DEFS[G.editSelBld.kind].cells(bx, by);
    for (const [x, y] of selCells) diamond(x, y, 'rgba(255,210,59,0.9)');
    // клетката под курсора — зелена/червена според валидността
    const cx2 = Math.floor(G.mouse.wx), cy2 = Math.floor(G.mouse.wy);
    const ok = bldCellsFree(BLD_DEFS[G.editSelBld.kind].cells(cx2, cy2), G.editSelBld);
    diamond(cx2, cy2, ok ? 'rgba(127,208,160,0.9)' : 'rgba(255,107,122,0.9)');
  }
  // лентата с бутоните
  rcx(0, 0, CW, 17 * S, 'rgba(4,6,11,0.85)');
  ctx.font = fontBold(6.5); ctx.textAlign = 'center'; ctx.fillStyle = '#ffd23b';
  const toolH = G.editTool || 'move';
  const hint = toolH === 'move' ? 'tap a building, then a tile' : toolH === 'pencil' ? (G.pixEdit ? 'pixel editing: ' + editKindLabel(G.pixEdit.key) : 'click an object to PIXEL-EDIT its sprite') : toolH === 'place' ? (G.editPlaceKind ? 'placing: ' + editKindLabel(G.editPlaceKind) : 'PICK an element from the palette') : toolH === 'erase' ? (G.editPlaceKind ? 'erasing: ' + editKindLabel(G.editPlaceKind) + ' only' : 'PICK an element to erase') : toolH === 'create' ? 'create your own sprite — pick cells & height' : toolH === 'wall' ? 'drag to BUILD walls' : toolH === 'floor' ? 'drag to TEAR DOWN walls' : 'paint the ground';
  ctx.fillText('CITY EDITOR — ' + hint + ' · F2/ESC exit', CW / 2, 7 * S);
  UI.cityEditBtns = [];
  const btn = (label, x, wpx, col, act) => {
    panel(x, 9 * S, wpx, 12 * S);
    ctx.font = fontBold(6); ctx.fillStyle = col;
    ctx.fillText(label, x + wpx / 2, 17.5 * S);
    UI.cityEditBtns.push({ x, y: 9 * S, w: wpx, h: 12 * S, act });
  };
  btn('COPY LAYOUT', CW / 2 - 58 * S, 62 * S, '#7fd0a0', () => {
    const lay = saveCityLayout();
    if (!lay) { toast('Nothing to copy here.', '#ff6b7a'); return; }
    const room = G.inside ? G.inside.id : null;
    if (room) lay.room = room;                       // белег кой интериор е това
    const code = JSON.stringify(lay);
    try { navigator.clipboard.writeText(code); } catch (e) {}
    console.log((room ? ('INTERIOR_LAYOUT[' + room + '] =') : 'MIRHOLD_LAYOUT ='), code);
    // и като ФАЙЛ: дългите кодове (с PNG рисунки) се развалят при копиране през чат
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([code], { type: 'application/json' }));
      a.download = room ? ('interior_' + room + '.json') : 'mirhold_layout.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {}
    toast('Layout copied + saved as a FILE — send the file to Claude.', '#7fd0a0');
  });
  // RESET е ПРЕМАХНАТ: трореше цялата подредба с едно кликване.
  // Вместо него — връщане към предишното запазено копие (с потвърждение).
  btn(G.restoreArm ? 'SURE?' : 'RESTORE', CW / 2 + 24 * S, 44 * S, G.restoreArm ? '#ff6b7a' : '#8ab0ff', () => restoreLayoutBackup());
  btn('EXIT', CW / 2 + 72 * S, 36 * S, '#e8e4d0', () => cityEditToggle());
  // ВТОРИ РЕД: инструментите
  const tool = G.editTool || 'move';
  const tbtn = (label, x, wpx, id) => {
    panel(x, 23 * S, wpx, 12 * S);
    if (tool === id) strokeRect(x, 23 * S, wpx, 12 * S, '#ffd23b', S);
    ctx.font = fontBold(6); ctx.fillStyle = tool === id ? '#ffd23b' : '#a8b2c4'; ctx.textAlign = 'center';
    ctx.fillText(label, x + wpx / 2, 31.5 * S);
    UI.cityEditBtns.push({ x, y: 23 * S, w: wpx, h: 12 * S, act: () => { G.editTool = id; G.editSelBld = null; } });
  };
  tbtn('MOVE', CW / 2 - 140 * S, 38 * S, 'move');
  tbtn('ADD', CW / 2 - 100 * S, 30 * S, 'place');
  tbtn('PENCIL', CW / 2 - 68 * S, 42 * S, 'pencil');
  tbtn('ERASE', CW / 2 - 24 * S, 38 * S, 'erase');
  if (!G.inside) { // пътищата и тревата са само навън
    tbtn('PATH', CW / 2 + 16 * S, 34 * S, 'path');
    tbtn('GRASS', CW / 2 + 52 * S, 40 * S, 'grass');
  } else {         // вътре: зидане и събаряне на стени
    tbtn('WALL', CW / 2 + 16 * S, 34 * S, 'wall');
    tbtn('FLOOR', CW / 2 + 52 * S, 40 * S, 'floor');
  }
  tbtn('CREATE', CW / 2 + 94 * S, 44 * S, 'create');
  // ПАЛИТРАТА (при ADD/PENCIL/ERASE): моливът и гумата работят САМО по избрания елемент
  if (tool === 'place' || tool === 'erase') {
    const items = [
      ['tree', Spr.surf.tree], ['tree2', Spr.surf.tree2], ['deadTree', Spr.surf.deadTree], ['deadTree2', Spr.surf.deadTree2],
      ['rock', Spr.surf.rock], ['rock2', Spr.surf.rock2], ['rock3', Spr.surf.rock3],
      ['bush', Spr.surf.bushes[0]], ['bush2', Spr.surf.bushes[1]],
      ['tuft', Spr.surf.tufts[0]], ['tuft2', Spr.surf.tufts[1]],
      ['fence', Spr.surf.fenceTiles[0][10]], ['fence2', Spr.surf.fenceTiles[1][10]], ['fence3', Spr.surf.fenceTiles[2][10]],
      ['puddle', Spr.surf.puddle],
      ['tomb', Spr.surf.tomb],
      // мебелите
      ['table', Spr.surf.table],
      ['bench', Spr.surf.bench],
      ['stool', Spr.surf.stool],
      ['keg', Spr.surf.keg],
      ['fireplace', Spr.surf.fireplace],
      ['cauldron', Spr.surf.cauldron],
      ['shelf', Spr.surf.shelf],
      ['bedroll', Spr.surf.bedroll],
      ['sacks', Spr.surf.sacks],
      ['candle', Spr.surf.candle],
    ];
    if (G.inside && Spr.int) items.push(['exitdoor', Spr.int.door]); // вратата — само вътре
    // ВСИЧКИ СГРАДИ — да могат да се възстановяват/дострояват направо от палитрата
    if (!G.inside) items.push(
      ['b_house_0_0', Spr.surf.houses[0]], ['b_house_0_1', Spr.surf.houses[1]],
      ['b_house_1_0', Spr.surf.houses2[0]], ['b_house_1_1', Spr.surf.houses2[1]],
      ['b_shop_weapon', Spr.surf.shophouses.weapon], ['b_shop_armor', Spr.surf.shophouses.armor],
      ['b_shop_potion', Spr.surf.shophouses.potion], ['b_shop_jewel', Spr.surf.shophouses.jewel],
      ['b_shop_tavern', Spr.surf.shophouses.tavern],
      ['b_church', Spr.surf.church], ['b_tower', Spr.surf.tower],
      ['b_wallseg', Spr.surf.wallseg], ['b_gatetower', Spr.surf.gateTower]
    );
    for (const id in (G.customDefs || {})) if (Spr.custom && Spr.custom[id]) items.push(['cust_' + id, Spr.custom[id]]);
    const per = 16, cw2 = 18 * S;
    const palRows = Math.ceil(items.length / per);
    UI.editPaletteBottom = (37 + palRows * 20) * S;

    items.forEach(([k, spr2], i) => {
      const colI = i % per, rowI = Math.floor(i / per);
      const cntI = Math.min(per, items.length - rowI * per);
      const x0r = CW / 2 - cntI * (cw2 + 2 * S) / 2;
      const bx2 = x0r + colI * (cw2 + 2 * S), by2 = (37 + rowI * 20) * S;
      panel(bx2, by2, cw2, cw2);
      if (G.editPlaceKind === k) strokeRect(bx2, by2, cw2, cw2, '#7fd0a0', S);
      const f = Math.min((cw2 - 4 * S) / spr2.width, (cw2 - 4 * S) / spr2.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spr2, 0, 0, spr2.width, spr2.height,
        bx2 + (cw2 - spr2.width * f) / 2, by2 + (cw2 - spr2.height * f) / 2, spr2.width * f, spr2.height * f);
      // ненарисуван собствен спрайт — да не е невидимо копче
      if (k.slice(0, 5) === 'cust_' && G.customDefs[k.slice(5)] && !G.customDefs[k.slice(5)].png) {
        ctx.font = fontBold(8); ctx.fillStyle = '#7d8899'; ctx.textAlign = 'center';
        ctx.fillText('?', bx2 + cw2 / 2, by2 + cw2 / 2 + 3 * S);
      }
      UI.cityEditBtns.push({ x: bx2, y: by2, w: cw2, h: cw2, act: () => { G.editPlaceKind = k; if (G.editDelArm !== k) G.editDelArm = null; } });
    });
    // изтриване на СЪЗДАДЕН спрайт: дефиницията + всички поставени копия (два клика)
    if (G.editPlaceKind && G.editPlaceKind.slice(0, 5) === 'cust_') {
      const delId = G.editPlaceKind.slice(5);
      const armed = G.editDelArm === G.editPlaceKind;
      const dx = CW / 2 - 40 * S, dy = (UI.editPaletteBottom || 61 * S) + 2 * S;
      panel(dx, dy, 80 * S, 11 * S);
      strokeRect(dx, dy, 80 * S, 11 * S, armed ? '#ff6b7a' : '#3a4456', S);
      ctx.font = fontBold(5.5); ctx.textAlign = 'center'; ctx.fillStyle = '#ff6b7a';
      ctx.fillText(armed ? 'SURE? DELETE FOREVER' : 'DEL SPRITE: ' + customName(delId).slice(0, 12), dx + 40 * S, dy + 7.5 * S);
      UI.cityEditBtns.push({ x: dx, y: dy, w: 80 * S, h: 11 * S, act: () => {
        if (G.editDelArm !== G.editPlaceKind) { G.editDelArm = G.editPlaceKind; toast('Click again to DELETE the sprite and all its copies.', '#ff6b7a'); return; }
        for (let i = G.props.length - 1; i >= 0; i--) if (G.props[i].kind === 'custom' && G.props[i].cid === delId) G.props.splice(i, 1);
        delete G.customDefs[delId];
        if (Spr.custom) delete Spr.custom[delId];
        G.editPlaceKind = null; G.editDelArm = null;
        saveCityLayout();
        toast('Sprite deleted.', '#ffd23b');
        Sfx.play('deny');
      } });
    }
  }
  // влаченето: четките за път/трева + моливът + гумата
  if (G.editPaint && (tool === 'path' || tool === 'grass')) paintPathCell(tool === 'path' ? 1 : 0);
  if (G.editPaint && (tool === 'wall' || tool === 'floor')) paintWallCell(tool === 'wall' ? WALL : FLOOR);
  if (G.editPaint && tool === 'erase') eraseDecorAt(Math.floor(G.mouse.wx), Math.floor(G.mouse.wy));
  if (G.editPaint && tool === 'place' && G.editPlaceKind && FENCE_SET[G.editPlaceKind] !== undefined) placeDecorAt(Math.floor(G.mouse.wx), Math.floor(G.mouse.wy), false);
  if (G.editPaint && tool === 'create' && !G.pixEdit && G.createSt && G.createSt.drag) {
    G.createSt.drag.x1 = Math.floor(G.mouse.wx); G.createSt.drag.y1 = Math.floor(G.mouse.wy);
  }
  if (tool === 'create' && !G.pixEdit) drawCreatePanel(diamond);
  if (G.pixPaint && G.pixEdit) pixPaintAt(G.mouse.x, G.mouse.y);
  if (G.pixEdit && (G.pixEdit.selNew || G.pixEdit.selDrag) && G.mouse.down) {
    const e2 = G.pixEdit, hit = pixHitPixel(G.mouse.x, G.mouse.y);
    if (hit) {
      if (e2.selNew) { e2.selNew.x1 = hit.px; e2.selNew.y1 = hit.py; }
      else if (e2.selDrag) { e2.selDrag.dx = hit.px - e2.selDrag.px; e2.selDrag.dy = hit.py - e2.selDrag.py; }
    }
  }
  if (G.pixPanning && G.pixEdit) {
    G.pixEdit.panX = G.pixPanning.ox - (G.mouse.x - G.pixPanning.sx);
    G.pixEdit.panY = G.pixPanning.oy - (G.mouse.y - G.pixPanning.sy);
    pixClampPan();
  }
  if (G.pixEdit && (G.pixSVDrag || G.pixHueDrag)) pixPickerDrag(G.mouse.x, G.mouse.y);
  if (G.pixEdit) drawPixelEditor();
  // курсорната клетка при четка/добавяне/триене (не и в пиксел-режим)
  if (tool !== 'move' && !G.pixEdit) {
    let cx2 = Math.floor(G.mouse.wx), cy2 = Math.floor(G.mouse.wy);
    if (tool === 'floor') { const t = pickWallCell(); cx2 = t.x; cy2 = t.y; } // показваме СТЕНАТА, която ще падне
    const col = tool === 'erase' ? 'rgba(255,107,122,0.9)' : tool === 'floor' ? 'rgba(255,150,90,0.95)' : tool === 'wall' ? 'rgba(150,170,200,0.95)' : tool === 'grass' ? 'rgba(140,160,90,0.9)' : tool === 'path' ? 'rgba(150,120,80,0.9)' : 'rgba(127,208,160,0.9)';
    const cdC = (tool === 'place' || tool === 'erase') && G.editPlaceKind && G.editPlaceKind.slice(0, 5) === 'cust_' ? (G.customDefs && G.customDefs[G.editPlaceKind.slice(5)]) : null;
    if (cdC) { for (const [x, y] of customCells(cdC, cx2, cy2)) diamond(x, y, col); }
    else {
      const sx2 = isoX(cx2, cy2) + G.camRX, sy2 = isoY(cx2, cy2) + G.camRY;
      ctx.strokeStyle = col; ctx.lineWidth = S;
      ctx.beginPath();
      ctx.moveTo(sx2, sy2); ctx.lineTo(sx2 + TW / 2, sy2 + TH / 2); ctx.lineTo(sx2, sy2 + TH); ctx.lineTo(sx2 - TW / 2, sy2 + TH / 2);
      ctx.closePath(); ctx.stroke();
    }
  }
  ctx.textAlign = 'left';
}

// ================= СЪЗДАЙ СВОЙ СПРАЙТ (бутонът CREATE) =================
// Дизайнерът избира клетки (готови размери или МАРКИРАНЕ с влачене), височина
// нагоре и плътност; платното се ПОКАЗВА за преглед и чака ПОТВЪРЖДЕНИЕ —
// чак след него се рисува. Дефинициите влизат в подредбата (COPY LAYOUT).
function customCanvasSize(def) {
  if (def.pw && def.ph) return { w: def.pw, h: def.ph }; // ръчно зададен размер
  return { w: (def.cw + def.ch) * 16, h: (def.cw + def.ch) * 8 + (def.top || 0) };
}
function customCells(def, bx, by) {
  const out = [];
  for (let dy = 0; dy < def.ch; dy++) for (let dx = 0; dx < def.cw; dx++) out.push([bx + dx, by + dy]);
  return out;
}
function customName(id) {
  const d2 = G.customDefs && G.customDefs[id];
  return (d2 && d2.name) ? d2.name : id;
}
// името на КОЙТО И ДА Е спрайт (вградените също се кръщават)
function spriteName(key) {
  if (G.spriteNames && G.spriteNames[key]) return G.spriteNames[key];
  if (key && key.slice(0, 5) === 'cust_') return customName(key.slice(5));
  return key;
}
function setSpriteName(key, name) {
  if (key.slice(0, 5) === 'cust_') {
    const id = key.slice(5);
    if (G.customDefs && G.customDefs[id]) G.customDefs[id].name = name;
  }
  G.spriteNames = G.spriteNames || {};
  G.spriteNames[key] = name;
  saveCityLayout();
}
function editKindLabel(k) {
  if (!k) return k;
  if (G.spriteNames && G.spriteNames[k]) return G.spriteNames[k];
  if (k.slice(0, 5) === 'cust_') return customName(k.slice(5));
  if (k.slice(0, 2) === 'b_') return k.slice(2).replace(/_/g, ' ');
  return k;
}
function buildCustomSprites() {
  Spr.custom = Spr.custom || {};
  const defs = G.customDefs || {};
  for (const id in Spr.custom) if (!defs[id]) delete Spr.custom[id]; // осиротелите платна умират с дефиницията
  for (const id in defs) {
    const { w, h } = customCanvasSize(defs[id]);
    const same = Spr.custom[id] && Spr.custom[id].width === w && Spr.custom[id].height === h;
    if (same && Spr.custom[id].__png === (defs[id].png || '')) continue; // същият спрайт — нищо за правене
    const cv3 = (same ? Spr.custom[id] : document.createElement('canvas'));
    cv3.width = w; cv3.height = h;                    // (пре)зарежда и чисти платното
    cv3.__png = defs[id].png || '';
    Spr.custom[id] = cv3;
    if (defs[id].png) {
      const img = new Image();
      img.onload = (function (c2, im) { return function () { const g2 = c2.getContext('2d'); g2.clearRect(0, 0, c2.width, c2.height); g2.drawImage(im, 0, 0); }; })(cv3, img);
      img.src = defs[id].png;
    }
  }
}
function drawCreatePanel(diamond) {
  const S = SCALE;
  const st = G.createSt || (G.createSt = { cw: 0, ch: 0, top: 0, solid: false, mark: false, drag: null });
  const w = 118 * S, x = CW - w - 6 * S, y = 38 * S;
  const ready = st.cw > 0 && st.top > 0;
  const h = ready ? 170 * S : 96 * S;
  panel(x, y, w, h);
  UI.createPanelRect = { x, y, w, h };
  ctx.textAlign = 'left'; ctx.font = fontBold(6.5); ctx.fillStyle = '#ffd23b';
  ctx.fillText('CREATE SPRITE', x + 5 * S, y + 10 * S);
  const bt = (label, bx2, by2, wpx, act, on) => {
    panel(bx2, by2, wpx, 11 * S);
    if (on) strokeRect(bx2, by2, wpx, 11 * S, '#7fd0a0', S);
    ctx.font = fontBold(5.5); ctx.textAlign = 'center'; ctx.fillStyle = on ? '#7fd0a0' : '#a8b2c4';
    ctx.fillText(label, bx2 + wpx / 2, by2 + 7.5 * S);
    UI.cityEditBtns.push({ x: bx2, y: by2, w: wpx, h: 11 * S, act });
  };
  // размерът (в клетки)
  ctx.textAlign = 'left'; ctx.font = fontPx(5.5); ctx.fillStyle = '#7d8899';
  ctx.fillText('CELLS', x + 5 * S, y + 20 * S);
  const sizes = [[1, 1], [2, 1], [1, 2], [2, 2], [3, 3]];
  sizes.forEach(([a, b], i) => bt(a + 'x' + b, x + 4 * S + i * 19 * S, y + 23 * S, 17 * S, () => { st.cw = a; st.ch = b; st.mark = false; }, st.cw === a && st.ch === b && !st.mark));
  bt('MARK', x + 4 * S, y + 36 * S, 34 * S, () => { st.mark = !st.mark; }, st.mark);
  ctx.textAlign = 'left'; ctx.font = fontPx(5); ctx.fillStyle = '#7d8899';
  ctx.fillText(st.mark ? 'drag a frame of cells on the ground' : (st.cw ? st.cw + 'x' + st.ch + ' cells picked' : 'or drag cells on the ground'), x + 41 * S, y + 43.5 * S);
  // височината нагоре (за стърчащи неща — факла, стълб, покрив)
  ctx.font = fontPx(5.5);
  ctx.fillText('HEIGHT UP', x + 5 * S, y + 54 * S);
  [16, 32, 48, 64].forEach((t, i) => bt('+' + t, x + 4 * S + i * 21 * S, y + 57 * S, 19 * S, () => { st.top = t; }, st.top === t));
  // плътността
  ctx.textAlign = 'left'; ctx.font = fontPx(5.5); ctx.fillStyle = '#7d8899';
  ctx.fillText('BODY', x + 5 * S, y + 74 * S);
  st.body = st.body || (st.solid ? 'solid' : 'walk');
  bt('SOLID', x + 4 * S, y + 77 * S, 30 * S, () => { st.body = 'solid'; }, st.body === 'solid');
  bt('WALK', x + 36 * S, y + 77 * S, 28 * S, () => { st.body = 'walk'; }, st.body === 'walk');
  bt('FLAT', x + 66 * S, y + 77 * S, 28 * S, () => { st.body = 'flat'; }, st.body === 'flat'); // терен: ляга НА земята, под всичко
  // ПРЕГЛЕДЪТ: платното се показва и чака ПОТВЪРЖДЕНИЕ — чак тогава се рисува
  if (ready) {
    const cvw = (st.cw + st.ch) * 16, cvh = (st.cw + st.ch) * 8 + st.top;
    const fit = Math.min((w - 40 * S) / cvw, 40 * S / cvh); // може и под 1:1 — прегледът е само рамка
    const pw = cvw * fit, ph = cvh * fit;
    const px0 = x + (w - pw) / 2, py0 = y + 96 * S;
    ctx.textAlign = 'center'; ctx.font = fontPx(5.5); ctx.fillStyle = '#e8e4d0';
    ctx.fillText(cvw + 'x' + cvh + ' px  ·  ' + st.cw + 'x' + st.ch + ' cells  ·  +' + st.top + ' up', x + w / 2, y + 92 * S);
    rcx(px0, py0, pw, ph, '#141926');
    // земната част (ромбът на футпринта) — зелена, да прецениш дали ти стига нагоре
    const fh = (st.cw + st.ch) * 8 * fit;
    ctx.strokeStyle = 'rgba(127,208,160,0.9)'; ctx.lineWidth = S;
    ctx.beginPath();
    ctx.moveTo(px0 + pw / 2, py0 + ph - fh); ctx.lineTo(px0 + pw, py0 + ph - fh / 2); ctx.lineTo(px0 + pw / 2, py0 + ph); ctx.lineTo(px0, py0 + ph - fh / 2);
    ctx.closePath(); ctx.stroke();
    strokeRect(px0, py0, pw, ph, '#3a4456', S);
    ctx.font = fontPx(5); ctx.fillStyle = '#7d8899'; ctx.textAlign = 'center';
    ctx.fillText('green diamond = on the ground', x + w / 2, py0 + ph + 8 * S);
    bt('CONFIRM', x + 14 * S, y + 155 * S, 46 * S, () => {
      G.customDefs = G.customDefs || {};
      const pre = G.inside ? (G.inside.id.slice(0, 2) + '_') : 'c'; // своя редица за всяка стая
      let n = 1; while (G.customDefs[pre + n] || (Spr.custom && Spr.custom[pre + n])) n++;
      const id = pre + n;
      G.customDefs[id] = { cw: st.cw, ch: st.ch, top: st.top, solid: st.body === 'solid', flat: st.body === 'flat' };
      // кръщаването: празно = служебното id
      try {
        const nm = (window.prompt('Name your sprite:', '') || '').trim().slice(0, 24);
        if (nm) G.customDefs[id].name = nm;
      } catch (err) {}
      buildCustomSprites();
      saveCityLayout();
      G.createSt = null;
      openPixelEditor('cust_' + id);
      toast('Canvas ready — draw! Then place it with ADD.', '#7fd0a0');
    }, false);
    bt('BACK', x + 64 * S, y + 155 * S, 34 * S, () => { st.top = 0; }, false);
  }
  // рамката при МАРКИРАНЕ (до 4x4)
  if (st.drag) {
    const x0 = Math.min(st.drag.x0, st.drag.x1), x1 = Math.max(st.drag.x0, st.drag.x1);
    const y0 = Math.min(st.drag.y0, st.drag.y1), y1 = Math.max(st.drag.y0, st.drag.y1);
    for (let yy = y0; yy <= Math.min(y1, y0 + 3); yy++) for (let xx = x0; xx <= Math.min(x1, x0 + 3); xx++) diamond(xx, yy, 'rgba(127,208,160,0.9)');
  }
  ctx.textAlign = 'left';
}
// HSV -> hex (за свободната палитра)
function hsv2hex(hh, ss, vv) {
  const f = (n) => {
    const k = (n + hh / 60) % 6;
    return Math.round((vv - vv * ss * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return '#' + ((1 << 24) | (f(5) << 16) | (f(3) << 8) | f(1)).toString(16).slice(1);
}
function pixPickerDrag(mx, my) {
  const e = G.pixEdit; if (!e) return;
  if (G.pixSVDrag && UI.pixSVRect) {
    const r = UI.pixSVRect;
    e.sat = clamp((mx - r.x) / r.w, 0, 1);
    e.val = clamp(1 - (my - r.y) / r.h, 0, 1);
    e.color = hsv2hex(e.hue || 0, e.sat, e.val);
    if (e.tool === 'erase' || e.tool === 'pick') e.tool = 'pen';
  }
  if (G.pixHueDrag && UI.pixHueRect) {
    const r = UI.pixHueRect;
    e.hue = clamp((mx - r.x) / r.w, 0, 1) * 360;
    e.color = hsv2hex(e.hue, e.sat === undefined ? 1 : e.sat, e.val === undefined ? 1 : e.val);
    if (e.tool === 'erase' || e.tool === 'pick') e.tool = 'pen';
  }
}

// ================= ПИКСЕЛ-РЕДАКТОРЪТ (моливът на дизайнера) =================
// Избираш обект -> панел отстрани: увеличен спрайт, цветове, молив/гума/пипета.
// Промените важат за ВСИЧКИ копия и влизат в подредбата (COPY LAYOUT).
function spriteByKey(key) {
  if (key && key.slice(0, 5) === 'cust_') return (Spr.custom && Spr.custom[key.slice(5)]) || null;
  const S2 = Spr.surf; if (!S2) return null;
  const map = {
    tree: S2.tree, tree2: S2.tree2, deadTree: S2.deadTree, deadTree2: S2.deadTree2,
    rock: S2.rock, rock2: S2.rock2, rock3: S2.rock3,
    bush: S2.bushes[0], bush2: S2.bushes[1], tuft: S2.tufts[0], tuft2: S2.tufts[1],
    puddle: S2.puddle, tomb: S2.tomb,
    // хората: странстващият търговец и продавачите зад сергиите
    peddler: S2.vendors.peddler,
    vendor_weapon: S2.vendors.weapon, vendor_armor: S2.vendors.armor,
    vendor_potion: S2.vendors.potion, vendor_jewel: S2.vendors.jewel,
    // гостилничарят и вратата на стаята се редактират като всичко останало
    vendor_tavern: (Spr.int && Spr.int.innkeeper) || null,
    exitdoor: (Spr.int && Spr.int.door) || null,
    // мебелите
    table: S2.table,
    bench: S2.bench,
    stool: S2.stool,
    keg: S2.keg,
    fireplace: S2.fireplace,
    cauldron: S2.cauldron,
    shelf: S2.shelf,
    bedroll: S2.bedroll,
    sacks: S2.sacks,
    candle: S2.candle,
    // оградите са авто-свързващи се (16 парчета) — моливът не важи за тях
    church: S2.church, tower: S2.tower, wallseg: S2.wallseg, gatetower: S2.gateTower,
    cave: S2.cave, hearth: S2.hearth,
    menhir0: S2.menhirs[0], menhir1: S2.menhirs[1], menhir2: S2.menhirs[2],
    house_0_0: S2.houses[0], house_0_1: S2.houses[1], house_1_0: S2.houses2[0], house_1_1: S2.houses2[1],
    shop_weapon: S2.shophouses.weapon, shop_armor: S2.shophouses.armor,
    shop_potion: S2.shophouses.potion, shop_jewel: S2.shophouses.jewel, shop_tavern: S2.shophouses.tavern,
  };
  return map[key] || null;
}
function propSpriteKey(pr) {
  switch (pr.kind) {
    case 'house': return 'house_' + (pr.t || 0) + '_' + (pr.v || 0);
    case 'shophouse': return 'shop_' + pr.vtype;
    case 'gatetower': return 'gatetower';
    case 'portal': return 'cave';
    case 'cityportal': return 'hearth';
    case 'menhir': return 'menhir' + ((pr.v || 0) % 3);
    case 'custom': return 'cust_' + pr.cid;
    case 'peddler': return 'peddler';
    case 'vendor': return 'vendor_' + pr.vtype;
    default: return spriteByKey(pr.kind) ? pr.kind : null;
  }
}
function openPixelEditor(key) {
  const spr = spriteByKey(key);
  if (!spr) { toast('This object cannot be edited.', '#ff6b7a'); return; }
  // резервно копие за RESET
  const bak = document.createElement('canvas');
  bak.width = spr.width; bak.height = spr.height;
  bak.getContext('2d').drawImage(spr, 0, 0);
  // палитра: най-честите цветове от спрайта + основни
  const g2 = spr.getContext('2d');
  const data = g2.getImageData(0, 0, spr.width, spr.height).data;
  const freq = {};
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const hex = '#' + ((1 << 24) | (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]).toString(16).slice(1);
    freq[hex] = (freq[hex] || 0) + 1;
  }
  const own = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 16);
  const std = ['#10131c', '#e8e4d0', '#c9a23b', '#8f2a3a', '#2a4a8f', '#2f6e3a', '#ffb84d', '#c84fff'];
  const palette = own.concat(std.filter(c => own.indexOf(c) === -1)).slice(0, 24);
  G.pixDelArm = null;
  G.pixEdit = { key, spr, bak, palette, full: null, sel: null, selNew: null, selDrag: null, color: palette[0] || '#e8e4d0', tool: 'pen', zoom: 0, panX: 0, panY: 0, hue: 0, sat: 1, val: 1, mirror: false, hist: [] };
  Sfx.play('open');
}
function pixZoomScale() {
  const e = G.pixEdit, S = SCALE;
  const fit = Math.max(2, Math.floor(Math.min(172 * S / e.spr.width, (CH - 160 * S) / e.spr.height)));
  return Math.max(1, Math.min(16, e.zoom ? e.zoom : fit));
}
function pixViewport() {
  const S = SCALE;
  const vw = 178 * S, vh = Math.max(60 * S, Math.min(CH - 185 * S, 340 * S));
  return { vw, vh };
}
function pixPanelRect() {
  const S = SCALE, e = G.pixEdit;
  const z = pixZoomScale();
  const { vw, vh } = pixViewport();
  const w = vw + 12 * S;
  const extra = 13 * S + (e.key.slice(0, 5) === 'cust_' ? 13 * S : 0); // редовете за размера
  const h = 59 * S + extra + Math.ceil(e.palette.length / 8) * 12 * S + 32 * S + vh + 16 * S;
  return { x: CW - w - 6 * S, y: 30 * S, w, h, z };
}
function pixPaintAt(mx, my) {
  const e = G.pixEdit; if (!e) return;
  const hit = pixHitPixel(mx, my);
  if (!hit) return;
  const px2 = hit.px, py2 = hit.py;
  const c = e.spr.getContext('2d');
  if (e.tool === 'erase') pixSet(c, px2, py2, true);
  else if (e.tool === 'pick') {
    const d = c.getImageData(px2, py2, 1, 1).data;
    if (d[3] > 0) {
      e.color = '#' + ((1 << 24) | (d[0] << 16) | (d[1] << 8) | d[2]).toString(16).slice(1);
      // маркерите на свободната палитра застават на взетия цвят
      const r1 = d[0] / 255, g1 = d[1] / 255, b1 = d[2] / 255;
      const mx3 = Math.max(r1, g1, b1), df = mx3 - Math.min(r1, g1, b1);
      e.val = mx3; e.sat = mx3 ? df / mx3 : 0;
      e.hue = !df ? 0 : mx3 === r1 ? 60 * (((g1 - b1) / df + 6) % 6) : mx3 === g1 ? 60 * ((b1 - r1) / df + 2) : 60 * ((r1 - g1) / df + 4);
    }
    G.pixPaint = false;
  } else {
    c.fillStyle = e.color;
    pixSet(c, px2, py2, false);
  }
}
// ПРЕОРАЗМЕРЯВАНЕ на готов собствен спрайт: платното се сменя, а рисунката
// ляга долу-центрирано (както стъпва на земята), за да не се губи трудът.
function pixResize(dw, dh, dtop) {
  const e = G.pixEdit; if (!e || e.key.slice(0, 5) !== 'cust_') return;
  const id = e.key.slice(5), cd = G.customDefs && G.customDefs[id];
  if (!cd) return;
  const ncw = clamp(cd.cw + dw, 1, 4), nch = clamp(cd.ch + dh, 1, 4);
  const ntop = clamp((cd.top || 16) + dtop, 8, 96);
  if (ncw === cd.cw && nch === cd.ch && ntop === (cd.top || 16)) return;
  const old = e.spr;
  cd.cw = ncw; cd.ch = nch; cd.top = ntop;
  delete cd.pw; delete cd.ph;   // клетките наново определят платното
  const sz = customCanvasSize(cd);
  const nc = document.createElement('canvas');
  nc.width = sz.w; nc.height = sz.h;
  const g2 = nc.getContext('2d');
  g2.imageSmoothingEnabled = false;
  g2.drawImage(old, Math.round((sz.w - old.width) / 2), sz.h - old.height); // долу-центрирано
  Spr.custom[id] = nc;
  e.spr = nc;
  const bak = document.createElement('canvas');
  bak.width = sz.w; bak.height = sz.h;
  bak.getContext('2d').drawImage(nc, 0, 0);
  e.bak = bak;
  e.zoom = 0; e.panX = 0; e.panY = 0; e.hist = [];
  // поставените копия приемат новия размер
  for (const pr of G.props) {
    if (pr.kind !== 'custom' || pr.cid !== id) continue;
    pr.cw = ncw; pr.ch = nch;
    pr.x = pr.bx + ncw / 2; pr.y = pr.by + nch / 2;
    pr.solid = !!cd.solid && !cd.flat;
  }
  pixSaveOverride();
  toast(ncw + 'x' + nch + ' cells  ·  +' + ntop + ' up  ·  ' + sz.w + 'x' + sz.h + ' px', '#7fd0a0');
}
// ================= РЯЗАНЕ: ограждаш част и я местиш =================
function pixNormSel(s) {
  return { x0: Math.min(s.x0, s.x1), y0: Math.min(s.y0, s.y1), x1: Math.max(s.x0, s.x1), y1: Math.max(s.y0, s.y1) };
}
// пренася оградените пиксели с (dx,dy): изрязва ги и ги слага на новото място
function pixMoveSel(dx, dy) {
  const e = G.pixEdit; if (!e || !e.sel || (!dx && !dy)) return;
  const s = pixNormSel(e.sel);
  const w = s.x1 - s.x0 + 1, h = s.y1 - s.y0 + 1;
  const c = e.spr.getContext('2d');
  const buf = document.createElement('canvas');
  buf.width = w; buf.height = h;
  buf.getContext('2d').drawImage(e.spr, s.x0, s.y0, w, h, 0, 0, w, h);
  pixPushHist();
  c.clearRect(s.x0, s.y0, w, h);                       // изрязваме
  c.imageSmoothingEnabled = false;
  c.drawImage(buf, s.x0 + dx, s.y0 + dy);              // и лепим на новото място
  e.sel = { x0: s.x0 + dx, y0: s.y0 + dy, x1: s.x1 + dx, y1: s.y1 + dy };
  pixSaveOverride();
}
function pixCommitSel() {
  const e = G.pixEdit; if (!e) return;
  e.sel = null; e.selDrag = null; e.selNew = null;
}
// Смяна на ПЛАТНОТО (в пиксели) за който и да е спрайт — и нагоре, и надолу.
// Рисунката остава долу-центрирана, както обектът стъпва на земята.
// ПЪЛНОТО копие: рисунката живее в голямо платно, а видимото е само изрезка
// от него — затова смаляването НЕ трие нищо и уголемяването го връща.
const PIX_FULL = 256;
function pixSyncFull() {
  const e = G.pixEdit; if (!e) return;
  if (!e.full) {
    const f = document.createElement('canvas');
    f.width = PIX_FULL; f.height = PIX_FULL;
    e.full = f;
  }
  const g = e.full.getContext('2d');
  g.imageSmoothingEnabled = false;
  const ox = Math.round((PIX_FULL - e.spr.width) / 2), oy = PIX_FULL - e.spr.height;
  g.clearRect(ox, oy, e.spr.width, e.spr.height);
  g.drawImage(e.spr, ox, oy);
}
function pixResizeCanvas(dw, dh) {
  const e = G.pixEdit; if (!e) return;
  const nw = clamp(e.spr.width + dw, 8, 200), nh = clamp(e.spr.height + dh, 8, 220);
  if (nw === e.spr.width && nh === e.spr.height) return;
  pixSyncFull();                                          // каквото е нарисувано влиза в пълното копие
  pixPushHist();                                          // и стъпката се връща с UNDO
  e.spr.width = nw; e.spr.height = nh;                    // платното се пресъздава (и се чисти)
  const c = e.spr.getContext('2d');
  c.imageSmoothingEnabled = false;
  const sx = Math.round((PIX_FULL - nw) / 2), sy = PIX_FULL - nh;
  c.drawImage(e.full, sx, sy, nw, nh, 0, 0, nw, nh);      // изрязваме от пълното копие
  const bak = document.createElement('canvas');
  bak.width = nw; bak.height = nh;
  bak.getContext('2d').drawImage(e.spr, 0, 0);
  e.bak = bak;
  e.zoom = 0; e.panX = 0; e.panY = 0; e.sel = null;
  if (e.key.slice(0, 5) === 'cust_') {                    // собствените помнят размера си
    const cd = G.customDefs && G.customDefs[e.key.slice(5)];
    if (cd) { cd.pw = nw; cd.ph = nh; }
  }
  pixSaveOverride();
  toast(nw + 'x' + nh + ' px', '#7fd0a0');
}
function pixSaveOverride() {
  const e = G.pixEdit; if (!e) return;
  pixSyncFull();   // пълното копие следва рисунката
  if (e.key.slice(0, 5) === 'cust_') {
    const id = e.key.slice(5);
    if (G.customDefs && G.customDefs[id]) {
      try {
        const png = e.spr.toDataURL('image/png');
        G.customDefs[id].png = png;
        e.spr.__png = png;                    // кешът да не презарежда същото
        saveCityLayout();
      } catch (err) {}
    }
    return;
  }
  // изцяло ИЗТРИТ базов спрайт не се записва — само би направил сградата невидима
  try {
    const dd = e.spr.getContext('2d').getImageData(0, 0, e.spr.width, e.spr.height).data;
    let opq = false;
    for (let i = 3; i < dd.length; i += 4) if (dd[i] > 0) { opq = true; break; }
    if (!opq) { toast('Fully erased — not saved. Use RST or UND to bring it back.', '#ff6b7a'); return; }
  } catch (err) {}
  G.spriteOverrides = G.spriteOverrides || {};
  try { G.spriteOverrides[e.key] = e.spr.toDataURL('image/png'); saveCityLayout(); } catch (err) {}
}
function pixClick(mx, my) {
  const e = G.pixEdit;
  const r = pixPanelRect();
  if (mx < r.x || mx > r.x + r.w || my < r.y || my > r.y + r.h) return false; // извън панела
  for (const b of (UI.pixBtns || [])) if (mx >= b.x && mx < b.x + b.w && my >= b.y && my < b.y + b.h) { b.act(); return true; }
  if (UI.pixSVRect && mx >= UI.pixSVRect.x && mx < UI.pixSVRect.x + UI.pixSVRect.w && my >= UI.pixSVRect.y && my < UI.pixSVRect.y + UI.pixSVRect.h) { G.pixSVDrag = true; pixPickerDrag(mx, my); return true; }
  if (UI.pixHueRect && mx >= UI.pixHueRect.x && mx < UI.pixHueRect.x + UI.pixHueRect.w && my >= UI.pixHueRect.y && my < UI.pixHueRect.y + UI.pixHueRect.h) { G.pixHueDrag = true; pixPickerDrag(mx, my); return true; }
  if (UI.pixZoomRect) {
    const zr = UI.pixZoomRect;
    if (mx >= zr.x && my >= zr.y && mx < zr.x + zr.vw && my < zr.y + zr.vh) {
      if (e.tool === 'hand') {
        G.pixPanning = { sx: mx, sy: my, ox: e.panX, oy: e.panY };
      } else if (e.tool === 'sel') {
        const hit = pixHitPixel(mx, my);
        if (hit) {
          const s = e.sel ? pixNormSel(e.sel) : null;
          if (s && hit.px >= s.x0 && hit.px <= s.x1 && hit.py >= s.y0 && hit.py <= s.y1) {
            e.selDrag = { px: hit.px, py: hit.py, dx: 0, dy: 0 };   // местене на оградената част
          } else {
            e.selNew = { x0: hit.px, y0: hit.py, x1: hit.px, y1: hit.py }; // ново оградяване
            e.sel = null;
          }
        }
      } else if (e.tool === 'fill') {
        const hit = pixHitPixel(mx, my);
        if (hit) { pixPushHist(); pixFloodFill(hit.px, hit.py); pixSaveOverride(); }
      } else if (e.tool === 'line' || e.tool === 'rect') {
        const hit = pixHitPixel(mx, my);
        if (hit) G.pixShape = { x0: hit.px, y0: hit.py };
      } else {
        if (e.tool !== 'pick') pixPushHist(); // щрихът да може да се върне с UNDO
        G.pixPaint = true;
        pixPaintAt(mx, my);
      }
      return true;
    }
  }
  return true; // клик в панела, но не върху нищо
}
function pixClampPan() {
  const e = G.pixEdit; if (!e) return;
  const z = pixZoomScale();
  const { vw, vh } = pixViewport();
  e.panX = Math.max(0, Math.min(e.panX, Math.max(0, e.spr.width * z - vw)));
  e.panY = Math.max(0, Math.min(e.panY, Math.max(0, e.spr.height * z - vh)));
}
function pixZoomStep(dir) {
  const e = G.pixEdit; if (!e) return;
  const cur = pixZoomScale();
  e.zoom = Math.max(1, Math.min(16, cur + dir));
  pixClampPan();
}
// --- помощници на пиксел-инструментите: кофа, линия, правоъгълник, огледало, UNDO ---
function pixHitPixel(mx, my) {
  const e = G.pixEdit; if (!e || !UI.pixZoomRect) return null;
  const r = UI.pixZoomRect;
  if (mx < r.x || my < r.y || mx >= r.x + r.vw || my >= r.y + r.vh) return null;
  const drawW = e.spr.width * r.z, drawH = e.spr.height * r.z;
  const ox = drawW < r.vw ? Math.floor((r.vw - drawW) / 2) : -e.panX;
  const oy2 = drawH < r.vh ? Math.floor((r.vh - drawH) / 2) : -e.panY;
  const px2 = Math.floor((mx - r.x - ox) / r.z), py2 = Math.floor((my - r.y - oy2) / r.z);
  if (px2 < 0 || py2 < 0 || px2 >= e.spr.width || py2 >= e.spr.height) return null;
  return { px: px2, py: py2 };
}
function pixSet(c, x, y, erase) {
  const e = G.pixEdit;
  const put = (xx, yy) => {
    if (xx < 0 || yy < 0 || xx >= e.spr.width || yy >= e.spr.height) return;
    c.clearRect(xx, yy, 1, 1);
    if (!erase) c.fillRect(xx, yy, 1, 1);
  };
  put(x, y);
  if (e.mirror) put(e.spr.width - 1 - x, y); // огледалото повтаря по хоризонтала
}
function pixShapePixels(tool, x0, y0, x1, y1) {
  const out = [];
  if (tool === 'rect') {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1);
    for (let x = ax; x <= bx; x++) { out.push([x, ay]); if (by !== ay) out.push([x, by]); }
    for (let y = ay + 1; y < by; y++) { out.push([ax, y]); if (bx !== ax) out.push([bx, y]); }
    return out;
  }
  // линия на Брезенхам
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    out.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return out;
}
function pixFloodFill(px, py) {
  const e = G.pixEdit; if (!e) return;
  const c = e.spr.getContext('2d');
  const W = e.spr.width, H = e.spr.height;
  const img = c.getImageData(0, 0, W, H), d = img.data;
  const nr = parseInt(e.color.slice(1, 3), 16), ng = parseInt(e.color.slice(3, 5), 16), nb = parseInt(e.color.slice(5, 7), 16);
  const fill1 = (sx, sy) => {
    const i0 = (sy * W + sx) * 4;
    const tr = d[i0], tg = d[i0 + 1], tb2 = d[i0 + 2], ta = d[i0 + 3];
    if (ta === 255 && tr === nr && tg === ng && tb2 === nb) return; // вече е този цвят
    const stack = [sy * W + sx];
    while (stack.length) {
      const idx = stack.pop();
      const j = idx * 4;
      if (d[j] !== tr || d[j + 1] !== tg || d[j + 2] !== tb2 || d[j + 3] !== ta) continue;
      d[j] = nr; d[j + 1] = ng; d[j + 2] = nb; d[j + 3] = 255;
      const x = idx % W, y = (idx / W) | 0;
      if (x > 0) stack.push(idx - 1);
      if (x < W - 1) stack.push(idx + 1);
      if (y > 0) stack.push(idx - W);
      if (y < H - 1) stack.push(idx + W);
    }
  };
  fill1(px, py);
  if (e.mirror) fill1(W - 1 - px, py);
  c.putImageData(img, 0, 0);
}
function pixPushHist() {
  const e = G.pixEdit; if (!e) return;
  e.hist = e.hist || [];
  try {
    e.hist.push({ w: e.spr.width, h: e.spr.height, img: e.spr.getContext('2d').getImageData(0, 0, e.spr.width, e.spr.height) });
    if (e.hist.length > 30) e.hist.shift();
  } catch (err) {}
}
function pixUndo() {
  const e = G.pixEdit; if (!e || !e.hist || !e.hist.length) return;
  const st = e.hist.pop();
  if (st.w !== e.spr.width || st.h !== e.spr.height) {   // връща се и РАЗМЕРЪТ
    e.spr.width = st.w; e.spr.height = st.h;
    e.zoom = 0; e.panX = 0; e.panY = 0; e.sel = null;
    if (e.key.slice(0, 5) === 'cust_') {
      const cd = G.customDefs && G.customDefs[e.key.slice(5)];
      if (cd) { cd.pw = st.w; cd.ph = st.h; }
    }
  }
  e.spr.getContext('2d').putImageData(st.img, 0, 0);
  pixSaveOverride();
  Sfx.play('open');
}
function drawPixelEditor() {
  const S = SCALE, e = G.pixEdit;
  const r = pixPanelRect();
  panel(r.x, r.y, r.w, r.h);
  UI.pixBtns = [];
  ctx.textAlign = 'left';
  ctx.font = fontBold(6.5); ctx.fillStyle = '#ffd23b';
  // (NAME бутонът се регистрира в pixBtns по-долу)
  ctx.fillText('PIXEL: ' + String(spriteName(e.key)).slice(0, 16) + (e.tool === 'sel' ? '  ·  frame a part, then drag it' : ''), r.x + 6 * S, r.y + 10 * S);
  { // преименуване на ВСЕКИ спрайт
    const nx = r.x + r.w - 50 * S, ny = r.y + 2 * S;
    panel(nx, ny, 26 * S, 10 * S);
    ctx.font = fontBold(5); ctx.textAlign = 'center'; ctx.fillStyle = '#a8b2c4';
    ctx.fillText('NAME', nx + 13 * S, ny + 7 * S);
    UI.pixBtns = UI.pixBtns || [];
    UI.pixBtns.push({ x: nx, y: ny, w: 26 * S, h: 10 * S, act: () => {
      try {
        const nm = (window.prompt('Name this sprite:', spriteName(e.key)) || '').trim().slice(0, 24);
        if (nm) { setSpriteName(e.key, nm); toast('Named: ' + nm, '#7fd0a0'); }
      } catch (err) {}
    } });
    ctx.textAlign = 'left';
  }
  // инструменти
  const tb = (label, x, wpx, act, on, row) => {
    const by = r.y + (14 + (row || 0) * 13) * S;
    panel(x, by, wpx, 11 * S);
    if (on) strokeRect(x, by, wpx, 11 * S, '#7fd0a0', S);
    ctx.font = fontBold(5.5); ctx.textAlign = 'center';
    ctx.fillStyle = on ? '#7fd0a0' : '#a8b2c4';
    ctx.fillText(label, x + wpx / 2, by + 7.5 * S);
    UI.pixBtns.push({ x, y: by, w: wpx, h: 11 * S, act });
  };
  let bx2 = r.x + 4 * S;
  tb('PEN', bx2, 20 * S, () => { e.tool = 'pen'; }, e.tool === 'pen'); bx2 += 22 * S;
  tb('ERS', bx2, 20 * S, () => { e.tool = 'erase'; }, e.tool === 'erase'); bx2 += 22 * S;
  tb('PIK', bx2, 20 * S, () => { e.tool = 'pick'; }, e.tool === 'pick'); bx2 += 22 * S;
  tb('FIL', bx2, 20 * S, () => { e.tool = 'fill'; }, e.tool === 'fill'); bx2 += 22 * S;
  tb('LIN', bx2, 20 * S, () => { e.tool = 'line'; }, e.tool === 'line'); bx2 += 22 * S;
  tb('REC', bx2, 20 * S, () => { e.tool = 'rect'; }, e.tool === 'rect'); bx2 += 22 * S;
  tb('SEL', bx2, 20 * S, () => { pixCommitSel(); e.tool = 'sel'; }, e.tool === 'sel');
  bx2 = r.x + 4 * S;
  tb('HND', bx2, 20 * S, () => { e.tool = 'hand'; }, e.tool === 'hand', 1); bx2 += 22 * S;
  tb('MIR', bx2, 20 * S, () => { e.mirror = !e.mirror; }, !!e.mirror, 1); bx2 += 22 * S;
  tb('UND', bx2, 20 * S, () => pixUndo(), false, 1); bx2 += 22 * S;
  tb('-', bx2, 12 * S, () => pixZoomStep(-1), false, 1); bx2 += 14 * S;
  tb('+', bx2, 12 * S, () => pixZoomStep(1), false, 1); bx2 += 14 * S;
  tb('RST', bx2, 20 * S, () => {
    pixPushHist(); // и RESET може да се върне с UNDO
    const c = e.spr.getContext('2d');
    c.clearRect(0, 0, e.spr.width, e.spr.height);
    c.drawImage(e.bak, 0, 0);
    if (e.key.slice(0, 5) === 'cust_') { pixSaveOverride(); return; }
    if (G.spriteOverrides) { delete G.spriteOverrides[e.key]; saveCityLayout(); }
  }, false, 1); bx2 += 22 * S;
  if (e.key.slice(0, 5) === 'cust_') { // ИЗТРИВАНЕ на собствения спрайт (два клика)
    const delId = e.key.slice(5);
    const armed = G.pixDelArm === e.key;
    tb(armed ? 'SURE?' : 'DEL', bx2, 22 * S, () => {
      if (!armed) { G.pixDelArm = e.key; toast('Click DEL again to delete this sprite for good.', '#ff6b7a'); return; }
      for (let i = G.props.length - 1; i >= 0; i--) if (G.props[i].kind === 'custom' && G.props[i].cid === delId) G.props.splice(i, 1);
      if (G.customDefs) delete G.customDefs[delId];
      if (Spr.custom) delete Spr.custom[delId];
      if (G.editPlaceKind === e.key) G.editPlaceKind = null;
      G.pixEdit = null; G.pixDelArm = null;
      saveCityLayout();
      toast('Sprite deleted.', '#ffd23b');
      Sfx.play('deny');
    }, armed, 1); bx2 += 24 * S;
  }
  tb('X', bx2, 12 * S, () => { G.pixEdit = null; }, false, 1);
  // ТРЕТИ РЕД: ПЛАТНОТО в пиксели — за ВСЕКИ спрайт, нагоре и надолу
  const isCust = e.key.slice(0, 5) === 'cust_';
  {
    let rx = r.x + 4 * S;
    ctx.font = fontPx(5); ctx.fillStyle = '#7d8899'; ctx.textAlign = 'left';
    ctx.fillText(e.spr.width + 'x' + e.spr.height + 'px', rx, r.y + 47 * S);
    rx += 30 * S;
    tb('W-', rx, 15 * S, () => pixResizeCanvas(-4, 0), false, 2); rx += 17 * S;
    tb('W+', rx, 15 * S, () => pixResizeCanvas(4, 0), false, 2); rx += 18 * S;
    tb('H-', rx, 15 * S, () => pixResizeCanvas(0, -4), false, 2); rx += 17 * S;
    tb('H+', rx, 15 * S, () => pixResizeCanvas(0, 4), false, 2);
  }
  // ЧЕТВЪРТИ РЕД (само собствени): колко КЛЕТКИ заема и височина нагоре
  if (isCust) {
    const cd = (G.customDefs && G.customDefs[e.key.slice(5)]) || { cw: 1, ch: 1, top: 16 };
    let rx = r.x + 4 * S;
    ctx.font = fontPx(5); ctx.fillStyle = '#7d8899'; ctx.textAlign = 'left';
    ctx.fillText(cd.cw + 'x' + cd.ch + ' +' + (cd.top || 16), rx, r.y + 60 * S);
    rx += 30 * S;
    tb('C-', rx, 14 * S, () => pixResize(-1, 0, 0), false, 3); rx += 16 * S;
    tb('C+', rx, 14 * S, () => pixResize(1, 0, 0), false, 3); rx += 17 * S;
    tb('R-', rx, 14 * S, () => pixResize(0, -1, 0), false, 3); rx += 16 * S;
    tb('R+', rx, 14 * S, () => pixResize(0, 1, 0), false, 3); rx += 17 * S;
    tb('U-', rx, 14 * S, () => pixResize(0, 0, -8), false, 3); rx += 16 * S;
    tb('U+', rx, 14 * S, () => pixResize(0, 0, 8), false, 3);
  }
  // палитрата
  ctx.textAlign = 'left';
  const py0 = r.y + (isCust ? 67 : 54) * S; // под редовете инструменти
  e.palette.forEach((col, i) => {
    const sx2 = r.x + 4 * S + (i % 8) * 15 * S, sy2 = py0 + Math.floor(i / 8) * 12 * S;
    rcx(sx2, sy2, 13 * S, 10 * S, col);
    if (e.color === col) strokeRect(sx2 - S, sy2 - S, 15 * S, 12 * S, '#ffffff', S);
    UI.pixBtns.push({ x: sx2, y: sy2, w: 13 * S, h: 10 * S, act: () => { e.color = col; if (e.tool === 'erase') e.tool = 'pen'; } });
  });
  // текущият цвят
  rcx(r.x + r.w - 20 * S, r.y + 3 * S, 14 * S, 8 * S, e.color);
  strokeRect(r.x + r.w - 20 * S, r.y + 3 * S, 14 * S, 8 * S, '#e8e4d0', S);
  // СВОБОДНАТА ПАЛИТРА (като в Paint): поле наситеност/светлота + лента за тона
  const pkY = py0 + Math.ceil(e.palette.length / 8) * 12 * S + 2 * S;
  const svW = 74 * S, svH = 26 * S, svX = r.x + 4 * S;
  rcx(svX, pkY, svW, svH, hsv2hex(e.hue || 0, 1, 1));
  let gr = ctx.createLinearGradient(svX, 0, svX + svW, 0);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gr; ctx.fillRect(svX, pkY, svW, svH);
  gr = ctx.createLinearGradient(0, pkY, 0, pkY + svH);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = gr; ctx.fillRect(svX, pkY, svW, svH);
  strokeRect(svX, pkY, svW, svH, '#3a4456', S);
  const svMx = svX + (e.sat === undefined ? 1 : e.sat) * svW, svMy = pkY + (1 - (e.val === undefined ? 1 : e.val)) * svH;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = S; ctx.strokeRect(svMx - 2 * S, svMy - 2 * S, 4 * S, 4 * S);
  UI.pixSVRect = { x: svX, y: pkY, w: svW, h: svH };
  const huX = svX + svW + 4 * S, huW = r.w - svW - 12 * S, huH = 10 * S;
  gr = ctx.createLinearGradient(huX, 0, huX + huW, 0);
  ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'].forEach((c2, i) => gr.addColorStop(i / 6, c2));
  ctx.fillStyle = gr; ctx.fillRect(huX, pkY, huW, huH);
  strokeRect(huX, pkY, huW, huH, '#3a4456', S);
  const huMx = huX + ((e.hue || 0) / 360) * huW;
  ctx.strokeStyle = '#ffffff'; ctx.strokeRect(huMx - S, pkY - S, 2 * S, huH + 2 * S);
  UI.pixHueRect = { x: huX, y: pkY, w: huW, h: huH };
  rcx(huX, pkY + huH + 4 * S, huW, svH - huH - 4 * S, e.color);
  strokeRect(huX, pkY + huH + 4 * S, huW, svH - huH - 4 * S, '#3a4456', S);
  // прозорецът: увеличеният спрайт върху шахматен фон, с клип, пан и зуум
  const zy0 = pkY + svH + 4 * S;
  const z = r.z;
  const { vw, vh } = pixViewport();
  const zx0 = r.x + Math.floor((r.w - vw) / 2);
  pixClampPan();
  // ако спрайтът е по-малък от прозореца — центрираме го (пан 0)
  const drawW = e.spr.width * z, drawH = e.spr.height * z;
  const ox = drawW < vw ? Math.floor((vw - drawW) / 2) : -e.panX;
  const oy2 = drawH < vh ? Math.floor((vh - drawH) / 2) : -e.panY;
  rcx(zx0, zy0, vw, vh, '#0c1018');
  ctx.save();
  ctx.beginPath(); ctx.rect(zx0, zy0, vw, vh); ctx.clip();
  // шахматен фон само за видимите пиксели
  const px0 = Math.max(0, Math.floor(-ox / z)), py1 = Math.max(0, Math.floor(-oy2 / z));
  const px1 = Math.min(e.spr.width, Math.ceil((vw - ox) / z)), py2v = Math.min(e.spr.height, Math.ceil((vh - oy2) / z));
  for (let yy = py1; yy < py2v; yy++) for (let xx = px0; xx < px1; xx++) {
    rcx(zx0 + ox + xx * z, zy0 + oy2 + yy * z, z, z, (xx + yy) % 2 ? '#1a2030' : '#141926');
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(e.spr, 0, 0, e.spr.width, e.spr.height, zx0 + ox, zy0 + oy2, drawW, drawH);
  if (e.mirror) { ctx.globalAlpha = 0.35; rcx(zx0 + ox + (e.spr.width / 2) * z - 1, zy0 + oy2, 2, drawH, '#7fd0a0'); ctx.globalAlpha = 1; }
  // показалецът: полупрозрачен преглед на цвета + очертание на пиксела
  const hx2 = Math.floor((G.mouse.x - zx0 - ox) / z), hy2 = Math.floor((G.mouse.y - zy0 - oy2) / z);
  if (hx2 >= 0 && hy2 >= 0 && hx2 < e.spr.width && hy2 < e.spr.height &&
      G.mouse.x >= zx0 && G.mouse.x < zx0 + vw && G.mouse.y >= zy0 && G.mouse.y < zy0 + vh) {
    const cell = (x, y, col, a) => { ctx.globalAlpha = a; rcx(zx0 + ox + x * z, zy0 + oy2 + y * z, z, z, col); ctx.globalAlpha = 1; };
    if (G.pixShape && (e.tool === 'line' || e.tool === 'rect')) {
      // прегледът на линията/правоъгълника, докато влачиш
      for (const [x, y] of pixShapePixels(e.tool, G.pixShape.x0, G.pixShape.y0, hx2, hy2)) {
        cell(x, y, e.color, 0.55);
        if (e.mirror) cell(e.spr.width - 1 - x, y, e.color, 0.35);
      }
    } else if (e.tool === 'pen' || e.tool === 'fill' || e.tool === 'line' || e.tool === 'rect') {
      cell(hx2, hy2, e.color, 0.55);
      if (e.mirror && e.tool === 'pen') cell(e.spr.width - 1 - hx2, hy2, e.color, 0.35);
    }
    strokeRect(zx0 + ox + hx2 * z, zy0 + oy2 + hy2 * z, z, z, e.tool === 'erase' ? '#ff6b7a' : '#ffffff', 1);
  }
  // РЯЗАНЕТО: рамка от "мравки" + преглед на местеното парче
  const selRect = e.selNew ? pixNormSel(e.selNew) : (e.sel ? pixNormSel(e.sel) : null);
  if (selRect) {
    const off = e.selDrag ? e.selDrag : { dx: 0, dy: 0 };
    const rx = zx0 + ox + (selRect.x0 + off.dx) * z, ry = zy0 + oy2 + (selRect.y0 + off.dy) * z;
    const rw = (selRect.x1 - selRect.x0 + 1) * z, rh = (selRect.y1 - selRect.y0 + 1) * z;
    if (e.selDrag && (off.dx || off.dy)) {             // полупрозрачен преглед на новото място
      ctx.globalAlpha = 0.75;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(e.spr, selRect.x0, selRect.y0, selRect.x1 - selRect.x0 + 1, selRect.y1 - selRect.y0 + 1, rx, ry, rw, rh);
      ctx.globalAlpha = 1;
    }
    const dash = Math.floor(G.time * 8) % 2;           // движещи се чертички
    for (let i = 0; i < rw; i += 2) { if (((i >> 1) + dash) % 2) { rcx(rx + i, ry - 1, 2, 1, '#ffffff'); rcx(rx + i, ry + rh, 2, 1, '#ffffff'); } }
    for (let i = 0; i < rh; i += 2) { if (((i >> 1) + dash) % 2) { rcx(rx - 1, ry + i, 1, 2, '#ffffff'); rcx(rx + rw, ry + i, 1, 2, '#ffffff'); } }
  }
  ctx.restore();
  strokeRect(zx0, zy0, vw, vh, '#3a4456', S);
  ctx.font = fontPx(5); ctx.fillStyle = '#7d8899'; ctx.textAlign = 'right';
  ctx.fillText('x' + z, zx0 + vw - 2 * S, zy0 + vh + 8 * S);
  UI.pixZoomRect = { x: zx0, y: zy0, z, vw, vh };
  ctx.textAlign = 'left';
}
// прилага записаните пикселни корекции върху сглобените спрайтове
function applySpriteOverrides() {
  let loc = null;
  try {
    const key = (G.inside && typeof interiorLayoutKey === 'function') ? interiorLayoutKey(G.inside.id) : 'sm_layout_mirhold';
    const L = JSON.parse(localStorage.getItem(key) || 'null');
    if (L && L.sprites) loc = L.sprites;
    G.spriteNames = (L && L.names) ? L.names : ((typeof MIRHOLD_LAYOUT !== 'undefined' && MIRHOLD_LAYOUT.names) || {});
  } catch (e) {}
  const baked = (typeof MIRHOLD_LAYOUT !== 'undefined' && MIRHOLD_LAYOUT && MIRHOLD_LAYOUT.sprites) || {};
  G.spriteOverrides = Object.assign({}, loc || {});
  const applyOne = (k, src, isLocal) => {
    const img = new Image();
    img.onload = function () {
      const cv3 = spriteByKey(k);
      if (!cv3) return;
      if (cv3.width !== img.width || cv3.height !== img.height) {
        if (img.width > 256 || img.height > 256) return;   // разумна граница
        cv3.width = img.width; cv3.height = img.height;    // платното приема новия размер
      }
      // ПРАЗНА (или повредена) корекция не се прилага — тя прави сградата
      // невидима („прозрачната църква“). Локална такава се чисти завинаги,
      // а отдолу излиза вградената рисунка.
      const t = document.createElement('canvas'); t.width = img.width; t.height = img.height;
      const tg = t.getContext('2d'); tg.drawImage(img, 0, 0);
      const dd = tg.getImageData(0, 0, t.width, t.height).data;
      let opaque = false;
      for (let i = 3; i < dd.length; i += 4) if (dd[i] > 0) { opaque = true; break; }
      if (!opaque) {
        if (isLocal) {
          delete G.spriteOverrides[k];
          try { const L2 = JSON.parse(localStorage.getItem('sm_layout_mirhold') || 'null'); if (L2 && L2.sprites) { delete L2.sprites[k]; localStorage.setItem('sm_layout_mirhold', JSON.stringify(L2)); } } catch (e2) {}
          if (baked[k]) applyOne(k, baked[k], false);
        }
        return;
      }
      const c = cv3.getContext('2d');
      c.clearRect(0, 0, cv3.width, cv3.height);
      c.drawImage(img, 0, 0);
    };
    img.src = src;
  };
  for (const k in baked) if (!loc || !loc[k]) applyOne(k, baked[k], false);
  if (loc) for (const k in loc) applyOne(k, loc[k], true);
}
