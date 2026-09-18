import type { Badges, DayRecord, PlayerStats } from '../data/types';

/** Tài khoản quản trị — chỉ dùng để xem bảng xếp hạng & tiến trình người chơi (kiểm tra phía client, không phải bảo mật thật) */
export const ADMIN = { name: 'admin', password: 'Quality@123' } as const;

export interface BossRecord {
  at: number;
  won: boolean;
  reasons: string[];
  attempts: number;
  totalGym: number;
  totalStudy: number;
  newGamePlus: number;
}

export interface PlayerCurrent {
  phase: 'training' | 'boss' | 'ended';
  day: number;
  pointsLeft: number;
  totalGym: number;
  totalStudy: number;
  stats: PlayerStats;
  log: DayRecord[];
  newGamePlus: number;
  bossAttempts: number;
  lastWon: boolean | null;
}

/** Hồ sơ một người chơi trong bảng xếp hạng (lưu localStorage, độc lập với save đang chơi) */
export interface PlayerRecord {
  name: string;
  createdAt: number;
  lastPlayedAt: number;
  games: number;
  wins: number;
  losses: number;
  bestTotalGym: number;
  bestTotalStudy: number;
  maxKnowledge: number;
  maxPhysical: number;
  badges: Badges;
  history: BossRecord[];
  current: PlayerCurrent | null;
}

const KEY = 'q2q-players-v1';
const CURRENT_KEY = 'q2q-current-player';

function readAll(): Record<string, PlayerRecord> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, PlayerRecord>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, PlayerRecord>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode / quota — bỏ qua */
  }
}

function fresh(name: string): PlayerRecord {
  return {
    name,
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    games: 0,
    wins: 0,
    losses: 0,
    bestTotalGym: 0,
    bestTotalStudy: 0,
    maxKnowledge: 0,
    maxPhysical: 0,
    badges: { balanced: false, scholar: false, athlete: false, champion: false },
    history: [],
    current: null,
  };
}

export const Players = {
  /** Chuẩn hoá tên: cắt khoảng trắng, tối đa 16 ký tự */
  normalize(name: string): string {
    return name.trim().replace(/\s+/g, ' ').slice(0, 16);
  },

  isAdmin(name: string): boolean {
    return name.trim().toLowerCase() === ADMIN.name;
  },

  list(): PlayerRecord[] {
    return Object.values(readAll());
  },

  /** Xếp hạng: thắng nhiều → tổng điểm tốt nhất → chơi gần đây */
  ranked(): PlayerRecord[] {
    return this.list().sort(
      (a, b) => b.wins - a.wins || b.bestTotalGym + b.bestTotalStudy - (a.bestTotalGym + a.bestTotalStudy) || b.lastPlayedAt - a.lastPlayedAt,
    );
  },

  get(name: string): PlayerRecord | null {
    return readAll()[name] ?? null;
  },

  update(name: string, fn: (r: PlayerRecord) => void): PlayerRecord {
    const all = readAll();
    const r = all[name] ?? fresh(name);
    fn(r);
    r.lastPlayedAt = Date.now();
    all[name] = r;
    writeAll(all);
    return r;
  },

  remove(name: string): void {
    const all = readAll();
    delete all[name];
    writeAll(all);
  },

  currentName(): string | null {
    try {
      return localStorage.getItem(CURRENT_KEY);
    } catch {
      return null;
    }
  },

  setCurrentName(name: string): void {
    try {
      localStorage.setItem(CURRENT_KEY, name);
    } catch {
      /* ignore */
    }
  },
};
