import { BALANCE } from '../data/balance';
import type { ExerciseConfig, ExerciseMode } from '../data/types';

export type RepGrade = 'perfect' | 'good' | 'bad';
export type Dir = 'up' | 'down' | 'left' | 'right';
/** Tín hiệu vào của mini-game: 'action' = SPACE / chạm; còn lại là phím hướng */
export type ExerciseInput = 'action' | Dir;

export interface ExerciseEvents {
  rep: (grade: RepGrade, repIndex: number) => void;
  combo: () => void;
  badStreak: () => void;
  /** thao tác sai (sai tay, sai mũi tên, bấm không có nốt) — không tính rep */
  miss: () => void;
  done: (summary: ExerciseSummary) => void;
}

export interface ExerciseSummary {
  reps: number;
  perfect: number;
  good: number;
  bad: number;
  comboAchieved: boolean;
}

/** Vùng chấm điểm cho timing-mode (con trỏ 0..1) */
export const TIMING_ZONES = { goodMin: 0.3, goodMax: 0.7, perfectMin: 0.44, perfectMax: 0.56 };
/** Vùng chấm điểm cho hold-mode (thanh kéo 0..1, thả ra trong vùng): Perfect hẹp (6%) < Good (33%) < vùng hỏng (quá đà / thả sớm) */
export const HOLD_ZONES = { goodMin: 0.55, goodMax: 0.88, perfectMin: 0.76, perfectMax: 0.82 };
/** Sai số chấm điểm cho rhythm-mode (ms so với lúc nốt chạm vạch) */
export const RHYTHM_WINDOW = { perfectMs: 80, goodMs: 170, missMs: 230 };

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

type EngineConfig = Pick<
  ExerciseConfig,
  'mode' | 'repsRequired' | 'repWindowMs' | 'mashPerRep' | 'timingSpeed' | 'holdMs' | 'altPerRep' | 'beatMs' | 'travelMs' | 'seqLen'
>;

/**
 * Lõi mini-game bài tập, độc lập với Phaser. Mỗi cơ chế là một lớp con; phần chung:
 * chấm điểm rep, chuỗi Perfect → combo (2 combo => +1 điểm phụ trội), 2 Bad liên tiếp => cảnh báo.
 * Luôn phải tập đủ số rep.
 */
export abstract class ExerciseEngine {
  abstract readonly mode: ExerciseMode;
  readonly repsRequired: number;
  reps = 0;
  perfect = 0;
  good = 0;
  bad = 0;
  perfectStreak = 0;
  badStreak = 0;
  comboAchieved = false;
  done = false;
  lastGrade: RepGrade | null = null;

  protected listeners: Partial<ExerciseEvents> = {};

  constructor(repsRequired: number) {
    this.repsRequired = repsRequired;
  }

  on<K extends keyof ExerciseEvents>(evt: K, fn: ExerciseEvents[K]): this {
    this.listeners[evt] = fn;
    return this;
  }

  /** Gọi mỗi frame */
  update(_dtMs: number): void {}
  /** Bấm phím / chạm */
  press(_input: ExerciseInput = 'action'): void {}
  /** Thả phím (chỉ hold-mode dùng) */
  release(): void {}

  /** Đặt lại trạng thái của rep hiện tại (lớp con ghi đè) */
  protected resetRep(): void {}

  protected miss(): void {
    this.listeners.miss?.();
  }

  protected completeRep(grade: RepGrade): void {
    if (this.done) return;
    this.reps += 1;
    this.lastGrade = grade;
    this.resetRep();
    if (grade === 'perfect') {
      this.perfect++;
      this.perfectStreak++;
      this.badStreak = 0;
    } else if (grade === 'good') {
      this.good++;
      this.perfectStreak = 0;
      this.badStreak = 0;
    } else {
      this.bad++;
      this.perfectStreak = 0;
      this.badStreak++;
      if (this.badStreak === 2) this.listeners.badStreak?.();
    }
    this.listeners.rep?.(grade, this.reps);

    if (!this.comboAchieved && this.perfectStreak >= BALANCE.perfectStreakForCombo) {
      this.comboAchieved = true;
      this.listeners.combo?.();
    }
    if (this.reps >= this.repsRequired) {
      this.done = true;
      this.listeners.done?.({
        reps: this.reps,
        perfect: this.perfect,
        good: this.good,
        bad: this.bad,
        comboAchieved: this.comboAchieved,
      });
    }
  }
}

/** MASH — bấm đủ `mashPerRep` lần trong `windowMs`. Nhanh => Perfect, kịp => Good, hết giờ => Bad. */
export class MashEngine extends ExerciseEngine {
  readonly mode = 'mash' as const;
  private presses = 0;
  private elapsed = 0;
  private readonly windowMs: number;
  private readonly mashPerRep: number;

  constructor(cfg: EngineConfig) {
    super(cfg.repsRequired);
    this.windowMs = cfg.repWindowMs ?? 4000;
    this.mashPerRep = cfg.mashPerRep ?? 8;
  }

  get progress(): number {
    return Math.min(1, this.presses / this.mashPerRep);
  }

