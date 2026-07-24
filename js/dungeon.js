'use strict';
// ================= ПОДЗЕМИЯ: процедурна генерация на етажи =================

// вярно ли е, че ако запечатаме стаята, ВСИЧКИ други стаи остават достижими от старта?
// (пази специалните стаи да не блокират единствен коридор -> да не заключват играча)
function sealKeepsConnected(room, rooms, cells, w, h, sx, sy) {
  const gates = roomGates(room, cells, w, h);
  const saved = gates.map(([i, j]) => cells[j * w + i]);
  for (const [i, j] of gates) cells[j * w + i] = WALL; // временно зазиждаме входовете
  const seen = new Uint8Array(w * h);
  const q = [sy * w + sx]; seen[sy * w + sx] = 1;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi], cx = c % w, cy = (c / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (cells[ni] === FLOOR && !seen[ni]) { seen[ni] = 1; q.push(ni); }
    }
  }
  gates.forEach(([i, j], k) => cells[j * w + i] = saved[k]); // връщаме
  for (const rr of rooms) { if (rr !== room && !seen[rr.cy * w + rr.cx]) return false; }
  return true;
}
// подовите плочки по ръба на стаята, чийто външен съсед е под (=входовете-проходи)
function roomGates(room, cells, w, h) {
  const g = [];
  for (let i = room.x; i < room.x + room.w; i++) {
    if (room.y - 1 >= 0 && cells[room.y * w + i] === FLOOR && cells[(room.y - 1) * w + i] === FLOOR) g.push([i, room.y]);
    if (room.y + room.h < h && cells[(room.y + room.h - 1) * w + i] === FLOOR && cells[(room.y + room.h) * w + i] === FLOOR) g.push([i, room.y + room.h - 1]);
  }
  for (let j = room.y; j < room.y + room.h; j++) {
    if (room.x - 1 >= 0 && cells[j * w + room.x] === FLOOR && cells[j * w + room.x - 1] === FLOOR) g.push([room.x, j]);
    if (room.x + room.w < w && cells[j * w + room.x + room.w - 1] === FLOOR && cells[j * w + room.x + room.w] === FLOOR) g.push([room.x + room.w - 1, j]);
  }
  return g;
}

