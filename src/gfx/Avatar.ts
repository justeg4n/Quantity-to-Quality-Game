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

const SKIN = 0xf1c27d;
const SKIN_D = 0xc68642;
const HAIR = 0x2b1d0e;
const TANK = 0x1d3557;
const SHORTS = 0x222b45;
const SHOE = 0x111111;
const EYE = 0x222222;

export const AV_W = 40; // đơn vị
export const AV_H = 42;

/** Mức phát triển cơ 0..3 theo điểm khả năng */
export function muscleLevel(stat: number): number {
  return Math.min(3, Math.floor(stat / 2));
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

export function avatarKey(stats: PlayerStats, pose: Pose): string {
  const p = stats.physical;
  const l = [p.nguc, p.vai, p.lung, p.tay, p.bung, p.chan].map(muscleLevel).join('');
  return `av-${pose}-${l}`;
}

/** Đảm bảo texture avatar tồn tại; trả về key. u = kích thước 1 pixel-art (px). */
export function ensureAvatar(scene: Phaser.Scene, stats: PlayerStats, pose: Pose, u = 4): string {
  const key = avatarKey(stats, pose) + `-u${u}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  drawAvatar(g, stats, pose, u);
  g.generateTexture(key, AV_W * u, AV_H * u);
  g.destroy();
  return key;
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
export function drawAvatar(g: Phaser.GameObjects.Graphics, stats: PlayerStats, pose: Pose, u = 4): void {
  const p = stats.physical;
  const L = {
    nguc: muscleLevel(p.nguc),
    vai: muscleLevel(p.vai),
    lung: muscleLevel(p.lung),
    tay: muscleLevel(p.tay),
    bung: muscleLevel(p.bung),
    chan: muscleLevel(p.chan),
  };
  const def = POSES[pose];
  const cx = AV_W / 2;
  const squat = def.squat ?? 0;
  const lean = def.lean ?? 0;

  if (def.lying) {
    drawLying(g, L, def, u);
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
  const headY = neckY - 8;

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
  // múi bụng
  for (let i = 0; i < L.bung; i++) {
    px(g, 0x274c77, cx - 3, torsoTop + 5 + i * 2, 2, 1, u);
    px(g, 0x274c77, cx + 1, torsoTop + 5 + i * 2, 2, 1, u);
  }
  // viền áo (dây tank top)
  px(g, SKIN, cx - shoulderW / 2 + 2, torsoTop, 1, 1, u);
  px(g, SKIN, cx + shoulderW / 2 - 3, torsoTop, 1, 1, u);

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
    }
    // bàn tay
    px(g, SKIN_D, s[0] + a.hand[0] - 1, s[1] + a.hand[1] - 1, 2, 2, u);
  };
  drawArm(shoulderR, armR);
  drawArm(shoulderL, armL);

  // ─── Cổ, đầu ───
  px(g, SKIN, cx - 1, neckY, 2 + Math.min(L.vai, 1), 2, u);
  px(g, SKIN, cx - 4, headY, 8, 8, u);
  px(g, HAIR, cx - 4, headY - 1, 8, 3, u);
  px(g, HAIR, cx - 5, headY, 1, 3, u);
  px(g, HAIR, cx + 4, headY, 1, 3, u);
  // mắt
  const tiredEyes = pose === 'tired';
  px(g, EYE, cx - 3, headY + 4, 1, tiredEyes ? 1 : 2, u);
  px(g, EYE, cx + 2, headY + 4, 1, tiredEyes ? 1 : 2, u);
  // miệng
  if (pose === 'happy' || pose === 'flex') {
    px(g, 0x8b3a3a, cx - 2, headY + 6, 4, 1, u);
    px(g, 0x8b3a3a, cx - 3, headY + 5, 1, 1, u);
    px(g, 0x8b3a3a, cx + 2, headY + 5, 1, 1, u);
  } else if (tiredEyes) {
    px(g, 0x8b3a3a, cx - 1, headY + 6, 2, 1, u);
  } else {
    px(g, 0x8b3a3a, cx - 1, headY + 6, 3, 1, u);
  }
}

/** Tư thế push-up: thân nằm ngang (side view đơn giản) */
function drawLying(g: Phaser.GameObjects.Graphics, L: Record<string, number>, def: PoseDef, u: number): void {
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
  // đầu (bên phải)
  px(g, SKIN, x1, bodyY - 3, 7, 7, u);
  px(g, HAIR, x1, bodyY - 4, 7, 2, u);
  px(g, EYE, x1 + 5, bodyY - 1, 1, 2, u);
  // tay chống xuống đất
  const armT = 2 + L.tay;
  const sx = x1 - 3;
  const sy = bodyY + bodyT - 1;
  seg(g, SKIN, sx, sy, sx + def.arm.elbow[0], sy + def.arm.elbow[1], armT, u);
  seg(g, SKIN, sx + def.arm.elbow[0], sy + def.arm.elbow[1], sx + def.arm.hand[0], groundY - 1, 2 + Math.ceil(L.tay / 2), u);
  px(g, SKIN_D, sx + def.arm.hand[0] - 1, groundY - 2, 4, 2, u);
}
