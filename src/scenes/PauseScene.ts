import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE, KNOWLEDGE_KEYS, KNOWLEDGE_SHORT, PHYSICAL_KEYS, PHYSICAL_LABEL } from '../data/balance';
import { game } from '../systems/GameState';
import { Sfx } from '../systems/Sfx';
import { Button, StatBar, modal, txt } from '../ui/Widgets';

/** Các scene cho phép mở menu Esc */
export const PAUSABLE: string[] = [SCENE.town, SCENE.gym, SCENE.athens, SCENE.exercise, SCENE.quiz, SCENE.dayEnd, SCENE.boss, SCENE.ending];

/**
 * Gắn phím Esc cho một scene: tạm dừng scene đó và mở PauseScene đè lên.
 * Gọi trong create() của các scene gameplay.
 */
export function enablePause(scene: Phaser.Scene): void {
  const kb = scene.input.keyboard;
  if (!kb) return;
  kb.addCapture('ESC');
  kb.on('keydown-ESC', () => openPause(scene));
  // nút ☰ nhỏ ở góc dưới-trái cho mobile
  const btn = txt(scene, 8, GAME_HEIGHT - 8, '☰ MENU (Esc)', 16, C.cream, { stroke: '#0b0716', strokeThickness: 4 })
    .setOrigin(0, 1)
    .setDepth(500)
    .setAlpha(0.8)
    .setInteractive({ useHandCursor: true });
  btn.on('pointerup', () => openPause(scene));
}

export function openPause(scene: Phaser.Scene): void {
  if (scene.scene.isActive(SCENE.pause)) return;
  Sfx.click();
  scene.scene.launch(SCENE.pause, { from: scene.scene.key });
  scene.scene.pause();
}

export class PauseScene extends Phaser.Scene {
  private from = '';

  constructor() {
    super(SCENE.pause);
  }

  create(data: { from: string }): void {
    this.from = data.from;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0).setInteractive();
    const w = 880;
    const h = 420;
    const g = this.add.graphics();
    g.fillStyle(C.borderHex, 1).fillRect(GAME_WIDTH / 2 - w / 2, GAME_HEIGHT / 2 - h / 2, w, h);
    g.fillStyle(0x0b0716, 1).fillRect(GAME_WIDTH / 2 - w / 2 + 3, GAME_HEIGHT / 2 - h / 2 + 3, w - 6, h - 6);
    g.fillStyle(C.panel, 1).fillRect(GAME_WIDTH / 2 - w / 2 + 6, GAME_HEIGHT / 2 - h / 2 + 6, w - 12, h - 12);

    const left = GAME_WIDTH / 2 - w / 2 + 30;
    const top = GAME_HEIGHT / 2 - h / 2 + 20;
    txt(this, GAME_WIDTH / 2, top, 'TẠM DỪNG', 36, C.gold).setOrigin(0.5, 0);
    txt(this, GAME_WIDTH / 2, top + 42, `Ngày ${game.day.currentDay}/${BALANCE.totalDays} · Còn ${game.pointsLeft} điểm · Gym ${game.totalGym} · Học ${game.totalStudy}`, 18, C.gray).setOrigin(0.5, 0);

    // Cột trái: nút chức năng
    const bx = left + 120;
    let by = top + 100;
    const gap = 54;
    new Button(this, bx, by, 'TIẾP TỤC  (Esc)', () => this.resume(), { w: 240, h: 44, fill: C.greenHex, color: C.dark, size: 22 });
    by += gap;
    const soundBtn = new Button(this, bx, by, Sfx.muted ? 'ÂM THANH: TẮT' : 'ÂM THANH: BẬT', () => { const m = Sfx.toggleMute(); soundBtn.setText(m ? 'ÂM THANH: TẮT' : 'ÂM THANH: BẬT'); game.muted = m; }, { w: 240, h: 44, size: 20 });
    by += gap;
    new Button(this, bx, by, 'HƯỚNG DẪN', () => this.showHelp(), { w: 240, h: 44, size: 20 });
    by += gap;
    new Button(this, bx, by, 'VỀ MÀN HÌNH CHÍNH', () => this.toTitle(), { w: 240, h: 44, size: 20 });
    by += gap;
    new Button(this, bx, by, 'CHƠI LẠI TỪ ĐẦU', () => this.confirmRestart(), { w: 240, h: 44, size: 20, fill: 0x4a1d2a });
    txt(this, bx, by + 32, 'Tiến trình tự lưu sau mỗi hành động.', 14, C.gray).setOrigin(0.5, 0);

