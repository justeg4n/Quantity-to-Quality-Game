export type PhysicalKey = 'nguc' | 'vai' | 'lung' | 'tay' | 'bung' | 'chan';
export type KnowledgeKey = 'chat' | 'luong' | 'quanHeLuongChat' | 'do' | 'diemNutBuocNhay' | 'vanDung';

export interface PlayerStats {
  physical: Record<PhysicalKey, number>;
  knowledge: Record<KnowledgeKey, number>;
}

export interface DayRecord {
  day: number;
  gym: number;
  study: number;
  diary: string;
}

export type Weather = 'sun' | 'rain' | 'wind';

export interface DayState {
  currentDay: number; // 1..totalDays
  pointsLeft: number; // 0..pointsPerDay
  gymToday: number;
  studyToday: number;
  philosopherBadge: boolean; // huy hiệu "Triết gia" tạm thời trong ngày
  weather: Weather;
  log: DayRecord[];
}

/**
 * Mỗi bài tập có một cơ chế chơi riêng:
 * - mash: bấm liên tục đủ số lần trong thời gian cho phép
 * - timing: bấm khi con trỏ chạy vào vùng xanh
 * - hold: giữ phím để kéo, thả ra đúng vùng xanh
 * - alternate: bấm luân phiên TRÁI / PHẢI đúng thứ tự
 * - rhythm: bấm đúng nhịp khi nốt chạm vạch
 * - sequence: bấm đúng chuỗi mũi tên hiển thị
 */
export type ExerciseMode = 'mash' | 'timing' | 'hold' | 'alternate' | 'rhythm' | 'sequence';

export interface ExerciseConfig {
  id: string;
  muscleGroup: PhysicalKey;
  name: string; // tên bài tập
  label: string; // tên nhóm cơ tiếng Việt
  mode: ExerciseMode;
  videoPath: string;
  posterPath: string;
  repsRequired: number;
  /** thời gian cho 1 rep ở mash-mode (ms) */
  repWindowMs?: number;
  /** số lần bấm cần thiết để hoàn thành 1 rep ở mash-mode */
  mashPerRep?: number;
  /** tốc độ con trỏ ở timing-mode (chu kỳ/giây) */
  timingSpeed?: number;
  /** hold-mode: thời gian giữ để thanh kéo đầy (ms) */
  holdMs?: number;
  /** alternate-mode: số lần bấm luân phiên đúng để hoàn thành 1 rep */
  altPerRep?: number;
  /** rhythm-mode: khoảng cách giữa 2 nốt (ms) */
  beatMs?: number;
  /** rhythm-mode: thời gian nốt chạy từ mép tới vạch (ms) */
  travelMs?: number;
  /** sequence-mode: độ dài chuỗi mũi tên của 1 rep */
  seqLen?: number;
}

export interface QuizQuestion {
  id: string;
  category: KnowledgeKey;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** ví dụ liên hệ đến việc tập gym — hiện khi trả lời sai */
  gymExample?: string;
}

export interface Badges {
  balanced: boolean; // Cân bằng tuyệt đối
  scholar: boolean; // Học bá
  athlete: boolean; // Lực sĩ
  champion: boolean; // Vượt qua thử thách cuối
}

export interface SaveData {
  version: number;
  stats: PlayerStats;
  day: DayState;
  badges: Badges;
  seenQuestions: string[];
  gymVisits: number;
  athensVisits: number;
  comboCount: number; // số lần đạt combo gym (2 lần => +1 điểm phụ trội, lượt đó +2)
  totalGym: number;
  totalStudy: number;
  phase: 'training' | 'boss' | 'ended';
  newGamePlus: number;
  bossAttempts: number;
}
