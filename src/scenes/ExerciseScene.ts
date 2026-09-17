import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { PHYSICAL_LABEL } from '../data/balance';
import { EXERCISES } from '../data/exercises';
import type { PhysicalKey } from '../data/types';
import { ensureAvatar, type Pose } from '../gfx/Avatar';
import { ExerciseEngine, TIMING_ZONES, type RepGrade } from '../systems/ExerciseEngine';
import { game } from '../systems/GameState';
import { Sfx } from '../systems/Sfx';
import { enablePause } from './PauseScene';
import { bindAction } from '../ui/ActionInput';
import { ActionButton, Button, floatText, modal, txt } from '../ui/Widgets';

const BAR_X = 300;
const BAR_Y = 470;
const BAR_W = 360;
const BAR_H = 28;

export class ExerciseScene extends Phaser.Scene {
  private muscle!: PhysicalKey;
  private engine!: ExerciseEngine;
  private avatar!: Phaser.GameObjects.Image;
  private poseA!: Pose;
  private poseB!: Pose;
  private toggle = false;
  private repText!: Phaser.GameObjects.Text;
  private gradeBoxes: Phaser.GameObjects.Rectangle[] = [];
  private streakText!: Phaser.GameObjects.Text;
  private coachText!: Phaser.GameObjects.Text;
  private barG!: Phaser.GameObjects.Graphics;
  private video: Phaser.GameObjects.Video | null = null;
  private unbind: (() => void) | null = null;
  private actionBtn!: ActionButton;
  private finished = false;
  private sweat: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor() {
    super(SCENE.exercise);
  }

  create(data: { muscle: PhysicalKey }): void {
    enablePause(this);
    this.muscle = data.muscle;
    this.finished = false;
    this.gradeBoxes = [];
    const ex = EXERCISES[this.muscle];
    this.engine = new ExerciseEngine(ex);
    this.poseA = `${this.muscle}_a` as Pose;
    this.poseB = `${this.muscle}_b` as Pose;

    // ─── Nền ───
    this.add.rectangle(0, 0, GAME_WIDTH, 200, 0xeaf2fc).setOrigin(0);
    this.add.rectangle(0, 176, GAME_WIDTH, 20, 0x2f7fe0).setOrigin(0);
    this.add.rectangle(0, 196, GAME_WIDTH, 8, 0x1b5fb8).setOrigin(0);
    this.add.tileSprite(0, 204, GAME_WIDTH, GAME_HEIGHT - 204, 'tile-gymfloor').setOrigin(0);
    txt(this, GAME_WIDTH / 2, 22, `${ex.name.toUpperCase()}  ·  ${PHYSICAL_LABEL[this.muscle].toUpperCase()}`, 30, C.gold, { stroke: '#0b0716', strokeThickness: 4 }).setOrigin(0.5, 0);
    txt(
      this,
      GAME_WIDTH / 2,
      56,
      ex.mode === 'mash' ? `Bấm SPACE / chạm liên tục — ${ex.mashPerRep} lần = 1 rep. Nhanh = PERFECT!` : 'Bấm SPACE / chạm khi con trỏ vào vùng XANH ở giữa thanh tạ!',
      20,
      '#123f7a',
    ).setOrigin(0.5, 0);

    // ─── Khung TV + video HLV ───
    this.add.image(150, 300, 'tv-frame');
    txt(this, 150, 138, 'HLV DEMO', 18, '#123f7a').setOrigin(0.5);
    // Màn hình TV: vùng 204x236 tại tâm (150, 288); video/poster bị cắt (mask) đúng vùng này
    const screenMask = this.make.graphics({ x: 0, y: 0 }, false);
    screenMask.fillStyle(0xffffff, 1).fillRect(150 - 102, 288 - 118, 204, 236);
    const mask = screenMask.createGeometryMask();
    this.add.image(150, 288, `poster-${this.muscle}`).setDisplaySize(150, 236).setAlpha(0.6).setMask(mask);
    if (this.cache.video.exists(`vid-${this.muscle}`)) {
      this.video = this.add.video(150, 288, `vid-${this.muscle}`);
      this.video.setLoop(true);
      this.video.setMute(true);
      this.video.setMask(mask);
      this.video.play(true);
      this.fitVideo();
      this.video.on('created', () => this.fitVideo());
      this.video.on('metadata', () => this.fitVideo());
    }

    // ─── Avatar ───
    this.avatar = this.add.image(480, 440, ensureAvatar(this, game.stats.stats, this.poseA, 5)).setOrigin(0.5, 1);
    this.sweat = this.add.particles(480, 300, 'sweat', {
      speedX: { min: -60, max: 60 },
      speedY: { min: 40, max: 120 },
      lifespan: 700,
      quantity: 1,
      frequency: 180,
      alpha: { start: 1, end: 0 },
      emitting: false,
    });

    // ─── Panel phải ───
    const px0 = 690;
    const pg = this.add.graphics();
    pg.fillStyle(C.borderHex, 1).fillRect(px0 - 10, 90, 270, 330);
    pg.fillStyle(C.panel, 1).fillRect(px0 - 6, 94, 262, 322);
    this.repText = txt(this, px0 + 125, 108, '', 40, C.white).setOrigin(0.5, 0);
    for (let i = 0; i < ex.repsRequired; i++) {
      const r = this.add.rectangle(px0 + 22 + i * 40, 175, 30, 30, 0x2a1d4a).setStrokeStyle(2, 0xf6d8a8);
      this.gradeBoxes.push(r);
    }
    this.streakText = txt(this, px0 + 125, 200, '', 22, C.gold).setOrigin(0.5, 0);
    txt(this, px0 + 4, 240, 'Chấm điểm rep:', 18, C.gray);
    const lg = this.add.graphics();
    let lx = px0 + 6;
    for (const [label, col] of [['PERFECT', C.greenHex], ['GOOD', C.goldHex], ['HỎNG FORM', C.redHex]] as Array<[string, number]>) {
      lg.fillStyle(col, 1).fillRect(lx, 268, 12, 12);
      const t = txt(this, lx + 16, 262, label, 17, C.cream);
      lx += 16 + t.width + 14;
    }
    this.coachText = txt(this, px0 + 4, 300, 'HLV: Bắt đầu khi sẵn sàng!', 19, C.cream, { wordWrap: { width: 250 } });
    this.updateRepUi();

    // ─── Thanh nhập liệu ───
    this.barG = this.add.graphics();
    this.actionBtn = new ActionButton(this, () => this.press(), ex.mode === 'mash' ? 'BẤM LIÊN TỤC!' : 'BẤM!');
    this.unbind = bindAction(this, () => this.press());

    // ─── Sự kiện engine ───
    this.engine
      .on('rep', (g, i) => this.onRep(g, i))
      .on('combo', () => {
        Sfx.combo();
        floatText(this, 480, 230, 'COMBO x1.5!', C.gold, 36);
        this.coachText.setText('HLV: COMBO! Giữ nhịp này tới hết bài!');
        this.cameras.main.flash(200, 255, 209, 102);
      })
      .on('badStreak', () => {
        this.coachText.setText('HLV: Giữ form đi! Chậm lại một chút cũng được.');
        this.cameras.main.shake(150, 0.004);
      })
      .on('done', () => this.finish());

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.events.once('shutdown', () => this.unbind?.());
  }

