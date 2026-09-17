import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE, KNOWLEDGE_KEYS, KNOWLEDGE_SHORT, PHYSICAL_KEYS, PHYSICAL_LABEL } from '../data/balance';
import { dayFlavor } from '../data/dialogue';
import { ensureAvatar } from '../gfx/Avatar';
import { SkyLayer } from '../gfx/Sky';
import { game } from '../systems/GameState';
import { Sfx } from '../systems/Sfx';
import { Button, drawRadar, txt } from '../ui/Widgets';

const HORIZON = 330;

export class DayEndScene extends Phaser.Scene {
  private sky!: SkyLayer;
  private summary!: Phaser.GameObjects.Container;

  constructor() {
    super(SCENE.dayEnd);
  }

  create(): void {
    const dayNum = game.day.currentDay;
    const gymN = game.day.gymToday;
    const studyN = game.day.studyToday;
    const { diary, goBoss } = game.endDay();

    this.sky = new SkyLayer(this, HORIZON);
    this.sky.set(1);
    this.add.tileSprite(0, HORIZON, GAME_WIDTH, GAME_HEIGHT - HORIZON, 'tile-ground').setOrigin(0).setDepth(-50).setTint(0x556677);
    this.add.tileSprite(0, 390, GAME_WIDTH, 110, 'tile-plaza').setOrigin(0).setDepth(-49).setTint(0x778899);
    this.add.image(160, HORIZON + 12, 'bld-gym').setOrigin(0.5, 1).setDepth(-40).setTint(0x8899bb);
    this.add.image(800, HORIZON + 12, 'bld-athens').setOrigin(0.5, 1).setDepth(-40).setTint(0x8899bb);
    for (const lx of [330, 630]) {
      this.add.image(lx, 406, 'lamp').setOrigin(0.5, 1).setDepth(-30);
      const l = this.add.image(lx, 348, 'sun').setScale(2.2).setAlpha(0.3).setDepth(-31).setTint(0xffd166);
      this.tweens.add({ targets: l, alpha: 0.42, duration: 900, yoyo: true, repeat: -1 });
    }
    const av = this.add.image(GAME_WIDTH / 2, 470, ensureAvatar(this, game.stats.stats, 'tired', 2)).setOrigin(0.5, 1).setDepth(10);
    this.tweens.add({ targets: av, scaleY: 0.97, duration: 1200, yoyo: true, repeat: -1 });

    // ─── Bảng tổng kết ───
    const summary = this.add.container(0, 0).setDepth(20);
    this.summary = summary;
    const px0 = 40;
    const py0 = 24;
    const pw = GAME_WIDTH - 80;
    const ph = 290;
    const g = this.add.graphics();
    summary.add(g);
    g.fillStyle(C.borderHex, 1).fillRect(px0, py0, pw, ph);
    g.fillStyle(0x0b0716, 0.92).fillRect(px0 + 4, py0 + 4, pw - 8, ph - 8);
    summary.add(txt(this, GAME_WIDTH / 2, py0 + 12, `TỔNG KẾT NGÀY ${dayNum}`, 32, C.gold).setOrigin(0.5, 0));
    summary.add(txt(this, px0 + 24, py0 + 60, `Điểm đã dùng:  🏋 Gym ${gymN}   ·   📖 Học ${studyN}`, 22, C.cream));
    summary.add(txt(this, px0 + 24, py0 + 92, dayFlavor(gymN, studyN), 20, C.sky, { wordWrap: { width: 470 } }));
    summary.add(txt(this, px0 + 24, py0 + 150, 'Nhật ký:', 18, C.gray));
    summary.add(txt(this, px0 + 24, py0 + 172, diary, 19, C.cream, { wordWrap: { width: 470 }, fontStyle: 'italic' }));
    summary.add(txt(this, px0 + 24, py0 + 228, `Tổng: Gym ${game.totalGym} · Học ${game.totalStudy}   ·   Còn ${Math.max(0, BALANCE.totalDays - dayNum)} ngày`, 18, C.gray));

    // Radar chart 12 trục
    const rg = this.add.graphics();
    summary.add(rg);
    const values = [...PHYSICAL_KEYS.map((k) => game.stats.physical(k)), ...KNOWLEDGE_KEYS.map((k) => game.stats.knowledge(k))];
    const cx = px0 + pw - 170;
    const cy = py0 + 150;
    drawRadar(rg, cx, cy, 95, values, 8, C.greenHex);
    const labels = [...PHYSICAL_KEYS.map((k) => PHYSICAL_LABEL[k]), ...KNOWLEDGE_KEYS.map((k) => KNOWLEDGE_SHORT[k])];
    labels.forEach((l, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      summary.add(txt(this, cx + Math.cos(a) * 118, cy + Math.sin(a) * 112, l, 14, i < 6 ? C.orange : C.sky).setOrigin(0.5));
    });

    const btn = new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 40, goBoss ? 'NGỦ... NGÀY MAI LÀ NGÀY THỬ THÁCH' : 'NGỦ ▶ NGÀY MỚI', () => this.sleep(goBoss), {
      w: goBoss ? 420 : 260,
      h: 48,
      fill: goBoss ? C.redHex : C.blueHex,
    });
    summary.add(btn);
    btn.setAlpha(0);
    this.tweens.add({ targets: btn, alpha: 1, delay: 800, duration: 400 });

    this.cameras.main.fadeIn(500, 0, 0, 0);
    Sfx.playBgm('night', 90);
  }

  private sleep(goBoss: boolean): void {
    Sfx.stopBgm();
    const black = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setOrigin(0).setDepth(100);
    this.tweens.add({
      targets: black,
      alpha: 1,
      duration: 700,
      onComplete: () => {
        this.summary.destroy();
        const label = txt(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, goBoss ? '...' : `NGÀY ${game.day.currentDay}`, 48, C.white).setOrigin(0.5).setDepth(101);
        this.tweens.add({ targets: black, alpha: 0, delay: 900, duration: 900 });
        this.tweens.add({ targets: label, alpha: 0, delay: 900, duration: 900 });
        if (goBoss) {
          // Trời chuyển đỏ, rung: NGÀY THỬ THÁCH
          this.time.delayedCall(900, () => {
            Sfx.alarm();
            this.sky.set(2);
            this.cameras.main.shake(1200, 0.01);
            const warn = txt(this, GAME_WIDTH / 2, 150, 'NGÀY THỬ THÁCH', 72, C.red, { stroke: '#000000', strokeThickness: 8 }).setOrigin(0.5).setDepth(102).setScale(0.2);
            this.tweens.add({ targets: warn, scale: 1, duration: 500, ease: 'Back.Out' });
            txt(this, GAME_WIDTH / 2, 215, 'VÒNG XOÁY BIỆN CHỨNG ĐANG ĐẾN...', 26, C.white, { stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5).setDepth(102);
            this.time.delayedCall(2600, () => {
              this.cameras.main.fadeOut(600, 60, 0, 0);
              this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.boss));
            });
          });
        } else {
          Sfx.sunrise();
          this.tweens.addCounter({
            from: 1,
            to: 0,
            duration: 2200,
            delay: 600,
            onUpdate: (tw) => this.sky.set(tw.getValue() ?? 0),
            onComplete: () => {
              this.cameras.main.fadeOut(400, 0, 0, 0);
              this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.town));
            },
          });
        }
      },
    });
  }
}