  get timeLeft(): number {
    return Math.max(0, 1 - this.elapsed / this.windowMs);
  }

  update(dtMs: number): void {
    if (this.done) return;
    this.elapsed += dtMs;
    if (this.elapsed >= this.windowMs) this.completeRep('bad');
  }

  press(): void {
    if (this.done) return;
    this.presses += 1;
    if (this.presses >= this.mashPerRep) {
      const frac = this.elapsed / this.windowMs;
      this.completeRep(frac <= 0.55 ? 'perfect' : 'good');
    }
  }

  protected resetRep(): void {
    this.presses = 0;
    this.elapsed = 0;
  }
}

/** TIMING — con trỏ chạy qua lại; bấm trong vùng Perfect/Good/ngoài => Perfect/Good/Bad. Mỗi lần bấm = 1 rep. */
export class TimingEngine extends ExerciseEngine {
  readonly mode = 'timing' as const;
  private t = 0;
  private cooldown = 0;
  private readonly speed: number;

  constructor(cfg: EngineConfig) {
    super(cfg.repsRequired);
    this.speed = cfg.timingSpeed ?? 0.8;
  }

  /** Vị trí con trỏ 0..1, dạng sóng tam giác */
  get cursor(): number {
    const phase = (this.t * this.speed) % 1;
    return phase < 0.5 ? phase * 2 : (1 - phase) * 2;
  }

  get inPerfectZone(): boolean {
    const c = this.cursor;
    return c >= TIMING_ZONES.perfectMin && c <= TIMING_ZONES.perfectMax;
  }

  update(dtMs: number): void {
    if (this.done) return;
    this.t += dtMs / 1000;
    if (this.cooldown > 0) this.cooldown -= dtMs;
  }

  press(): void {
    if (this.done || this.cooldown > 0) return; // tránh bấm dồn
    this.cooldown = 220;
    const c = this.cursor;
    let g: RepGrade = 'bad';
    if (c >= TIMING_ZONES.perfectMin && c <= TIMING_ZONES.perfectMax) g = 'perfect';
    else if (c >= TIMING_ZONES.goodMin && c <= TIMING_ZONES.goodMax) g = 'good';
    this.completeRep(g);
  }
}

/** HOLD — giữ để thanh kéo dâng lên trong `holdMs`; thả ra trong vùng xanh. Kéo đầy (quá đà) hoặc thả sớm => Bad. */
export class HoldEngine extends ExerciseEngine {
  readonly mode = 'hold' as const;
  holding = false;
  charge = 0;
  private readonly holdMs: number;

  constructor(cfg: EngineConfig) {
    super(cfg.repsRequired);
    this.holdMs = cfg.holdMs ?? 1500;
  }

  get inPerfectZone(): boolean {
    return this.charge >= HOLD_ZONES.perfectMin && this.charge <= HOLD_ZONES.perfectMax;
  }

  update(dtMs: number): void {
    if (this.done || !this.holding) return;
    this.charge += dtMs / this.holdMs;
    if (this.charge >= 1) this.completeRep('bad'); // kéo quá đà
  }

  press(): void {
    if (this.done || this.holding) return;
    this.holding = true;
    this.charge = 0;
  }

  release(): void {
    if (this.done || !this.holding) return;
    const c = this.charge;
    let g: RepGrade = 'bad';
    if (c >= HOLD_ZONES.perfectMin && c <= HOLD_ZONES.perfectMax) g = 'perfect';
    else if (c >= HOLD_ZONES.goodMin && c <= HOLD_ZONES.goodMax) g = 'good';
    this.completeRep(g);
  }

  protected resetRep(): void {
    this.holding = false;
    this.charge = 0;
  }
}

/** ALTERNATE — bấm đúng tay TRÁI/PHẢI được chỉ định NGẪU NHIÊN đủ `altPerRep` lần trong `windowMs`. Sai tay => mất nhịp (tính lỗi). */
export class AlternateEngine extends ExerciseEngine {
  readonly mode = 'alternate' as const;
  expected: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
  count = 0;
  mistakes = 0;
  private elapsed = 0;
  private readonly windowMs: number;
  private readonly altPerRep: number;

  constructor(cfg: EngineConfig) {
    super(cfg.repsRequired);
    this.windowMs = cfg.repWindowMs ?? 4000;
    this.altPerRep = cfg.altPerRep ?? 6;
  }

  get progress(): number {
    return Math.min(1, this.count / this.altPerRep);
  }

  get timeLeft(): number {
    return Math.max(0, 1 - this.elapsed / this.windowMs);
  }

  update(dtMs: number): void {
    if (this.done) return;
    this.elapsed += dtMs;
    if (this.elapsed >= this.windowMs) this.completeRep('bad');
  }

  press(input: ExerciseInput = 'action'): void {
    if (this.done || (input !== 'left' && input !== 'right')) return;
    if (input !== this.expected) {
      this.mistakes++;
      this.miss();
      return;
    }
    this.count++;
    this.expected = Math.random() < 0.5 ? 'left' : 'right';
    if (this.count >= this.altPerRep) {
      const frac = this.elapsed / this.windowMs;
      this.completeRep(this.mistakes === 0 && frac <= 0.6 ? 'perfect' : this.mistakes <= 2 ? 'good' : 'bad');
    }
  }

