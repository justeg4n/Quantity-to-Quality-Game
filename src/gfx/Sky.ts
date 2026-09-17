import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { lerpColor } from './Pixel';

/**
 * Bầu trời gradient 4 pha (mục 6): t = 0 bình minh, 0.33 trưa, 0.66 hoàng hôn, 1 đêm.
 * Pha "danger" (t = 2) dùng cho ngày thử thách: trời đỏ.
 */
const STOPS: Array<{ t: number; top: number; bottom: number }> = [
  { t: 0, top: 0xf7a072, bottom: 0xffd6a5 }, // bình minh hồng cam
  { t: 0.33, top: 0x4cc9f0, bottom: 0xbde0fe }, // trưa xanh
  { t: 0.66, top: 0xf3722c, bottom: 0x9b5de5 }, // hoàng hôn cam tím
  { t: 1, top: 0x0b0716, bottom: 0x1a1a4a }, // đêm
];

export function skyColors(t: number): { top: number; bottom: number } {
  if (t >= 2) return { top: 0x4a0000, bottom: 0xb0202a };
  const tt = Phaser.Math.Clamp(t, 0, 1);
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (tt >= a.t && tt <= b.t) {
      const k = (tt - a.t) / (b.t - a.t);
      return { top: lerpColor(a.top, b.top, k), bottom: lerpColor(a.bottom, b.bottom, k) };
    }
  }
  return { top: STOPS[3].top, bottom: STOPS[3].bottom };
}

/** Thời điểm trong ngày theo số điểm còn lại (5 -> bình minh, 0 -> hoàng hôn) */
export function timeFromPoints(pointsLeft: number, pointsPerDay = 5): number {
  return ((pointsPerDay - pointsLeft) / pointsPerDay) * 0.66;
}

export class SkyLayer {
  private g: Phaser.GameObjects.Graphics;
  private stars: Phaser.GameObjects.Image[] = [];
  private sun: Phaser.GameObjects.Image;
  private moon: Phaser.GameObjects.Image;
  t = 0;

  constructor(scene: Phaser.Scene, private horizon = GAME_HEIGHT * 0.62) {
    this.g = scene.add.graphics().setDepth(-100);
    for (let i = 0; i < 60; i++) {
      const s = scene.add
        .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, horizon - 20), 'star')
        .setDepth(-99)
        .setAlpha(0);
      this.stars.push(s);
      scene.tweens.add({ targets: s, alpha: { from: 0.3, to: 1 }, duration: Phaser.Math.Between(600, 1800), yoyo: true, repeat: -1 });
    }
    this.sun = scene.add.image(0, 0, 'sun').setDepth(-98);
    this.moon = scene.add.image(0, 0, 'moon').setDepth(-98);
    this.set(0);
  }

  /** Cập nhật gradient + vị trí mặt trời/trăng theo t (0..1, hoặc 2 = đỏ) */
  set(t: number): void {
    this.t = t;
    const { top, bottom } = skyColors(t);
    this.g.clear();
    // vẽ gradient theo dải ngang để có cảm giác pixel
    const bands = 18;
    const h = this.horizon / bands;
    for (let i = 0; i < bands; i++) {
      this.g.fillStyle(lerpColor(top, bottom, i / (bands - 1)), 1);
      this.g.fillRect(0, i * h, GAME_WIDTH, h + 1);
    }
    // sao: chỉ hiện ban đêm
    const night = t >= 2 ? 0.2 : Phaser.Math.Clamp((t - 0.75) / 0.25, 0, 1);
    this.stars.forEach((s) => s.setVisible(night > 0.05));
    this.stars.forEach((s) => (s.alpha = Math.min(s.alpha, night)));
    // mặt trời: cung từ trái (bình minh) sang phải (hoàng hôn)
    const tt = Phaser.Math.Clamp(t, 0, 1);
    const sunProg = Phaser.Math.Clamp(tt / 0.72, 0, 1);
    const sx = 80 + sunProg * (GAME_WIDTH - 160);
    const sy = this.horizon - 30 - Math.sin(sunProg * Math.PI) * (this.horizon - 90);
    this.sun.setPosition(sx, sy).setVisible(tt < 0.74 && t < 2);
    if (t >= 2) {
      this.sun.setPosition(GAME_WIDTH / 2, 110).setVisible(true).setTint(0xff2a2a);
    } else {
      this.sun.clearTint();
    }
    // mặt trăng: mọc sau hoàng hôn
    const moonProg = Phaser.Math.Clamp((tt - 0.7) / 0.3, 0, 1);
    const mx = GAME_WIDTH - 120 - moonProg * 200;
    const my = this.horizon - 40 - Math.sin(moonProg * Math.PI * 0.7) * 160;
    this.moon.setPosition(mx, my).setVisible(tt > 0.7 && t < 2);
  }

  destroy(): void {
    this.g.destroy();
    this.stars.forEach((s) => s.destroy());
    this.sun.destroy();
    this.moon.destroy();
  }
}