    // Cột phải: chỉ số nhanh
    const sx = left + 290;
    const col2 = sx + 275;
    txt(this, sx, top + 90, 'THỂ CHẤT', 20, C.orange);
    PHYSICAL_KEYS.forEach((k, i) => new StatBar(this, sx, top + 124 + i * 28, PHYSICAL_LABEL[k], game.stats.physical(k), 0, C.orangeHex, 190));
    txt(this, col2, top + 90, 'KIẾN THỨC', 20, C.sky);
    KNOWLEDGE_KEYS.forEach((k, i) => new StatBar(this, col2, top + 124 + i * 28, KNOWLEDGE_SHORT[k], game.stats.knowledge(k), 0, C.skyHex, 190));
    txt(this, sx, top + 300, `Tổng điểm khả năng: Thể chất ${game.stats.totalPhysical()} · Kiến thức ${game.stats.totalKnowledge()}`, 16, C.cream);
    txt(this, sx, top + 322, 'Thử thách cuối sẽ dùng đến tất cả 12 chỉ số này.', 14, C.gray);

    this.input.keyboard?.addCapture('ESC');
    this.input.keyboard?.on('keydown-ESC', () => this.resume());
  }

  private resume(): void {
    Sfx.click();
    this.scene.resume(this.from);
    this.scene.stop();
  }

  private toTitle(): void {
    game.save();
    Sfx.stopBgm();
    this.scene.stop(this.from);
    this.scene.start(SCENE.title);
  }

  private confirmRestart(): void {
    const m = modal(this, 500, 180, 100);
    m.root.add(txt(this, 0, -50, 'Xoá toàn bộ tiến trình và chơi lại từ ngày 1?', 22, C.cream).setOrigin(0.5));
    m.root.add(new Button(this, -110, 35, 'XOÁ & CHƠI LẠI', () => { m.close(); game.newGame(false); Sfx.stopBgm(); this.scene.stop(this.from); this.scene.start(SCENE.town); }, { w: 210, h: 44, fill: C.redHex, size: 20 }));
    m.root.add(new Button(this, 110, 35, 'HUỶ', () => m.close(), { w: 210, h: 44, size: 20 }));
  }

  private showHelp(): void {
    const m = modal(this, GAME_WIDTH - 120, GAME_HEIGHT - 80, 100);
    const lines = [
      `MỤC TIÊU: ${BALANCE.totalDays} ngày rèn luyện, mỗi ngày ${BALANCE.pointsPerDay} ĐIỂM ĐẦU NGÀY (đồng hồ cát). Phải tiêu HẾT mới sang ngày.`,
      'Ngày nào KHÔNG học → đầu nhỏ lại: mỗi khối kiến thức −1.',
      '',
      'WHEYSTATION: chọn nhóm cơ → mini-game 6 rep → +1 điểm nhóm cơ. Mỗi bài một cơ chế riêng:',
      '   Ngực bấm liên tục · Vai canh thời điểm · Lưng giữ & thả · Tay bấm đúng tay chỉ định A/D · Bụng đúng nhịp · Chân chuỗi mũi tên.',
      '   3 Perfect liên tiếp = combo; 2 combo = +1 phụ trội (lượt đó +2).',
      'ATHENS: chọn khối kiến thức → 2 câu trắc nghiệm → +1 điểm khối. Đúng cả 2 → huy hiệu Triết gia.',
      '',
      `THỬ THÁCH CUỐI (sau ngày ${BALANCE.totalDays}) — 3 phase (thứ tự & bài tập ngẫu nhiên), đều tiêu hao chỉ số đã tích luỹ:`,
      '   2 phase đầu: mỗi lượt tập −1 nhóm cơ liên quan, mỗi câu hỏi −1 khối đó; thất bại/sai → −1 mọi nhóm còn lại.',
      `   Phase cuối (phần còn lại): Push-up ×${BALANCE.bossExerciseReps} (−Ngực, Vai, Tay) · Lat Pull Down ×${BALANCE.bossExerciseReps} (−Lưng, Tay) · Squat ×${BALANCE.bossExerciseReps} (−Chân, Bụng) + đề 5 câu.`,
      '   Tích luỹ bao nhiêu là đủ? Hãy tự khám phá — thua sẽ được hé lộ chỉ số nào còn thiếu.',
      '',
      'Điều khiển: ← → / WASD di chuyển · SPACE / E vào nhà · SPACE hoặc chạm nút vàng để tập · 1–4 chọn đáp án · Esc menu.',
    ];
    m.root.add(txt(this, -(GAME_WIDTH - 120) / 2 + 24, -(GAME_HEIGHT - 80) / 2 + 20, lines.join('\n'), 19, C.cream, { lineSpacing: 3, wordWrap: { width: GAME_WIDTH - 120 - 48 } }));
    m.root.add(new Button(this, 0, (GAME_HEIGHT - 80) / 2 - 40, 'ĐÓNG', () => m.close(), { w: 200 }));
  }
}
