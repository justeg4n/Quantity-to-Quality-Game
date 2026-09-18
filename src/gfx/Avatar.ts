import Phaser from 'phaser';
import type { PlayerStats } from '../data/types';
import { px } from './Pixel';

export type Pose =
  | 'idle'
  | 'walk1'
  | 'walk2'
  | 'flex'
  | 'happy'
  | 'tired'
  | 'nguc_a'
  | 'nguc_b'
  | 'vai_a'
  | 'vai_b'
  | 'lung_a'
  | 'lung_b'
  | 'tay_a'
  | 'tay_b'
  | 'bung_a'
  | 'bung_b'
  | 'chan_a'
  | 'chan_b'
  | 'pushup_a'
  | 'pushup_b';

const SKIN_LIGHT = 0xf1c27d;
const SKIN_LIGHT_D = 0xc68642;
// da dầu bóng kiểu vận động viên thể hình (tập gym >= 30 điểm)
const TAN = 0x7a3f16;
const TAN_D = 0x4e260c;
const TAN_SHINE = 0xd28a3c;
const HALO = 0xffe680;
const HAIR = 0x2b1d0e;
const HAIR_GRAY = 0xd8d8d8; // tóc bạc của học giả
const GLASS = 0x5b6b7a; // gọng kính kim loại — nhạt hơn tóc/mắt để không giống kính râm
const BOOK_COVER = 0x7a3b2e;
const BOOK_COVER2 = 0x2f4a7a;
const BOOK_PAGE = 0xf6ecd9;
const BOOK_RIBBON = 0xe0b04a;
const TANK = 0x1d3557;
const SHORTS = 0x222b45;
const SHOE = 0x111111;
const EYE = 0x222222;

export const AV_W = 40; // đơn vị
export const AV_H = 42;

/** Mức phát triển cơ 0..3 theo điểm khả năng, xẹp 1 mức mỗi ngày bỏ tập (chỉ ngoại hình) */
export function muscleLevel(stat: number, habits: Habits = currentHabits): number {
  return Math.max(0, Math.min(3, Math.floor(stat / 2)) - habits.noGymDays);
}

/**
 * Thói quen rèn luyện — số ngày đã qua KHÔNG học / KHÔNG tập. Ảnh hưởng ngoại hình:
 * mỗi ngày bỏ học đầu nhỏ đi 1 cỡ (học bù ngày cuối không kéo lại được), >= 2 ngày → mặt đờ đẫn (mắt lệch, há miệng, chảy dãi);
 * mỗi ngày bỏ tập cơ xẹp 1 mức, >= 2 ngày → bụng phệ. Chỉ khi học và tập đều thì cơ thể mới cân đối.
 */
export interface Habits {
  noStudyDays: number;
  noGymDays: number;
}

let currentHabits: Habits = { noStudyDays: 0, noGymDays: 0 };

/** GameState gọi mỗi khi nhật ký ngày thay đổi (load / newGame / endDay) */
export function setAvatarHabits(h: Habits): void {
  currentHabits = { ...h };
}

/** Tổng điểm kiến thức */
export function totalKnowledge(stats: PlayerStats): number {
  return Object.values(stats.knowledge).reduce((s, v) => s + v, 0);
}

/** Ngưỡng "học giả": đeo kính từ 10 điểm kiến thức, tóc bạc từ 16 */
export const SCHOLAR = { book: 6, glasses: 10, grayHair: 16, sage: 30 };
/** Ngưỡng thể chất: da dầu bóng kiểu thể hình từ 30 điểm gym */
export const ATHLETE = { tan: 30 };

export function totalPhysical(stats: PlayerStats): number {
  return Object.values(stats.physical).reduce((s, v) => s + v, 0);
}

/** Mức sách mang theo 0..3 theo tổng kiến thức: càng học nhiều càng giống giáo sư */
export function bookTier(know: number): 0 | 1 | 2 | 3 {
  if (know >= SCHOLAR.grayHair) return 3;
  if (know >= SCHOLAR.glasses) return 2;
  if (know >= SCHOLAR.book) return 1;
  return 0;
}