const Dungeon = {
  generate(depth, runSeed) {
    const R = mulberry32(((depth * 2654435761) ^ runSeed) >>> 0);
    const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    const size = Math.min(62, 40 + depth * 2);
    const w = size, h = size;
    const cells = new Uint8Array(w * h); // VOID
    const variant = new Uint8Array(w * h);

    // --- стаи ---
    const rooms = [];
    for (let tries = 0; tries < 90 && rooms.length < 9 + Math.min(5, depth); tries++) {
      const rw = ri(5, 10), rh = ri(5, 10);
      const x = ri(2, w - rw - 3), y = ri(2, h - rh - 3);
      let ok = true;
      for (const r of rooms) {
        if (x < r.x + r.w + 2 && x + rw + 2 > r.x && y < r.y + r.h + 2 && y + rh + 2 > r.y) { ok = false; break; }
      }
      if (!ok) continue;
      rooms.push({ x, y, w: rw, h: rh, cx: x + (rw >> 1), cy: y + (rh >> 1) });
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) cells[j * w + i] = FLOOR;
    }
    if (rooms.length < 2) return this.generate(depth, runSeed + 101); // защита

    // --- коридори (свързваме всяка стая с най-близката вече свързана) ---
    const carve = (i, j) => {
      for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) {
        const x = i + di, y = j + dj;
        if (x > 0 && y > 0 && x < w - 1 && y < h - 1) cells[y * w + x] = FLOOR;
      }
    };
    const corridor = (a, b) => {
      let x = a.cx, y = a.cy;
      const horFirst = R() < 0.5;
      const goX = () => { while (x !== b.cx) { carve(x, y); x += x < b.cx ? 1 : -1; } };
      const goY = () => { while (y !== b.cy) { carve(x, y); y += y < b.cy ? 1 : -1; } };
      if (horFirst) { goX(); goY(); } else { goY(); goX(); }
      carve(x, y);
    };
    const connected = [rooms[0]];
    const rest = rooms.slice(1);
    while (rest.length) {
      let bi = 0, bj = 0, bd = 1e9;
      for (let i = 0; i < rest.length; i++) for (let j = 0; j < connected.length; j++) {
        const d = Math.abs(rest[i].cx - connected[j].cx) + Math.abs(rest[i].cy - connected[j].cy);
        if (d < bd) { bd = d; bi = i; bj = j; }
      }
      corridor(connected[bj], rest[bi]);
      connected.push(rest.splice(bi, 1)[0]);
    }
    // няколко цикъла за алтернативни пътища
    for (let k = 0; k < 2 && rooms.length > 3; k++) {
      const a = rooms[ri(0, rooms.length - 1)], b = rooms[ri(0, rooms.length - 1)];
      if (a !== b) corridor(a, b);
    }

    // --- стени около пода ---
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (cells[j * w + i] !== VOID) continue;
      let nearFloor = false;
      for (let dj = -1; dj <= 1 && !nearFloor; dj++) for (let di = -1; di <= 1; di++) {
        const x = i + di, y = j + dj;
        if (x >= 0 && y >= 0 && x < w && y < h && cells[y * w + x] === FLOOR) { nearFloor = true; break; }
      }
      if (nearFloor) cells[j * w + i] = WALL;
    }
    for (let i = 0; i < w * h; i++) variant[i] = Math.floor(R() * 6);

    // --- начало и най-далечна стая (BFS по пода) ---
    const startRoom = rooms[0];
    const sx = startRoom.cx, sy = startRoom.cy;
    const distMap = new Int32Array(w * h).fill(-1);
    const q = [sy * w + sx];
    distMap[sy * w + sx] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const cur = q[qi], cx0 = cur % w, cy0 = (cur / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx0 + dx, ny = cy0 + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (cells[ni] === FLOOR && distMap[ni] < 0) { distMap[ni] = distMap[cur] + 1; q.push(ni); }
      }
    }
    let farRoom = rooms[rooms.length - 1], farD = -1;
    for (const r of rooms) {
      const d = distMap[r.cy * w + r.cx];
      if (d > farD) { farD = d; farRoom = r; }
    }

    // --- босовият етаж: разширяваме стаята до ГОЛЯМА (място за битката + да не заклещим боса) ---
    if (depth % 5 === 0) {
      const TGT = 14;
      const nw = Math.min(TGT, w - 6), nh = Math.min(TGT, h - 6);
      const nx = clamp(farRoom.cx - (nw >> 1), 2, w - nw - 2);
      const ny = clamp(farRoom.cy - (nh >> 1), 2, h - nh - 2);
      for (let j = ny; j < ny + nh; j++) for (let i = nx; i < nx + nw; i++) cells[j * w + i] = FLOOR;
      // стени около новия под (само където е било празно, за да не зазидаме входовете-коридори)
      for (let j = ny - 1; j <= ny + nh; j++) for (let i = nx - 1; i <= nx + nw; i++) {
        if (i < 0 || j < 0 || i >= w || j >= h) continue;
        if (cells[j * w + i] === VOID) cells[j * w + i] = WALL;
      }
      farRoom.x = nx; farRoom.y = ny; farRoom.w = nw; farRoom.h = nh;
      farRoom.cx = nx + (nw >> 1); farRoom.cy = ny + (nh >> 1);
    }

    const map = { w, h, cells, variant, rooms, start: { x: sx + 0.5, y: sy + 0.5 }, distMap };
    const props = [];
    const spawns = [];
    const used = new Set();
    used.add(sy * w + sx);
    const free = (i, j) => cells[j * w + i] === FLOOR && !used.has(j * w + i);
    const take = (i, j) => { used.add(j * w + i); };

    // --- стълби (на босов етаж — запечатани) ---
    const bossFloor = depth % 5 === 0;
    props.push({ kind: 'stairs', x: farRoom.cx + 0.5, y: farRoom.cy + 0.5, r: 0.45, sealed: bossFloor, solid: false });
    take(farRoom.cx, farRoom.cy);
    if (bossFloor) { take(farRoom.cx, farRoom.cy - 3); take(farRoom.cx, farRoom.cy + 1); } // мястото на боса остава свободно

    // --- фонтан ---
    if (R() < 0.65) {
      const r = rooms[ri(1, rooms.length - 1)];
      const i = r.cx + (R() < 0.5 ? -1 : 1), j = r.cy;
      if (free(i, j)) { props.push({ kind: 'fountain', x: i + 0.5, y: j + 0.5, r: 0.42, solid: true, used: false }); take(i, j); }
    }

    // --- сандъци ---
    const nChests = 1 + (R() < 0.35 ? 1 : 0);
    for (let c = 0; c < nChests; c++) {
      const r = rooms[ri(1, rooms.length - 1)];
      const i = ri(r.x + 1, r.x + r.w - 2), j = ri(r.y + 1, r.y + r.h - 2);
      if (free(i, j)) { props.push({ kind: 'chest', x: i + 0.5, y: j + 0.5, r: 0.4, solid: true, opened: false }); take(i, j); }
    }

    // --- специални стаи: Съкровищница (%5===3) и Арена (четни етажи) ---
    const usedRooms = new Set([startRoom, farRoom]);
    // разширената босова стая може да е погълнала съседни стаи -> изключваме всяка, която я застъпва
    const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const pickSpecialRoom = () => {
      // само стаи, чието запечатване НЕ отрязва достъпа до останалите (иначе играчът засяда), и които не застъпват босовата/стълбищната стая
      const avail = rooms.filter(r => !usedRooms.has(r) && r.w >= 4 && r.h >= 4 && !intersects(r, farRoom) && sealKeepsConnected(r, rooms, cells, w, h, sx, sy));
      if (!avail.length) return null;
      const r = avail[ri(0, avail.length - 1)];
      usedRooms.add(r);
      return r;
    };
    const vaultRoom = (depth % 5 === 3) ? pickSpecialRoom() : null;
    const arenaRoom = (depth % 2 === 0) ? pickSpecialRoom() : null;
    let vault = null, arena = null;
    if (vaultRoom) {
      // заключени врати на всеки вход + 3 сандъка вътре, без обикновени врагове
      for (const [gi, gj] of roomGates(vaultRoom, cells, w, h)) props.push({ kind: 'vaultdoor', x: gi + 0.5, y: gj + 0.5, r: 0.5, solid: true, opened: false });
      let placed = 0;
      for (let tries = 0; tries < 50 && placed < 3; tries++) {
        const i = ri(vaultRoom.x + 1, vaultRoom.x + vaultRoom.w - 2), j = ri(vaultRoom.y + 1, vaultRoom.y + vaultRoom.h - 2);
        if (free(i, j)) { props.push({ kind: 'chest', x: i + 0.5, y: j + 0.5, r: 0.4, solid: true, opened: false }); take(i, j); placed++; }
      }
      vault = { room: { x: vaultRoom.x, y: vaultRoom.y, w: vaultRoom.w, h: vaultRoom.h } };
    }
    if (arenaRoom) {
      props.push({ kind: 'arena', x: arenaRoom.cx + 0.5, y: arenaRoom.cy + 0.5, r: 0.5, solid: false });
      take(arenaRoom.cx, arenaRoom.cy);
      arena = { room: { x: arenaRoom.x, y: arenaRoom.y, w: arenaRoom.w, h: arenaRoom.h } };
    }

    // --- мангали, бъчви, декор ---
    for (const r of rooms) {
      if (R() < 0.75) {
        const corners = [[r.x, r.y], [r.x + r.w - 1, r.y], [r.x, r.y + r.h - 1], [r.x + r.w - 1, r.y + r.h - 1]];
        const [i, j] = corners[ri(0, 3)];
        if (free(i, j)) { props.push({ kind: 'brazier', x: i + 0.5, y: j + 0.5, r: 0.35, solid: true, animT: R() * 3 }); take(i, j); }
      }
      const nB = ri(0, 2);
      for (let b = 0; b < nB; b++) {
        const i = ri(r.x, r.x + r.w - 1), j = ri(r.y, r.y + r.h - 1);
        if (free(i, j)) {
          props.push({ kind: R() < 0.6 ? 'barrel' : 'crate', x: i + 0.5, y: j + 0.5, r: 0.35, solid: true, hp: 1 });
          take(i, j);
        }
      }
      // плосък декор (кости/отломки) — не блокира
      if (R() < 0.6) {
        const i = ri(r.x, r.x + r.w - 1), j = ri(r.y, r.y + r.h - 1);
        if (cells[j * w + i] === FLOOR) props.push({ kind: R() < 0.5 ? 'bones' : 'rubble', x: i + 0.5, y: j + 0.5, r: 0, solid: false, flat: true });
      }
    }

    // --- врагове ---
    const kinds = [];
    const pushK = (k, wgt, minD) => { if (depth >= minD) kinds.push({ k, w: wgt }); };
    pushK('slime', 30, 1); pushK('skeleton', 24, 1); pushK('bat', 20, 2);
    pushK('archer', 16, 3); pushK('shaman', 12, 5); pushK('brute', 10, 6); pushK('wraith', 9, 8);
    const pickKind = () => {
      let tot = 0; for (const k of kinds) tot += k.w;
      let v = R() * tot;
      for (const k of kinds) { v -= k.w; if (v <= 0) return k.k; }
      return 'slime';
    };
    let budget = Math.min(34, Math.round((bossFloor ? 6 : 9) + depth * 2.1));
    for (const r of rooms) {
      if (r === startRoom) continue;
      if (bossFloor && r === farRoom) continue; // босовата стая е само за боса
      if (r === vaultRoom || r === arenaRoom) continue; // специалните стаи нямат обикновени врагове
      const roomN = Math.min(budget, Math.max(1, Math.round(r.w * r.h / 14) + (R() < 0.5 ? 0 : 1)));
      for (let e = 0; e < roomN && budget > 0; e++) {
        const i = ri(r.x, r.x + r.w - 1), j = ri(r.y, r.y + r.h - 1);
        if (!free(i, j)) continue;
        // не точно до старта
        if (Math.abs(i - sx) + Math.abs(j - sy) < 7) continue;
        spawns.push({ kind: pickKind(), x: i + 0.5, y: j + 0.5, elite: R() < 0.06 + depth * 0.008 });
        take(i, j);
        budget--;
      }
    }
    if (bossFloor) {
      // архибос на всеки 10-и етаж, иначе ротация от тримата пазители
      const bossId = depth % 10 === 0 ? 'arch' : BOSS_POOL[ri(0, BOSS_POOL.length - 1)];
      // спаунва се навътре в голямата стая (3 плочки над центъра — далеч от стените и стълбите)
      spawns.push({ bossId, x: farRoom.cx + 0.5, y: farRoom.cy - 3 + 0.5 });
    }

    // Съкровищница: един елит носи ключа (маркиран). Ако няма елит — правим един гарантиран.
    if (vault) {
      let kg = spawns.find(s => s.elite && !s.bossId);
      if (!kg) kg = spawns.find(s => !s.bossId);
      if (!kg) {
        const rr = rooms.find(r => r !== startRoom && r !== vaultRoom && r !== arenaRoom && !(bossFloor && r === farRoom)) || rooms[1];
        if (rr) { kg = { kind: 'brute', x: rr.cx + 0.5, y: rr.cy + 0.5 }; spawns.push(kg); }
      }
      if (kg) { kg.elite = true; kg.keyGuardian = true; }
    }

    return {
      map, props, spawns, theme: themeIndexFor(depth), bossFloor,
      bossRoom: bossFloor ? { x: farRoom.x, y: farRoom.y, w: farRoom.w, h: farRoom.h } : null,
      vault, arena,
    };
  },
};
