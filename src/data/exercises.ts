import { BALANCE } from './balance';
import type { ExerciseConfig, ExerciseMode, PhysicalKey } from './types';

/** Mô tả từng cơ chế chơi — dùng cho nhãn máy tập, modal chọn bài và hướng dẫn trong màn tập */
export const MODE_INFO: Record<ExerciseMode, { short: string; howto: string; button: string }> = {
  mash: {
    short: '[bấm liên tục]',
    howto: 'Bấm SPACE / chạm liên tục — đủ số lần trong thời gian cho phép = 1 rep. Càng nhanh càng PERFECT!',
    button: 'BẤM LIÊN TỤC!',
  },
  timing: {
    short: '[canh thời điểm]',
    howto: 'Con trỏ chạy qua lại trên thanh tạ — bấm SPACE / chạm khi con trỏ vào vùng XANH ở giữa!',
    button: 'BẤM!',
  },
  hold: {
    short: '[giữ & thả]',
    howto: 'GIỮ SPACE / giữ nút để kéo thanh — THẢ ra khi thanh kéo vào vùng XANH. Giữ quá lâu = hỏng form!',
    button: 'GIỮ ĐỂ KÉO',
  },
  alternate: {
    short: '[luân phiên trái/phải]',
    howto: 'Bấm luân phiên TRÁI (A / ←) và PHẢI (D / →) đúng thứ tự. Bấm sai tay = mất nhịp!',
    button: 'TRÁI · PHẢI',
  },
  rhythm: {
    short: '[đúng nhịp]',
    howto: 'Nốt chạy từ phải sang — bấm SPACE / chạm đúng lúc nốt chạm VẠCH. Mỗi nốt = 1 rep.',
    button: 'BẤM ĐÚNG NHỊP!',
  },
  sequence: {
    short: '[chuỗi mũi tên]',
    howto: 'Bấm đúng chuỗi mũi tên hiển thị (phím mũi tên / WASD) trước khi hết giờ. Bấm sai = làm lại chuỗi!',
    button: '↑ ↓ ← →',
  },
};

/** Cấu hình 6 bài tập tại WheyStation — mỗi bài một cơ chế chơi riêng */
export const EXERCISES: Record<PhysicalKey, ExerciseConfig> = {
  nguc: {
    id: 'pecfly',
    muscleGroup: 'nguc',
    name: 'Pec Fly',
    label: 'Ngực',
    mode: 'mash',
    videoPath: '/videos/nguc.mp4',
    posterPath: '/videos/nguc.jpg',
    repsRequired: BALANCE.repsPerWorkout,
    repWindowMs: 4000,
    mashPerRep: 8,
  },
  vai: {
    id: 'shoulderpress',
    muscleGroup: 'vai',
    name: 'Shoulder Press',
    label: 'Vai',
    mode: 'timing',
    videoPath: '/videos/vai.mp4',
    posterPath: '/videos/vai.jpg',
    repsRequired: BALANCE.repsPerWorkout,
    timingSpeed: 0.7,
  },
  lung: {
    id: 'latpullback',
    muscleGroup: 'lung',
    name: 'Lat Pull Back',
    label: 'Lưng',
    mode: 'hold',
    videoPath: '/videos/lung.mp4',
    posterPath: '/videos/lung.jpg',
    repsRequired: BALANCE.repsPerWorkout,
    holdMs: 1500,
  },
  tay: {
    id: 'bicepcurl',
    muscleGroup: 'tay',
    name: 'Bicep Curl',
    label: 'Tay',
    mode: 'alternate',
    videoPath: '/videos/tay.mp4',
    posterPath: '/videos/tay.jpg',
    repsRequired: BALANCE.repsPerWorkout,
    repWindowMs: 4000,
    altPerRep: 6,
  },
  bung: {
    id: 'crunch',
    muscleGroup: 'bung',
    name: 'Crunch',
    label: 'Bụng',
    mode: 'rhythm',
    videoPath: '/videos/bung.mp4',
    posterPath: '/videos/bung.jpg',
    repsRequired: BALANCE.repsPerWorkout,
    beatMs: 900,
    travelMs: 1800,
  },
  chan: {
    id: 'legpress',
    muscleGroup: 'chan',
    name: 'Leg Press',
    label: 'Chân',
    mode: 'sequence',
    videoPath: '/videos/chan.mp4',
    posterPath: '/videos/chan.jpg',
    repsRequired: BALANCE.repsPerWorkout,
    repWindowMs: 5000,
    seqLen: 4,
  },
};
