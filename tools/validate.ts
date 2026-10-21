// Map sanity checker: row widths, entity placement, reachability. Run: npm run validate
import '../src/story';
import { allMaps } from '../src/overworld/mapdef';
import { walkable, VENT } from '../src/overworld/tiles';

let problems = 0;
const warn = (m: string) => { problems++; console.log('  ! ' + m); };
for (const m of Object.values(allMaps())) {
  console.log(`[${m.id}] ${m.tiles[0].length}x${m.tiles.length}`);
  const raw = m.tiles;
  const w = raw[0].length;
  const at = (x: number, y: number) => (y < 0 || y >= raw.length || x < 0 || x >= w ? '' : raw[y][x]);
  const solidEnt = new Set<string>();
  for (const e of m.ents) if (e.kind !== 'trigger') solidEnt.add(e.x + ',' + e.y);
  const walk = (x: number, y: number) => walkable(at(x, y), true) && !solidEnt.has(x + ',' + y);
  for (const e of m.ents) {
    const t = at(e.x, e.y);
    if (!t) warn(`${e.id} out of bounds (${e.x},${e.y})`);
    else if (e.kind !== 'obj' && !walkable(t, true) && e.kind !== 'trigger') warn(`${e.id} on non-walkable '${t}' (${e.x},${e.y})`);
    if (e.kind === 'trigger') for (let dy = 0; dy < (e.h || 1); dy++) for (let dx = 0; dx < (e.w || 1); dx++) if (!walkable(at(e.x + dx, e.y + dy), true)) warn(`${e.id} trigger cell (${e.x + dx},${e.y + dy}) on '${at(e.x + dx, e.y + dy)}'`);
  }
  for (const wp of m.warps) {
    if (!walkable(at(wp.x, wp.y), true)) warn(`warp at (${wp.x},${wp.y}) on '${at(wp.x, wp.y)}'`);
    const dst = allMaps()[wp.to];
    if (!dst) warn(`warp to unknown ${wp.to}`);
    else if (!walkable(dst.tiles[wp.ty]?.[wp.tx] || '', true)) warn(`warp dest ${wp.to} (${wp.tx},${wp.ty}) on '${dst.tiles[wp.ty]?.[wp.tx]}'`);
  }
  // reachability from first warp (vents treated as walkable both ways = optimistic)
  const start = m.warps[0];
  const seen = new Set<string>();
  const q: [number, number][] = [];
  const sx = m.id === 'lowwick' ? 7 : start.x, sy = m.id === 'lowwick' ? 7 : start.y;
  q.push([sx, sy]); seen.add(sx + ',' + sy);
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (seen.has(k) || !walk(nx, ny)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  for (const e of m.ents) {
    const ok = e.kind === 'trigger' ? seen.has(e.x + ',' + e.y) : [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has(e.x + dx + ',' + (e.y + dy)));
    if (!ok) warn(`${e.id} unreachable`);
  }
  for (const wp of m.warps) if (!seen.has(wp.x + ',' + wp.y)) warn(`warp (${wp.x},${wp.y}) -> ${wp.to} unreachable`);
  void VENT;
}
console.log(problems ? `${problems} problem(s)` : 'All maps OK');
