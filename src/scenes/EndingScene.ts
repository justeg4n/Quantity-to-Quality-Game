import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE, KNOWLEDGE_KEYS, KNOWLEDGE_SHORT, PHYSICAL_KEYS, PHYSICAL_LABEL } from '../data/balance';
import { BOSS_LINES } from '../data/dialogue';
import { ensureAvatar } from '../gfx/Avatar';
import { drawBackdrop } from '../gfx/Backdrop';
import { SkyLayer } from '../gfx/Sky';
import { game } from '../systems/GameState';
import { Sfx } from '../systems/Sfx';
import { enablePause } from './PauseScene';
import { Button, drawRadar, modal, txt } from '../ui/Widgets';

const HORIZON = 330;

export class EndingScene extends Phaser.Scene {
  constructor() {
    super(SCENE.ending);
  }

  create(): void {
    enablePause(this);
    const result = game.lastBossResult ?? { won: game.badges.champion, reasons: [] };
    const won = result.won;

    const sky = new SkyLayer(this, HORIZON);
    sky.set(won ? 0.05 : 0.9);
    this.add.tileSprite(0, HORIZON, GAME_WIDTH, GAME_HEIGHT - HORIZON, 'tile-ground').setOrigin(0).setDepth(-50);
    this.add.tileSprite(0, 390, GAME_WIDTH, 110, 'tile-plaza').setOrigin(0).setDepth(-49);
    drawBackdrop(this, HORIZON, { treeY: 42, tint: won ? undefined : 0xaab0cc });
    this.add.image(160, HORIZON + 12, 'bld-gym').setOrigin(0.5, 1).setDepth(-40);
    this.add.image(800, HORIZON + 12, 'bld-athens').setOrigin(0.5, 1).setDepth(-40);
    if (won) {
      // bình minh rực rỡ
      this.tweens.addCounter({ from: 0.05, to: 0.3, duration: 6000, onUpdate: (tw) => sky.set(tw.getValue() ?? 0.3) });
      this.add.particles(0, 0, 'spark', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 0, max: HORIZON },
        lifespan: 1800,
        alpha: { start: 1, end: 0 },
        scale: { start: 1.4, end: 0.2 },
        quantity: 2,
        frequency: 120,
      }).setDepth(-45);
    }
    const av = this.add.image(GAME_WIDTH / 2, 480, ensureAvatar(this, game.stats.stats, won ? 'happy' : 'tired', 2)).setOrigin(0.5, 1).setDepth(10);
    if (won) this.tweens.add({ targets: av, y: 470, duration: 350, yoyo: true, repeat: -1 });

    // ─── Bảng kết quả ───
    const px0 = 30;
    const py0 = 16;
    const pw = GAME_WIDTH - 60;
    const ph = 300;
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(won ? C.goldHex : C.borderHex, 1).fillRect(px0, py0, pw, ph);
    g.fillStyle(0x0b0716, 0.94).fillRect(px0 + 4, py0 + 4, pw - 8, ph - 8);
    txt(this, GAME_WIDTH / 2, py0 + 10, won ? '★  CHIẾN THẮNG — CHẤT ĐÃ ĐỔI  ★' : 'CHƯA VƯỢT QUA — LƯỢNG CHƯA ĐỦ', 34, won ? C.gold : C.red).setOrigin(0.5, 0).setDepth(21);
    txt(this, GAME_WIDTH / 2, py0 + 50, won ? BOSS_LINES.win : BOSS_LINES.lose, 18, C.cream, { wordWrap: { width: 820 }, align: 'center' }).setOrigin(0.5, 0).setDepth(21);

    // cột trái: thống kê & lý do
    let y = py0 + 96;
    txt(this, px0 + 24, y, `Tổng ${BALANCE.totalDays} ngày:  🏋 Gym ${game.totalGym}  ·  📖 Học ${game.totalStudy}  ·  Lần thử boss: ${game.bossAttempts}${game.newGamePlus ? `  ·  NG+${game.newGamePlus}` : ''}`, 19, C.cream).setDepth(21);
    y += 28;
    if (!won && result.reasons.length) {
      txt(this, px0 + 24, y, 'Chưa đạt ngưỡng / lý do:', 18, C.orange).setDepth(21);
      y += 24;
      const rt = txt(this, px0 + 24, y, result.reasons.join('   ·   '), 17, C.red, { wordWrap: { width: 560 }, lineSpacing: 2 }).setDepth(21);
      y += rt.height + 8;
    } else if (won) {
      txt(this, px0 + 24, y, `Mọi chỉ số đều đạt ngưỡng. Sự tích luỹ ${BALANCE.totalDays} ngày đã tạo nên bước nhảy!`, 18, C.green).setDepth(21);
      y += 28;
    }
    // huy hiệu
    const badges: Array<[string, boolean, string]> = [
      ['Vô địch', game.badges.champion, 'Vượt qua Vòng xoáy'],
      ['Cân bằng tuyệt đối', game.badges.balanced, '|Gym−Học| ≤ 2 mỗi ngày'],
      ['Học bá', game.badges.scholar, '≥30 điểm Học'],
      ['Lực sĩ', game.badges.athlete, '≥30 điểm Gym'],
    ];
    txt(this, px0 + 24, y, 'Huy hiệu:', 18, C.gray).setDepth(21);
    y += 24;
    badges.forEach(([name, has, desc], i) => {
      const bx = px0 + 30 + i * 150;
      this.add.image(bx, y + 10, has ? 'icon-badge' : 'icon-lock').setDepth(21).setAlpha(has ? 1 : 0.5);
      txt(this, bx + 16, y, name, 16, has ? C.gold : C.gray).setDepth(21);
      txt(this, bx + 16, y + 17, desc, 12, C.gray).setDepth(21);
    });

    // cột phải: radar
    const rg = this.add.graphics().setDepth(21);
    const values = [...PHYSICAL_KEYS.map((k) => game.stats.physical(k)), ...KNOWLEDGE_KEYS.map((k) => game.stats.knowledge(k))];
    const cx = px0 + pw - 150;
    const cy = py0 + 190;
    drawRadar(rg, cx, cy, 82, values, 8, won ? C.goldHex : C.greenHex);
    [...PHYSICAL_KEYS.map((k) => PHYSICAL_LABEL[k]), ...KNOWLEDGE_KEYS.map((k) => KNOWLEDGE_SHORT[k])].forEach((l, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      txt(this, cx + Math.cos(a) * 104, cy + Math.sin(a) * 98, l, 13, i < 6 ? C.orange : C.sky).setOrigin(0.5).setDepth(21);
    });

    // ─── Nút ───
    const by = GAME_HEIGHT - 40;
    txt(this, px0 + 24, GAME_HEIGHT - 100, `Người chơi: ${game.playerName} — kết quả đã được ghi nhận.`, 15, C.gray).setDepth(21);
    if (!won) {
      new Button(this, 190, by, 'THỬ LẠI THỬ THÁCH', () => this.retryBoss(), { w: 250, h: 46, fill: C.redHex, size: 20 }).setDepth(30);
    } else {
      new Button(this, 190, by, `HỒI KÝ ${BALANCE.totalDays} NGÀY`, () => this.showDiary(), { w: 250, h: 46, fill: C.blueHex, size: 20 }).setDepth(30);
    }
    new Button(this, GAME_WIDTH / 2, by, won ? 'NEW GAME+ (giữ huy hiệu)' : `HỒI KÝ ${BALANCE.totalDays} NGÀY`, () => (won ? this.newGamePlus() : this.showDiary()), { w: 270, h: 46, size: 20 }).setDepth(30);
    new Button(this, GAME_WIDTH - 190, by, won ? 'VỀ MÀN HÌNH CHÍNH' : 'NEW GAME+ (giữ huy hiệu)', () => (won ? this.toTitle() : this.newGamePlus()), { w: 250, h: 46, size: 20 }).setDepth(30);

    this.cameras.main.fadeIn(600, 0, 0, 0);
    Sfx.playBgm(won ? 'win' : 'night', won ? 140 : 90);
  }

  private retryBoss(): void {
    game.phase = 'boss';
    game.lastBossResult = null;
    game.save();
    Sfx.stopBgm();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.boss));
  }

  private newGamePlus(): void {
    game.newGame(true);
    Sfx.stopBgm();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.town));
  }

  private toTitle(): void {
    Sfx.stopBgm();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.title));
  }

  private showDiary(): void {
    const m = modal(this, 800, 460);
    m.root.add(txt(this, 0, -210, `HỒI KÝ ${BALANCE.totalDays} NGÀY`, 30, C.gold).setOrigin(0.5));
    const lines = game.day.log.length ? game.day.log.map((r) => r.diary) : ['(Chưa có nhật ký)'];
    m.root.add(txt(this, -380, -170, lines.join('\n'), 17, C.cream, { wordWrap: { width: 760 }, lineSpacing: 3 }));
    m.root.add(txt(this, 0, 150, `${BALANCE.totalDays} ngày · ${BALANCE.totalDays * BALANCE.pointsPerDay} điểm đầu ngày`, 15, C.gray).setOrigin(0.5));
    m.root.add(new Button(this, 0, 195, 'ĐÓNG', () => m.close(), { w: 180, h: 42, size: 20 }));
  }
}