  private press(): void {
    if (this.finished) return;
    Sfx.unlock();
    this.engine.press();
    this.actionBtn.flash();
    if (this.engine.mode === 'mash') {
      this.toggle = !this.toggle;
      this.avatar.setTexture(ensureAvatar(this, game.stats.stats, this.toggle ? this.poseB : this.poseA, 5));
      this.tweens.add({ targets: this.avatar, scaleX: 1.04, scaleY: 0.97, duration: 60, yoyo: true });
    }
  }

  private onRep(grade: RepGrade, i: number): void {
    const box = this.gradeBoxes[i - 1];
    if (box) box.setFillStyle(grade === 'perfect' ? C.greenHex : grade === 'good' ? C.goldHex : C.redHex);
    if (grade === 'perfect') {
      Sfx.perfect();
      floatText(this, 480, 250, 'PERFECT!', C.green, 32);
    } else if (grade === 'good') {
      Sfx.good();
      floatText(this, 480, 250, 'GOOD', C.gold, 28);
    } else {
      Sfx.bad();
      floatText(this, 480, 250, 'HỎNG FORM', C.red, 26);
    }
    this.tweens.add({ targets: this.avatar, y: 430, duration: 90, yoyo: true });
    if (this.engine.mode === 'timing') {
      this.avatar.setTexture(ensureAvatar(this, game.stats.stats, this.poseB, 5));
      this.time.delayedCall(250, () => { if (!this.finished) this.avatar.setTexture(ensureAvatar(this, game.stats.stats, this.poseA, 5)); });
    }
    if (i >= 3 && this.sweat) this.sweat.start();
    this.updateRepUi();
  }

  private updateRepUi(): void {
    this.repText.setText(`REP ${Math.min(this.engine.reps, this.engine.repsRequired)} / ${this.engine.repsRequired}`);
    const s = this.engine.perfectStreak;
    this.streakText.setText(s > 0 ? `PERFECT x${s}${s >= 3 ? '  ★ COMBO' : ''}` : '');
  }

  /** Ép video vừa chiều cao màn hình TV (Phaser reset kích thước khi texture video được tạo) */
  private fitVideo(): void {
    if (!this.video || this.video.width <= 0 || this.video.height <= 0) return;
    const targetH = 236;
    const ar = this.video.width / this.video.height;
    let w = targetH * ar;
    let h = targetH;
    if (w > 204) {
      w = 204;
      h = 204 / ar;
    }
    if (Math.abs(this.video.displayHeight - h) > 0.5 || Math.abs(this.video.displayWidth - w) > 0.5) {
      this.video.setDisplaySize(w, h);
    }
  }

  update(_t: number, delta: number): void {
    this.fitVideo();
    if (this.finished) return;
    this.engine.update(delta);
    this.drawBar();
  }

