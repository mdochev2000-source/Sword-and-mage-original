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
const MIRHOLD_LAYOUT = {"houses":[{"x":25,"y":12,"t":0,"v":0},{"x":33,"y":14,"t":0,"v":1},{"x":15,"y":28,"t":1,"v":0},{"x":11,"y":24,"t":1,"v":1},{"x":26,"y":29,"t":1,"v":0},{"x":30,"y":11,"t":0,"v":1},{"x":15,"y":12,"t":0,"v":0},{"x":12,"y":16,"t":1,"v":1},{"x":34,"y":18,"t":0,"v":0},{"x":13,"y":20,"t":0,"v":1},{"x":33,"y":22,"t":0,"v":0},{"x":30,"y":26,"t":0,"v":1},{"x":9,"y":19,"t":0,"v":0}],"shops":{"weapon":{"x":26,"y":25},"armor":{"x":18,"y":24},"potion":{"x":27,"y":9},"jewel":{"x":18,"y":9},"exchange":{"x":28,"y":17}},"church":{"x":21,"y":14},"tower":{"x":21,"y":20},"cave":{"x":4,"y":37},"travel":{"x":5,"y":31},"decor":[{"k":"deadTree","x":2,"y":2},{"k":"deadTree","x":9,"y":2},{"k":"deadTree","x":17,"y":2},{"k":"rock","x":27,"y":2},{"k":"deadTree","x":35,"y":2},{"k":"deadTree","x":39,"y":2},{"k":"deadTree","x":10,"y":3},{"k":"deadTree","x":11,"y":3},{"k":"deadTree","x":12,"y":3},{"k":"rock","x":37,"y":3},{"k":"deadTree","x":6,"y":4},{"k":"rock","x":14,"y":4},{"k":"deadTree","x":10,"y":5},{"k":"deadTree","x":13,"y":5},{"k":"deadTree","x":37,"y":7},{"k":"deadTree","x":3,"y":6},{"k":"fence","x":14,"y":7},{"k":"rock","x":41,"y":7},{"k":"fence","x":12,"y":8},{"k":"deadTree","x":39,"y":9},{"k":"deadTree","x":2,"y":11},{"k":"deadTree","x":3,"y":11},{"k":"rock","x":4,"y":11},{"k":"deadTree","x":6,"y":11},{"k":"deadTree","x":6,"y":16},{"k":"deadTree","x":43,"y":17},{"k":"deadTree","x":6,"y":19},{"k":"deadTree","x":2,"y":21},{"k":"deadTree","x":3,"y":21},{"k":"deadTree","x":5,"y":21},{"k":"deadTree","x":42,"y":21},{"k":"rock","x":41,"y":24},{"k":"deadTree","x":43,"y":28},{"k":"deadTree","x":39,"y":29},{"k":"deadTree","x":36,"y":30},{"k":"deadTree","x":11,"y":31},{"k":"deadTree","x":37,"y":31},{"k":"deadTree","x":13,"y":34},{"k":"deadTree","x":14,"y":34},{"k":"deadTree","x":32,"y":35},{"k":"deadTree","x":33,"y":35},{"k":"deadTree","x":36,"y":35},{"k":"rock","x":40,"y":37},{"k":"deadTree","x":8,"y":40},{"k":"deadTree","x":38,"y":40},{"k":"rock","x":12,"y":41},{"k":"deadTree","x":38,"y":41},{"k":"rock","x":42,"y":41},{"k":"deadTree","x":8,"y":42}],"sprites":{"tower":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAACcCAYAAADPla2KAAAK2UlEQVR42u1d3YocRRSuvo+yu1GEIBghAUlAvRJxxJlA7w6a2QxkIIHtLBjxwr3wRl9Ab/MIgpeCj+Ar+Ca+xWjPWL3V1ee36lTt5megCJmZ3u3z1Tlffeec6lrnLF+Nex1fr6fVdYFrat7Qmwm9bt7xZkZezbA+uPn+NhyvFU69wT/+9Mv22bc/DOMagtCYXhHPeGj8N4+eIABU5oKG+j1NOk7QjMsAKDSRTeU1FppxDIBXkhukABTnhiYn5pt0VscACP+FuOFh0dCoxOoY6WF8YM0NTQ3vwVg9BAGaeS0AEE9UILFG5PoYABJDOQBCwzUcMf2syXPzOMbjGU5xcez98+hzTj80JcOhRIxLQSrNESJ9QyEfAqCN8dRxTgAQe2rsrWbruEWMh8aU5AjW+GbCrGPExoZeJM+wlWeMPe1CxBGoVpEoMOgHx8ZQWj/le1ZAsTZCN3TVMW4VMrEd4GeYa1ExTi1ftY2kxsPAjgkAawaAUsbVcv1ngI5QeUCtWSpptCg84jdjTig18zXJkApzR6GXanx1455PjZTew24VwL5sPftXxSPU73VffHWyffT4bAsBkZvU0N5xAc5eCUAxUt/phB0Am7MdCP3gLrRx74sr8wBv+IPj090YPCAEQMqooRQtOSDPhN6j9ElseADAcgRAPGpyRGo4xDM8ZfynE8MftIgHaIDAADjPiNtzxhMw6Y7N+sTwqQecbKUg9N+z5YiLojHe3y8LQGgcB4QHAOMISxGlARKLcQoAb+8egM3YSAwI6P0aHIEJm3AiMCMxwyceABkbG0x5SI6OELn4c32Mh4Z6e46/fiwHIAZCwhUSAKREJlnHOQDiGY+BYQGIPWItACBcfjjyw78Dx3hszIIxHvrsydl3egDw0OjI6/eh8StrHOQdUIxzzE4ZDnoARnqSFYH6TvyZZg2nXB0zTmI4GgJhrEgB4ICA3lv/DwTXKqdifGzkCo1zKTe4+GYhMPrRx80EgA1+DQUg3CJ/KiI3b2hstGb2QQ/Qujg22z1Q0mt7b9CwOuXqqdwwBWCjByIVwH5N/vzLVjR7nJuncoOTxLsXDxqF6FcH6rreAzgApPHtRU7PC5QGSAIgRyFS11EApBBbfN1CEBrTZXAzvfmQACUKcS0EwgMw62+ynRqewuxabiCzwVCBhUoslSxjAEMP4CRrKW5w8UzHBh0d3NgNvULkCTMEIJSnmnRWI3ogbkCkcDd8yQPgQbBUiB4AzezFhi9SdEN7ygFwebO94Xc++vQSgHmKQuxG76+lAMxPQMNTuGG/QkyBEQHghybe1wKFKPGA0tzgOAOgEEhRiKEx/WzsAPi5B+BYbYAlNzhO4MQAWCpEyAO06WyubnCcwMEASK0hhp+FAKSms7nc4DiBwwGQoxBjHZCSzuZyg+NKYBoAtDXE2ANyFF8qNzhutrQAaDgiBGBmXOpSZYNczT8clHDScoQH4DJpWWWQ2746pM0pHFnxQZKhvBpiJwoBcamrzeMGh5XA8NGZ1RAhAKxKXWIAcktgagA3l9eEAPhETHzzgKsvErjBpWR1VjVEaUXIsgwecwPZGJklCpxQ7koAyElnc3WDq1kCywEglxuweoMIgDBuYwComeYAlAJgWQZnAVgbCBypQqQAoAyASnX+s5kwPPaku+S3yFiUwEIvQbPBVkduoUJN44bVNBmq0SS1yAZjAHK4wUHGlG6SYn0BLQC+VBe+H5e+QqXIbpGZ5QicBABjDtCks3EIQJsfVNlgeLOQ9qdyhcvvLlUAagCIDYgBWEh1QysAAFoRSihECQCY1MU8QKsbXAmBo+0NppS6jg4DAFra1akeodPuArNUiBAA0nQWWwZVOUWr7Q2un/ACZ3Mm5Av5Mjh9f4Uug9qcItgpCvfzsXIYrhDHu8aeDmB0KAASyRqzOxT/KTkFu1M0rgl6VWehECW5QDx7PRBQqS61YOK4fn7cG7RUiBoA8srgS74iRAEQxlq2QtzoAJgavkK3zKUUTBy0H4gqi0sVIiSmYgBV2WBr1CJrgWVwRhgz7Qt0Q+OUqwVwNcTU3qBdi2zFZ4MDAIc3wH1EOQoRWgaxm18AMwld43e0LXTZYIca5I1P6Q1yfAEtg+GmiBotMsdVcKStMQoIOFS6aQi09rvBVdkgNFspAEibpBgHZJXBW4QbEHAdt4lJ1hsc7ygd/bz5SRYAqlJXq9cNrmYJjMoGvdSt3SJzfAWnMyuB5WyRgd4b8oM2nRtczRJYTlG0VIsM7g3Oc5uknajLLM0GaW5YZrXIXGqsWzRJewAmVVyC2Epwg6tZApOsAlBik9sio0B2OSUwaeWHWgaxMjbX3PRG5XKDs+jxpQKoyQYXwt6gtkXmUra5WzVJc7JBrijK7RqRb5HZ2D8nwC2DWgBy2ueuhMCBRBS2DQ9aBqUAQL3BeNXgSNGVEDhSADEOkKSzWGdImlMsOAAoMNZGChEGYCVKZykA9knZUqQbnFbgrA230Uk8AOMGiQdIuMGVEDhShTgA0OrL4FRzdLJ8tqejByrZZZDW852ZQtQug7NAEGl7g6gHUAIHEhySmZ0ldIa06eze+LfEvUGsReY4gcOVw3IUoiYbDG++94J49lOfMHWcwJE8MpOTDUpaY/HNW/QGvRZgj9LCeoMW2+g0AJR6isxxBQysN2hRQ8zZKWr1FJnIA+IHJymSxAgzNxss1SJjs0GqO9yP924ejIZGIVLLYK2nyOS9QSQEYgAoIKjucO0nRZBssEOXQQqAf/48HQx/8f3t//49FJ8tRJ0gUYMbVFtkOA/4+8WM8IAOAeD4Sp4UgQHYTGcrNQT6bIzbRjfmgFWBJ0WWeYepSXqDO4OPIAB4hcitAjW4wVn0+CBPkCjElGXQ/jC1eXoJDPIQrpMchkZKUfSlPkxNmg1SjYy4pDXc+1xWBU4+TG1Klp2oBIY1T3ojtdkgxw0PGWVa5TA1TZc5FYD4+/E5of2AOEl2mFrFJqmuO7wUcQO2LGefJVaiSTo6SsvoUBRYmR6gW+8YADraoI2A8DZ1D1PDlKnJ0drWTVJwn2DmoShJIcC56rpQkxQ9TK2ViZ7w7DOM/GIAFrmPz3NFEKhyLDlMTfqkCBciEPtD2+dH5witkWZmDMSdD26JAKh5mFo4OGUan00mOkssBOLWO2/vQOiHhULUAGB60CJ6mtyGFjg9AH7cFQCRfZja/ARc/y2eFBF7QPj/EAA/KI/gFGJqUdTuMLUVf5gaBwAFxCtxmJoUgCkQXdXD1BbHRoepzQiBIwHAj5TD1Ogtc6urOUyNBeDdfADEzN5WPEzN5/GzaBmUGN8P/wt7PW4BQLHD1O5/8tm2H5KUV2L8b7//MXhAP7Z/nYp6g7XK4CgAflAgaDnAq0dJUVS6q8uqRebtdbfv3N/2QwJECgDX7TC12M4BgP24N/rwXgSEBQAhCJJlMIkbgE1XseHe5uHP6g4g3MU9whKAy2N1sWxwZcINmOEDAPFfZY6/EP8AUwCyDlNbZhke/PXpxkF/vDwXCGrvcMnD1BSG06/DTCDUh6m1ghhvcc8wMxz6y/MpQJQ8TC0EoJjhuR4hkdh8NriyiPHLV+PyX1KPKHWYWrUZtwLC6jA1yPAPr8LwXI/QHqV1bWa8BBAUAMmGNy8BEF5iQwC8NDOeBcTHe+NCALSGF5/opgIQHoBrPeNNLjINDkQIwLUxvCl8bQiEB+AqDf8XRw6eZmf1cSYAAAAASUVORK5CYII=","church":"data:image/png;base64,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"},"paths":"AAAAAAAAAAAAAAAAAAAYAAAAAAAGAAAAAIABAAAAAGAAAAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAEAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAgAAAAIAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAQAAAAAAAEAgAAAAAAIAAAAAQACAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAAAABgAYAAAAAYAGAAAgAEABgAAYACAAQAA/P9/AAAAAwAYAAAAAAAGAAAAAIABAAAAAGAAAAAAABgAAAAAAAYAAAAAAAAAAAAAAAAAAA=="};
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

    const LAY = mirholdLayout(); // ръчната подредба (ако има) важи и за стената
    // СТЕНАТА: каменен пръстен с ДВА входа — порта на юг и задна порта на север.
    // Отворът е 3 клетки; клетките на ±2 остават блокирани — върху тях стъпват кулите на портата.
    const gY = cy + Math.round(RAD / 1.1);  // редът на пръстена точно на юг
    const gNY = cy - Math.round(RAD / 1.1); // и на север
    const gateX = cx;
    if (LAY && Array.isArray(LAY.walls)) {
      // РЪЧНАТА стена от едитора — точно както е подредена
      for (const c2 of LAY.walls) { block(c2.x, c2.y); props.push({ kind: 'wallseg', x: c2.x + 0.5, y: c2.y + 0.5, r: 0.5, solid: false }); }
      const gts = Array.isArray(LAY.gates) ? LAY.gates : [];
      for (const c2 of gts) { block(c2.x, c2.y); props.push({ kind: 'gatetower', x: c2.x + 0.5, y: c2.y + 0.5, r: 0.5, solid: false }); }
      // гредата със знамената: две кули на един ред, на 4 клетки — греда по средата
      for (let a = 0; a < gts.length; a++) for (let b2 = a + 1; b2 < gts.length; b2++) {
        if (gts[a].y === gts[b2].y && Math.abs(gts[a].x - gts[b2].x) === 4) {
          props.push({ kind: 'gatebanner', x: Math.min(gts[a].x, gts[b2].x) + 2.5, y: gts[a].y + 0.4, r: 0.1, solid: false });
        }
      }
    } else {
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
    }

    // СТРУКТУРАТА: ПЛОЩАД в центъра (кулата, огънят и магазините около него),
    // къщите — в пръстен покрай стената, свързани с околовръстна улица.
    // Ако има РЪЧНА подредба от едитора — тя замества позициите на сградите.
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
    G.fenceDirty = true; // оградите се снапват — маските се преизчисляват при първия кадър
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
          props.push({ kind: 'custom', cid: d2.id, bx: d2.x, by: d2.y, cw: cd.cw, ch: cd.ch, x: d2.x + cd.cw / 2, y: d2.y + cd.ch / 2, r: 0.5, solid: !!cd.solid && !cd.flat, flat: !!cd.flat });
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
