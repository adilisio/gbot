export interface Settings {
  master: number; music: number; sfx: number;
  lowFx: boolean; scale: number; // 0 = auto (largest integer fit)
  fps: boolean; textSpeed: number;
}
const KEY = 'lanternfall.settings';
export const settings: Settings = { master: 0.8, music: 0.6, sfx: 0.8, lowFx: false, scale: 0, fps: false, textSpeed: 2 };
try {
  const s = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (s) Object.assign(settings, s);
} catch { /* ignore */ }
export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}
