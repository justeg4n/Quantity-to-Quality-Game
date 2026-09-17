import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { ensureAvatar } from '../gfx/Avatar';
import { SkyLayer } from '../gfx/Sky';
import { game } from '../systems/GameState';
import { Sfx } from '../systems/Sfx';
import { StatsManager } from '../systems/StatsManager';
import { Button, modal, txt } from '../ui/Widgets';

export class TitleScene extends Phaser.Scene {
  private sky!: SkyLayer;
  private t = 0;

  constructor() {
    super(SCENE.title);
  }

  create(): void {
    this.sky = new SkyLayer(this, GAME_HEIGHT * 0.7);
    this.t = 0.1;
    // nền đất
    this.add.tileSprite(0, GAME_HEIGHT * 0.7, GAME_WIDTH, GAME_HEIGHT * 0.3, 'tile-ground').setOrigin(0).setDepth(-50);
    this.add.tileSprite(0, GAME_HEIGHT * 0.7 + 40, GAME_WIDTH, 60, 'tile-plaza').setOrigin(0).setDepth(-49);
    this.add.image(150, GAME_HEIGHT * 0.7 + 4, 'bld-gym').setOrigin(0.5, 1).setScale(0.8).setDepth(-48);
    this.add.image(GAME_WIDTH - 150, GAME_HEIGHT * 0.7 + 4, 'bld-athens').setOrigin(0.5, 1).setScale(0.8).setDepth(-48);
    this.add.image(300, GAME_HEIGHT * 0.7 + 4, 'tree').setOrigin(0.5, 1).setDepth(-47);
    this.add.image(GAME_WIDTH - 300, GAME_HEIGHT * 0.7 + 4, 'tree').setOrigin(0.5, 1).setDepth(-47);

    // Avatar demo: 2 nhân vật (mới & đã tập)
    const weak = StatsManager.empty();
    const strong = StatsManager.empty();
    strong.physical = { nguc: 6, vai: 6, lung: 6, tay: 7, bung: 6, chan: 6 };
    const a1 = this.add.image(GAME_WIDTH / 2 - 90, GAME_HEIGHT * 0.7 + 42, ensureAvatar(this, weak, 'idle', 3)).setOrigin(0.5, 1);
    const a2 = this.add.image(GAME_WIDTH / 2 + 90, GAME_HEIGHT * 0.7 + 42, ensureAvatar(this, strong, 'flex', 3)).setOrigin(0.5, 1);
    this.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        a1.setTexture(ensureAvatar(this, weak, a1.texture.key.includes('walk1') ? 'walk2' : 'walk1', 3));
        a2.setTexture(ensureAvatar(this, strong, a2.texture.key.includes('flex') ? 'happy' : 'flex', 3));
      },
    });
    txt(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.7 + 52, '→  LƯỢNG ĐỔI  →  CHẤT ĐỔI  →', 20, C.dark).setOrigin(0.5, 0);

    // Tiêu đề
    const title = txt(this, GAME_WIDTH / 2, 70, 'QUANTITY TO QUALITY', 72, C.gold, { stroke: '#0b0716', strokeThickness: 8 }).setOrigin(0.5);
    txt(this, GAME_WIDTH / 2, 125, 'WHEYSTATION  vs  ATHENS', 32, C.white, { stroke: '#0b0716', strokeThickness: 6 }).setOrigin(0.5);
    txt(this, GAME_WIDTH / 2, 158, 'Trò chơi mô phỏng quy luật Lượng – Chất  ·  10 ngày  ·  50 điểm  ·  1 thử thách', 20, C.cream, {
      stroke: '#0b0716',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 66, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Nút
    const hasSave = game.hasSave();
    let y = 215;
    if (hasSave) {
      new Button(this, GAME_WIDTH / 2, y, 'TIẾP TỤC', () => this.continueGame(), { w: 300, h: 50, fill: C.blueHex });
      y += 62;
    }
    new Button(this, GAME_WIDTH / 2, y, hasSave ? 'CHƠI MỚI' : 'BẮT ĐẦU 10 NGÀY', () => this.newGame(hasSave), { w: 300, h: 50 });
    y += 62;
    new Button(this, GAME_WIDTH / 2, y, 'HƯỚNG DẪN', () => this.showHelp(), { w: 300, h: 50 });

    // Mute
    const mute = txt(this, GAME_WIDTH - 16, 12, Sfx.muted ? '[ ÂM: TẮT ]' : '[ ÂM: BẬT ]', 20, C.cream, { stroke: '#0b0716', strokeThickness: 4 })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    mute.on('pointerup', () => {
      const m = Sfx.toggleMute();
      mute.setText(m ? '[ ÂM: TẮT ]' : '[ ÂM: BẬT ]');
    });
    txt(this, 12, GAME_HEIGHT - 26, 'Điều khiển: ← → / WASD di chuyển · SPACE hành động · Chuột / chạm chọn', 18, C.cream, {
      stroke: '#0b0716',
      strokeThickness: 4,
    });

    this.input.once('pointerdown', () => {
      Sfx.unlock();
      Sfx.playBgm('town', 132);
    });
  }

  update(_time: number, delta: number): void {
    this.t = (this.t + delta / 40000) % 1;
    this.sky.set(this.t);
  }

  private newGame(confirmOverwrite: boolean): void {
    if (confirmOverwrite) {
      const m = modal(this, 480, 170);
      m.root.add(txt(this, 0, -40, 'Bắt đầu mới sẽ XOÁ tiến trình đã lưu. Tiếp tục?', 22, C.cream).setOrigin(0.5));
      m.root.add(
        new Button(this, -115, 30, 'XOÁ & CHƠI MỚI', () => { m.close(); game.newGame(false); this.start(); }, { w: 210, h: 46, fill: C.redHex, size: 20 }),
      );
      m.root.add(new Button(this, 115, 30, 'HUỶ', () => m.close(), { w: 210, h: 46, size: 20 }));
      return;
    }
    game.newGame(false);
    this.start();
  }

  private continueGame(): void {
    if (!game.load()) {
      game.newGame(false);
    }
    this.start();
  }

  private start(): void {
    Sfx.unlock();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (game.phase === 'boss') this.scene.start(SCENE.boss);
      else if (game.phase === 'ended') this.scene.start(SCENE.ending);
      else this.scene.start(SCENE.town);
    });
  }

  private showHelp(): void {
    const m = modal(this, GAME_WIDTH - 120, GAME_HEIGHT - 80);
    const lines = [
      'MỤC TIÊU: Trải qua 10 ngày rèn luyện, mỗi ngày có 5 ĐIỂM ĐẦU NGÀY (đồng hồ cát).',
      'Phải tiêu HẾT 5 điểm mới được sang ngày mới. Mỗi lượt Tập / Học tốn 1 điểm.',
      '',
      'WHEYSTATION (gym): chọn nhóm cơ → mini-game 6 rep (bấm SPACE liên tục hoặc canh thời điểm).',
      '   Hoàn thành → +1 điểm nhóm cơ đó. Nhân vật to dần đúng nhóm cơ đã tập.',
      'ATHENS (học): chọn khối kiến thức → trả lời 2 câu trắc nghiệm → +1 điểm khối đó.',
      '',
      'NGÀY 11 — THỬ THÁCH CUỐI "VÒNG XOÁY BIỆN CHỨNG" gồm 3 pha. Để thắng cần:',
      '   Ngực ≥3  Vai ≥3  Lưng ≥3  Chân ≥3  Bụng ≥3  Tay ≥6   và  mỗi khối kiến thức ≥2',
      '   (33/50 điểm tối thiểu — còn 17 điểm tự do). Thiếu 1 chỉ số là thua!',
      '',
      'Mẹo: 3 rep Perfect liên tiếp → combo; 2 combo → +1 điểm phụ trội. Đúng cả 2 câu → huy hiệu Triết gia.',
    ];
    m.root.add(txt(this, -(GAME_WIDTH - 120) / 2 + 24, -(GAME_HEIGHT - 80) / 2 + 20, lines.join('\n'), 21, C.cream, { lineSpacing: 4 }));
    m.root.add(new Button(this, 0, (GAME_HEIGHT - 80) / 2 - 40, 'ĐÃ HIỂU', () => m.close(), { w: 220 }));
  }
}
