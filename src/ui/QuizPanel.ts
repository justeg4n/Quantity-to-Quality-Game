import Phaser from 'phaser';
import { C } from '../config/constants';
import type { QuizQuestion } from '../data/types';
import { Sfx } from '../systems/Sfx';
import { txt } from './Widgets';

export interface QuizPanelOpts {
  w?: number;
  questionSize?: number;
  optionSize?: number;
  /** tô màu đúng/sai ngay sau khi chọn */
  instantFeedback?: boolean;
  optionGap?: number;
}

/**
 * Bảng câu hỏi trắc nghiệm tái sử dụng (Athens + Boss).
 * Toạ độ (x, y) là góc trên-trái. Chọn bằng chuột/chạm hoặc phím 1–4 (do scene gắn).
 */
export class QuizPanel extends Phaser.GameObjects.Container {
  private qText!: Phaser.GameObjects.Text;
  private options: Array<{ bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone; h: number }> = [];
  private answered = false;
  private current: QuizQuestion | null = null;
  private onAnswer: ((index: number, correct: boolean) => void) | null = null;
  private o: Required<QuizPanelOpts>;
  contentHeight = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: QuizPanelOpts = {}) {
    super(scene, x, y);
    this.o = {
      w: opts.w ?? 600,
      questionSize: opts.questionSize ?? 22,
      optionSize: opts.optionSize ?? 19,
      instantFeedback: opts.instantFeedback ?? false,
      optionGap: opts.optionGap ?? 8,
    };
    this.qText = txt(scene, 0, 0, '', this.o.questionSize, C.white, { wordWrap: { width: this.o.w }, lineSpacing: 3 });
    this.add(this.qText);
    scene.add.existing(this);
  }

  show(q: QuizQuestion, onAnswer: (index: number, correct: boolean) => void): void {
    this.clearOptions();
    this.current = q;
    this.onAnswer = onAnswer;
    this.answered = false;
    this.qText.setText(q.question);
    let y = this.qText.height + 14;
    q.options.forEach((opt, i) => {
      const label = txt(this.scene, 14, y + 6, `${i + 1}. ${opt}`, this.o.optionSize, C.cream, { wordWrap: { width: this.o.w - 28 } });
      const h = label.height + 12;
      const bg = this.scene.add.graphics();
      this.drawOption(bg, y, h, C.panelLight);
      const zone = this.scene.add.zone(0, y, this.o.w, h).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => { if (!this.answered) { this.drawOption(bg, y, h, C.purpleHex); Sfx.hover(); } });
      zone.on('pointerout', () => { if (!this.answered) this.drawOption(bg, y, h, C.panelLight); });
      zone.on('pointerup', () => this.choose(i));
      this.add(bg);
      this.add(label);
      this.add(zone);
      this.options.push({ bg, label, zone, h });
      y += h + this.o.optionGap;
    });
    this.contentHeight = y;
  }

  private drawOption(g: Phaser.GameObjects.Graphics, y: number, h: number, fill: number): void {
    g.clear();
    g.fillStyle(C.borderHex, 1).fillRect(0, y, this.o.w, h);
    g.fillStyle(fill, 1).fillRect(3, y + 3, this.o.w - 6, h - 6);
  }

  /** Chọn đáp án theo chỉ số (0..3). Gọi từ phím số hoặc click. */
  choose(i: number): void {
    if (this.answered || !this.current || i >= this.options.length) return;
    this.answered = true;
    const correct = i === this.current.correctIndex;
    Sfx.click();
    this.options.forEach((o, idx) => {
      const y = o.zone.y;
      if (this.o.instantFeedback) {
        if (idx === this.current!.correctIndex) this.drawOption(o.bg, y, o.h, C.greenHex);
        else if (idx === i) this.drawOption(o.bg, y, o.h, C.redHex);
        else this.drawOption(o.bg, y, o.h, 0x2a2a3a);
      } else {
        this.drawOption(o.bg, y, o.h, idx === i ? C.blueHex : 0x2a2a3a);
      }
      o.zone.disableInteractive();
    });
    this.onAnswer?.(i, correct);
  }

  /** Hiển thị đáp án đúng/sai (dùng sau khi đã trả lời, chế độ không feedback tức thì) */
  reveal(chosen: number): void {
    if (!this.current) return;
    this.options.forEach((o, idx) => {
      const y = o.zone.y;
      if (idx === this.current!.correctIndex) this.drawOption(o.bg, y, o.h, C.greenHex);
      else if (idx === chosen) this.drawOption(o.bg, y, o.h, C.redHex);
      else this.drawOption(o.bg, y, o.h, 0x2a2a3a);
    });
  }

  /** Khoá bảng (hết giờ) — không cho chọn nữa */
  lock(): void {
    if (this.answered) return;
    this.answered = true;
    this.options.forEach((o) => {
      this.drawOption(o.bg, o.zone.y, o.h, 0x2a2a3a);
      o.zone.disableInteractive();
    });
  }

  get isAnswered(): boolean {
    return this.answered;
  }

  private clearOptions(): void {
    this.options.forEach((o) => { o.bg.destroy(); o.label.destroy(); o.zone.destroy(); });
    this.options = [];
  }
}
