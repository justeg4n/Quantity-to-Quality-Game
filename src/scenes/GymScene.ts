import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE, PHYSICAL_KEYS, PHYSICAL_LABEL } from '../data/balance';
import { TRAINER_LINES } from '../data/dialogue';
import { EXERCISES } from '../data/exercises';
import type { PhysicalKey } from '../data/types';
import { ensureAvatar } from '../gfx/Avatar';
import { game } from '../systems/GameState';
import { Sfx } from '../systems/Sfx';
import { enablePause } from './PauseScene';
import { Button, PointsHud, SpeechBubble, StatBar, floatText, modal, txt } from '../ui/Widgets';

interface GymReturn {
  trained?: PhysicalKey;
  bonus?: boolean;
  combo?: boolean;
}

export class GymScene extends Phaser.Scene {
  private hud!: PointsHud;
  private bars: Partial<Record<PhysicalKey, StatBar>> = {};
  private avatar!: Phaser.GameObjects.Image;
  private bubble!: SpeechBubble;
  private machines: Phaser.GameObjects.Container[] = [];

  constructor() {
    super(SCENE.gym);
  }

  create(data: GymReturn): void {
    enablePause(this);
    this.bars = {};
    this.machines = [];
    game.gymVisits += 1;

    // ─── Nội thất ───
    this.add.rectangle(0, 0, GAME_WIDTH, 200, 0x1d3557).setOrigin(0);
    this.add.rectangle(0, 196, GAME_WIDTH, 8, 0x0b0716).setOrigin(0);
    this.add.tileSprite(0, 204, GAME_WIDTH, GAME_HEIGHT - 204, 'tile-gymfloor').setOrigin(0);
    // đèn trần
    for (const lx of [340, 620]) {
      this.add.rectangle(lx, 64, 60, 8, 0xffd166).setOrigin(0.5);
      this.add.rectangle(lx, 68, 90, 60, 0xffd166, 0.06).setOrigin(0.5, 0);
    }
    // poster động lực
    const poster = this.add.graphics();
    poster.fillStyle(0xe63946, 1).fillRect(400, 40, 150, 100);
    poster.fillStyle(0x0b0716, 1).fillRect(406, 46, 138, 88);
    txt(this, 475, 70, 'NO PAIN', 24, C.red).setOrigin(0.5);
    txt(this, 475, 100, 'NO CHẤT', 24, C.gold).setOrigin(0.5);
    this.add.image(475, 125, 'icon-dumbbell').setScale(0.8);
    txt(this, GAME_WIDTH / 2, 160, 'W H E Y S T A T I O N', 30, C.white, { stroke: '#0b0716', strokeThickness: 4 }).setOrigin(0.5);

    // ─── HLV ───
    this.add.image(90, 330, 'npc-trainer').setOrigin(0.5, 1).setScale(1.6);
    txt(this, 90, 336, 'HLV WHEY', 18, C.gold).setOrigin(0.5, 0);
    this.bubble = new SpeechBubble(this, 30, 120, 260);
    this.bubble.say(this.trainerLine(data));

    // ─── Máy tập ───
    const cols = [250, 390, 530];
    const rows = [290, 440];
    PHYSICAL_KEYS.forEach((k, i) => {
      const x = cols[i % 3];
      const y = rows[Math.floor(i / 3)];
      this.machines.push(this.makeMachine(k, x, y));
    });

    // ─── Panel chỉ số + avatar ───
    const px0 = 660;
    const pg = this.add.graphics();
    pg.fillStyle(C.borderHex, 1).fillRect(px0 - 10, 210, 300, 320);
    pg.fillStyle(C.panel, 1).fillRect(px0 - 6, 214, 292, 312);
    txt(this, px0 + 140, 222, 'THỂ CHẤT', 22, C.orange).setOrigin(0.5, 0);
    PHYSICAL_KEYS.forEach((k, i) => {
      this.bars[k] = new StatBar(this, px0 + 4, 262 + i * 30, PHYSICAL_LABEL[k], game.stats.physical(k), 0, C.orangeHex, 210);
    });
    this.avatar = this.add.image(px0 + 140, 520, ensureAvatar(this, game.stats.stats, 'flex', 2)).setOrigin(0.5, 1);
    this.time.addEvent({ delay: 700, loop: true, callback: () => this.avatar.setTexture(ensureAvatar(this, game.stats.stats, this.avatar.texture.key.includes('flex') ? 'idle' : 'flex', 2)) });

    // ─── HUD ───
    this.hud = new PointsHud(this, 16, 12, BALANCE.pointsPerDay);
    this.hud.set(game.day.currentDay, game.pointsLeft, BALANCE.totalDays);
    new Button(this, GAME_WIDTH - 110, 30, '◀ QUẢNG TRƯỜNG', () => this.leave(), { w: 200, h: 40, size: 20 });

    if (data?.trained) {
      const k = data.trained;
      this.time.delayedCall(200, () => {
        floatText(this, px0 + 140, 300, `+1 ${PHYSICAL_LABEL[k]}!`, C.green, 30);
        Sfx.statUp();
        if (data.bonus) this.time.delayedCall(600, () => floatText(this, px0 + 140, 330, `COMBO BONUS +1 ${PHYSICAL_LABEL[k]}!`, C.gold, 26));
      });
    }
    if (game.pointsLeft === 0) {
      this.time.delayedCall(1200, () => this.bubble.say('Hết điểm hôm nay rồi. Về nghỉ đi, mai tập tiếp!'));
    }
    this.cameras.main.fadeIn(300, 0, 0, 0);
    Sfx.playBgm('gym', 150);
  }

