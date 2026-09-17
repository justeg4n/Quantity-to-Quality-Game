import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/constants';

/**
 * Phong cảnh phía sau quảng trường: núi xa, hai lớp đồi, cây to/nhỏ đứng trên mặt đất.
 * Texture núi/đồi được rasterize theo cột 4px để giữ chất pixel-art.
 */
function ensureTerrainTextures(scene: Phaser.Scene): void {
  const u = 4;
  const cols = Math.ceil(GAME_WIDTH / u);
  if (!scene.textures.exists('mountains')) {
    const h = 150;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const peaks = [
      { x: 90, w: 190, hh: 120 },
      { x: 300, w: 240, hh: 145 },
      { x: 520, w: 170, hh: 105 },
      { x: 720, w: 230, hh: 135 },
      { x: 930, w: 180, hh: 110 },
    ];
    for (let c = 0; c < cols; c++) {
      const x = c * u;
      let y = 0;
      for (const p of peaks) {
        const d = Math.abs(x - p.x);
        if (d < p.w / 2) y = Math.max(y, p.hh * (1 - d / (p.w / 2)));
      }
      y = Math.floor(y / u) * u;
      if (y <= 0) continue;
      g.fillStyle(0x6b7a99, 1);
      g.fillRect(x, h - y, u, y);
      // đỉnh tuyết
      if (y > 90) {
        g.fillStyle(0xe8ecf5, 1);
        g.fillRect(x, h - y, u, Math.min(y, Math.floor((y - 90) / 1.5 / u) * u + u));
      }
      // sườn tối bên phải
      g.fillStyle(0x55627f, 1);
      g.fillRect(x + 2, h - y + 8, 2, Math.max(0, y - 8));
    }
    g.generateTexture('mountains', GAME_WIDTH, h);
    g.destroy();
  }
  const hill = (key: string, color: number, dark: number, h: number, bumps: Array<[number, number, number]>) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    for (let c = 0; c < cols; c++) {
      const x = c * u;
      let y = 10;
      for (const [bx, bw, bh] of bumps) {
        const d = Math.abs(x - bx);
        if (d < bw) y = Math.max(y, 10 + bh * Math.cos(((d / bw) * Math.PI) / 2));
      }
      y = Math.floor(y / u) * u;
      g.fillStyle(color, 1);
      g.fillRect(x, h - y, u, y);
      g.fillStyle(dark, 1);
      g.fillRect(x, h - y, u, u);
    }
    g.generateTexture(key, GAME_WIDTH, h);
    g.destroy();
  };
  hill('hills-far', 0x4f8a5b, 0x3f7049, 70, [
    [60, 160, 46],
    [280, 200, 58],
    [520, 150, 40],
    [740, 220, 56],
    [940, 160, 44],
  ]);
  hill('hills-near', 0x5f9f60, 0x4c8450, 46, [
    [0, 140, 26],
    [200, 170, 32],
    [430, 160, 24],
    [640, 190, 34],
    [880, 150, 28],
  ]);
}

export interface BackdropOpts {
  /** tint mờ cho ban đêm */
  tint?: number;
  /** độ sâu cơ sở (các lớp nằm từ base tới base+5); phải lớn hơn depth của nền cỏ */
  baseDepth?: number;
  /** khoảng cách từ chân trời tới gốc cây to (mép dải cỏ) */
  treeY?: number;
}

/**
 * Vẽ phong cảnh phía sau với đường chân trời `horizon` (đỉnh dải cỏ).
 * Cây to đứng trên dải cỏ, cây nhỏ trên đồi, có bóng đổ.
 */
export function drawBackdrop(scene: Phaser.Scene, horizon: number, opts: BackdropOpts = {}): Phaser.GameObjects.GameObject[] {
  ensureTerrainTextures(scene);
  const base = opts.baseDepth ?? -50;
  const treeY = opts.treeY ?? 56;
  const tint = opts.tint;
  const out: Phaser.GameObjects.GameObject[] = [];
  const add = (img: Phaser.GameObjects.Image) => {
    if (tint !== undefined) img.setTint(tint);
    out.push(img);
    return img;
  };
  add(scene.add.image(0, horizon + 2, 'mountains').setOrigin(0, 1).setDepth(base).setAlpha(0.9));
  add(scene.add.image(0, horizon + 10, 'hills-far').setOrigin(0, 1).setDepth(base + 1));
  // cây nhỏ đứng trên đỉnh các đồi xa (toạ độ y = đỉnh đồi tại x đó)
  for (const [x, s, top] of [
    [60, 0.5, 56],
    [95, 0.42, 52],
    [280, 0.55, 68],
    [330, 0.45, 62],
    [520, 0.5, 50],
    [740, 0.55, 66],
    [700, 0.45, 62],
    [940, 0.5, 54],
  ] as Array<[number, number, number]>) {
    add(scene.add.image(x, horizon + 10 - top + 2, 'tree').setOrigin(0.5, 1).setScale(s).setDepth(base + 2));
  }
  add(scene.add.image(0, horizon + 18, 'hills-near').setOrigin(0, 1).setDepth(base + 3));
  // cây vừa trên đồi gần
  for (const [x, s, top] of [
    [200, 0.7, 42],
    [430, 0.6, 34],
    [640, 0.7, 44],
    [880, 0.65, 38],
  ] as Array<[number, number, number]>) {
    add(scene.add.image(x, horizon + 18 - top + 2, 'tree').setOrigin(0.5, 1).setScale(s).setDepth(base + 4));
  }
  // cây to trên dải cỏ, đứng sát mặt đất kèm bóng
  for (const [x, s] of [
    [18, 0.9],
    [395, 1.2],
    [GAME_WIDTH / 2, 0.85],
    [565, 1.2],
    [GAME_WIDTH - 18, 0.9],
  ] as Array<[number, number]>) {
    const y = horizon + treeY;
    const shadow = scene.add.ellipse(x, y - 2, 40 * s, 10 * s, 0x000000, 0.22).setDepth(base + 4);
    out.push(shadow);
    add(scene.add.image(x, y, 'tree').setOrigin(0.5, 1).setScale(s).setDepth(base + 5));
  }
  for (const x of [300, 660, 480]) {
    const shadow = scene.add.ellipse(x, horizon + treeY + 4, 34, 8, 0x000000, 0.2).setDepth(base + 4);
    out.push(shadow);
    add(scene.add.image(x, horizon + treeY + 6, 'bush').setOrigin(0.5, 1).setDepth(base + 5));
  }
  return out;
}
