import Phaser from 'phaser';
import { C, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { Sfx } from '../systems/Sfx';

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 22,
  color: string = C.cream,
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    resolution: 2,
    ...extra,
  });
}

/** Panel pixel với viền kem 2 lớp */
export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = C.panel,
  border = C.borderHex,
  alpha = 1,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(border, alpha);
  g.fillRect(x, y, w, h);
  g.fillStyle(0x0b0716, alpha);
  g.fillRect(x + 3, y + 3, w - 6, h - 6);
  g.fillStyle(fill, alpha);
  g.fillRect(x + 6, y + 6, w - 12, h - 12);
  return g;
}

export interface ButtonOpts {
  w?: number;
  h?: number;
  size?: number;
  fill?: number;
  hover?: number;
  color?: string;
  disabled?: boolean;
  icon?: string;
}

/** Nút bấm pixel-art: hover sáng, bấm lún xuống */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private opts: Required<Omit<ButtonOpts, 'icon'>> & { icon?: string };
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOpts = {}) {
    super(scene, x, y);
    this.opts = {
      w: opts.w ?? 200,
      h: opts.h ?? 48,
      size: opts.size ?? 24,
      fill: opts.fill ?? C.panelLight,
      hover: opts.hover ?? C.purpleHex,
      color: opts.color ?? C.cream,
      disabled: opts.disabled ?? false,
      icon: opts.icon,
    };
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.label = txt(scene, 0, 0, text, this.opts.size, this.opts.color).setOrigin(0.5);
    this.add(this.label);
    if (this.opts.icon) {
      const ic = scene.add.image(-this.opts.w / 2 + 24, 0, this.opts.icon);
      this.add(ic);
      this.label.x = 12;
    }
    this.draw(this.opts.fill);
    this.setSize(this.opts.w, this.opts.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => {
      if (!this.enabled) return;
      this.draw(this.opts.hover);
      Sfx.hover();
    });
    this.on('pointerout', () => this.draw(this.enabled ? this.opts.fill : 0x2a2a3a));
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.label.y = 2;
    });
    this.on('pointerup', () => {
      if (!this.enabled) return;
      this.label.y = 0;
      Sfx.unlock();
      Sfx.click();
      onClick();
    });
    this.setEnabled(!this.opts.disabled);
    scene.add.existing(this);
  }

  private draw(fill: number): void {
    const { w, h } = this.opts;
    this.bg.clear();
    this.bg.fillStyle(C.borderHex, 1);
    this.bg.fillRect(-w / 2, -h / 2, w, h);
    this.bg.fillStyle(0x0b0716, 1);
    this.bg.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    this.bg.fillStyle(fill, 1);
    this.bg.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
    // highlight cạnh trên
    this.bg.fillStyle(0xffffff, 0.12);
    this.bg.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, 3);
  }

  setEnabled(v: boolean): this {
    this.enabled = v;
    this.draw(v ? this.opts.fill : 0x2a2a3a);
    this.label.setAlpha(v ? 1 : 0.45);
    if (v) this.setInteractive({ useHandCursor: true });
    else this.disableInteractive();
    return this;
  }

  setText(t: string): this {
    this.label.setText(t);
    return this;
  }
}

/** Thanh chỉ số XP pixel: n ô sáng / max, có vạch ngưỡng tối thiểu */
export class StatBar extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private valueText: Phaser.GameObjects.Text;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private labelStr: string,
    private value: number,
    private required: number,
    private color: number = C.greenHex,
    private barW = 220,
    private maxSeg = 10,
  ) {
    super(scene, x, y);
    this.add(txt(scene, 0, 0, this.labelStr, 20).setOrigin(0, 0.5));
    this.g = scene.add.graphics();
    this.add(this.g);
    this.valueText = txt(scene, barW + 6, 0, '', 20, C.gold).setOrigin(0, 0.5);
    this.add(this.valueText);
    this.set(value);
    scene.add.existing(this);
  }

  set(value: number): void {
    this.value = value;
    const segW = Math.floor((this.barW - 90) / this.maxSeg);
    const x0 = 90;
    this.g.clear();
    this.g.fillStyle(0x0b0716, 1);
    this.g.fillRect(x0 - 2, -9, segW * this.maxSeg + 4, 18);
    for (let i = 0; i < this.maxSeg; i++) {
      const filled = i < this.value;
      const reachedReq = this.value >= this.required;
      const col = filled ? (reachedReq ? this.color : C.orangeHex) : 0x2a1d4a;
      this.g.fillStyle(col, 1);
      this.g.fillRect(x0 + i * segW, -7, segW - 2, 14);
    }
    // vạch ngưỡng
    if (this.required > 0 && this.required <= this.maxSeg) {
      this.g.fillStyle(0xffffff, 0.9);
      this.g.fillRect(x0 + this.required * segW - 3, -11, 2, 22);
    }
    const ok = this.value >= this.required;
    this.valueText.setText(`${this.value}${this.required ? '/' + this.required : ''}${this.value > this.maxSeg ? '+' : ''}`);
    this.valueText.setColor(ok ? C.green : C.orange);
  }
}

/** Radar chart pixel 12 trục */
export function drawRadar(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number,
  values: number[],
  maxValue: number,
  color: number = C.greenHex,
): void {
  const n = values.length;
  // lưới
  for (let ring = 1; ring <= 3; ring++) {
    g.lineStyle(1, 0x8d99ae, 0.35);
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = (radius * ring) / 3;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
  }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    g.lineStyle(1, 0x8d99ae, 0.35);
    g.lineBetween(cx, cy, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
  }
  // vùng giá trị
  g.fillStyle(color, 0.35);
  g.lineStyle(2, color, 1);
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const v = Math.min(1, values[i % n] / maxValue);
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * radius * v;
    const y = cy + Math.sin(a) * radius * v;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
  g.strokePath();
  // điểm pixel ở đỉnh
  for (let i = 0; i < n; i++) {
    const v = Math.min(1, values[i] / maxValue);
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx + Math.cos(a) * radius * v - 2, cy + Math.sin(a) * radius * v - 2, 4, 4);
  }
}

