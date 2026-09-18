import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE, PHYSICAL_LABEL } from '../data/balance';
import { EXERCISES, MODE_INFO } from '../data/exercises';
import type { PhysicalKey } from '../data/types';
import { ensureAvatar, type Pose } from '../gfx/Avatar';
import {
  AlternateEngine,
  HOLD_ZONES,
  HoldEngine,
  MashEngine,
  RhythmEngine,
  SequenceEngine,
  TIMING_ZONES,
  TimingEngine,
  createExerciseEngine,
  type Dir,
  type ExerciseEngine,
  type RepGrade,
} from '../systems/ExerciseEngine';
import { game } from '../systems/GameState';
import { Sfx } from '../systems/Sfx';
import { enablePause } from './PauseScene';
import { bindAction, bindDirKeys, bindHold } from '../ui/ActionInput';
import { ActionButton, Button, floatText, modal, txt } from '../ui/Widgets';

const BAR_X = 300;
const BAR_Y = 470;
const BAR_W = 360;
const BAR_H = 28;

const ARROW: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' };

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
  private barLabels: Phaser.GameObjects.Text[] = [];
  private video: Phaser.GameObjects.Video | null = null;
  private unbind: (() => void) | null = null;
  private actionBtns: ActionButton[] = [];
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
    this.barLabels = [];
    this.actionBtns = [];
    const ex = EXERCISES[this.muscle];
    this.engine = createExerciseEngine(ex);
    this.poseA = `${this.muscle}_a` as Pose;
    this.poseB = `${this.muscle}_b` as Pose;

    // ─── Nền ───
    this.add.rectangle(0, 0, GAME_WIDTH, 200, 0xeaf2fc).setOrigin(0);
    this.add.rectangle(0, 176, GAME_WIDTH, 20, 0x2f7fe0).setOrigin(0);
    this.add.rectangle(0, 196, GAME_WIDTH, 8, 0x1b5fb8).setOrigin(0);
    this.add.tileSprite(0, 204, GAME_WIDTH, GAME_HEIGHT - 204, 'tile-gymfloor').setOrigin(0);
    txt(this, GAME_WIDTH / 2, 22, `${ex.name.toUpperCase()}  ·  ${PHYSICAL_LABEL[this.muscle].toUpperCase()}`, 30, C.gold, { stroke: '#0b0716', strokeThickness: 4 }).setOrigin(0.5, 0);
    txt(this, GAME_WIDTH / 2, 56, MODE_INFO[ex.mode].howto, 19, '#123f7a', { wordWrap: { width: 700 }, align: 'center' }).setOrigin(0.5, 0);

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

    // ─── Thanh nhập liệu + nút bấm theo cơ chế ───
    this.barG = this.add.graphics();
    this.setupInput();

    // ─── Sự kiện engine ───
    this.engine
      .on('rep', (g, i) => this.onRep(g, i))
      .on('miss', () => this.onMiss())
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

  /** Gắn bàn phím + nút chạm phù hợp với cơ chế của bài tập */
  private setupInput(): void {
    const e = this.engine;
    const label = MODE_INFO[e.mode].button;
    switch (e.mode) {
      case 'hold': {
        const down = () => this.press('action');
        const up = () => this.release();
        this.actionBtns.push(new ActionButton(this, down, label, GAME_WIDTH - 120, GAME_HEIGHT - 60, { onRelease: up }));
        this.unbind = bindHold(this, down, up);
        break;
      }
      case 'alternate': {
        this.actionBtns.push(new ActionButton(this, () => this.press('left'), '◀ TRÁI', GAME_WIDTH - 190, GAME_HEIGHT - 60, { w: 120 }));
        this.actionBtns.push(new ActionButton(this, () => this.press('right'), 'PHẢI ▶', GAME_WIDTH - 60, GAME_HEIGHT - 60, { w: 120 }));
        this.unbind = bindDirKeys(this, (d) => this.press(d));
        break;
      }
      case 'sequence': {
        const bx = GAME_WIDTH - 100;
        const by = GAME_HEIGHT - 60;
        const mk = (d: Dir, x: number, y: number) => this.actionBtns.push(new ActionButton(this, () => this.press(d), ARROW[d], x, y, { w: 58, h: 50, size: 26 }));
        mk('up', bx, by - 28);
        mk('left', bx - 62, by + 26);
        mk('down', bx, by + 26);
        mk('right', bx + 62, by + 26);
        this.unbind = bindDirKeys(this, (d) => this.press(d));
        break;
      }
      default: {
        this.actionBtns.push(new ActionButton(this, () => this.press('action'), label));
        this.unbind = bindAction(this, () => this.press('action'));
      }
    }
    // nhãn tĩnh cho thanh nhập liệu (sequence: các ô mũi tên)
    if (e.mode === 'sequence') {
      const seq = e as SequenceEngine;
      seq.sequence.forEach((_, i) => {
        const t = txt(this, BAR_X + 45 + i * 90, BAR_Y + BAR_H / 2, '', 34, C.white).setOrigin(0.5);
        this.barLabels.push(t);
      });
    }
  }

  private press(input: Dir | 'action'): void {
    if (this.finished) return;
    Sfx.unlock();
    this.engine.press(input);
    if (input === 'action') this.actionBtns[0]?.flash();
    const m = this.engine.mode;
    if (m === 'mash' || m === 'alternate' || m === 'sequence') {
      this.toggle = !this.toggle;
      this.avatar.setTexture(ensureAvatar(this, game.stats.stats, this.toggle ? this.poseB : this.poseA, 5));
      this.tweens.add({ targets: this.avatar, scaleX: 1.04, scaleY: 0.97, duration: 60, yoyo: true });
    } else if (m === 'hold') {
      this.avatar.setTexture(ensureAvatar(this, game.stats.stats, this.poseB, 5));
    }
  }

  private release(): void {
    if (this.finished) return;
    this.engine.release();
    if (this.engine.mode === 'hold') this.avatar.setTexture(ensureAvatar(this, game.stats.stats, this.poseA, 5));
  }

  private onMiss(): void {
    Sfx.bad();
    const m = this.engine.mode;
    const msg = m === 'alternate' ? 'SAI TAY!' : m === 'sequence' ? 'SAI — LÀM LẠI CHUỖI' : 'LỆCH NHỊP';
    floatText(this, 480, 280, msg, C.red, 22);
    this.cameras.main.shake(80, 0.003);
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
      const m = this.engine.mode;
      floatText(this, 480, 250, m === 'hold' && (this.engine as HoldEngine).charge >= 1 ? 'QUÁ ĐÀ!' : 'HỎNG FORM', C.red, 26);
    }
    this.tweens.add({ targets: this.avatar, y: 430, duration: 90, yoyo: true });
    const m = this.engine.mode;
    if (m === 'timing' || m === 'rhythm' || m === 'hold') {
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

  // ───────────────────────── vẽ thanh nhập liệu theo cơ chế ─────────────────────────
  private drawFrame(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(C.borderHex, 1).fillRect(BAR_X - 4, BAR_Y - 4, BAR_W + 8, BAR_H + 8);
    g.fillStyle(0x0b0716, 1).fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);
  }

  private drawTimeBar(g: Phaser.GameObjects.Graphics, t: number): void {
    g.fillStyle(C.borderHex, 1).fillRect(BAR_X - 4, BAR_Y + BAR_H + 10, BAR_W + 8, 14);
    g.fillStyle(0x0b0716, 1).fillRect(BAR_X, BAR_Y + BAR_H + 14, BAR_W, 6);
    g.fillStyle(t > 0.3 ? C.skyHex : C.redHex, 1).fillRect(BAR_X, BAR_Y + BAR_H + 14, BAR_W * t, 6);
  }

  private drawBar(): void {
    const g = this.barG;
    g.clear();
    switch (this.engine.mode) {
      case 'mash':
        return this.drawMash(g, this.engine as MashEngine);
      case 'timing':
        return this.drawTiming(g, this.engine as TimingEngine);
      case 'hold':
        return this.drawHold(g, this.engine as HoldEngine);
      case 'alternate':
        return this.drawAlternate(g, this.engine as AlternateEngine);
      case 'rhythm':
        return this.drawRhythm(g, this.engine as RhythmEngine);
      case 'sequence':
        return this.drawSequence(g, this.engine as SequenceEngine);
    }
  }

  private drawMash(g: Phaser.GameObjects.Graphics, e: MashEngine): void {
    this.drawFrame(g);
    const p = e.progress;
    g.fillStyle(p > 0.99 ? C.greenHex : C.goldHex, 1).fillRect(BAR_X, BAR_Y, BAR_W * p, BAR_H);
    this.drawTimeBar(g, e.timeLeft);
  }

  private drawTiming(g: Phaser.GameObjects.Graphics, e: TimingEngine): void {
    this.drawFrame(g);
    const gx = BAR_X + BAR_W * TIMING_ZONES.goodMin;
    const gw = BAR_W * (TIMING_ZONES.goodMax - TIMING_ZONES.goodMin);
    const pxx = BAR_X + BAR_W * TIMING_ZONES.perfectMin;
    const pw = BAR_W * (TIMING_ZONES.perfectMax - TIMING_ZONES.perfectMin);
    g.fillStyle(C.goldHex, 0.55).fillRect(gx, BAR_Y, gw, BAR_H);
    g.fillStyle(C.greenHex, 1).fillRect(pxx, BAR_Y, pw, BAR_H);
    // "thanh tạ" trang trí
    g.fillStyle(0x8d99ae, 1).fillRect(BAR_X - 30, BAR_Y + 8, 26, 12).fillRect(BAR_X + BAR_W + 4, BAR_Y + 8, 26, 12);
    const cx = BAR_X + BAR_W * e.cursor;
    g.fillStyle(0xffffff, 1).fillRect(cx - 4, BAR_Y - 10, 8, BAR_H + 20);
    g.fillStyle(e.inPerfectZone ? C.greenHex : C.redHex, 1).fillRect(cx - 2, BAR_Y - 8, 4, BAR_H + 16);
    // avatar theo con trỏ
    const pose = e.cursor > 0.5 ? this.poseB : this.poseA;
    const key = ensureAvatar(this, game.stats.stats, pose, 5);
    if (this.avatar.texture.key !== key && !this.tweens.isTweening(this.avatar)) this.avatar.setTexture(key);
  }

  private drawHold(g: Phaser.GameObjects.Graphics, e: HoldEngine): void {
    this.drawFrame(g);
    // vùng thả: good (vàng) / perfect (xanh)
    g.fillStyle(C.goldHex, 0.45).fillRect(BAR_X + BAR_W * HOLD_ZONES.goodMin, BAR_Y, BAR_W * (HOLD_ZONES.goodMax - HOLD_ZONES.goodMin), BAR_H);
    g.fillStyle(C.greenHex, 0.9).fillRect(BAR_X + BAR_W * HOLD_ZONES.perfectMin, BAR_Y, BAR_W * (HOLD_ZONES.perfectMax - HOLD_ZONES.perfectMin), BAR_H);
    // vùng quá đà
    g.fillStyle(C.redHex, 0.5).fillRect(BAR_X + BAR_W * HOLD_ZONES.goodMax, BAR_Y, BAR_W * (1 - HOLD_ZONES.goodMax), BAR_H);
    // thanh kéo
    const c = Math.min(1, e.charge);
    g.fillStyle(e.inPerfectZone ? C.greenHex : e.holding ? 0xffffff : C.grayHex, e.holding ? 1 : 0.5).fillRect(BAR_X, BAR_Y + 6, BAR_W * c, BAR_H - 12);
    // tay cầm
    const hx = BAR_X + BAR_W * c;
    g.fillStyle(0x8d99ae, 1).fillRect(hx - 6, BAR_Y - 8, 12, BAR_H + 16);
    if (e.holding) {
      const key = ensureAvatar(this, game.stats.stats, c > 0.5 ? this.poseB : this.poseA, 5);
      if (this.avatar.texture.key !== key && !this.tweens.isTweening(this.avatar)) this.avatar.setTexture(key);
    }
  }

  private drawAlternate(g: Phaser.GameObjects.Graphics, e: AlternateEngine): void {
    this.drawFrame(g);
    const half = BAR_W / 2;
    // nửa trái / phải: sáng bên đang chờ bấm
    g.fillStyle(C.orangeHex, e.expected === 'left' ? 0.9 : 0.15).fillRect(BAR_X, BAR_Y, half - 3, BAR_H);
    g.fillStyle(C.skyHex, e.expected === 'right' ? 0.9 : 0.15).fillRect(BAR_X + half + 3, BAR_Y, half - 3, BAR_H);
    // mũi tên chỉ bên cần bấm
    const ax = e.expected === 'left' ? BAR_X + half / 2 : BAR_X + half + half / 2;
    g.fillStyle(0x0b0716, 1).fillTriangle(ax - 10, BAR_Y + 6, ax + 10, BAR_Y + 6, ax, BAR_Y + BAR_H - 6);
    // tiến độ luân phiên: ô nhỏ trên thanh
    const n = Math.round(e.progress * 6);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i < n ? C.greenHex : 0x2a1d4a, 1).fillRect(BAR_X + i * 60 + 4, BAR_Y - 22, 52, 10);
    }
    this.drawTimeBar(g, e.timeLeft);
  }

  private drawRhythm(g: Phaser.GameObjects.Graphics, e: RhythmEngine): void {
    // làn nốt: vạch ở gần mép trái, nốt chạy từ phải sang
    const hitX = BAR_X + 40;
    const laneW = BAR_W - 40;
    this.drawFrame(g);
    g.fillStyle(C.borderHex, 0.25).fillRect(hitX - 1, BAR_Y, 2, BAR_H);
    // vòng chấm điểm nhấp nháy theo nhịp
    const pulse = 1 - e.beatPhase;
    g.lineStyle(3, C.greenHex, 0.9).strokeCircle(hitX, BAR_Y + BAR_H / 2, 14 + pulse * 4);
    for (const p of e.notePositions) {
      const x = hitX + p * laneW;
      if (x < BAR_X - 10 || x > BAR_X + BAR_W + 10) continue;
      const near = Math.abs(p) < 0.1;
      g.fillStyle(near ? C.greenHex : C.goldHex, 1).fillCircle(x, BAR_Y + BAR_H / 2, 11);
      g.fillStyle(0x0b0716, 1).fillCircle(x, BAR_Y + BAR_H / 2, 4);
    }
  }

  private drawSequence(g: Phaser.GameObjects.Graphics, e: SequenceEngine): void {
    this.drawFrame(g);
    e.sequence.forEach((d, i) => {
      const x = BAR_X + 45 + i * 90;
      const state = i < e.index ? 'done' : i === e.index ? 'now' : 'todo';
      g.fillStyle(state === 'done' ? C.greenHex : state === 'now' ? C.goldHex : 0x2a1d4a, 1).fillRect(x - 36, BAR_Y + 2, 72, BAR_H - 4);
      const t = this.barLabels[i];
      if (t) t.setText(ARROW[d]).setColor(state === 'todo' ? C.gray : C.dark);
    });
    this.drawTimeBar(g, e.timeLeft);
  }

  private finish(): void {
    this.finished = true;
    this.unbind?.();
    this.actionBtns.forEach((b) => b.setVisible(false));
    this.barLabels.forEach((t) => t.setVisible(false));
    this.sweat?.stop();
    this.barG.clear();
    const summary = this.engine;
    // +1 điểm khả năng (luật gốc). Combo: cứ 2 combo => +1 phụ trội (lượt này +2).
    let bonus = false;
    if (summary.comboAchieved) bonus = game.registerCombo();
    const gain = bonus ? 2 : 1;
    game.stats.addPhysical(this.muscle, gain);
    game.save();
    Sfx.statUp();
    this.avatar.setTexture(ensureAvatar(this, game.stats.stats, 'flex', 5));
    this.cameras.main.flash(300, 6, 214, 160);

    this.time.delayedCall(500, () => {
      const m = modal(this, 520, 300);
      m.root.add(txt(this, 0, -115, 'HOÀN THÀNH LƯỢT TẬP!', 32, C.green).setOrigin(0.5));
      m.root.add(txt(this, 0, -70, `+${gain} ${PHYSICAL_LABEL[this.muscle]}  →  ${game.stats.physical(this.muscle)}`, 30, bonus ? C.gold : C.green).setOrigin(0.5));
      m.root.add(
        txt(this, 0, -30, `Perfect ${summary.perfect} · Good ${summary.good} · Hỏng form ${summary.bad}`, 20, C.cream).setOrigin(0.5),
      );
      if (summary.comboAchieved) {
        m.root.add(
          txt(
            this,
            0,
            2,
            bonus
              ? `★ COMBO ×${BALANCE.combosPerBonus} tích luỹ → +1 ${PHYSICAL_LABEL[this.muscle]} phụ trội (tổng +2)!`
              : `★ Combo đạt! (${game.comboCount % BALANCE.combosPerBonus}/${BALANCE.combosPerBonus} tới điểm phụ trội)`,
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
