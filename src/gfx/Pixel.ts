import Phaser from 'phaser';

export type Palette = Record<string, number>;

/**
 * Tạo texture pixel-art từ "bản đồ ký tự": mỗi ký tự = 1 pixel, '.' = trong suốt.
 * Ví dụ: rows = ['.aa.', 'abba', '.aa.'], palette = { a: 0xff0000, b: 0xffffff }
 */
export function pixelTexture(scene: Phaser.Scene, key: string, rows: string[], palette: Palette, scale = 4): void {
  if (scene.textures.exists(key)) return;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (color === undefined) continue;
      g.fillStyle(color, 1);
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  g.generateTexture(key, w * scale, h * scale);
  g.destroy();
}

/** Vẽ hình chữ nhật theo đơn vị pixel-art (u = scale) */
export function px(g: Phaser.GameObjects.Graphics, color: number, x: number, y: number, w: number, h: number, u = 4): void {
  g.fillStyle(color, 1);
  g.fillRect(Math.round(x * u), Math.round(y * u), Math.round(w * u), Math.round(h * u));
}

/** Viền kiểu pixel (khung 2 lớp) */
export function pixelFrame(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
  border: number,
  thick = 4,
  alpha = 1,
): void {
  g.fillStyle(border, alpha);
  g.fillRect(x, y, w, h);
  g.fillStyle(fill, alpha);
  g.fillRect(x + thick, y + thick, w - thick * 2, h - thick * 2);
  // góc bo kiểu pixel: khoét 4 góc
  g.fillStyle(0x000000, 0);
}

export function lerpColor(a: number, b: number, t: number): number {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const r = Math.round(ca.red + (cb.red - ca.red) * t);
  const g = Math.round(ca.green + (cb.green - ca.green) * t);
  const bl = Math.round(ca.blue + (cb.blue - ca.blue) * t);
  return Phaser.Display.Color.GetColor(r, g, bl);
}