/** Bong bóng thoại NPC */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private textObj: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene, x: number, y: number, private bubbleW = 300) {
    super(scene, x, y);
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.textObj = txt(scene, 10, 8, '', 19, C.dark, { wordWrap: { width: bubbleW - 20 } });
    this.add(this.textObj);
    scene.add.existing(this);
    this.setDepth(50);
  }

  say(text: string, tailSide: 'left' | 'right' = 'left'): void {
    this.textObj.setText(text);
    const h = this.textObj.height + 16;
    this.bg.clear();
    this.bg.fillStyle(0x0b0716, 1);
    this.bg.fillRect(-3, -3, this.bubbleW + 6, h + 6);
    this.bg.fillStyle(0xfdf6e3, 1);
    this.bg.fillRect(0, 0, this.bubbleW, h);
    // đuôi
    const tx = tailSide === 'left' ? 24 : this.bubbleW - 36;
    this.bg.fillStyle(0x0b0716, 1);
    this.bg.fillRect(tx - 3, h, 18, 6);
    this.bg.fillRect(tx, h + 6, 12, 6);
    this.bg.fillStyle(0xfdf6e3, 1);
    this.bg.fillRect(tx, h - 2, 12, 6);
    this.bg.fillRect(tx + 3, h + 4, 6, 4);
    this.setVisible(true);
  }
}

/** Nút hành động lớn cho mobile (thay phím Space) */
export class ActionButton extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene, onPress: () => void, label = 'SPACE / CHẠM', x = GAME_WIDTH - 120, y = GAME_HEIGHT - 60) {
    super(scene, x, y);
    this.g = scene.add.graphics();
    this.add(this.g);
    this.draw(false);
    const t = txt(scene, 0, 0, label, 22, C.dark).setOrigin(0.5);
    this.add(t);
    this.setSize(200, 72);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      this.draw(true);
      onPress();
    });
    this.on('pointerup', () => this.draw(false));
    this.on('pointerout', () => this.draw(false));
    this.setDepth(100);
    scene.add.existing(this);
  }
  private draw(pressed: boolean): void {
    this.g.clear();
    this.g.fillStyle(C.borderHex, 1);
    this.g.fillRect(-100, -36, 200, 72);
    this.g.fillStyle(pressed ? C.orangeHex : C.goldHex, 1);
    this.g.fillRect(-95, -31 + (pressed ? 3 : 0), 190, 62 - (pressed ? 3 : 0));
  }
  flash(): void {
    this.draw(true);
    this.scene.time.delayedCall(80, () => this.draw(false));
  }
}

/** Thông báo nổi ngắn (toast) bay lên rồi mờ dần */
export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color: string = C.gold, size = 26): void {
  const t = txt(scene, x, y, text, size, color, { stroke: '#0b0716', strokeThickness: 4 }).setOrigin(0.5).setDepth(200);
  scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 900, ease: 'Cubic.Out', onComplete: () => t.destroy() });
}

/** Lớp phủ tối toàn màn hình (dùng cho modal) */
export function dim(scene: Phaser.Scene, alpha = 0.6, depth = 90): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, alpha).setOrigin(0).setDepth(depth).setInteractive();
}

/**
 * Modal: lớp phủ tối + panel ở giữa màn hình. Toạ độ con tính từ TÂM panel.
 * Trả về container gốc (thêm con vào root) và hàm đóng.
 */
export function modal(scene: Phaser.Scene, w: number, h: number, depth = 90): { root: Phaser.GameObjects.Container; close: () => void } {
  const root = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(depth);
  const bg = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setInteractive();
  root.add(bg);
  const g = scene.add.graphics();
  g.fillStyle(C.borderHex, 1);
  g.fillRect(-w / 2, -h / 2, w, h);
  g.fillStyle(0x0b0716, 1);
  g.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  g.fillStyle(C.panel, 1);
  g.fillRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);
  root.add(g);
  root.setScale(0.9);
  scene.tweens.add({ targets: root, scale: 1, duration: 150, ease: 'Back.Out' });
  return { root, close: () => root.destroy() };
}

/** Icon đồng hồ cát hiển thị điểm đầu ngày */
export class PointsHud extends Phaser.GameObjects.Container {
  private icons: Phaser.GameObjects.Image[] = [];
  private dayText: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, x: number, y: number, max = 5) {
    super(scene, x, y);
    this.dayText = txt(scene, 0, 0, '', 24, C.gold);
    this.add(this.dayText);
    for (let i = 0; i < max; i++) {
      const ic = scene.add.image(150 + i * 30, 12, 'icon-hourglass');
      this.icons.push(ic);
      this.add(ic);
    }
    scene.add.existing(this);
    this.setDepth(80);
  }
  set(day: number, pointsLeft: number, totalDays = 10): void {
    this.dayText.setText(`NGÀY ${day}/${totalDays}`);
    this.icons.forEach((ic, i) => ic.setTexture(i < pointsLeft ? 'icon-hourglass' : 'icon-hourglass-empty'));
  }
  /** Hiệu ứng cát rơi khi tiêu 1 điểm */
  spend(indexJustSpent: number): void {
    const ic = this.icons[indexJustSpent];
    if (!ic) return;
    this.scene.tweens.add({ targets: ic, scaleY: 0.2, duration: 150, yoyo: true, onYoyo: () => ic.setTexture('icon-hourglass-empty') });
  }
}