  private drawBar(): void {
    const g = this.barG;
    g.clear();
    // khung
    g.fillStyle(C.borderHex, 1).fillRect(BAR_X - 4, BAR_Y - 4, BAR_W + 8, BAR_H + 8);
    g.fillStyle(0x0b0716, 1).fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);
    if (this.engine.mode === 'mash') {
      // thanh form (tiến độ rep)
      const p = this.engine.progress;
      g.fillStyle(p > 0.99 ? C.greenHex : C.goldHex, 1).fillRect(BAR_X, BAR_Y, BAR_W * p, BAR_H);
      // thanh thời gian còn lại
      const t = this.engine.timeLeft;
      g.fillStyle(C.borderHex, 1).fillRect(BAR_X - 4, BAR_Y + BAR_H + 10, BAR_W + 8, 14);
      g.fillStyle(0x0b0716, 1).fillRect(BAR_X, BAR_Y + BAR_H + 14, BAR_W, 6);
      g.fillStyle(t > 0.3 ? C.skyHex : C.redHex, 1).fillRect(BAR_X, BAR_Y + BAR_H + 14, BAR_W * t, 6);
    } else {
      // vùng good / perfect
      const gx = BAR_X + BAR_W * TIMING_ZONES.goodMin;
      const gw = BAR_W * (TIMING_ZONES.goodMax - TIMING_ZONES.goodMin);
      const pxx = BAR_X + BAR_W * TIMING_ZONES.perfectMin;
      const pw = BAR_W * (TIMING_ZONES.perfectMax - TIMING_ZONES.perfectMin);
      g.fillStyle(C.goldHex, 0.55).fillRect(gx, BAR_Y, gw, BAR_H);
      g.fillStyle(C.greenHex, 1).fillRect(pxx, BAR_Y, pw, BAR_H);
      // "thanh tạ" trang trí
      g.fillStyle(0x8d99ae, 1).fillRect(BAR_X - 30, BAR_Y + 8, 26, 12).fillRect(BAR_X + BAR_W + 4, BAR_Y + 8, 26, 12);
      // con trỏ
      const cx = BAR_X + BAR_W * this.engine.cursor;
      g.fillStyle(0xffffff, 1).fillRect(cx - 4, BAR_Y - 10, 8, BAR_H + 20);
      g.fillStyle(this.engine.inPerfectZone ? C.greenHex : C.redHex, 1).fillRect(cx - 2, BAR_Y - 8, 4, BAR_H + 16);
      // avatar theo con trỏ
      if (!this.finished) {
        const pose = this.engine.cursor > 0.5 ? this.poseB : this.poseA;
        const key = ensureAvatar(this, game.stats.stats, pose, 5);
        if (this.avatar.texture.key !== key && !this.tweens.isTweening(this.avatar)) this.avatar.setTexture(key);
      }
    }
  }

  private finish(): void {
    this.finished = true;
    this.unbind?.();
    this.actionBtn.setVisible(false);
    this.sweat?.stop();
    this.barG.clear();
    const summary = this.engine;
    // +1 điểm khả năng (luật gốc). Combo: cứ 2 combo => +1 phụ trội.
    game.stats.addPhysical(this.muscle, 1);
    let bonus = false;
    if (summary.comboAchieved) bonus = game.registerCombo();
    if (bonus) game.stats.addPhysical(this.muscle, 1);
    game.save();
    Sfx.statUp();
    this.avatar.setTexture(ensureAvatar(this, game.stats.stats, 'flex', 5));
    this.cameras.main.flash(300, 6, 214, 160);

    this.time.delayedCall(500, () => {
      const m = modal(this, 520, 300);
      m.root.add(txt(this, 0, -115, 'HOÀN THÀNH LƯỢT TẬP!', 32, C.green).setOrigin(0.5));
      m.root.add(txt(this, 0, -70, `+1 ${PHYSICAL_LABEL[this.muscle]}  →  ${game.stats.physical(this.muscle)}`, 30, C.gold).setOrigin(0.5));
      m.root.add(
        txt(this, 0, -30, `Perfect ${summary.perfect} · Good ${summary.good} · Hỏng form ${summary.bad}`, 20, C.cream).setOrigin(0.5),
      );
      if (summary.comboAchieved) {
        m.root.add(
          txt(
            this,
            0,
            2,
            bonus ? `★ COMBO ×2 tích luỹ → +1 ${PHYSICAL_LABEL[this.muscle]} phụ trội!` : `★ Combo đạt! (${game.comboCount % 2}/2 tới điểm phụ trội)`,
            20,
            C.gold,
          ).setOrigin(0.5),
        );
      }
      m.root.add(
        txt(this, 0, 36, `Lượng tích luỹ: mỗi rep là một đơn vị nhỏ,\nđủ nhiều thì cơ bắp "đổi chất".`, 17, C.gray, { align: 'center' }).setOrigin(0.5),
      );
      m.root.add(new Button(this, 0, 105, 'VỀ PHÒNG GYM ▶', () => this.back(bonus, summary.comboAchieved), { w: 240, h: 48 }));
    });
  }

  private back(bonus: boolean, combo: boolean): void {
    this.video?.stop();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.gym, { trained: this.muscle, bonus, combo }));
  }
}
