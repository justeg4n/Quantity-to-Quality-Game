import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE, KNOWLEDGE_LABEL, PHYSICAL_KEYS, PHYSICAL_LABEL } from '../data/balance';
import { BOSS_LINES } from '../data/dialogue';
import type { KnowledgeKey, PhysicalKey, PlayerStats, QuizQuestion } from '../data/types';
import { ensureAvatar, type Pose } from '../gfx/Avatar';
import { SkyLayer } from '../gfx/Sky';
import { ExerciseEngine, TIMING_ZONES } from '../systems/ExerciseEngine';
import { StatsManager } from '../systems/StatsManager';
import { game } from '../systems/GameState';
import { QuizEngine } from '../systems/QuizEngine';
import { Sfx } from '../systems/Sfx';
import { enablePause } from './PauseScene';
import { bindAction, bindNumberKeys } from '../ui/ActionInput';
import { QuizPanel } from '../ui/QuizPanel';
import { ActionButton, Button, floatText, modal, txt } from '../ui/Widgets';

type Phase = 'intro' | 'p1' | 'p2' | 'p3' | 'result';

// ─── Tham số các pha (không ảnh hưởng công thức thắng/thua ở pha 3) ───
const P1 = { drainMs: 50000, needCorrect: 4, burstEvery: 2, burstMs: 3000, burstPresses: 12 };
const P2 = { totalMs: 80000, needReps: 5, needCorrect: 3, questionMs: 20000 };

export class BossScene extends Phaser.Scene {
  private phase: Phase = 'intro';
  private sky!: SkyLayer;
  private boss!: Phaser.GameObjects.Image;
  private avatar!: Phaser.GameObjects.Image;
  private phaseRoot!: Phaser.GameObjects.Container;
  private phaseTitle!: Phaser.GameObjects.Text;
  private unbinders: Array<() => void> = [];
  private actionBtn: ActionButton | null = null;
  private usedQ = new Set<string>();
  private snapshot!: PlayerStats;
  private busy = false;

  // pha 1
  private p1 = { energy: 1, drainMul: 1, correct: 0, answered: 0, burst: false, burstPresses: 0, burstTimer: 0 };
  private p1Bar!: Phaser.GameObjects.Graphics;
  private p1Quiz: QuizPanel | null = null;
  private p1Status!: Phaser.GameObjects.Text;
  private p1BurstText: Phaser.GameObjects.Text | null = null;
  private pushToggle = false;

  // pha 2
  private p2 = { timer: P2.totalMs, reps: 0, correct: 0, qTimer: P2.questionMs, qActive: false };
  private p2Engine: ExerciseEngine | null = null;
  private p2G!: Phaser.GameObjects.Graphics;
  private p2Quiz: QuizPanel | null = null;
  private p2Left!: Phaser.GameObjects.Text;
  private p2Right!: Phaser.GameObjects.Text;
  private p2Timer!: Phaser.GameObjects.Text;

  // pha 3
  private p3Counts: Record<string, number> = {};
  private p3Cards: Record<string, { root: Phaser.GameObjects.Container; count: Phaser.GameObjects.Text; status: Phaser.GameObjects.Text }> = {};
  private p3Exam: QuizQuestion[] = [];
  private p3Index = 0;
  private p3Wrong: KnowledgeKey[] = [];
  private p3Quiz: QuizPanel | null = null;
  private p3ExamDone = false;
  private p3PhysDone = false;
  private p3MuscleTexts: Partial<Record<PhysicalKey, Phaser.GameObjects.Text>> = {};
  private p3Status!: Phaser.GameObjects.Text;
  private p3Doomed = false;

  constructor() {
    super(SCENE.boss);
  }