/** Cỡ đầu (đơn vị pixel-art): 6 (rỗng) → 12 (uyên bác, +1 mỗi 3 điểm kiến thức), trừ 1 cỡ mỗi ngày bỏ học, tối thiểu 5. */
export function headSize(stats: PlayerStats, habits: Habits = currentHabits): number {
  return Math.max(5, 6 + Math.min(6, Math.floor(totalKnowledge(stats) / 3)) - habits.noStudyDays);
}

/** Mặt đờ đẫn khi bỏ học >= 2 ngày */
export function isDerp(habits: Habits = currentHabits): boolean {
  return habits.noStudyDays >= 2;
}

export interface ArmPose {
  elbow: [number, number];
  hand: [number, number];
}

interface PoseDef {
  arm: ArmPose; // cánh tay phải (trái lấy đối xứng)
  armL?: ArmPose; // override cánh tay trái nếu bất đối xứng
  squat?: number; // hạ thân xuống n đơn vị, chân co
  legOffset?: [number, number]; // lệch chân trái/phải (walk)
  lean?: number; // nghiêng thân (crunch)
  lying?: boolean; // tư thế push-up (nằm ngang)
}

const POSES: Record<Pose, PoseDef> = {
  idle: { arm: { elbow: [1, 5], hand: [1, 10] } },
  walk1: { arm: { elbow: [2, 5], hand: [3, 9] }, legOffset: [-1, 1] },
  walk2: { arm: { elbow: [0, 5], hand: [-1, 9] }, legOffset: [1, -1] },
  flex: { arm: { elbow: [6, -1], hand: [3, -6] } },
  happy: { arm: { elbow: [5, -4], hand: [7, -10] } },
  tired: { arm: { elbow: [2, 6], hand: [1, 11] }, squat: 1 },
  nguc_a: { arm: { elbow: [7, 0], hand: [12, -3] } },
  nguc_b: { arm: { elbow: [5, 0], hand: [2, -3] } },
  vai_a: { arm: { elbow: [5, 1], hand: [4, -4] } },
  vai_b: { arm: { elbow: [4, -5], hand: [4, -11] } },
  lung_a: { arm: { elbow: [4, -5], hand: [5, -11] } },
  lung_b: { arm: { elbow: [5, 2], hand: [4, -2] } },
  tay_a: { arm: { elbow: [1, 5], hand: [1, 10] } },
  tay_b: { arm: { elbow: [1, 5], hand: [3, 1] } },
  bung_a: { arm: { elbow: [5, -2], hand: [1, -4] } },
  bung_b: { arm: { elbow: [5, -1], hand: [1, -3] }, squat: 2, lean: 2 },
  chan_a: { arm: { elbow: [4, 2], hand: [8, 1] }, squat: 4 },
  chan_b: { arm: { elbow: [4, 2], hand: [8, 1] } },
  pushup_a: { arm: { elbow: [3, 4], hand: [3, 8] }, lying: true },
  pushup_b: { arm: { elbow: [2, 2], hand: [3, 4] }, lying: true, squat: 3 },
};

export function avatarKey(stats: PlayerStats, pose: Pose, habits: Habits = currentHabits): string {
  const p = stats.physical;
  const l = [p.nguc, p.vai, p.lung, p.tay, p.bung, p.chan].map((v) => muscleLevel(v, habits)).join('');
  const k = totalKnowledge(stats);
  return `av-${pose}-${l}-h${headSize(stats, habits)}${isDerp(habits) ? 'd' : ''}${habits.noGymDays >= 2 ? 'belly' : ''}${k >= SCHOLAR.glasses ? 'g' : ''}${k >= SCHOLAR.grayHair ? 's' : ''}${k >= SCHOLAR.sage ? 'a' : ''}${totalPhysical(stats) >= ATHLETE.tan ? 't' : ''}-bk${bookTier(k)}`;
}

