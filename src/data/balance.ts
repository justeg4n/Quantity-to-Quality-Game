import type { KnowledgeKey, PhysicalKey } from './types';

/**
 * CÂN BẰNG LÕI — KHÔNG TỰ Ý THAY ĐỔI (mục 8–9 của tài liệu thiết kế).
 * Ngưỡng tối thiểu để có thể thắng thử thách cuối cùng:
 *   Ngực>=3, Vai>=3, Lưng>=3, Chân>=3, Bụng>=3, Tay>=6  (21 điểm Gym)
 *   Mỗi khối kiến thức >= 2                             (12 điểm Học)
 *   => 33 / 50 điểm, còn 17 điểm tự do.
 */
export const BALANCE = {
  totalDays: 10,
  pointsPerDay: 5,
  repsPerWorkout: 6,
  questionsPerStudy: 2,
  bossQuestions: 5,
  bossExerciseReps: 3,
  physicalMin: {
    nguc: 3,
    vai: 3,
    lung: 3,
    chan: 3,
    bung: 3,
    tay: 6,
  } as Record<PhysicalKey, number>,
  knowledgeMin: 2,
  /** Bài tập ở pha 3 và nhóm cơ bị trừ 1 điểm mỗi lần thực hiện */
  bossExercises: [
    { id: 'pushup', name: 'Push-up', muscles: ['nguc', 'vai', 'tay'] as PhysicalKey[] },
    { id: 'latpulldown', name: 'Lat Pull Down', muscles: ['lung', 'tay'] as PhysicalKey[] },
    { id: 'squat', name: 'Squat', muscles: ['chan', 'bung'] as PhysicalKey[] },
  ],
  /** Combo gym: 3 rep Perfect liên tiếp => combo; 2 combo => +1 điểm phụ trội */
  combosPerBonus: 2,
  perfectStreakForCombo: 3,
} as const;

export const PHYSICAL_KEYS: PhysicalKey[] = ['nguc', 'vai', 'lung', 'tay', 'bung', 'chan'];
export const KNOWLEDGE_KEYS: KnowledgeKey[] = [
  'chat',
  'luong',
  'quanHeLuongChat',
  'do',
  'diemNutBuocNhay',
  'vanDung',
];

export const PHYSICAL_LABEL: Record<PhysicalKey, string> = {
  nguc: 'Ngực',
  vai: 'Vai',
  lung: 'Lưng',
  tay: 'Tay',
  bung: 'Bụng',
  chan: 'Chân',
};

export const KNOWLEDGE_LABEL: Record<KnowledgeKey, string> = {
  chat: 'Chất',
  luong: 'Lượng',
  quanHeLuongChat: 'Quan hệ Lượng–Chất',
  do: 'Độ',
  diemNutBuocNhay: 'Điểm nút & Bước nhảy',
  vanDung: 'Vận dụng',
};

export const KNOWLEDGE_SHORT: Record<KnowledgeKey, string> = {
  chat: 'Chất',
  luong: 'Lượng',
  quanHeLuongChat: 'QH L–C',
  do: 'Độ',
  diemNutBuocNhay: 'Nút/Nhảy',
  vanDung: 'Vận dụng',
};

export const KNOWLEDGE_DESC: Record<KnowledgeKey, string> = {
  chat: 'Bản chất sự vật, thuộc tính căn bản',
  luong: 'Quy mô, số lượng, trình độ',
  quanHeLuongChat: 'Sự chuyển hoá qua lại giữa lượng và chất',
  do: 'Giới hạn mà lượng đổi chưa làm chất đổi',
  diemNutBuocNhay: 'Thời điểm lượng đổi đủ để nhảy vọt về chất',
  vanDung: 'Áp dụng quy luật vào thực tiễn',
};
