import type { SaveData } from '../data/types';

const KEY = 'q2q-save-v1';

export const SaveSystem = {
  save(data: SaveData): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* private mode / quota — bỏ qua, game vẫn chạy trong phiên */
    }
  },
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (!data || data.version !== 1) return null;
      return data;
    } catch {
      return null;
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
  exists(): boolean {
    return this.load() !== null;
  },
};
