import { BALANCE, KNOWLEDGE_KEYS } from '../data/balance';
import { dayDiary } from '../data/dialogue';
import type { Badges, DayState, KnowledgeKey, SaveData, Weather } from '../data/types';
import { setAvatarHabits } from '../gfx/Avatar';
import { SaveSystem } from './SaveSystem';
import { StatsManager } from './StatsManager';

function randomWeather(): Weather {
  const r = Math.random();
  return r < 0.55 ? 'sun' : r < 0.8 ? 'rain' : 'wind';
}

function freshDay(day = 1): DayState {
  return {
    currentDay: day,
    pointsLeft: BALANCE.pointsPerDay,
    gymToday: 0,
    studyToday: 0,
    philosopherBadge: false,
    weather: randomWeather(),
    log: [],
  };
}

/**
 * Trạng thái toàn cục của game (singleton). Gộp StatsManager + DayManager + huy hiệu + save.
 * Mọi scene đều đọc/ghi qua `game`.
 */
class GameStateImpl {
  stats = new StatsManager();
  day: DayState = freshDay();
  badges: Badges = { balanced: false, scholar: false, athlete: false, champion: false };
  seenQuestions = new Set<string>();
  gymVisits = 0;
  athensVisits = 0;
  comboCount = 0;
  totalGym = 0;
  totalStudy = 0;
  phase: SaveData['phase'] = 'training';
  newGamePlus = 0;
  bossAttempts = 0;
  /** Kết quả trận boss gần nhất — dùng cho EndingScene */
  lastBossResult: { won: boolean; reasons: string[] } | null = null;
  muted = false;

  // ─────────── Vòng đời ───────────
  newGame(keepBadges = false): void {
    const badges = keepBadges ? { ...this.badges, champion: false } : { balanced: false, scholar: false, athlete: false, champion: false };
    const ngp = keepBadges ? this.newGamePlus + 1 : 0;
    this.stats = new StatsManager();
    this.day = freshDay();
    this.badges = badges;
    this.seenQuestions = new Set();
    this.gymVisits = 0;
    this.athensVisits = 0;
    this.comboCount = 0;
    this.totalGym = 0;
    this.totalStudy = 0;
    this.phase = 'training';
    this.newGamePlus = ngp;
    this.bossAttempts = 0;
    this.lastBossResult = null;
    this.syncHabits();
    this.save();
  }

  /** Thói quen: số ngày đã qua không học / không tập (từ nhật ký) → ngoại hình nhân vật */
  habits(): { noStudyDays: number; noGymDays: number } {
    return {
      noStudyDays: this.day.log.filter((r) => r.study === 0).length,
      noGymDays: this.day.log.filter((r) => r.gym === 0).length,
    };
  }

  private syncHabits(): void {
    setAvatarHabits(this.habits());
  }

  load(): boolean {
    const d = SaveSystem.load();
    if (!d) return false;
    this.stats = new StatsManager(d.stats);
    this.day = d.day;
    this.badges = d.badges;
    this.seenQuestions = new Set(d.seenQuestions);
    this.gymVisits = d.gymVisits;
    this.athensVisits = d.athensVisits;
    this.comboCount = d.comboCount;
    this.totalGym = d.totalGym;
    this.totalStudy = d.totalStudy;
    this.phase = d.phase;
    this.newGamePlus = d.newGamePlus;
    this.bossAttempts = d.bossAttempts ?? 0;
    this.syncHabits();
    return true;
  }

  save(): void {
    const data: SaveData = {
      version: 1,
      stats: this.stats.stats,
      day: this.day,
      badges: this.badges,
      seenQuestions: [...this.seenQuestions],
      gymVisits: this.gymVisits,
      athensVisits: this.athensVisits,
      comboCount: this.comboCount,
      totalGym: this.totalGym,
      totalStudy: this.totalStudy,
      phase: this.phase,
      newGamePlus: this.newGamePlus,
      bossAttempts: this.bossAttempts,
    };
    SaveSystem.save(data);
  }

  hasSave(): boolean {
    return SaveSystem.exists();
  }

  // ─────────── DayManager ───────────
  get pointsLeft(): number {
    return this.day.pointsLeft;
  }

  canSpend(): boolean {
    return this.day.pointsLeft > 0;
  }

  /** Tiêu 1 điểm đầu ngày cho gym hoặc học. Trả false nếu hết điểm. */
  spend(kind: 'gym' | 'study'): boolean {
    if (this.day.pointsLeft <= 0) return false;
    this.day.pointsLeft -= 1;
    if (kind === 'gym') {
      this.day.gymToday += 1;
      this.totalGym += 1;
    } else {
      this.day.studyToday += 1;
      this.totalStudy += 1;
    }
    this.save();
    return true;
  }

  /** Chỉ được sang ngày khi điểm = 0 (luật bắt buộc tiêu hết). */
  canEndDay(): boolean {
    return this.day.pointsLeft === 0;
  }

  /**
   * Chốt ngày: ghi nhật ký, cập nhật huy hiệu, chuyển ngày kế hoặc sang boss.
   * Không học cả ngày → "đầu nhỏ lại": mỗi khối kiến thức −1 (trả về danh sách khối bị trừ).
   */
  endDay(): { diary: string; goBoss: boolean; forgot: KnowledgeKey[] } {
    const d = this.day;
    const forgot: KnowledgeKey[] = [];
    if (d.studyToday === 0) {
      for (const k of KNOWLEDGE_KEYS) {
        if (this.stats.knowledge(k) > 0) {
          this.stats.addKnowledge(k, -1);
          forgot.push(k);
        }
      }
    }
    const diary = dayDiary(d.currentDay, d.gymToday, d.studyToday, d.weather);
    d.log.push({ day: d.currentDay, gym: d.gymToday, study: d.studyToday, diary });
    this.syncHabits();
    this.updateBadges();
    const goBoss = d.currentDay >= BALANCE.totalDays;
    if (goBoss) {
      this.phase = 'boss';
    } else {
      const log = d.log;
      this.day = { ...freshDay(d.currentDay + 1), log };
    }
    this.save();
    return { diary, goBoss, forgot };
  }

  isLastDay(): boolean {
    return this.day.currentDay >= BALANCE.totalDays;
  }

  private updateBadges(): void {
    // Cân bằng tuyệt đối: |gym - học| <= 2 trong TẤT CẢ các ngày đã qua
    const balanced = this.day.log.every((r) => Math.abs(r.gym - r.study) <= 2);
    if (this.day.log.length >= BALANCE.totalDays) this.badges.balanced = balanced;
    if (this.totalStudy >= 30) this.badges.scholar = true;
    if (this.totalGym >= 30) this.badges.athlete = true;
  }

  // ─────────── Gym combo ───────────
  /** Gọi khi hoàn thành 1 lượt tập có combo. Trả true nếu vừa nhận +1 điểm phụ trội. */
  registerCombo(): boolean {
    this.comboCount += 1;
    return this.comboCount % BALANCE.combosPerBonus === 0;
  }

  markSeen(ids: string[]): void {
    ids.forEach((id) => this.seenQuestions.add(id));
  }
}

export const game = new GameStateImpl();
