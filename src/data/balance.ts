import type { KnowledgeKey, PhysicalKey } from './types';

/**
 * CÂN BẰNG LÕI — chỉ đổi khi luật chơi đổi.
 * 4 ngày × 10 điểm = 40 điểm.
 *
 * Phase 3 (Phủ định của phủ định) yêu cầu 3 bài × 2 lần:
 *   Ngực>=2, Vai>=2, Lưng>=2, Chân>=2, Bụng>=2, Tay>=4  (14 điểm Gym)
 *   Mỗi khối kiến thức >= 2                             (12 điểm Học)
 * Hai phase đầu (thứ tự & bài tập ngẫu nhiên) tiêu hao thêm trước khi vào phase cuối (chơi hoàn hảo):
 *   "Lượng đổi":  1 lượt bài tập X (−1 các nhóm cơ của X) + 2 câu hỏi (−1 khối mỗi câu)
 *   "Đấu tranh":  2 cặp, mỗi cặp 1 lượt bài tập Y/Z gồm 3 rep (−1 các nhóm cơ, tính 1 lần cho cả lượt) + 1 câu hỏi
 *   X, Y, Z là 3 bài Push-up / Lat Pull Down / Squat (xáo thứ tự) → cả trận dùng mỗi bài đúng 1 lần. Mỗi nhóm cơ:
 *   Ngực 3, Vai 3, Lưng 3, Chân 3, Bụng 3, Tay 6 (Tay dùng ở 2 bài) => 21 Gym.
 *   Câu hỏi theo concept phase: "Lượng đổi" hỏi Chất/Lượng/QH L–C (2 câu, ưu tiên khối cao nhất => nhóm này tổng >= 8),
 *   "Đấu tranh" hỏi Độ/Điểm nút (2 câu => nhóm này tổng >= 6), Vận dụng >= 2 => Học 16.
 *   Thất bại/sai trừ thêm 1 ở MỌI nhóm còn lại.
 * Tổng tối thiểu để chắc chắn thắng: 21 Gym + 16 Học = 37 / 40 điểm, còn 3 điểm dự phòng.
 */
export const BALANCE = {
  totalDays: 4,
  pointsPerDay: 10,
  repsPerWorkout: 6,
  questionsPerStudy: 2,
  bossQuestions: 5,
  bossExerciseReps: 2,
  physicalMin: {
    nguc: 2,
    vai: 2,
    lung: 2,
    chan: 2,
    bung: 2,
    tay: 4,
  } as Record<PhysicalKey, number>,
  knowledgeMin: 2,
  /** Bài tập ở Phase 3 và nhóm cơ bị trừ 1 điểm mỗi lần thực hiện */
  bossExercises: [
    { id: 'pushup', name: 'Push-up', muscles: ['nguc', 'vai', 'tay'] as PhysicalKey[] },
    { id: 'latpulldown', name: 'Lat Pull Down', muscles: ['lung', 'tay'] as PhysicalKey[] },
    { id: 'squat', name: 'Squat', muscles: ['chan', 'bung'] as PhysicalKey[] },
  ],
  /** Combo gym: 3 rep Perfect liên tiếp => combo; 2 combo => +1 điểm phụ trội (lượt tập đó nhận +2) */
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