  private trainerLine(data: GymReturn): string {
    if (data?.combo) return 'COMBO! Form chuẩn như sách giáo khoa. Cứ thế mà phát huy!';
    if (data?.trained) return `Xong bài ${EXERCISES[data.trained].name}. ${PHYSICAL_LABEL[data.trained]} +1. Tiếp không?`;
    const idx = (game.gymVisits - 1) % TRAINER_LINES.length;
    return TRAINER_LINES[idx];
  }

  private makeMachine(k: PhysicalKey, x: number, y: number): Phaser.GameObjects.Container {
    const ex = EXERCISES[k];
    const c = this.add.container(x, y);
    const glow = this.add.rectangle(0, -10, 120, 120, 0xffd166, 0).setOrigin(0.5);
    c.add(glow);
    const img = this.add.image(0, 0, `machine-${k}`).setOrigin(0.5, 1).setScale(2);
    c.add(img);
    c.add(txt(this, 0, 6, `${PHYSICAL_LABEL[k].toUpperCase()}`, 22, C.gold).setOrigin(0.5, 0));
    c.add(txt(this, 0, 28, ex.name, 15, C.cream).setOrigin(0.5, 0));
    c.add(txt(this, 0, 44, ex.mode === 'mash' ? '[bấm liên tục]' : '[canh thời điểm]', 13, C.gray).setOrigin(0.5, 0));
    const v = game.stats.physical(k);
    c.add(txt(this, 46, -92, `${v}`, 20, C.gold, { stroke: '#0b0716', strokeThickness: 3 }).setOrigin(0.5));
    c.setSize(120, 130);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => { glow.setFillStyle(0xffd166, 0.12); Sfx.hover(); });
    c.on('pointerout', () => glow.setFillStyle(0xffd166, 0));
    c.on('pointerup', () => this.select(k));
    return c;
  }

  private select(k: PhysicalKey): void {
    Sfx.unlock();
    Sfx.click();
    if (game.pointsLeft === 0) {
      this.bubble.say('Hết điểm rồi! Ra quảng trường kết thúc ngày đi.');
      return;
    }
    const ex = EXERCISES[k];
    const m = modal(this, 640, 280);
    m.root.add(this.add.image(-250, -50, `machine-${k}`).setScale(2));
    m.root.add(txt(this, -170, -115, `${ex.name}  —  nhóm cơ ${PHYSICAL_LABEL[k]}`, 26, C.gold));
    m.root.add(
      txt(
        this,
        -170,
        -80,
        ex.mode === 'mash'
          ? `Cơ chế MASH: bấm SPACE liên tục, đủ ${ex.mashPerRep} lần trong ${(ex.repWindowMs! / 1000).toFixed(1)}s = 1 rep. Bấm nhanh → PERFECT. Cần đủ ${ex.repsRequired} rep.`
          : `Cơ chế TIMING: con trỏ chạy trên thanh tạ, bấm SPACE khi vào vùng xanh (PERFECT) ở giữa. Cần đủ ${ex.repsRequired} rep.`,
        18,
        C.cream,
        { lineSpacing: 4, wordWrap: { width: 460 } },
      ),
    );
    m.root.add(txt(this, -170, 2, `Hiện tại: ${PHYSICAL_LABEL[k]} = ${game.stats.physical(k)}`, 20, C.orange));
    m.root.add(txt(this, -170, 28, 'Tốn 1 điểm đầu ngày', 20, C.red));
    m.root.add(new Button(this, -115, 95, 'TẬP  (−1 ⌛)', () => { m.close(); this.startExercise(k); }, { w: 210, h: 46, fill: C.greenHex, color: C.dark }));
    m.root.add(new Button(this, 115, 95, 'HUỶ', () => m.close(), { w: 210, h: 46 }));
  }

  private startExercise(k: PhysicalKey): void {
    const spentIndex = game.pointsLeft - 1;
    if (!game.spend('gym')) return;
    this.hud.spend(spentIndex);
    Sfx.stopBgm();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.exercise, { muscle: k }));
  }

  private leave(): void {
    Sfx.door();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.town, { from: 'gym' }));
  }
}
