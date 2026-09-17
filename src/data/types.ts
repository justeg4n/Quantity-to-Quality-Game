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
  currentDay: number; // 1..10
  pointsLeft: number; // 0..5
  gymToday: number;
  studyToday: number;
  philosopherBadge: boolean; // huy hiệu "Triết gia" tạm thời trong ngày
  weather: Weather;
  log: DayRecord[];
}

export type ExerciseMode = 'mash' | 'timing';

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
  comboCount: number; // số lần đạt combo gym (2 lần => +1 điểm phụ trội)
  totalGym: number;
  totalStudy: number;
  phase: 'training' | 'boss' | 'ended';
  newGamePlus: number;
  bossAttempts: number;
}
