import type { SaveData } from '../data/types';

const PREFIX = 'q2q-save-v1';

/** Mỗi người chơi một khe lưu riêng theo tên */
function keyFor(player: string): string {
  return `${PREFIX}:${player}`;
}

export const SaveSystem = {
  save(player: string, data: SaveData): void {
    try {
      localStorage.setItem(keyFor(player), JSON.stringify(data));
    } catch {
      /* private mode / quota — bỏ qua, game vẫn chạy trong phiên */
    }
  },
  load(player: string): SaveData | null {
    try {
      const raw = localStorage.getItem(keyFor(player));
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (!data || data.version !== 1) return null;
      return data;
    } catch {
      return null;
    }
  },
  clear(player: string): void {
    try {
      localStorage.removeItem(keyFor(player));
    } catch {
      /* ignore */
    }
  },
  exists(player: string): boolean {
    return this.load(player) !== null;
  },
};