  create(): void {
    enablePause(this);
    this.phase = 'intro';
    this.usedQ = new Set();
    this.unbinders = [];
    this.actionBtn = null;
    this.busy = false;
    this.snapshot = game.stats.clone();
    game.bossAttempts += 1;
    game.save();

    this.sky = new SkyLayer(this, GAME_HEIGHT);
    this.sky.set(2);
    const floor = this.add.tileSprite(0, 440, GAME_WIDTH, 100, 'tile-plaza').setOrigin(0).setTint(0x884444);
    floor.setDepth(-10);
    this.boss = this.add.image(GAME_WIDTH / 2, 150, 'boss-1').setDepth(1);
    this.tweens.add({ targets: this.boss, angle: 360, duration: 9000, repeat: -1 });
    this.tweens.add({ targets: this.boss, scale: 1.08, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.avatar = this.add.image(90, 520, ensureAvatar(this, game.stats.stats, 'idle', 3)).setOrigin(0.5, 1).setDepth(5);
    this.phaseTitle = txt(this, GAME_WIDTH / 2, 8, '', 24, C.gold, { stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5, 0).setDepth(60);
    this.phaseRoot = this.add.container(0, 0).setDepth(10);
    this.events.once('shutdown', () => this.cleanupInput());

    this.cameras.main.fadeIn(600, 60, 0, 0);
    Sfx.playBgm('boss', 120);
    this.intro();
  }

  // ───────────────────────────── tiện ích ─────────────────────────────
  private cleanupInput(): void {
    this.unbinders.forEach((u) => u());
    this.unbinders = [];
    this.actionBtn?.destroy();
    this.actionBtn = null;
  }

  private resetPhaseRoot(): void {
    this.cleanupInput();
    this.phaseRoot.destroy();
    this.phaseRoot = this.add.container(0, 0).setDepth(10);
    this.p1Quiz = null;
    this.p2Quiz = null;
    this.p3Quiz = null;
    this.p2Engine = null;
  }

  private banner(title: string, hint: string, then: () => void): void {
    this.busy = true;
    const m = modal(this, 800, 250, 95);
    m.root.add(txt(this, 0, -85, title, 34, C.red, { stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5));
    m.root.add(txt(this, 0, -20, hint, 19, C.cream, { wordWrap: { width: 740 }, align: 'center' }).setOrigin(0.5));
    m.root.add(new Button(this, 0, 80, 'BẮT ĐẦU!', () => { m.close(); this.busy = false; then(); }, { w: 220, h: 46, fill: C.redHex }));
  }

  private bossHit(): void {
    Sfx.bossHit();
    this.boss.setTint(0xffffff);
    this.time.delayedCall(120, () => this.boss.clearTint());
    this.tweens.add({ targets: this.boss, y: 130, duration: 80, yoyo: true });
  }

  private playerHit(): void {
    Sfx.bad();
    this.cameras.main.shake(250, 0.008);
    this.avatar.setTint(0xff4444);
    this.time.delayedCall(200, () => this.avatar.clearTint());
  }

  private setAvatar(pose: Pose, u = 3): void {
    this.avatar.setTexture(ensureAvatar(this, game.stats.stats, pose, u));
  }

  private nextQuestion(): QuizQuestion {
    const q = QuizEngine.drawAny(1, this.usedQ)[0] ?? QuizEngine.drawAny(1)[0];
    this.usedQ.add(q.id);
    return q;
  }

  // ───────────────────────────── INTRO ─────────────────────────────
  private intro(): void {
    this.phaseTitle.setText('THỬ THÁCH CUỐI CÙNG — VÒNG XOÁY BIỆN CHỨNG');
    const m = modal(this, 760, 260, 95);
    m.root.add(this.add.image(-290, -20, 'boss-1').setScale(0.6));
    m.root.add(txt(this, 40, -90, 'VÒNG XOÁY BIỆN CHỨNG', 30, C.red).setOrigin(0.5));
    m.root.add(txt(this, 40, -30, BOSS_LINES.intro[0], 20, C.cream, { wordWrap: { width: 480 }, align: 'center' }).setOrigin(0.5));
    m.root.add(txt(this, 40, 30, `Lần thử: ${game.bossAttempts}   ·   3 pha   ·   Pha cuối sẽ tiêu hao chính thành quả những ngày rèn luyện của ngươi.`, 15, C.gray, { wordWrap: { width: 500 }, align: 'center' }).setOrigin(0.5));
    m.root.add(new Button(this, 40, 90, 'NGHÊNH CHIẾN', () => { m.close(); this.startPhase1(); }, { w: 240, h: 46, fill: C.redHex }));
  }

  // ───────────────────────────── PHA 1 ─────────────────────────────
  private startPhase1(): void {
    this.resetPhaseRoot();
    this.phase = 'p1';
    this.boss.setTexture('boss-1');
    this.phaseTitle.setText(BOSS_LINES.phase1);
    this.p1 = { energy: 1, drainMul: 1, correct: 0, answered: 0, burst: false, burstPresses: 0, burstTimer: 0 };
    this.banner(BOSS_LINES.phase1, `${BOSS_LINES.phase1Hint}\nCần ${P1.needCorrect} câu đúng trước khi thanh Năng lượng cạn.`, () => {
      // thanh năng lượng
      this.p1Bar = this.add.graphics();
      this.phaseRoot.add(this.p1Bar);
      this.phaseRoot.add(txt(this, 250, 46, 'NĂNG LƯỢNG', 16, C.cream));
      this.p1Status = txt(this, GAME_WIDTH - 40, 46, '', 18, C.gold).setOrigin(1, 0);
      this.phaseRoot.add(this.p1Status);
      // panel câu hỏi
      const pg = this.add.graphics();
      pg.fillStyle(C.borderHex, 1).fillRect(220, 250, 720, 280);
      pg.fillStyle(0x0b0716, 0.92).fillRect(224, 254, 712, 272);
      this.phaseRoot.add(pg);
      this.p1Quiz = new QuizPanel(this, 240, 264, { w: 680, questionSize: 20, optionSize: 17, instantFeedback: true, optionGap: 5 });
      this.phaseRoot.add(this.p1Quiz);
      this.unbinders.push(bindNumberKeys(this, (i) => { if (!this.p1.burst) this.p1Quiz?.choose(i); }));
      this.unbinders.push(bindAction(this, () => this.p1Press()));
      this.actionBtn = new ActionButton(this, () => this.p1Press(), 'PUSH-UP!', GAME_WIDTH - 120, 200);
      this.actionBtn.setVisible(false);
      this.p1Ask();
      this.p1Refresh();
    });
  }

  private p1Ask(): void {
    if (!this.p1Quiz) return;
    const q = this.nextQuestion();
    this.p1Quiz.show(q, (_i, correct) => {
      this.p1.answered++;
      if (correct) {
        this.p1.correct++;
        this.p1.drainMul = Math.max(0.35, this.p1.drainMul * 0.78);
        this.p1.energy = Math.min(1, this.p1.energy + 0.08);
        Sfx.correct();
        this.bossHit();
        floatText(this, GAME_WIDTH / 2, 240, `ĐÚNG! Tốc độ cạn ×${this.p1.drainMul.toFixed(2)}`, C.green, 26);
      } else {
        this.p1.energy = Math.max(0, this.p1.energy - 0.05);
        Sfx.wrong();
        floatText(this, GAME_WIDTH / 2, 240, `Sai — ${KNOWLEDGE_LABEL[q.category]}: ${q.options[q.correctIndex].slice(0, 40)}…`, C.red, 20);
      }
      this.p1Refresh();
      this.time.delayedCall(900, () => {
        if (this.phase !== 'p1') return;
        if (this.p1.correct >= P1.needCorrect) return this.passPhase1();
        if (this.p1.answered % P1.burstEvery === 0) this.p1StartBurst();
        else this.p1Ask();
      });
    });
  }

  private p1StartBurst(): void {
    this.p1.burst = true;
    this.p1.burstPresses = 0;
    this.p1.burstTimer = P1.burstMs;
    Sfx.alarm();
    this.p1BurstText = txt(this, GAME_WIDTH / 2, 150, `BÙNG NỔ THỂ LỰC!\nPUSH-UP: bấm SPACE ×${P1.burstPresses} trong 3 giây!`, 30, C.gold, {
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5).setDepth(70);
    this.actionBtn?.setVisible(true);
    this.setAvatar('pushup_a');
    this.boss.setTint(0xff6666);
  }

  private p1Press(): void {
    if (this.phase !== 'p1' || !this.p1.burst) return;
    this.p1.burstPresses++;
    this.pushToggle = !this.pushToggle;
    this.setAvatar(this.pushToggle ? 'pushup_b' : 'pushup_a');
    Sfx.rep();
    this.actionBtn?.flash();
    this.p1BurstText?.setText(`BÙNG NỔ THỂ LỰC!\nPUSH-UP: ${this.p1.burstPresses} / ${P1.burstPresses}`);
    if (this.p1.burstPresses >= P1.burstPresses) this.p1EndBurst(true);
  }

  private p1EndBurst(success: boolean): void {
    this.p1.burst = false;
    this.p1BurstText?.destroy();
    this.p1BurstText = null;
    this.actionBtn?.setVisible(false);
    this.boss.clearTint();
    this.setAvatar('idle');
    if (success) {
      this.p1.energy = Math.min(1, this.p1.energy + 0.15);
      this.bossHit();
      floatText(this, GAME_WIDTH / 2, 230, 'ĐẨY LÙI ĐÒN TẤN CÔNG! +Năng lượng', C.green, 26);
    } else {
      this.p1.energy = Math.max(0, this.p1.energy - 0.2);
      this.playerHit();
      floatText(this, GAME_WIDTH / 2, 230, 'Trúng đòn! −Năng lượng', C.red, 26);
    }
    this.p1Refresh();
    this.time.delayedCall(700, () => { if (this.phase === 'p1' && this.p1.energy > 0) this.p1Ask(); });
  }

  private p1Refresh(): void {
    this.p1Status.setText(`Đúng: ${this.p1.correct} / ${P1.needCorrect}   ·   Đã trả lời: ${this.p1.answered}`);
  }

  private p1Draw(): void {
    const g = this.p1Bar;
    g.clear();
    g.fillStyle(C.borderHex, 1).fillRect(246, 66, 668, 26);
    g.fillStyle(0x0b0716, 1).fillRect(250, 70, 660, 18);
    const e = this.p1.energy;
    g.fillStyle(e > 0.5 ? C.greenHex : e > 0.25 ? C.goldHex : C.redHex, 1).fillRect(250, 70, 660 * e, 18);
    if (this.p1.burst) {
      g.fillStyle(C.borderHex, 1).fillRect(GAME_WIDTH / 2 - 154, 196, 308, 18);
      g.fillStyle(0x0b0716, 1).fillRect(GAME_WIDTH / 2 - 150, 200, 300, 10);
      g.fillStyle(C.orangeHex, 1).fillRect(GAME_WIDTH / 2 - 150, 200, 300 * (this.p1.burstTimer / P1.burstMs), 10);
    }
  }

  private passPhase1(): void {
    if (this.phase !== 'p1') return;
    this.phase = 'intro';
    Sfx.combo();
    floatText(this, GAME_WIDTH / 2, 200, 'PHA 1 HOÀN THÀNH — LƯỢNG ĐÃ ĐỔI!', C.gold, 34);
    this.bossHit();
    this.time.delayedCall(1200, () => this.startPhase2());
  }

  private failPhase(n: 1 | 2): void {
    this.phase = 'intro';
    this.playerHit();
    Sfx.lose();
    const m = modal(this, 620, 220, 95);
    m.root.add(txt(this, 0, -70, `BỊ VÒNG XOÁY ÁP ĐẢO Ở PHA ${n}`, 28, C.red).setOrigin(0.5));
    m.root.add(txt(this, 0, -20, 'Phủ định không phải là kết thúc. Thử lại pha này — chỉ số của bạn không bị mất.', 19, C.cream, { wordWrap: { width: 560 }, align: 'center' }).setOrigin(0.5));
    m.root.add(new Button(this, 0, 60, `THỬ LẠI PHA ${n}`, () => { m.close(); n === 1 ? this.startPhase1() : this.startPhase2(); }, { w: 240, h: 46, fill: C.redHex }));
  }

  // ───────────────────────────── PHA 2 ─────────────────────────────
  private startPhase2(): void {
    this.resetPhaseRoot();
    this.phase = 'p2';
    this.boss.setTexture('boss-2');
    this.phaseTitle.setText(BOSS_LINES.phase2);
    this.p2 = { timer: P2.totalMs, reps: 0, correct: 0, qTimer: P2.questionMs, qActive: false };
    this.banner(BOSS_LINES.phase2, `${BOSS_LINES.phase2Hint}\nCần ${P2.needReps} rep Lat Pulldown (Good/Perfect) VÀ ${P2.needCorrect} câu đúng trong ${P2.totalMs / 1000}s.`, () => {
      this.avatar.setPosition(100, 340);
      this.setAvatar('lung_a');
      // vách ngăn
      const g = this.add.graphics();
      g.fillStyle(C.borderHex, 1).fillRect(GAME_WIDTH / 2 - 3, 40, 6, GAME_HEIGHT - 40);
      g.fillStyle(0x0b0716, 0.7).fillRect(0, 40, GAME_WIDTH / 2 - 3, GAME_HEIGHT - 40);
      g.fillStyle(0x0b0716, 0.85).fillRect(GAME_WIDTH / 2 + 3, 40, GAME_WIDTH / 2 - 3, GAME_HEIGHT - 40);
      this.phaseRoot.add(g);
      this.p2G = this.add.graphics();
      this.phaseRoot.add(this.p2G);
      this.p2Timer = txt(this, GAME_WIDTH / 2, 44, '', 26, C.gold, { stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(61);
      this.phaseRoot.add(this.p2Timer);
      this.phaseRoot.add(txt(this, 240, 80, 'THỂ CHẤT — LAT PULLDOWN', 22, C.orange).setOrigin(0.5));
      this.p2Left = txt(this, 240, 110, '', 22, C.white).setOrigin(0.5);
      this.phaseRoot.add(this.p2Left);
      this.phaseRoot.add(txt(this, 240, 340, 'SPACE khi con trỏ vào vùng XANH', 16, C.cream).setOrigin(0.5));
      this.phaseRoot.add(txt(this, 720, 80, 'KIẾN THỨC — CÂU HỎI ĐẾM GIỜ', 22, C.sky).setOrigin(0.5));
      this.p2Right = txt(this, 720, 110, '', 22, C.white).setOrigin(0.5);
      this.phaseRoot.add(this.p2Right);
      this.p2Quiz = new QuizPanel(this, GAME_WIDTH / 2 + 20, 150, { w: 430, questionSize: 17, optionSize: 15, instantFeedback: true, optionGap: 4 });
      this.phaseRoot.add(this.p2Quiz);

      this.p2Engine = new ExerciseEngine({ mode: 'timing', repsRequired: 999, timingSpeed: 0.62 });
      this.p2Engine.on('rep', (grade) => {
        if (this.phase !== 'p2') return;
        if (grade === 'bad') {
          Sfx.bad();
          floatText(this, 240, 300, 'TRƯỢT', C.red, 22);
        } else {
          this.p2.reps++;
          grade === 'perfect' ? Sfx.perfect() : Sfx.good();
          floatText(this, 240, 300, grade === 'perfect' ? 'PERFECT!' : 'GOOD', grade === 'perfect' ? C.green : C.gold, 24);
          this.setAvatar('lung_b');
          this.time.delayedCall(200, () => { if (this.phase === 'p2') this.setAvatar('lung_a'); });
          this.bossHit();
        }
        this.p2Refresh();
        this.p2Check();
      });
      this.unbinders.push(bindAction(this, () => this.p2Engine?.press()));
      this.unbinders.push(bindNumberKeys(this, (i) => this.p2Quiz?.choose(i)));
      this.actionBtn = new ActionButton(this, () => this.p2Engine?.press(), 'KÉO!', 240, GAME_HEIGHT - 50);
      this.p2Ask();
      this.p2Refresh();
    });
  }

  private p2Ask(): void {
    if (!this.p2Quiz || this.phase !== 'p2') return;
    if (this.p2.correct >= P2.needCorrect) return;
    this.p2.qTimer = P2.questionMs;
    this.p2.qActive = true;
    const q = this.nextQuestion();
    this.p2Quiz.show(q, (_i, correct) => {
      this.p2.qActive = false;
      if (correct) {
        this.p2.correct++;
        Sfx.correct();
        this.bossHit();
      } else {
        Sfx.wrong();
        floatText(this, 720, 130, `Sai! Đáp án: ${q.options[q.correctIndex].slice(0, 36)}…`, C.red, 17);
      }
      this.p2Refresh();
      this.time.delayedCall(800, () => { if (!this.p2Check()) this.p2Ask(); });
    });
  }

  private p2Refresh(): void {
    this.p2Left.setText(`Rep: ${this.p2.reps} / ${P2.needReps}${this.p2.reps >= P2.needReps ? '  ✔' : ''}`);
    this.p2Right.setText(`Đúng: ${this.p2.correct} / ${P2.needCorrect}${this.p2.correct >= P2.needCorrect ? '  ✔' : ''}`);
  }

  private p2Check(): boolean {
    if (this.phase !== 'p2') return true;
    if (this.p2.reps >= P2.needReps && this.p2.correct >= P2.needCorrect) {
      this.phase = 'intro';
      Sfx.combo();
      floatText(this, GAME_WIDTH / 2, 250, 'PHA 2 HOÀN THÀNH — HAI MẶT ĐỐI LẬP ĐÃ THỐNG NHẤT!', C.gold, 30);
      this.bossHit();
      this.time.delayedCall(1400, () => this.startPhase3());
      return true;
    }
    return false;
  }

  private p2Draw(): void {
    if (!this.p2Engine) return;
    const g = this.p2G;
    g.clear();
    const bx = 60;
    const by = 360;
    const bw = 360;
    const bh = 26;
    g.fillStyle(C.borderHex, 1).fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    g.fillStyle(0x0b0716, 1).fillRect(bx, by, bw, bh);
    g.fillStyle(C.goldHex, 0.55).fillRect(bx + bw * TIMING_ZONES.goodMin, by, bw * (TIMING_ZONES.goodMax - TIMING_ZONES.goodMin), bh);
    g.fillStyle(C.greenHex, 1).fillRect(bx + bw * TIMING_ZONES.perfectMin, by, bw * (TIMING_ZONES.perfectMax - TIMING_ZONES.perfectMin), bh);
    const cx = bx + bw * this.p2Engine.cursor;
    g.fillStyle(0xffffff, 1).fillRect(cx - 4, by - 10, 8, bh + 20);
    g.fillStyle(this.p2Engine.inPerfectZone ? C.greenHex : C.redHex, 1).fillRect(cx - 2, by - 8, 4, bh + 16);
    // timer câu hỏi
    if (this.p2.qActive) {
      const qx = GAME_WIDTH / 2 + 20;
      g.fillStyle(C.borderHex, 1).fillRect(qx - 3, 129, 436, 14);
      g.fillStyle(0x0b0716, 1).fillRect(qx, 132, 430, 8);
      const f = this.p2.qTimer / P2.questionMs;
      g.fillStyle(f > 0.3 ? C.skyHex : C.redHex, 1).fillRect(qx, 132, 430 * f, 8);
    }
  }

  // ───────────────────────────── PHA 3 ─────────────────────────────
  private startPhase3(): void {
    this.resetPhaseRoot();
    this.phase = 'p3';
    this.boss.setTexture('boss-3');
    this.phaseTitle.setText(BOSS_LINES.phase3);
    this.p3Counts = { pushup: 0, latpulldown: 0, squat: 0 };
    this.p3Cards = {};
    this.p3Index = 0;
    this.p3Wrong = [];
    this.p3ExamDone = false;
    this.p3PhysDone = false;
    this.p3Doomed = false;
    this.p3MuscleTexts = {};
    this.p3Exam = QuizEngine.drawBossExam(game.seenQuestions, game.stats.stats.knowledge, BALANCE.knowledgeMin, BALANCE.bossQuestions);
    this.banner(BOSS_LINES.phase3, `${BOSS_LINES.phase3Hint}\nThể chất: Push-up ×3 (Ngực, Vai, Tay) · Lat Pull Down ×3 (Lưng, Tay) · Squat ×3 (Chân, Bụng).`, () => {
      this.avatar.setPosition(400, 420);
      this.setAvatar('idle', 2);
      const g = this.add.graphics();
      g.fillStyle(0x0b0716, 0.8).fillRect(0, 40, GAME_WIDTH, GAME_HEIGHT - 40);
      g.fillStyle(C.borderHex, 1).fillRect(GAME_WIDTH / 2 - 3, 40, 6, GAME_HEIGHT - 40);
      this.phaseRoot.add(g);
      this.phaseRoot.add(txt(this, 240, 44, 'THỂ CHẤT — tiêu hao thành quả', 20, C.orange).setOrigin(0.5, 0));
      this.phaseRoot.add(txt(this, 720, 44, `KIẾN THỨC — đề ${BALANCE.bossQuestions} câu, cần đúng cả ${BALANCE.bossQuestions}`, 20, C.sky).setOrigin(0.5, 0));

      // điểm cơ hiện tại
      PHYSICAL_KEYS.forEach((k, i) => {
        const t = txt(this, 30 + (i % 3) * 150, 82 + Math.floor(i / 3) * 22, '', 17, C.cream);
        this.p3MuscleTexts[k] = t;
        this.phaseRoot.add(t);
      });
      // 3 thẻ bài tập
      BALANCE.bossExercises.forEach((ex, i) => {
        const y = 134 + i * 92;
        const root = this.add.container(20, y);
        const bg = this.add.graphics();
        bg.fillStyle(C.borderHex, 1).fillRect(0, 0, 330, 82);
        bg.fillStyle(C.panel, 1).fillRect(4, 4, 322, 74);
        root.add(bg);
        root.add(txt(this, 12, 6, ex.name, 22, C.gold));
        root.add(txt(this, 12, 34, `−1: ${ex.muscles.map((m) => PHYSICAL_LABEL[m]).join(', ')}`, 15, C.cream));
        const count = txt(this, 318, 8, '', 28, C.white).setOrigin(1, 0);
        root.add(count);
        const status = txt(this, 12, 56, '', 14, C.green);
        root.add(status);
        const zone = this.add.zone(0, 0, 330, 82).setOrigin(0).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => bg.setAlpha(0.85));
        zone.on('pointerout', () => bg.setAlpha(1));
        zone.on('pointerup', () => this.p3Perform(ex.id));
        root.add(zone);
        this.phaseRoot.add(root);
        this.p3Cards[ex.id] = { root, count, status };
      });
      this.p3Status = txt(this, 240, 436, '', 16, C.gold, { wordWrap: { width: 440 }, align: 'center' }).setOrigin(0.5, 0);
      this.phaseRoot.add(this.p3Status);
      this.phaseRoot.add(new Button(this, 240, GAME_HEIGHT - 30, 'BỎ CUỘC', () => this.p3GiveUp(), { w: 160, h: 36, size: 18, fill: 0x3a2a2a }));

      // đề thi
      this.p3Quiz = new QuizPanel(this, GAME_WIDTH / 2 + 20, 92, { w: 430, questionSize: 17, optionSize: 15, instantFeedback: true, optionGap: 4 });
      this.phaseRoot.add(this.p3Quiz);
      this.unbinders.push(bindNumberKeys(this, (i) => this.p3Quiz?.choose(i)));
      this.p3RefreshCards();
      this.p3AskExam();
    });
  }

  private p3RefreshCards(): void {
    PHYSICAL_KEYS.forEach((k) => {
      const v = game.stats.physical(k);
      this.p3MuscleTexts[k]?.setText(`${PHYSICAL_LABEL[k]}: ${v}`).setColor(v > 0 ? C.cream : C.red);
    });
    BALANCE.bossExercises.forEach((ex) => {
      const c = this.p3Cards[ex.id];
      const n = this.p3Counts[ex.id];
      c.count.setText(`${n} / ${BALANCE.bossExerciseReps}`);
      if (n >= BALANCE.bossExerciseReps) c.status.setText('✔ HOÀN THÀNH').setColor(C.green);
      else {
        const lacking = ex.muscles.filter((m) => game.stats.physical(m) < 1);
        c.status.setText(lacking.length ? `Không đủ sức: ${lacking.map((m) => PHYSICAL_LABEL[m]).join(', ')} = 0` : 'Bấm để thực hiện 1 lần').setColor(lacking.length ? C.red : C.green);
      }
    });
    // Bị kẹt: còn bài chưa xong mà một nhóm cơ liên quan đã về 0 (người chơi tự "khám phá" giới hạn của mình)
    const stuck = new Set<PhysicalKey>();
    BALANCE.bossExercises.forEach((ex) => {
      if (this.p3Counts[ex.id] >= BALANCE.bossExerciseReps) return;
      ex.muscles.filter((m) => game.stats.physical(m) < 1).forEach((m) => stuck.add(m));
    });
    this.p3PhysDone = BALANCE.bossExercises.every((ex) => this.p3Counts[ex.id] >= BALANCE.bossExerciseReps);
    if (this.p3PhysDone) this.p3Status.setText('✔ Phần thể chất hoàn thành!').setColor(C.green);
    else if (stuck.size && !this.p3Doomed) {
      this.p3Doomed = true;
      this.p3Status.setText(`Hết sức! ${[...stuck].map((k) => PHYSICAL_LABEL[k]).join(', ')} đã về 0 — không thể hoàn thành phần thể chất.`).setColor(C.red);
      this.time.delayedCall(2200, () => { if (this.phase === 'p3') this.p3Finish(); });
    } else this.p3Status.setText('Mỗi lần thực hiện trừ 1 điểm ở mọi nhóm cơ liên quan.').setColor(C.gold);
    this.p3CheckDone();
  }

  private p3Perform(id: string): void {
    if (this.phase !== 'p3' || this.busy) return;
    const ex = BALANCE.bossExercises.find((e) => e.id === id)!;
    if (this.p3Counts[id] >= BALANCE.bossExerciseReps) return;
    const lacking = ex.muscles.filter((m) => game.stats.physical(m) < 1);
    if (lacking.length) {
      this.playerHit();
      floatText(this, 240, 140, `Không đủ sức! ${lacking.map((m) => PHYSICAL_LABEL[m]).join(', ')} = 0`, C.red, 20);
      return;
    }
    this.busy = true;
    ex.muscles.forEach((m) => game.stats.addPhysical(m, -1));
    this.p3Counts[id]++;
    Sfx.rep();
    const poseA: Pose = id === 'pushup' ? 'pushup_a' : id === 'latpulldown' ? 'lung_a' : 'chan_a';
    const poseB: Pose = id === 'pushup' ? 'pushup_b' : id === 'latpulldown' ? 'lung_b' : 'chan_b';
    this.setAvatar(poseA, 2);
    this.time.delayedCall(220, () => this.setAvatar(poseB, 2));
    this.time.delayedCall(440, () => this.setAvatar(poseA, 2));
    this.time.delayedCall(650, () => { this.setAvatar('idle', 2); this.busy = false; });
    this.bossHit();
    floatText(this, 240, 140, `${ex.name} +1  (${ex.muscles.map((m) => `−1 ${PHYSICAL_LABEL[m]}`).join(', ')})`, C.gold, 18);
    this.p3RefreshCards();
  }

  private p3AskExam(): void {
    if (!this.p3Quiz || this.phase !== 'p3') return;
    if (this.p3Index >= this.p3Exam.length) {
      this.p3ExamDone = true;
      this.p3CheckDone();
      return;
    }
    const q = this.p3Exam[this.p3Index];
    const level = game.stats.knowledge(q.category);
    const idx = this.p3Index;
    const header = this.phaseRoot.getByName('examHeader') as Phaser.GameObjects.Text | null;
    header?.destroy();
    const h = txt(this, GAME_WIDTH / 2 + 20, 70, `Câu ${idx + 1}/${this.p3Exam.length} · Khối ${KNOWLEDGE_LABEL[q.category]} (đã học ${level} lần)`, 15, C.gray).setName('examHeader');
    this.phaseRoot.add(h);

    if (level < BALANCE.knowledgeMin) {
      // Chưa tích luỹ đủ lượng → không thể "đọc" được câu hỏi (công thức gốc: mỗi khối >= 2)
      const garbled: QuizQuestion = {
        ...q,
        question: `▓▓▓▓ ▓▓▓ ▓▓▓▓▓▓ ▓▓ ▓▓▓▓▓ ▓▓▓▓?\n(Kiến thức khối "${KNOWLEDGE_LABEL[q.category]}" chưa đủ để đọc câu hỏi này — đã học ${level} lần)`,
        options: ['▓▓▓▓ ▓▓▓▓▓ ▓▓', '▓▓▓ ▓▓▓▓▓▓ ▓▓▓▓', '▓▓▓▓▓ ▓▓ ▓▓▓', '▓▓ ▓▓▓▓ ▓▓▓▓▓'],
        correctIndex: -1,
      };
      this.p3Quiz.show(garbled, () => {
        this.p3Wrong.push(q.category);
        Sfx.wrong();
        this.playerHit();
        floatText(this, 720, 300, 'Kiến thức chưa đủ để giải!', C.red, 22);
        this.p3Index++;
        this.time.delayedCall(900, () => this.p3AskExam());
      });
      return;
    }
    this.p3Quiz.show(q, (_i, correct) => {
      if (correct) {
        Sfx.correct();
        this.bossHit();
      } else {
        this.p3Wrong.push(q.category);
        Sfx.wrong();
        this.playerHit();
        floatText(this, 720, 300, `Sai! Đáp án: ${q.options[q.correctIndex].slice(0, 40)}…`, C.red, 16);
      }
      this.p3Index++;
      this.time.delayedCall(900, () => this.p3AskExam());
    });
  }

  private p3CheckDone(): void {
    if (this.phase !== 'p3') return;
    if (this.p3ExamDone && (this.p3PhysDone || this.p3Doomed)) this.time.delayedCall(600, () => this.p3Finish());
  }

  private p3GiveUp(): void {
    if (this.phase !== 'p3') return;
    const m = modal(this, 520, 180, 95);
    m.root.add(txt(this, 0, -50, 'Bỏ cuộc thử thách này?', 26, C.cream).setOrigin(0.5));
    m.root.add(new Button(this, -110, 40, 'BỎ CUỘC', () => { m.close(); this.p3Finish(true); }, { w: 200, h: 44, fill: C.redHex }));
    m.root.add(new Button(this, 110, 40, 'TIẾP TỤC', () => m.close(), { w: 200, h: 44 }));
  }

  /** Kết thúc pha 3: áp công thức thắng/thua, khôi phục chỉ số, sang Ending */
  private p3Finish(gaveUp = false): void {
    if (this.phase !== 'p3') return;
    this.phase = 'result';
    this.cleanupInput();
    const physOk = this.p3PhysDone;
    const knowOk = this.p3ExamDone && this.p3Wrong.length === 0;
    const won = physOk && knowOk && !gaveUp;

    // lý do thua: chỉ số chưa đạt ngưỡng (theo snapshot trước trận) + câu sai
    const reasons: string[] = [];
    const snapMgr = new StatsManager(this.snapshot);
    snapMgr.deficits().forEach((d) => reasons.push(`${d.label}: ${d.current}/${d.required}`));
    if (!won && reasons.length === 0) {
      if (!knowOk) reasons.push(`Trả lời sai ${this.p3Wrong.length} câu (${[...new Set(this.p3Wrong)].map((c) => KNOWLEDGE_LABEL[c]).join(', ')})`);
      if (!physOk) reasons.push('Chưa hoàn thành đủ 3 bài tập ×3');
      if (gaveUp) reasons.push('Đã bỏ cuộc');
    }
    // khôi phục chỉ số đã tích luỹ (phần tiêu hao chỉ diễn ra trong trận)
    game.stats.stats = this.snapshot;
    game.lastBossResult = { won, reasons };
    game.phase = 'ended';
    if (won) game.badges.champion = true;
    game.save();

    Sfx.stopBgm();
    if (won) {
      Sfx.win();
      this.tweens.add({ targets: this.boss, scale: 0, angle: 1080, alpha: 0, duration: 1500, ease: 'Cubic.In' });
      this.cameras.main.flash(600, 255, 255, 255);
      floatText(this, GAME_WIDTH / 2, 260, 'CHẤT ĐÃ ĐỔI!', C.gold, 48);
      this.setAvatar('happy', 2);
    } else {
      Sfx.lose();
      this.cameras.main.shake(600, 0.01);
      this.setAvatar('tired', 2);
      floatText(this, GAME_WIDTH / 2, 260, 'LƯỢNG CHƯA ĐỦ...', C.red, 40);
    }
    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.ending));
    });
  }

  // ───────────────────────────── UPDATE ─────────────────────────────
  update(_t: number, delta: number): void {
    if (this.busy && this.phase !== 'p3') return;
    if (this.phase === 'p1') {
      if (this.p1.burst) {
        this.p1.burstTimer -= delta;
        if (this.p1.burstTimer <= 0) this.p1EndBurst(false);
      } else {
        this.p1.energy -= (delta / P1.drainMs) * this.p1.drainMul;
        if (this.p1.energy <= 0) {
          this.p1.energy = 0;
          this.p1Draw();
          return this.failPhase(1);
        }
      }
      this.p1Draw();
    } else if (this.phase === 'p2') {
      this.p2.timer -= delta;
      this.p2Engine?.update(delta);
      if (this.p2.qActive) {
        this.p2.qTimer -= delta;
        if (this.p2.qTimer <= 0) {
          this.p2.qActive = false;
          this.p2Quiz?.lock();
          Sfx.wrong();
          floatText(this, 720, 130, 'Hết giờ câu này!', C.red, 18);
          this.time.delayedCall(500, () => { if (!this.p2Check()) this.p2Ask(); });
        }
      }
      this.p2Timer.setText(`⏱ ${Math.max(0, this.p2.timer / 1000).toFixed(1)}s`);
      this.p2Draw();
      if (this.p2.timer <= 0) return this.failPhase(2);
    }
  }
}
