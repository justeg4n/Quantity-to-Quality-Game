import { BALANCE } from '../data/balance';
import type { ExerciseConfig, ExerciseMode } from '../data/types';

export type RepGrade = 'perfect' | 'good' | 'bad';

export interface ExerciseEvents {
  rep: (grade: RepGrade, repIndex: number) => void;
  combo: () => void;
  badStreak: () => void;
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

/**
 * Logic mini-game bài tập, độc lập với Phaser (mục 4 tài liệu thiết kế).
 * - mash: bấm đủ `mashPerRep` lần trong `repWindowMs`. Nhanh => Perfect, kịp => Good, hết giờ => Bad (vẫn tính rep).
 * - timing: con trỏ chạy qua lại; bấm trong vùng Perfect/Good/ngoài => Perfect/Good/Bad. Mỗi lần bấm = 1 rep.
 * - 3 Perfect liên tiếp => combo (rep cuối tự hoàn thành sớm). 2 Bad liên tiếp => cảnh báo, không phạt.
 */
export class ExerciseEngine {
  readonly mode: ExerciseMode;
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

  // mash
  private presses = 0;
  private elapsed = 0;
  private readonly windowMs: number;
  private readonly mashPerRep: number;

  // timing
  private t = 0;
  private readonly speed: number;
  private cooldown = 0;

  private listeners: Partial<ExerciseEvents> = {};

  constructor(cfg: Pick<ExerciseConfig, 'mode' | 'repsRequired' | 'repWindowMs' | 'mashPerRep' | 'timingSpeed'>) {
    this.mode = cfg.mode;
    this.repsRequired = cfg.repsRequired;
    this.windowMs = cfg.repWindowMs ?? 4000;
    this.mashPerRep = cfg.mashPerRep ?? 8;
    this.speed = cfg.timingSpeed ?? 0.8;
  }

  on<K extends keyof ExerciseEvents>(evt: K, fn: ExerciseEvents[K]): this {
    this.listeners[evt] = fn;
    return this;
  }

  /** Tiến độ rep hiện tại (mash) 0..1 */
  get progress(): number {
    return Math.min(1, this.presses / this.mashPerRep);
  }

  /** Thời gian còn lại của rep hiện tại (mash) 0..1 */
  get timeLeft(): number {
    return Math.max(0, 1 - this.elapsed / this.windowMs);
  }

  /** Vị trí con trỏ (timing) 0..1, dạng sóng tam giác */
  get cursor(): number {
    const phase = (this.t * this.speed) % 1; // 0..1
    return phase < 0.5 ? phase * 2 : (1 - phase) * 2;
  }

  get inPerfectZone(): boolean {
    const c = this.cursor;
    return c >= TIMING_ZONES.perfectMin && c <= TIMING_ZONES.perfectMax;
  }

  update(dtMs: number): void {
    if (this.done) return;
    if (this.mode === 'mash') {
      this.elapsed += dtMs;
      if (this.elapsed >= this.windowMs) this.completeRep('bad');
    } else {
      this.t += dtMs / 1000;
      if (this.cooldown > 0) this.cooldown -= dtMs;
    }
  }

  press(): void {
    if (this.done) return;
    if (this.mode === 'mash') {
      this.presses += 1;
      if (this.presses >= this.mashPerRep) {
        const frac = this.elapsed / this.windowMs;
        this.completeRep(frac <= 0.55 ? 'perfect' : 'good');
      }
    } else {
      if (this.cooldown > 0) return; // tránh bấm dồn
      this.cooldown = 220;
      const c = this.cursor;
      let g: RepGrade = 'bad';
      if (c >= TIMING_ZONES.perfectMin && c <= TIMING_ZONES.perfectMax) g = 'perfect';
      else if (c >= TIMING_ZONES.goodMin && c <= TIMING_ZONES.goodMax) g = 'good';
      this.completeRep(g);
    }
  }

  private completeRep(grade: RepGrade): void {
    this.reps += 1;
    this.lastGrade = grade;
    this.presses = 0;
    this.elapsed = 0;
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
    // Combo x1.5: rep cuối tự hoàn thành sớm (chỉ cần repsRequired - 1 rep thực)
    const needed = this.comboAchieved ? this.repsRequired - 1 : this.repsRequired;
    if (this.reps >= needed) {
      this.reps = this.repsRequired;
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