  protected resetRep(): void {
    this.count = 0;
    this.mistakes = 0;
    this.elapsed = 0;
    this.expected = Math.random() < 0.5 ? 'left' : 'right';
  }
}

interface Note {
  hitAt: number;
  judged: boolean;
}

/** RHYTHM — nốt chạy tới vạch cách nhau `beatMs`; bấm càng sát lúc chạm vạch càng Perfect. Mỗi nốt = 1 rep. */
export class RhythmEngine extends ExerciseEngine {
  readonly mode = 'rhythm' as const;
  private t = 0;
  private notes: Note[] = [];
  private spawned = 0;
  private nextSpawnAt = 500;
  private readonly beatMs: number;
  private readonly travelMs: number;

  constructor(cfg: EngineConfig) {
    super(cfg.repsRequired);
    this.beatMs = cfg.beatMs ?? 900;
    this.travelMs = cfg.travelMs ?? 1800;
  }

  /** Vị trí các nốt chưa chấm: 1 = vừa xuất hiện ở mép, 0 = chạm vạch, âm = đã qua vạch */
  get notePositions(): number[] {
    return this.notes.filter((n) => !n.judged).map((n) => (n.hitAt - this.t) / this.travelMs);
  }

  /** Nhịp nền 0..1 để vẽ hiệu ứng đập theo beat */
  get beatPhase(): number {
    return ((this.t - this.nextSpawnAt) % this.beatMs) / this.beatMs;
  }

  update(dtMs: number): void {
    if (this.done) return;
    this.t += dtMs;
    while (this.spawned < this.repsRequired && this.t >= this.nextSpawnAt) {
      this.notes.push({ hitAt: this.nextSpawnAt + this.travelMs, judged: false });
      this.nextSpawnAt += this.beatMs;
      this.spawned++;
    }
    for (const n of this.notes) {
      if (!n.judged && this.t - n.hitAt > RHYTHM_WINDOW.missMs) {
        n.judged = true;
        this.completeRep('bad');
      }
    }
  }

  press(): void {
    if (this.done) return;
    let best: Note | null = null;
    let bestOff = Infinity;
    for (const n of this.notes) {
      if (n.judged) continue;
      const off = Math.abs(this.t - n.hitAt);
      if (off < bestOff) {
        bestOff = off;
        best = n;
      }
    }
    if (!best || bestOff > RHYTHM_WINDOW.missMs) {
      this.miss();
      return;
    }
    best.judged = true;
    this.completeRep(bestOff <= RHYTHM_WINDOW.perfectMs ? 'perfect' : bestOff <= RHYTHM_WINDOW.goodMs ? 'good' : 'bad');
  }
}

/** SEQUENCE — nhập đúng chuỗi `seqLen` mũi tên trong `windowMs`. Sai => làm lại chuỗi từ đầu (tính lỗi). */
export class SequenceEngine extends ExerciseEngine {
  readonly mode = 'sequence' as const;
  sequence: Dir[] = [];
  index = 0;
  mistakes = 0;
  private elapsed = 0;
  private readonly windowMs: number;
  private readonly seqLen: number;

  constructor(cfg: EngineConfig) {
    super(cfg.repsRequired);
    this.windowMs = cfg.repWindowMs ?? 5000;
    this.seqLen = cfg.seqLen ?? 4;
    this.newSequence();
  }

  get timeLeft(): number {
    return Math.max(0, 1 - this.elapsed / this.windowMs);
  }

  private newSequence(): void {
    this.sequence = Array.from({ length: this.seqLen }, () => DIRS[Math.floor(Math.random() * DIRS.length)]);
  }

  update(dtMs: number): void {
    if (this.done) return;
    this.elapsed += dtMs;
    if (this.elapsed >= this.windowMs) this.completeRep('bad');
  }

  press(input: ExerciseInput = 'action'): void {
    if (this.done || input === 'action') return;
    if (input !== this.sequence[this.index]) {
      this.mistakes++;
      this.index = 0;
      this.miss();
      return;
    }
    this.index++;
    if (this.index >= this.sequence.length) {
      const frac = this.elapsed / this.windowMs;
      this.completeRep(this.mistakes === 0 && frac <= 0.6 ? 'perfect' : this.mistakes <= 1 ? 'good' : 'bad');
    }
  }

  protected resetRep(): void {
    this.index = 0;
    this.mistakes = 0;
    this.elapsed = 0;
    this.newSequence();
  }
}

export function createExerciseEngine(cfg: EngineConfig): ExerciseEngine {
  switch (cfg.mode) {
    case 'mash':
      return new MashEngine(cfg);
    case 'timing':
      return new TimingEngine(cfg);
    case 'hold':
      return new HoldEngine(cfg);
    case 'alternate':
      return new AlternateEngine(cfg);
    case 'rhythm':
      return new RhythmEngine(cfg);
    case 'sequence':
      return new SequenceEngine(cfg);
  }
}
