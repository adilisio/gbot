import { W, H } from './engine/canvas';
import { settings } from './engine/settings';

export function applyScale() {
  const c = document.getElementById('screen') as HTMLCanvasElement;
  const maxS = Math.max(1, Math.floor(Math.min(window.innerWidth / W, window.innerHeight / H)));
  const s = settings.scale === 0 ? maxS : Math.min(settings.scale, Math.max(maxS, 1));
  c.style.width = W * s + 'px';
  c.style.height = H * s + 'px';
}
