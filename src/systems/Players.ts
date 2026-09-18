import { mergeRecords } from '../../api/_lib/merge.js';
import type { Badges, BossLog, DayAction, DayRecord, PlayerStats } from '../data/types';
import type { Habits } from '../gfx/Avatar';
import { Api } from './Api';

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
  /** nhật ký 3 phase của trận đó */
  log?: BossLog | null;
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
  /** ngày bỏ học / bỏ tập → vẽ đúng ngoại hình hiện tại */
  habits?: Habits;
  /** các lượt tập/học của ngày đang chơi dở */
  todayActions?: DayAction[];
  /** nhật ký trận boss gần nhất */
  bossLog?: BossLog | null;
}

/** Nhân vật cuối cùng khi kết thúc ván gần nhất — để hiển thị & so sánh trên bảng xếp hạng */
export interface FinalAvatar {
  at: number;
  won: boolean;
  stats: PlayerStats;
  habits: Habits;
  /** tổng thể chất + kiến thức của nhân vật */
  score: number;
}

/** Hồ sơ một người chơi trong bảng xếp hạng (localStorage là bộ đệm; bản chính trên server /api/players) */
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
  finalAvatar?: FinalAvatar | null;
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

/** Xếp hạng: thắng nhiều → điểm nhân vật cuối → tổng điểm tốt nhất → chơi gần đây */
export function rankPlayers(list: PlayerRecord[]): PlayerRecord[] {
  const score = (r: PlayerRecord) => r.finalAvatar?.score ?? 0;
  return [...list].sort(
    (a, b) =>
      b.wins - a.wins ||
      score(b) - score(a) ||
      b.bestTotalGym + b.bestTotalStudy - (a.bestTotalGym + a.bestTotalStudy) ||
      b.lastPlayedAt - a.lastPlayedAt,
  );
}

/** Đẩy hồ sơ lên server (gộp nhiều máy), gom các lần save liên tiếp lại */
const pending = new Map<string, ReturnType<typeof setTimeout>>();
function pushToServer(name: string): void {
  clearTimeout(pending.get(name));
  pending.set(
    name,
    setTimeout(async () => {
      pending.delete(name);
      const local = readAll()[name];
      if (!local) return;
      const merged = await Api.upsert(local);
      if (merged) {
        const all = readAll();
        all[name] = mergeRecords(all[name], merged);
        writeAll(all);
      }
    }, 800),
  );
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

  ranked(): PlayerRecord[] {
    return rankPlayers(this.list());
  },

  /** Lấy hồ sơ từ server và gộp vào bản local (khi người chơi nhập tên trên máy mới) */
  async pullFromServer(name: string): Promise<void> {
    const remote = await Api.get(name);
    if (!remote) return;
    const all = readAll();
    all[name] = mergeRecords(all[name] ?? fresh(name), remote);
    writeAll(all);
  },

  /** Bảng xếp hạng toàn cầu (server); null nếu backend không sẵn sàng */
  async fetchRanked(): Promise<{ players: PlayerRecord[]; persistent: boolean } | null> {
    const r = await Api.list();
    if (!r) return null;
    // hoà bản local vào để máy này luôn thấy chính mình kể cả khi vừa save chưa kịp đẩy
    const byName = new Map(r.players.map((p) => [p.name, p]));
    for (const l of this.list()) byName.set(l.name, mergeRecords(byName.get(l.name), l));
    return { players: rankPlayers([...byName.values()]), persistent: r.persistent };
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
    pushToServer(name);
    return r;
  },

  async remove(name: string, adminKey: string): Promise<boolean> {
    const all = readAll();
    delete all[name];
    writeAll(all);
    return Api.remove(name, adminKey);
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