/** Đảm bảo texture avatar tồn tại; trả về key. u = kích thước 1 pixel-art (px). `habits` mặc định = thói quen của người chơi. */
export function ensureAvatar(scene: Phaser.Scene, stats: PlayerStats, pose: Pose, u = 4, habits: Habits = currentHabits): string {
  const key = avatarKey(stats, pose, habits) + `-u${u}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  drawAvatar(g, stats, pose, u, habits);
  g.generateTexture(key, AV_W * u, AV_H * u);
  g.destroy();
  return key;
}

/** Sách cầm tay: tier 1 = 1 cuốn đóng gáy, 2 = lộ trang giấy, 3 = 2 cuốn xếp chồng + dây đánh dấu */
function drawBook(g: Phaser.GameObjects.Graphics, hx: number, hy: number, tier: number, u: number): void {
  if (tier >= 3) {
    px(g, BOOK_COVER2, hx - 1, hy - 1, 3, 2, u);
    px(g, BOOK_COVER, hx, hy + 1, 3, 2, u);
    px(g, BOOK_PAGE, hx + 2, hy + 1, 1, 2, u);
    px(g, BOOK_RIBBON, hx + 1, hy + 3, 1, 2, u);
  } else if (tier === 2) {
    px(g, BOOK_COVER, hx, hy, 3, 3, u);
    px(g, BOOK_PAGE, hx + 3, hy, 1, 3, u);
  } else {
    px(g, BOOK_COVER, hx, hy, 3, 3, u);
  }
}

function seg(g: Phaser.GameObjects.Graphics, color: number, x0: number, y0: number, x1: number, y1: number, t: number, u: number): void {
  const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    px(g, color, Math.round(x - t / 2), Math.round(y - t / 2), t, t, u);
  }
}

/** Vẽ nhân vật (front view) vào Graphics theo đơn vị u. Gốc toạ độ: góc trên-trái của khung AV_W x AV_H. */
export function drawAvatar(g: Phaser.GameObjects.Graphics, stats: PlayerStats, pose: Pose, u = 4, habits: Habits = currentHabits): void {
  const p = stats.physical;
  const L = {
    nguc: muscleLevel(p.nguc, habits),
    vai: muscleLevel(p.vai, habits),
    lung: muscleLevel(p.lung, habits),
    tay: muscleLevel(p.tay, habits),
    bung: muscleLevel(p.bung, habits),
    chan: muscleLevel(p.chan, habits),
  };
  const derp = isDerp(habits);
  const belly = habits.noGymDays >= 2;
  const know = totalKnowledge(stats);
  const glasses = know >= SCHOLAR.glasses && !derp;
  const hairColor = know >= SCHOLAR.grayHair ? HAIR_GRAY : HAIR;
  const sage = know >= SCHOLAR.sage; // râu bạc + vòng thiên thần
  const tanned = totalPhysical(stats) >= ATHLETE.tan;
  const SKIN = tanned ? TAN : SKIN_LIGHT;
  const SKIN_D = tanned ? TAN_D : SKIN_LIGHT_D;
  const def = POSES[pose];
  const cx = AV_W / 2;
  const squat = def.squat ?? 0;
  const lean = def.lean ?? 0;

  const hs = headSize(stats, habits);
  if (def.lying) {
    drawLying(g, L, def, u, hs, hairColor, SKIN, SKIN_D);
    return;
  }

  // ─── Kích thước ───
  const shoulderW = 10 + L.vai * 2 + L.nguc; // bề ngang vai/ngực
  const latW = 8 + L.lung * 2 + Math.min(L.nguc, 1); // bề ngang lưng/xô
  const waistW = 8;
  const armT = 2 + L.tay; // độ dày bắp tay
  const foreT = 2 + Math.ceil(L.tay / 2);
  const legW = 3 + L.chan;
  const legH = 11 - squat;

  const groundY = AV_H - 1;
  const hipY = groundY - legH; // đỉnh chân
  const torsoH = 12;
  const torsoTop = hipY - torsoH + lean;
  const neckY = torsoTop - 2;

  // ─── Chân ───
  const lo = def.legOffset ?? [0, 0];
  const legGap = 1;
  const legLX = cx - legGap - legW;
  const legRX = cx + legGap;
  const legSpread = squat > 0 ? 2 : 0;
  // đùi (quần short) + cẳng chân
  px(g, SHORTS, legLX - legSpread, hipY, legW + legSpread, 4, u);
  px(g, SHORTS, legRX, hipY, legW + legSpread, 4, u);
  px(g, SKIN, legLX - legSpread + lo[0] * 0, hipY + 4 + lo[0], legW, legH - 4 - lo[0], u);
  px(g, SKIN, legRX + legSpread, hipY + 4 + lo[1], legW, legH - 4 - lo[1], u);
  // bắp chân nổi
  if (L.chan >= 2) {
    px(g, SKIN_D, legLX - legSpread, hipY + 6, 1, 3, u);
    px(g, SKIN_D, legRX + legSpread + legW - 1, hipY + 6, 1, 3, u);
  }
  // giày
  px(g, SHOE, legLX - legSpread - 1, groundY - 1, legW + 2, 2, u);
  px(g, SHOE, legRX + legSpread - 1, groundY - 1, legW + 2, 2, u);

  // ─── Thân ───
  // ngực/vai (4 hàng trên)
  px(g, TANK, cx - shoulderW / 2, torsoTop, shoulderW, 4, u);
  // vai nổi (deltoid) 2 bên
  if (L.vai >= 1) {
    px(g, SKIN, cx - shoulderW / 2 - 1, torsoTop, 2, 2 + L.vai, u);
    px(g, SKIN, cx + shoulderW / 2 - 1, torsoTop, 2, 2 + L.vai, u);
  }
  // ngực (pec) nổi
  if (L.nguc >= 1) {
    const pw = 2 + L.nguc;
    px(g, 0x274c77, cx - pw - 1, torsoTop + 1, pw, 2 + Math.min(L.nguc, 2), u);
    px(g, 0x274c77, cx + 1, torsoTop + 1, pw, 2 + Math.min(L.nguc, 2), u);
  }
  // xô/lưng (4 hàng giữa) — hình chữ V
  px(g, TANK, cx - latW / 2, torsoTop + 4, latW, 4, u);
  // bụng/eo (4 hàng dưới)
  px(g, TANK, cx - waistW / 2, torsoTop + 8, waistW, 4, u);
  // bụng phệ khi bỏ tập nhiều ngày
  if (belly) {
    px(g, TANK, cx - waistW / 2 - 2, torsoTop + 7, waistW + 4, 5, u);
    px(g, 0x162a4a, cx - waistW / 2 - 2, torsoTop + 11, waistW + 4, 1, u);
  }
  // múi bụng
  for (let i = 0; i < L.bung; i++) {
    px(g, 0x274c77, cx - 3, torsoTop + 5 + i * 2, 2, 1, u);
    px(g, 0x274c77, cx + 1, torsoTop + 5 + i * 2, 2, 1, u);
  }
  // viền áo (dây tank top)
  px(g, SKIN, cx - shoulderW / 2 + 2, torsoTop, 1, 1, u);
  px(g, SKIN, cx + shoulderW / 2 - 3, torsoTop, 1, 1, u);
  // ánh dầu bóng trên vai khi da thể hình
  if (tanned && L.vai >= 1) {
    px(g, TAN_SHINE, cx - shoulderW / 2 - 1, torsoTop, 1, 1, u);
    px(g, TAN_SHINE, cx + shoulderW / 2 - 1, torsoTop, 1, 1, u);
  }

  // ─── Tay ───
  const shoulderR: [number, number] = [cx + shoulderW / 2, torsoTop + 1];
  const shoulderL: [number, number] = [cx - shoulderW / 2, torsoTop + 1];
  const armR = def.arm;
  const armL = def.armL ?? { elbow: [-armR.elbow[0], armR.elbow[1]], hand: [-armR.hand[0], armR.hand[1]] };
  const drawArm = (s: [number, number], a: ArmPose) => {
    seg(g, SKIN, s[0], s[1], s[0] + a.elbow[0], s[1] + a.elbow[1], armT, u);
    seg(g, SKIN, s[0] + a.elbow[0], s[1] + a.elbow[1], s[0] + a.hand[0], s[1] + a.hand[1], foreT, u);
    // bắp tay nổi khi flex/curl
    if (L.tay >= 2 && a.hand[1] < a.elbow[1]) {
      px(g, SKIN_D, s[0] + a.elbow[0] / 2 - 1, s[1] + a.elbow[1] / 2 - 1, 2, 2, u);
      if (tanned) px(g, TAN_SHINE, s[0] + a.elbow[0] / 2 - 1, s[1] + a.elbow[1] / 2 - 2, 1, 1, u);
    }
    // bàn tay
    px(g, SKIN_D, s[0] + a.hand[0] - 1, s[1] + a.hand[1] - 1, 2, 2, u);
  };
  drawArm(shoulderR, armR);
  drawArm(shoulderL, armL);

  // ─── Sách trên tay — càng học nhiều càng giống giáo sư (chỉ ở tư thế đời thường) ───
  const calmPose = pose === 'idle' || pose === 'walk1' || pose === 'walk2' || pose === 'flex' || pose === 'happy' || pose === 'tired';
  if (calmPose) {
    const tier = bookTier(know);
    if (tier > 0) {
      drawBook(g, shoulderL[0] + armL.hand[0] - 1, shoulderL[1] + armL.hand[1] - 1, tier, u);
    }
  }

  // ─── Cổ, đầu ───
  px(g, SKIN, cx - 1, neckY, 2 + Math.min(L.vai, 1), 2, u);
  // đầu: cỡ theo kiến thức, neo ở cổ (đầu nhỏ thì ngắn hơn, không "lơ lửng")
  const hx = cx - Math.floor(hs / 2);
  const hy = neckY - hs;
  px(g, SKIN, hx, hy, hs, hs, u);
  const hairH = hs >= 7 ? 3 : 2; // đầu nhỏ thì tóc mỏng để còn chỗ cho mặt
  px(g, hairColor, hx, hy - 1, hs, hairH, u);
  px(g, hairColor, hx - 1, hy, 1, hairH, u);
  px(g, hairColor, hx + hs, hy, 1, hairH, u);
  // vòng thiên thần của bậc hiền triết (kiến thức >= 30)
  if (sage && hy >= 4) {
    px(g, HALO, hx + 1, hy - 4, hs - 2, 1, u);
    px(g, HALO, hx, hy - 3, 1, 1, u);
    px(g, HALO, hx + hs - 1, hy - 3, 1, 1, u);
    px(g, HALO, hx + 1, hy - 2, hs - 2, 1, u);
  }
  // mắt
  const tiredEyes = pose === 'tired';
  const eyeY = hs >= 7 ? hy + Math.floor(hs / 2) : hy + hairH - 1;
  const pad = hs >= 7 ? 1 : 0;
  if (derp) {
    // mắt lòe: tròng trắng to, con ngươi mỗi bên lệch một hướng
    px(g, 0xffffff, hx + pad, eyeY, 2, 2, u);
    px(g, EYE, hx + pad + 1, eyeY, 1, 1, u);
    px(g, 0xffffff, hx + hs - 2 - pad, eyeY, 2, 2, u);
    px(g, EYE, hx + hs - 2 - pad, eyeY + 1, 1, 1, u);
  } else {
    px(g, EYE, hx + 1, eyeY, 1, tiredEyes ? 1 : 2, u);
    px(g, EYE, hx + hs - 2, eyeY, 1, tiredEyes ? 1 : 2, u);
    if (glasses && hs >= 7) {
      // kính cận mỏng (không phải kính râm): chỉ viền trên/dưới hở + cầu kính, mắt vẫn lộ rõ ở giữa
      const eyeH = tiredEyes ? 1 : 2;
      for (const gx of [hx, hx + hs - 3]) {
        px(g, GLASS, gx, eyeY - 1, 3, 1, u); // viền trên
        px(g, GLASS, gx, eyeY + eyeH, 3, 1, u); // viền dưới
      }
      px(g, GLASS, hx + 3, eyeY, hs - 6, 1, u); // cầu kính giữa 2 mắt
    }
  }
  // miệng
  const mouthY = Math.max(eyeY + 2, hy + hs - 2);
  if (derp) {
    // há miệng, chảy dãi
    px(g, 0x5a1e1e, cx - 1, mouthY, 3, 1, u);
    px(g, 0x9ad0ec, cx + 1, mouthY + 1, 1, 3, u);
  } else if (pose === 'happy' || pose === 'flex') {
    px(g, 0x8b3a3a, cx - 2, mouthY, 4, 1, u);
    px(g, 0x8b3a3a, cx - 3, mouthY - 1, 1, 1, u);
    px(g, 0x8b3a3a, cx + 2, mouthY - 1, 1, 1, u);
  } else if (tiredEyes) {
    px(g, 0x8b3a3a, cx - 1, mouthY, 2, 1, u);
  } else {
    px(g, 0x8b3a3a, cx - 1, mouthY, 3, 1, u);
  }
  // râu bạc dài dưới cằm (kiến thức >= 30) — chừa miệng
  if (sage && !derp) {
    const beardTop = mouthY + 1;
    const chin = hy + hs;
    px(g, HAIR_GRAY, cx - 3, beardTop, 6, Math.max(1, chin - beardTop), u);
    px(g, HAIR_GRAY, cx - 2, chin, 4, 2, u);
    px(g, HAIR_GRAY, cx - 1, chin + 2, 2, 1, u);
    // ria hai bên mép
    px(g, HAIR_GRAY, cx - 3, mouthY, 1, 1, u);
    px(g, HAIR_GRAY, cx + 2, mouthY, 1, 1, u);
  }
}

/** Tư thế push-up: thân nằm ngang (side view đơn giản) */
function drawLying(g: Phaser.GameObjects.Graphics, L: Record<string, number>, def: PoseDef, u: number, hs: number, hairColor: number, SKIN: number, SKIN_D: number): void {
  const squat = def.squat ?? 0; // 0 = tay duỗi (cao), 3 = hạ thấp
  const groundY = AV_H - 2;
  const bodyT = 5 + Math.min(L.nguc, 2); // độ dày thân
  const bodyY = groundY - 10 + squat - bodyT; // càng squat càng thấp
  const x0 = 6;
  const x1 = AV_W - 8;
  // thân
  px(g, TANK, x0 + 6, bodyY, x1 - x0 - 6, bodyT, u);
  px(g, SHORTS, x0, bodyY + 1, 7, bodyT - 1, u);
  // chân duỗi ra sau (bên trái) + giày
  px(g, SKIN, x0 - 4, bodyY + 2, 5, 3 + Math.min(L.chan, 1), u);
  px(g, SHOE, x0 - 6, bodyY + 3, 3, 3, u);
  // đầu (bên phải), cỡ theo kiến thức
  const hh = hs - 1;
  px(g, SKIN, x1, bodyY + 4 - hh, hh, hh, u);
  px(g, hairColor, x1, bodyY + 3 - hh, hh, 2, u);
  px(g, EYE, x1 + hh - 2, bodyY + 1 - Math.floor(hh / 3), 1, 2, u);
  // tay chống xuống đất
  const armT = 2 + L.tay;
  const sx = x1 - 3;
  const sy = bodyY + bodyT - 1;
  seg(g, SKIN, sx, sy, sx + def.arm.elbow[0], sy + def.arm.elbow[1], armT, u);
  seg(g, SKIN, sx + def.arm.elbow[0], sy + def.arm.elbow[1], sx + def.arm.hand[0], groundY - 1, 2 + Math.ceil(L.tay / 2), u);
  px(g, SKIN_D, sx + def.arm.hand[0] - 1, groundY - 2, 4, 2, u);
}
