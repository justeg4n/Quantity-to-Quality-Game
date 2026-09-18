import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE } from '../data/balance';
import { ensureAvatar, type Habits } from '../gfx/Avatar';

const NO_HABITS: Habits = { noStudyDays: 0, noGymDays: 0 };
import { drawBackdrop } from '../gfx/Backdrop';
import { SkyLayer } from '../gfx/Sky';
import { game } from '../systems/GameState';
import { Sfx } from '../systems/Sfx';
import { StatsManager } from '../systems/StatsManager';
import { promptName } from '../ui/NameInput';
import { Button, modal, scrollText, txt } from '../ui/Widgets';

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
    drawBackdrop(this, GAME_HEIGHT * 0.7, { treeY: 30, baseDepth: -49, treeXs: [330, 630], treeScale: 1.4 });

    // Avatar demo: 2 nhân vật (mới & đã tập)
    const weak = StatsManager.empty();
    const strong = StatsManager.empty();
    strong.physical = { nguc: 6, vai: 6, lung: 6, tay: 7, bung: 6, chan: 6 };
    const a1 = this.add.image(GAME_WIDTH / 2 - 250, GAME_HEIGHT * 0.7 + 42, ensureAvatar(this, weak, 'idle', 3, NO_HABITS)).setOrigin(0.5, 1);
    const a2 = this.add.image(GAME_WIDTH / 2 + 250, GAME_HEIGHT * 0.7 + 42, ensureAvatar(this, strong, 'flex', 3, NO_HABITS)).setOrigin(0.5, 1);
    this.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        a1.setTexture(ensureAvatar(this, weak, a1.texture.key.includes('walk1') ? 'walk2' : 'walk1', 3, NO_HABITS));
        a2.setTexture(ensureAvatar(this, strong, a2.texture.key.includes('flex') ? 'happy' : 'flex', 3, NO_HABITS));
      },
    });
    txt(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.7 + 52, '→  LƯỢNG ĐỔI  →  CHẤT ĐỔI  →', 20, C.dark).setOrigin(0.5, 0);

    // Tiêu đề
    const title = txt(this, GAME_WIDTH / 2, 70, 'QUANTITY TO QUALITY', 72, C.gold, { stroke: '#0b0716', strokeThickness: 8 }).setOrigin(0.5);
    txt(this, GAME_WIDTH / 2, 125, 'WHEYSTATION  vs  ATHENS', 32, C.white, { stroke: '#0b0716', strokeThickness: 6 }).setOrigin(0.5);
    txt(this, GAME_WIDTH / 2, 158, `Trò chơi mô phỏng quy luật Lượng – Chất  ·  ${BALANCE.totalDays} ngày  ·  ${BALANCE.totalDays * BALANCE.pointsPerDay} điểm  ·  1 thử thách`, 20, C.cream, {
      stroke: '#0b0716',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 66, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Nút: nhập tên trước khi vào game (admin → trang quản trị), bảng xếp hạng, hướng dẫn
    let y = 215;
    new Button(this, GAME_WIDTH / 2, y, 'VÀO GAME', () => this.enter(), { w: 300, h: 50, fill: C.greenHex, color: C.dark });
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

  /** Hỏi tên → admin vào trang quản trị; người chơi thường: tiếp tục ván dở hoặc chơi mới */
  private enter(): void {
    Sfx.unlock();
    promptName(this, async (r) => {
      if (r.kind === 'admin') {
        this.scene.start(SCENE.admin);
        return;
      }
      const wait = txt(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Đang đồng bộ hồ sơ...', 24, C.cream, { stroke: '#0b0716', strokeThickness: 4 }).setOrigin(0.5).setDepth(150);
      await game.setPlayer(r.name);
      wait.destroy();
      const canContinue = game.canContinue();
      const hasSave = game.hasSave();
      const m = modal(this, 560, 220);
      m.root.add(txt(this, 0, -75, `Xin chào, ${game.playerName}!`, 30, C.gold).setOrigin(0.5));
      m.root.add(
        txt(this, 0, -35, canContinue ? 'Bạn đang có ván chơi dở. Tiếp tục hay bắt đầu lại?' : hasSave ? 'Ván trước đã kết thúc. Bắt đầu ván mới?' : `Sẵn sàng cho ${BALANCE.totalDays} ngày rèn luyện?`, 19, C.cream, { wordWrap: { width: 500 }, align: 'center' }).setOrigin(0.5),
      );
      if (canContinue) {
        m.root.add(new Button(this, -120, 45, 'TIẾP TỤC', () => { m.close(); this.continueGame(); }, { w: 220, h: 46, fill: C.blueHex, size: 20 }));
        m.root.add(new Button(this, 120, 45, 'CHƠI MỚI (XOÁ)', () => { m.close(); game.newGame(false); this.start(); }, { w: 220, h: 46, fill: C.redHex, size: 20 }));
      } else {
        m.root.add(new Button(this, 0, 45, `BẮT ĐẦU ${BALANCE.totalDays} NGÀY`, () => { m.close(); game.newGame(false); this.start(); }, { w: 260, h: 46, fill: C.greenHex, color: C.dark, size: 20 }));
      }
      m.root.add(new Button(this, 0, 95, 'ĐỔI TÊN', () => { m.close(); this.enter(); }, { w: 160, h: 34, size: 17 }));
    });
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
      `MỤC TIÊU: Trải qua ${BALANCE.totalDays} ngày rèn luyện, mỗi ngày có ${BALANCE.pointsPerDay} ĐIỂM ĐẦU NGÀY (đồng hồ cát).`,
      `Phải tiêu HẾT ${BALANCE.pointsPerDay} điểm mới được sang ngày mới. Mỗi lượt Tập / Học tốn 1 điểm. Ngày nào KHÔNG học → đầu nhỏ lại (mỗi khối −1, mặt đờ đẫn); KHÔNG tập → cơ xẹp, bụng phệ.`,
      '',
      'WHEYSTATION (gym): chọn nhóm cơ → mini-game 6 rep, mỗi bài một cơ chế riêng (bấm liên tục, canh thời điểm,',
      '   giữ & thả, đúng tay chỉ định, đúng nhịp, chuỗi mũi tên).',
      '   Hoàn thành → +1 điểm nhóm cơ đó. Nhân vật to dần đúng nhóm cơ đã tập.',
      'ATHENS (học): chọn khối kiến thức → trả lời 2 câu trắc nghiệm → +1 điểm khối đó.',
      '',
      `SAU NGÀY ${BALANCE.totalDays} — THỬ THÁCH CUỐI "VÒNG XOÁY BIỆN CHỨNG" gồm 3 phase (thứ tự & bài tập ngẫu nhiên), dùng chính thành quả đã tích luỹ:`,
      '   2 phase đầu: mỗi lượt tập / câu hỏi tiêu hao 1 điểm nhóm liên quan (thất bại → −1 mọi nhóm còn lại).',
      '   Phase cuối: chỉ còn phần chưa bị tiêu hao — mỗi bài tập trừ điểm nhóm cơ, đề thi rút từ mọi khối kiến thức.',
      '   Tích luỹ bao nhiêu là đủ? Hãy tự khám phá — lượng đổi đến đâu thì chất đổi!',
      '',
      'Mẹo: 3 rep Perfect liên tiếp → combo; 2 combo → +1 điểm phụ trội (lượt đó +2). Đúng cả 2 câu → huy hiệu Triết gia.',
    ];
    // vùng đọc cuộn được, chừa chỗ cho nút ở đáy — nút không che chữ
    const unbind = scrollText(this, m.root, -(GAME_WIDTH - 120) / 2 + 24, -(GAME_HEIGHT - 80) / 2 + 20, GAME_WIDTH - 120 - 48, GAME_HEIGHT - 80 - 110, lines.join('\n'));
    m.root.add(new Button(this, 0, (GAME_HEIGHT - 80) / 2 - 36, 'ĐÃ HIỂU', () => { unbind(); m.close(); }, { w: 220, h: 44 }));
  }
}
