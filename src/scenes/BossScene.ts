import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE, KNOWLEDGE_KEYS, KNOWLEDGE_LABEL, KNOWLEDGE_SHORT, PHYSICAL_KEYS, PHYSICAL_LABEL } from '../data/balance';
import { BOSS_LINES } from '../data/dialogue';
import type { KnowledgeKey, PhysicalKey, PlayerStats, QuizQuestion } from '../data/types';
import { ensureAvatar, type Pose } from '../gfx/Avatar';
import { SkyLayer } from '../gfx/Sky';
import { TIMING_ZONES, TimingEngine } from '../systems/ExerciseEngine';
import { StatsManager } from '../systems/StatsManager';
import { game } from '../systems/GameState';
import { QuizEngine } from '../systems/QuizEngine';
import { Sfx } from '../systems/Sfx';
import { enablePause } from './PauseScene';
import { bindAction, bindNumberKeys } from '../ui/ActionInput';
import { QuizPanel } from '../ui/QuizPanel';
import { ActionButton, Button, floatText, modal, txt } from '../ui/Widgets';

/** Ba loại phase: 2 phase tiêu hao (thứ tự ngẫu nhiên) rồi phase cuối dùng phần còn lại */
type PhaseKind = 'quantity' | 'struggle' | 'negation';
type Phase = 'intro' | PhaseKind | 'result';
type BossExercise = (typeof BALANCE.bossExercises)[number];

// ─── Tham số các phase (chi phí tiêu hao tối thiểu được tính trong data/balance.ts) ───
// Phase "Lượng đổi": mở màn bằng 1 lượt tập, sau đó cứ 2 câu hỏi lại 1 lượt; cần 2 câu đúng.
const QZ = { drainMs: 45000, needCorrect: 2, burstEvery: 2, burstMs: 3000, burstPresses: 12 };
// Phase "Đấu tranh": 3 rep (Good/Perfect) + 2 câu đúng trong 60s. Cả lượt tập tiêu hao 1 lần (khi bắt đầu),
// mỗi rep trượt phạt −1 các nhóm cơ còn lại — nhờ vậy số rep tăng mà cân bằng 37/40 không đổi.
const SP = { totalMs: 60000, needReps: 3, needCorrect: 2, questionMs: 20000 };

/**
 * Concept từng phase quyết định khối kiến thức được hỏi (bài tập & câu cụ thể vẫn ngẫu nhiên):
 * - Lượng đổi → Chất đổi: Chất, Lượng, Quan hệ Lượng–Chất
 * - Đấu tranh giữa các mặt đối lập: Độ (giới hạn giằng co), Điểm nút & Bước nhảy
 * - Phủ định của phủ định: đề tổng hợp mọi khối (QuizEngine.drawBossExam)
 */
const CONCEPT_CATS: Record<Exclude<PhaseKind, 'negation'>, KnowledgeKey[]> = {
  quantity: ['chat', 'luong', 'quanHeLuongChat'],
  struggle: ['do', 'diemNutBuocNhay'],
};

// ─── Bố cục chia đôi: trên = đấu trường (nhân vật + vòng xoáy), dưới = câu hỏi / thử thách ───
const ARENA_H = 250;
const PANEL_Y = ARENA_H + 22;
const AVATAR_X = 150;
const AVATAR_Y = ARENA_H - 6;
const BOSS_X = 620;
const BOSS_Y = 128;

const POSES: Record<string, [Pose, Pose]> = {
  pushup: ['pushup_a', 'pushup_b'],
  latpulldown: ['lung_a', 'lung_b'],
  squat: ['chan_a', 'chan_b'],
};

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class BossScene extends Phaser.Scene {
  private phase: Phase = 'intro';
  private sky!: SkyLayer;
  private boss!: Phaser.GameObjects.Image;
  private bossGlow!: Phaser.GameObjects.Arc;
  private avatar!: Phaser.GameObjects.Image;
  private sweat!: Phaser.GameObjects.Particles.ParticleEmitter;
  private phaseRoot!: Phaser.GameObjects.Container;
  private phaseTitle!: Phaser.GameObjects.Text;
  private statsStrip!: Phaser.GameObjects.Text;
  private unbinders: Array<() => void> = [];
  private actionBtn: ActionButton | null = null;
  private usedQ = new Set<string>();
  private lastCat: KnowledgeKey | null = null;
  private busy = false;

  /** Thứ tự phase & bài tập của lần chơi này (ngẫu nhiên mỗi trận) */
  private order: PhaseKind[] = [];
  private phaseIndex = 0;
  private exercises: BossExercise[] = [];

  /** Chỉ số lúc bước vào trận — khôi phục sau khi kết thúc (để thử lại cả trận) */
  private snapshot!: PlayerStats;
  /** Chỉ số lúc bắt đầu phase hiện tại — khôi phục khi thua phase đó */
  private phaseSnapshot!: PlayerStats;
  /** Chỉ số lúc bước vào phase cuối (= tích luỹ − tiêu hao 2 phase trước) — dùng để liệt kê lý do thua */
  private finalSnapshot!: PlayerStats;

  // phase "Lượng đổi" (quiz + bùng nổ)
  private qz = { energy: 1, drainMul: 1, correct: 0, answered: 0, burst: false, burstPresses: 0, burstTimer: 0 };
  private qzEx!: BossExercise;
  private qzBar!: Phaser.GameObjects.Graphics;
  private qzQuiz: QuizPanel | null = null;
  private qzStatus!: Phaser.GameObjects.Text;
  private qzBurstText: Phaser.GameObjects.Text | null = null;
  private pushToggle = false;

  // phase "Đấu tranh" (chia đôi)
  private sp = { timer: SP.totalMs, reps: 0, correct: 0, qTimer: SP.questionMs, qActive: false };
  private spEx!: BossExercise;
  private spEngine: TimingEngine | null = null;
  private spG!: Phaser.GameObjects.Graphics;
  private spQuiz: QuizPanel | null = null;
  private spLeft!: Phaser.GameObjects.Text;
  private spRight!: Phaser.GameObjects.Text;
  private spTimer!: Phaser.GameObjects.Text;
  private spCat: KnowledgeKey | null = null;

  // phase cuối "Phủ định của phủ định"
  private fnCounts: Record<string, number> = {};
  private fnCards: Record<string, { root: Phaser.GameObjects.Container; count: Phaser.GameObjects.Text; status: Phaser.GameObjects.Text }> = {};
  private fnExam: QuizQuestion[] = [];
  private fnIndex = 0;
  private fnWrong: KnowledgeKey[] = [];
  private fnQuiz: QuizPanel | null = null;
  private fnExamDone = false;
  private fnPhysDone = false;
  private fnStatus!: Phaser.GameObjects.Text;
  private fnDoomed = false;

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
    this.phaseSnapshot = game.stats.clone();
    this.finalSnapshot = game.stats.clone();
    game.bossAttempts += 1;
    game.save();

    // Ngẫu nhiên hoá: thứ tự 2 phase tiêu hao, và bài tập cho từng phase (phase cuối dùng cả 3, thứ tự ngẫu nhiên)
    this.order = [...shuffle(['quantity', 'struggle'] as PhaseKind[]), 'negation'];
    this.phaseIndex = 0;
    this.exercises = shuffle(BALANCE.bossExercises);
    this.qzEx = this.exercises[0];
    this.spEx = this.exercises[1];

    // ─── Đấu trường (nửa trên) ───
    this.sky = new SkyLayer(this, ARENA_H);
    this.sky.set(2);
    const floor = this.add.tileSprite(0, ARENA_H - 30, GAME_WIDTH, 30, 'tile-plaza').setOrigin(0).setTint(0x884444);
    floor.setDepth(-10);
    this.bossGlow = this.add.circle(BOSS_X, BOSS_Y, 150, 0x9b5de5, 0.18).setDepth(0);
    this.tweens.add({ targets: this.bossGlow, scale: 1.15, alpha: 0.3, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.boss = this.add.image(BOSS_X, BOSS_Y, 'boss-1').setScale(1.25).setDepth(1);
    this.tweens.add({ targets: this.boss, angle: 360, duration: 9000, repeat: -1 });
    this.tweens.add({ targets: this.boss, scale: 1.35, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.avatar = this.add.image(AVATAR_X, AVATAR_Y, ensureAvatar(this, game.stats.stats, 'idle', 4)).setOrigin(0.5, 1).setDepth(5);
    // mồ hôi: phát ra từ đầu nhân vật, dày dần theo mức mệt mỏi
    this.sweat = this.add.particles(AVATAR_X, AVATAR_Y - 140, 'sweat', {
      speedX: { min: -50, max: 50 },
      speedY: { min: 30, max: 110 },
      lifespan: 800,
      quantity: 1,
      frequency: 400,
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(6);

    // ─── Vách ngăn + dải chỉ số ───
    const div = this.add.graphics().setDepth(8);
    div.fillStyle(C.borderHex, 1).fillRect(0, ARENA_H, GAME_WIDTH, 4);
    div.fillStyle(0x0b0716, 1).fillRect(0, ARENA_H + 4, GAME_WIDTH, GAME_HEIGHT - ARENA_H - 4);
    this.statsStrip = txt(this, GAME_WIDTH / 2, ARENA_H + 6, '', 15, C.cream).setOrigin(0.5, 0).setDepth(9);
    this.refreshStrip();

    this.phaseTitle = txt(this, GAME_WIDTH / 2, 6, '', 22, C.gold, { stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5, 0).setDepth(60);
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
    this.qzQuiz = null;
    this.spQuiz = null;
    this.fnQuiz = null;
    this.spEngine = null;
    this.qzBurstText?.destroy();
    this.qzBurstText = null;
  }

  private banner(title: string, hint: string, then: () => void): void {
    this.busy = true;
    const m = modal(this, 820, 270, 95);
    m.root.add(txt(this, 0, -95, title, 32, C.red, { stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5));
    m.root.add(txt(this, 0, -20, hint, 18, C.cream, { wordWrap: { width: 760 }, align: 'center' }).setOrigin(0.5));
    m.root.add(new Button(this, 0, 90, 'BẮT ĐẦU!', () => { m.close(); this.busy = false; then(); }, { w: 220, h: 46, fill: C.redHex }));
  }

  private phaseLabel(kind: PhaseKind): string {
    const n = this.order.indexOf(kind) + 1;
    const name = kind === 'quantity' ? BOSS_LINES.quantity : kind === 'struggle' ? BOSS_LINES.struggle : BOSS_LINES.negation;
    return `PHASE ${n} — ${name}`;
  }

  /** Vẽ nền panel nửa dưới */
  private panelBg(): void {
    const g = this.add.graphics();
    g.fillStyle(C.borderHex, 1).fillRect(20, PANEL_Y, GAME_WIDTH - 40, GAME_HEIGHT - PANEL_Y - 10);
    g.fillStyle(0x0b0716, 0.95).fillRect(24, PANEL_Y + 4, GAME_WIDTH - 48, GAME_HEIGHT - PANEL_Y - 18);
    this.phaseRoot.add(g);
  }

  private bossHit(): void {
    Sfx.bossHit();
    this.boss.setTint(0xffffff);
    this.time.delayedCall(120, () => this.boss.clearTint());
    this.tweens.add({ targets: this.boss, y: BOSS_Y - 18, duration: 80, yoyo: true });
  }

  private playerHit(): void {
    Sfx.bad();
    this.cameras.main.shake(250, 0.008);
    this.avatar.setTint(0xff4444);
    this.setAvatar('tired');
    this.sweat.explode(8, AVATAR_X, AVATAR_Y - 140);
    this.time.delayedCall(200, () => this.refreshFatigue());
    this.time.delayedCall(700, () => { if (this.phase !== 'result') this.setAvatar('idle'); });
  }

  /** Mức mệt mỏi 0..1 = phần thể chất đã tiêu hao so với lúc vào trận */
  private fatigue(): number {
    const start = new StatsManager(this.snapshot).totalPhysical();
    const now = game.stats.totalPhysical();
    return start <= 0 ? 0 : Math.min(1, Math.max(0, (start - now) / start));
  }

  /** Đặt tư thế; khi mệt (>50% thể chất đã tiêu hao) tư thế nghỉ chuyển thành 'tired' */
  private setAvatar(pose: Pose): void {
    const f = this.fatigue();
    const p: Pose = pose === 'idle' && f >= 0.5 ? 'tired' : pose;
    this.avatar.setTexture(ensureAvatar(this, game.stats.stats, p, 4));
  }

  /** Cập nhật hiệu ứng mồ hôi / mệt mỏi theo mức tiêu hao hiện tại */
  private refreshFatigue(): void {
    const f = this.fatigue();
    if (f <= 0) {
      this.sweat.stop();
    } else {
      this.sweat.frequency = Math.max(60, 400 - f * 340);
      if (!this.sweat.emitting) this.sweat.start();
    }
    // ngả màu xám dần khi mệt
    const shade = Math.round(255 - f * 70);
    this.avatar.setTint(Phaser.Display.Color.GetColor(255, shade, shade));
    this.tweens.killTweensOf(this.avatar);
    this.avatar.setScale(1);
    if (f >= 0.5) this.tweens.add({ targets: this.avatar, scaleY: 0.96, duration: 700 - f * 300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private refreshStrip(): void {
    const phys = PHYSICAL_KEYS.map((k) => `${PHYSICAL_LABEL[k]} ${game.stats.physical(k)}`).join(' · ');
    const know = KNOWLEDGE_KEYS.map((k) => `${KNOWLEDGE_SHORT[k]} ${game.stats.knowledge(k)}`).join(' · ');
    this.statsStrip.setText(`${phys}    |    ${know}`);
  }

  /**
   * Tiêu hao thể chất ở 2 phase đầu: −1 các nhóm cơ của bài tập; nếu thất bại −1 cả các nhóm còn lại.
   * Chỉ số không xuống dưới 0. Phần tiêu hao này được giữ nguyên sang phase cuối.
   * Không save trong trận: tải lại trang sẽ quay về chỉ số trước khi vào boss.
   */
  private drainPhysical(muscles: readonly PhysicalKey[], failed: boolean, x: number, y: number): void {
    muscles.forEach((m) => game.stats.addPhysical(m, -1));
    if (failed) PHYSICAL_KEYS.filter((m) => !muscles.includes(m)).forEach((m) => game.stats.addPhysical(m, -1));
    this.refreshStrip();
    this.refreshFatigue();
    const names = muscles.map((m) => PHYSICAL_LABEL[m]).join(', ');
    floatText(this, x, y, failed ? `−1 ${names}  và  −1 mọi nhóm cơ khác!` : `−1 ${names}`, failed ? C.red : C.orange, 18);
  }

  /** Phạt khi thất bại một rep: −1 mọi nhóm cơ KHÔNG thuộc bài tập (bài tập đã tiêu hao khi bắt đầu lượt) */
  private penaltyOthers(muscles: readonly PhysicalKey[], x: number, y: number): void {
    PHYSICAL_KEYS.filter((m) => !muscles.includes(m)).forEach((m) => game.stats.addPhysical(m, -1));
    this.refreshStrip();
    this.refreshFatigue();
    floatText(this, x, y, 'Trượt → −1 mọi nhóm cơ khác!', C.red, 18);
  }

  /** Tiêu hao kiến thức ở 2 phase đầu: −1 khối của câu hỏi khi đọc đề; nếu sai −1 cả các khối còn lại. */
  private drainKnowledge(cat: KnowledgeKey, failed: boolean, x: number, y: number): void {
    if (!failed) game.stats.addKnowledge(cat, -1);
    else KNOWLEDGE_KEYS.filter((k) => k !== cat).forEach((k) => game.stats.addKnowledge(k, -1));
    this.refreshStrip();
    floatText(this, x, y, failed ? 'Sai → −1 mọi khối kiến thức khác!' : `Đọc đề: −1 ${KNOWLEDGE_LABEL[cat]}`, failed ? C.red : C.sky, 17);
  }

  /**
   * Câu hỏi 2 phase đầu: trong nhóm khối đúng concept của phase, rút từ khối người chơi đang tích luỹ NHIỀU nhất
   * (mỗi câu tiêu hao 1 điểm khối đó); đổi khối so với câu trước khi có thể; không lặp câu trong cùng trận.
   */
  private nextQuestion(kind: Exclude<PhaseKind, 'negation'>): QuizQuestion {
    const group = CONCEPT_CATS[kind];
    const max = Math.max(...group.map((k) => game.stats.knowledge(k)));
    let top = group.filter((k) => game.stats.knowledge(k) === max);
    if (top.length > 1 && this.lastCat) top = top.filter((k) => k !== this.lastCat);
    const cat = top[Math.floor(Math.random() * top.length)];
    this.lastCat = cat;
    const q = QuizEngine.drawFrom(cat, this.usedQ);
    this.usedQ.add(q.id);
    return q;
  }

  /** Hoạt ảnh một lượt tập (2 tư thế) rồi về nghỉ */
  private animateExercise(ex: BossExercise, done?: () => void): void {
    const [a, b] = POSES[ex.id];
    this.setAvatar(a);
    this.time.delayedCall(220, () => this.setAvatar(b));
    this.time.delayedCall(440, () => this.setAvatar(a));
    this.time.delayedCall(650, () => { this.setAvatar('idle'); done?.(); });
  }

  private startPhase(kind: PhaseKind): void {
    if (kind === 'quantity') this.startQuantity();
    else if (kind === 'struggle') this.startStruggle();
    else this.startNegation();
  }

  private nextPhase(): void {
    this.phaseIndex++;
    this.phaseSnapshot = game.stats.clone();
    this.startPhase(this.order[this.phaseIndex]);
  }

  private failPhase(kind: PhaseKind): void {
    this.phase = 'intro';
    this.playerHit();
    Sfx.lose();
    const n = this.order.indexOf(kind) + 1;
    const m = modal(this, 620, 220, 95);
    m.root.add(txt(this, 0, -70, `BỊ VÒNG XOÁY ÁP ĐẢO Ở PHASE ${n}`, 28, C.red).setOrigin(0.5));
    m.root.add(txt(this, 0, -20, 'Phủ định không phải là kết thúc. Thử lại phase này — chỉ số được khôi phục như lúc bắt đầu phase.', 19, C.cream, { wordWrap: { width: 560 }, align: 'center' }).setOrigin(0.5));
    m.root.add(new Button(this, 0, 60, `THỬ LẠI PHASE ${n}`, () => { m.close(); this.startPhase(kind); }, { w: 240, h: 46, fill: C.redHex }));
  }

  private passPhase(kind: PhaseKind, message: string): void {
    this.phase = 'intro';
    Sfx.combo();
    floatText(this, GAME_WIDTH / 2, 120, `PHASE ${this.order.indexOf(kind) + 1} HOÀN THÀNH — ${message}`, C.gold, 30);
    this.bossHit();
    this.time.delayedCall(1300, () => this.nextPhase());
  }

  // ───────────────────────────── INTRO ─────────────────────────────
  private intro(): void {
    this.phaseTitle.setText('THỬ THÁCH CUỐI CÙNG — VÒNG XOÁY BIỆN CHỨNG');
    const m = modal(this, 780, 280, 95);
    m.root.add(this.add.image(-300, -30, 'boss-1').setScale(0.6));
    m.root.add(txt(this, 40, -105, 'VÒNG XOÁY BIỆN CHỨNG', 30, C.red).setOrigin(0.5));
    m.root.add(txt(this, 40, -45, BOSS_LINES.intro[0], 19, C.cream, { wordWrap: { width: 500 }, align: 'center' }).setOrigin(0.5));
    const seq = this.order.map((k, i) => `${i + 1}. ${k === 'quantity' ? BOSS_LINES.quantity : k === 'struggle' ? BOSS_LINES.struggle : BOSS_LINES.negation}`).join('   →   ');
    m.root.add(txt(this, 40, 15, seq, 14, C.gold, { wordWrap: { width: 520 }, align: 'center' }).setOrigin(0.5));
    m.root.add(txt(this, 40, 48, `Lần thử: ${game.bossAttempts}   ·   Thứ tự phase & bài tập ngẫu nhiên mỗi trận   ·   2 phase đầu tiêu hao chỉ số, phase cuối chỉ còn phần còn lại.`, 14, C.gray, { wordWrap: { width: 520 }, align: 'center' }).setOrigin(0.5));
    m.root.add(new Button(this, 40, 105, 'NGHÊNH CHIẾN', () => { m.close(); this.startPhase(this.order[0]); }, { w: 240, h: 46, fill: C.redHex }));
  }

  // ───────────────────────────── PHASE "LƯỢNG ĐỔI" — quiz + bùng nổ thể lực ─────────────────────────────
  private startQuantity(): void {
    this.resetPhaseRoot();
    this.phase = 'quantity';
    this.boss.setTexture('boss-1');
    this.bossGlow.setFillStyle(0x9b5de5, 0.18);
    this.phaseTitle.setText(this.phaseLabel('quantity'));
    this.qz = { energy: 1, drainMul: 1, correct: 0, answered: 0, burst: false, burstPresses: 0, burstTimer: 0 };
    game.stats.stats = JSON.parse(JSON.stringify(this.phaseSnapshot));
    this.refreshStrip();
    this.refreshFatigue();
    const ex = this.qzEx;
    const names = ex.muscles.map((m) => PHYSICAL_LABEL[m]).join(', ');
    this.banner(
      this.phaseLabel('quantity'),
      `${BOSS_LINES.quantityHint} ${BOSS_LINES.quantityCats}\nBài tập: ${ex.name} (−1 ${names} mỗi lượt) · ${BOSS_LINES.drainRule}\nCần ${QZ.needCorrect} câu đúng trước khi thanh Năng lượng cạn.`,
      () => {
        this.panelBg();
        this.qzBar = this.add.graphics();
        this.phaseRoot.add(this.qzBar);
        this.phaseRoot.add(txt(this, 40, PANEL_Y + 10, 'NĂNG LƯỢNG', 16, C.cream));
        this.qzStatus = txt(this, GAME_WIDTH - 40, PANEL_Y + 10, '', 17, C.gold).setOrigin(1, 0);
        this.phaseRoot.add(this.qzStatus);
        this.qzQuiz = new QuizPanel(this, 40, PANEL_Y + 52, { w: 880, questionSize: 19, optionSize: 16, instantFeedback: true, optionGap: 4 });
        this.phaseRoot.add(this.qzQuiz);
        this.unbinders.push(bindNumberKeys(this, (i) => { if (!this.qz.burst) this.qzQuiz?.choose(i); }));
        this.unbinders.push(bindAction(this, () => this.qzPress()));
        this.actionBtn = new ActionButton(this, () => this.qzPress(), `${ex.name.toUpperCase()}!`, GAME_WIDTH - 130, GAME_HEIGHT - 50, { w: 220, h: 64 });
        this.actionBtn.setVisible(false);
        this.qzRefresh();
        // mở màn bằng một lượt tập
        this.qzStartBurst();
      },
    );
  }

  private qzAsk(): void {
    if (!this.qzQuiz) return;
    const q = this.nextQuestion('quantity');
    this.drainKnowledge(q.category, false, GAME_WIDTH / 2, ARENA_H - 30);
    this.qzQuiz.show(q, (_i, correct) => {
      this.qz.answered++;
      if (correct) {
        this.qz.correct++;
        this.qz.drainMul = Math.max(0.35, this.qz.drainMul * 0.78);
        this.qz.energy = Math.min(1, this.qz.energy + 0.08);
        Sfx.correct();
        this.bossHit();
        floatText(this, BOSS_X, 60, `ĐÚNG! Tốc độ cạn ×${this.qz.drainMul.toFixed(2)}`, C.green, 24);
      } else {
        this.qz.energy = Math.max(0, this.qz.energy - 0.05);
        Sfx.wrong();
        this.playerHit();
        floatText(this, GAME_WIDTH / 2, 60, `Sai — ${KNOWLEDGE_LABEL[q.category]}: ${q.options[q.correctIndex].slice(0, 40)}…`, C.red, 18);
        this.drainKnowledge(q.category, true, GAME_WIDTH / 2, ARENA_H - 30);
      }
      this.qzRefresh();
      this.time.delayedCall(900, () => {
        if (this.phase !== 'quantity') return;
        if (this.qz.correct >= QZ.needCorrect) return this.passPhase('quantity', 'LƯỢNG ĐÃ ĐỔI!');
        if (this.qz.answered % QZ.burstEvery === 0) this.qzStartBurst();
        else this.qzAsk();
      });
    });
  }

  private qzStartBurst(): void {
    this.qz.burst = true;
    this.qz.burstPresses = 0;
    this.qz.burstTimer = QZ.burstMs;
    Sfx.alarm();
    this.qzBurstText = txt(this, GAME_WIDTH / 2 - 60, 70, `BÙNG NỔ THỂ LỰC!\n${this.qzEx.name.toUpperCase()}: bấm SPACE ×${QZ.burstPresses} trong 3 giây!`, 26, C.gold, {
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5).setDepth(70);
    this.actionBtn?.setVisible(true);
    this.setAvatar(POSES[this.qzEx.id][0]);
    this.boss.setTint(0xff6666);
  }

  private qzPress(): void {
    if (this.phase !== 'quantity' || !this.qz.burst) return;
    this.qz.burstPresses++;
    this.pushToggle = !this.pushToggle;
    this.setAvatar(POSES[this.qzEx.id][this.pushToggle ? 1 : 0]);
    Sfx.rep();
    this.actionBtn?.flash();
    this.sweat.explode(1, AVATAR_X, AVATAR_Y - 140);
    this.qzBurstText?.setText(`BÙNG NỔ THỂ LỰC!\n${this.qzEx.name.toUpperCase()}: ${this.qz.burstPresses} / ${QZ.burstPresses}`);
    if (this.qz.burstPresses >= QZ.burstPresses) this.qzEndBurst(true);
  }

  private qzEndBurst(success: boolean): void {
    this.qz.burst = false;
    this.qzBurstText?.destroy();
    this.qzBurstText = null;
    this.actionBtn?.setVisible(false);
    this.boss.clearTint();
    this.setAvatar('idle');
    if (success) {
      this.qz.energy = Math.min(1, this.qz.energy + 0.15);
      this.bossHit();
      floatText(this, BOSS_X, 60, 'ĐẨY LÙI ĐÒN TẤN CÔNG! +Năng lượng', C.green, 24);
    } else {
      this.qz.energy = Math.max(0, this.qz.energy - 0.2);
      this.playerHit();
      floatText(this, AVATAR_X + 120, 80, 'Trúng đòn! −Năng lượng', C.red, 24);
    }
    // bài tập tiêu hao nhóm cơ liên quan; thất bại thì mọi nhóm cơ khác cũng −1
    this.drainPhysical(this.qzEx.muscles, !success, AVATAR_X + 120, ARENA_H - 50);
    this.qzRefresh();
    this.time.delayedCall(700, () => { if (this.phase === 'quantity' && this.qz.energy > 0) this.qzAsk(); });
  }

  private qzRefresh(): void {
    this.qzStatus.setText(`Đúng: ${this.qz.correct} / ${QZ.needCorrect}   ·   Đã trả lời: ${this.qz.answered}`);
  }

  private qzDraw(): void {
    const g = this.qzBar;
    g.clear();
    const bx = 150;
    const by = PANEL_Y + 12;
    const bw = GAME_WIDTH - 40 - 250 - bx;
    g.fillStyle(C.borderHex, 1).fillRect(bx - 4, by - 4, bw + 8, 22);
    g.fillStyle(0x0b0716, 1).fillRect(bx, by, bw, 14);
    const e = this.qz.energy;
    g.fillStyle(e > 0.5 ? C.greenHex : e > 0.25 ? C.goldHex : C.redHex, 1).fillRect(bx, by, bw * e, 14);
    if (this.qz.burst) {
      g.fillStyle(C.borderHex, 1).fillRect(GAME_WIDTH / 2 - 214, 116, 308, 18);
      g.fillStyle(0x0b0716, 1).fillRect(GAME_WIDTH / 2 - 210, 120, 300, 10);
      g.fillStyle(C.orangeHex, 1).fillRect(GAME_WIDTH / 2 - 210, 120, 300 * (this.qz.burstTimer / QZ.burstMs), 10);
    }
  }

  // ───────────────────────────── PHASE "ĐẤU TRANH" — chia đôi thể chất / kiến thức ─────────────────────────────
  private startStruggle(): void {
    this.resetPhaseRoot();
    this.phase = 'struggle';
    this.boss.setTexture('boss-2');
    this.bossGlow.setFillStyle(0xef476f, 0.18);
    this.phaseTitle.setText(this.phaseLabel('struggle'));
    this.sp = { timer: SP.totalMs, reps: 0, correct: 0, qTimer: SP.questionMs, qActive: false };
    game.stats.stats = JSON.parse(JSON.stringify(this.phaseSnapshot));
    this.refreshStrip();
    this.refreshFatigue();
    const ex = this.spEx;
    const names = ex.muscles.map((m) => PHYSICAL_LABEL[m]).join(', ');
    this.banner(
      this.phaseLabel('struggle'),
      `${BOSS_LINES.struggleHint} ${BOSS_LINES.struggleCats}\nBài tập: ${ex.name} — cả lượt tập tiêu hao −1 ${names}; mỗi rep TRƯỢT phạt −1 mọi nhóm cơ khác. Mỗi câu hỏi −1 khối đó, sai → −1 mọi khối khác.\nCần ${SP.needReps} rep (Good/Perfect) VÀ ${SP.needCorrect} câu đúng trong ${SP.totalMs / 1000}s.`,
      () => {
        this.panelBg();
        this.setAvatar(POSES[ex.id][0]);
        // cả lượt tập tiêu hao 1 lần khi bắt đầu
        this.drainPhysical(ex.muscles, false, AVATAR_X + 120, ARENA_H - 50);
        const g = this.add.graphics();
        g.fillStyle(C.borderHex, 1).fillRect(GAME_WIDTH / 2 - 2, PANEL_Y + 4, 4, GAME_HEIGHT - PANEL_Y - 18);
        this.phaseRoot.add(g);
        this.spG = this.add.graphics();
        this.phaseRoot.add(this.spG);
        this.spTimer = txt(this, GAME_WIDTH / 2, 34, '', 24, C.gold, { stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(61);
        this.phaseRoot.add(this.spTimer);
        this.phaseRoot.add(txt(this, 250, PANEL_Y + 14, `THỂ CHẤT — ${ex.name.toUpperCase()}`, 20, C.orange).setOrigin(0.5));
        this.spLeft = txt(this, 250, PANEL_Y + 40, '', 20, C.white).setOrigin(0.5);
        this.phaseRoot.add(this.spLeft);
        this.phaseRoot.add(txt(this, 250, PANEL_Y + 64, 'SPACE khi con trỏ vào vùng XANH', 15, C.cream).setOrigin(0.5));
        this.phaseRoot.add(txt(this, 720, PANEL_Y + 14, 'KIẾN THỨC — CÂU HỎI ĐẾM GIỜ', 20, C.sky).setOrigin(0.5));
        this.spRight = txt(this, 720, PANEL_Y + 40, '', 20, C.white).setOrigin(0.5);
        this.phaseRoot.add(this.spRight);
        this.spQuiz = new QuizPanel(this, GAME_WIDTH / 2 + 20, PANEL_Y + 68, { w: 420, questionSize: 15, optionSize: 14, instantFeedback: true, optionGap: 2 });
        this.phaseRoot.add(this.spQuiz);

        this.spEngine = new TimingEngine({ mode: 'timing', repsRequired: 999, timingSpeed: 0.8 });
        this.spEngine.on('rep', (grade) => {
          if (this.phase !== 'struggle') return;
          if (grade === 'bad') {
            this.penaltyOthers(ex.muscles, AVATAR_X + 120, ARENA_H - 50);
            this.playerHit();
            floatText(this, 250, PANEL_Y + 100, 'TRƯỢT', C.red, 22);
          } else {
            this.sp.reps++;
            grade === 'perfect' ? Sfx.perfect() : Sfx.good();
            floatText(this, 250, PANEL_Y + 100, grade === 'perfect' ? 'PERFECT!' : 'GOOD', grade === 'perfect' ? C.green : C.gold, 24);
            this.animateExercise(ex, () => { if (this.phase === 'struggle') this.setAvatar(POSES[ex.id][0]); });
            this.sweat.explode(3, AVATAR_X, AVATAR_Y - 140);
            this.bossHit();
          }
          this.spRefresh();
          this.spCheck();
        });
        this.unbinders.push(bindAction(this, () => this.spEngine?.press()));
        this.unbinders.push(bindNumberKeys(this, (i) => this.spQuiz?.choose(i)));
        this.actionBtn = new ActionButton(this, () => this.spEngine?.press(), 'KÉO!', 250, GAME_HEIGHT - 52, { h: 60 });
        this.spAsk();
        this.spRefresh();
      },
    );
  }

  private spAsk(): void {
    if (!this.spQuiz || this.phase !== 'struggle') return;
    if (this.sp.correct >= SP.needCorrect) return;
    this.sp.qTimer = SP.questionMs;
    this.sp.qActive = true;
    const q = this.nextQuestion('struggle');
    this.spCat = q.category;
    this.drainKnowledge(q.category, false, 720, ARENA_H - 30);
    this.spQuiz.show(q, (_i, correct) => {
      this.sp.qActive = false;
      if (correct) {
        this.sp.correct++;
        Sfx.correct();
        this.bossHit();
      } else {
        Sfx.wrong();
        this.playerHit();
        floatText(this, 720, PANEL_Y + 60, `Sai! Đáp án: ${q.options[q.correctIndex].slice(0, 36)}…`, C.red, 16);
        this.drainKnowledge(q.category, true, 720, ARENA_H - 30);
      }
      this.spRefresh();
      this.time.delayedCall(800, () => { if (!this.spCheck()) this.spAsk(); });
    });
  }

  private spRefresh(): void {
    this.spLeft.setText(`Rep: ${this.sp.reps} / ${SP.needReps}${this.sp.reps >= SP.needReps ? '  ✔' : ''}`);
    this.spRight.setText(`Đúng: ${this.sp.correct} / ${SP.needCorrect}${this.sp.correct >= SP.needCorrect ? '  ✔' : ''}`);
  }

  private spCheck(): boolean {
    if (this.phase !== 'struggle') return true;
    if (this.sp.reps >= SP.needReps && this.sp.correct >= SP.needCorrect) {
      this.passPhase('struggle', 'HAI MẶT ĐỐI LẬP ĐÃ THỐNG NHẤT!');
      return true;
    }
    return false;
  }

  private spDraw(): void {
    if (!this.spEngine) return;
    const g = this.spG;
    g.clear();
    const bx = 70;
    const by = PANEL_Y + 130;
    const bw = 360;
    const bh = 26;
    g.fillStyle(C.borderHex, 1).fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    g.fillStyle(0x0b0716, 1).fillRect(bx, by, bw, bh);
    g.fillStyle(C.goldHex, 0.55).fillRect(bx + bw * TIMING_ZONES.goodMin, by, bw * (TIMING_ZONES.goodMax - TIMING_ZONES.goodMin), bh);
    g.fillStyle(C.greenHex, 1).fillRect(bx + bw * TIMING_ZONES.perfectMin, by, bw * (TIMING_ZONES.perfectMax - TIMING_ZONES.perfectMin), bh);
    const cx = bx + bw * this.spEngine.cursor;
    g.fillStyle(0xffffff, 1).fillRect(cx - 4, by - 10, 8, bh + 20);
    g.fillStyle(this.spEngine.inPerfectZone ? C.greenHex : C.redHex, 1).fillRect(cx - 2, by - 8, 4, bh + 16);
    // timer câu hỏi
    if (this.sp.qActive) {
      const qx = GAME_WIDTH / 2 + 20;
      g.fillStyle(C.borderHex, 1).fillRect(qx - 3, PANEL_Y + 55, 426, 12);
      g.fillStyle(0x0b0716, 1).fillRect(qx, PANEL_Y + 58, 420, 6);
      const f = this.sp.qTimer / SP.questionMs;
      g.fillStyle(f > 0.3 ? C.skyHex : C.redHex, 1).fillRect(qx, PANEL_Y + 58, 420 * f, 6);
    }
  }

  // ───────────────────────────── PHASE CUỐI "PHỦ ĐỊNH CỦA PHỦ ĐỊNH" ─────────────────────────────
  private startNegation(): void {
    this.resetPhaseRoot();
    this.phase = 'negation';
    this.boss.setTexture('boss-3');
    this.bossGlow.setFillStyle(0xffd166, 0.18);
    this.phaseTitle.setText(this.phaseLabel('negation'));
    this.fnCounts = {};
    BALANCE.bossExercises.forEach((ex) => (this.fnCounts[ex.id] = 0));
    this.fnCards = {};
    this.fnIndex = 0;
    this.fnWrong = [];
    this.fnExamDone = false;
    this.fnPhysDone = false;
    this.fnDoomed = false;
    game.stats.stats = JSON.parse(JSON.stringify(this.phaseSnapshot));
    this.finalSnapshot = game.stats.clone();
    this.refreshStrip();
    this.refreshFatigue();
    this.fnExam = QuizEngine.drawBossExam(game.seenQuestions, game.stats.stats.knowledge, BALANCE.knowledgeMin, BALANCE.bossQuestions);
    const list = this.exercises.map((ex) => `${ex.name} ×${BALANCE.bossExerciseReps} (${ex.muscles.map((m) => PHYSICAL_LABEL[m]).join(', ')})`).join(' · ');
    this.banner(this.phaseLabel('negation'), `${BOSS_LINES.negationHint}\nThể chất: ${list}.`, () => {
      this.panelBg();
      this.setAvatar('idle');
      const g = this.add.graphics();
      g.fillStyle(C.borderHex, 1).fillRect(GAME_WIDTH / 2 - 2, PANEL_Y + 4, 4, GAME_HEIGHT - PANEL_Y - 18);
      this.phaseRoot.add(g);
      this.phaseRoot.add(txt(this, 250, PANEL_Y + 10, 'THỂ CHẤT — phần còn lại', 18, C.orange).setOrigin(0.5, 0));
      this.phaseRoot.add(txt(this, 720, PANEL_Y + 10, `KIẾN THỨC — đề ${BALANCE.bossQuestions} câu, cần đúng cả ${BALANCE.bossQuestions}`, 18, C.sky).setOrigin(0.5, 0));

      // 3 thẻ bài tập (thứ tự ngẫu nhiên của trận này)
      this.exercises.forEach((ex, i) => {
        const y = PANEL_Y + 36 + i * 62;
        const root = this.add.container(36, y);
        const bg = this.add.graphics();
        bg.fillStyle(C.borderHex, 1).fillRect(0, 0, 300, 56);
        bg.fillStyle(C.panel, 1).fillRect(3, 3, 294, 50);
        root.add(bg);
        root.add(txt(this, 10, 4, ex.name, 20, C.gold));
        root.add(txt(this, 10, 26, `−1: ${ex.muscles.map((m) => PHYSICAL_LABEL[m]).join(', ')}`, 13, C.cream));
        const count = txt(this, 290, 6, '', 24, C.white).setOrigin(1, 0);
        root.add(count);
        const status = txt(this, 150, 40, '', 12, C.green).setOrigin(0, 0);
        root.add(status);
        const zone = this.add.zone(0, 0, 300, 56).setOrigin(0).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => bg.setAlpha(0.85));
        zone.on('pointerout', () => bg.setAlpha(1));
        zone.on('pointerup', () => this.fnPerform(ex.id));
        root.add(zone);
        this.phaseRoot.add(root);
        this.fnCards[ex.id] = { root, count, status };
      });
      this.fnStatus = txt(this, 345, PANEL_Y + 40, '', 13, C.gold, { wordWrap: { width: 125 } });
      this.phaseRoot.add(this.fnStatus);
      this.phaseRoot.add(new Button(this, 405, GAME_HEIGHT - 34, 'BỎ CUỘC', () => this.fnGiveUp(), { w: 120, h: 32, size: 16, fill: 0x3a2a2a }));

      // đề thi
      this.fnQuiz = new QuizPanel(this, GAME_WIDTH / 2 + 20, PANEL_Y + 56, { w: 420, questionSize: 16, optionSize: 14, instantFeedback: true, optionGap: 3 });
      this.phaseRoot.add(this.fnQuiz);
      this.unbinders.push(bindNumberKeys(this, (i) => this.fnQuiz?.choose(i)));
      this.fnRefreshCards();
      this.fnAskExam();
    });
  }

  private fnRefreshCards(): void {
    BALANCE.bossExercises.forEach((ex) => {
      const c = this.fnCards[ex.id];
      const n = this.fnCounts[ex.id];
      c.count.setText(`${n} / ${BALANCE.bossExerciseReps}`);
      if (n >= BALANCE.bossExerciseReps) c.status.setText('✔ HOÀN THÀNH').setColor(C.green);
      else {
        const lacking = ex.muscles.filter((m) => game.stats.physical(m) < 1);
        c.status.setText(lacking.length ? `Hết sức: ${lacking.map((m) => PHYSICAL_LABEL[m]).join(', ')} = 0` : 'Bấm để thực hiện').setColor(lacking.length ? C.red : C.green);
      }
    });
    // Bị kẹt: còn bài chưa xong mà một nhóm cơ liên quan đã về 0 (người chơi tự "khám phá" giới hạn của mình)
    const stuck = new Set<PhysicalKey>();
    BALANCE.bossExercises.forEach((ex) => {
      if (this.fnCounts[ex.id] >= BALANCE.bossExerciseReps) return;
      ex.muscles.filter((m) => game.stats.physical(m) < 1).forEach((m) => stuck.add(m));
    });
    this.fnPhysDone = BALANCE.bossExercises.every((ex) => this.fnCounts[ex.id] >= BALANCE.bossExerciseReps);
    if (this.fnPhysDone) this.fnStatus.setText('✔ Phần thể chất hoàn thành!').setColor(C.green);
    else if (stuck.size && !this.fnDoomed) {
      this.fnDoomed = true;
      this.fnStatus.setText(`Hết sức! ${[...stuck].map((k) => PHYSICAL_LABEL[k]).join(', ')} = 0 — không thể hoàn thành.`).setColor(C.red);
      this.time.delayedCall(2200, () => { if (this.phase === 'negation') this.fnFinish(); });
    } else this.fnStatus.setText('Mỗi lần tập −1 điểm các nhóm cơ liên quan.').setColor(C.gold);
    this.fnCheckDone();
  }

  private fnPerform(id: string): void {
    if (this.phase !== 'negation' || this.busy) return;
    const ex = BALANCE.bossExercises.find((e) => e.id === id)!;
    if (this.fnCounts[id] >= BALANCE.bossExerciseReps) return;
    const lacking = ex.muscles.filter((m) => game.stats.physical(m) < 1);
    if (lacking.length) {
      this.playerHit();
      floatText(this, 250, PANEL_Y + 20, `Không đủ sức! ${lacking.map((m) => PHYSICAL_LABEL[m]).join(', ')} = 0`, C.red, 18);
      return;
    }
    this.busy = true;
    ex.muscles.forEach((m) => game.stats.addPhysical(m, -1));
    this.fnCounts[id]++;
    Sfx.rep();
    this.animateExercise(ex, () => { this.busy = false; });
    this.sweat.explode(4, AVATAR_X, AVATAR_Y - 140);
    this.refreshStrip();
    this.refreshFatigue();
    this.bossHit();
    floatText(this, AVATAR_X + 120, ARENA_H - 50, `${ex.name} +1  (${ex.muscles.map((m) => `−1 ${PHYSICAL_LABEL[m]}`).join(', ')})`, C.gold, 17);
    this.fnRefreshCards();
  }

  private fnAskExam(): void {
    if (!this.fnQuiz || this.phase !== 'negation') return;
    if (this.fnIndex >= this.fnExam.length) {
      this.fnExamDone = true;
      this.fnCheckDone();
      return;
    }
    const q = this.fnExam[this.fnIndex];
    const level = game.stats.knowledge(q.category);
    const idx = this.fnIndex;
    const header = this.phaseRoot.getByName('examHeader') as Phaser.GameObjects.Text | null;
    header?.destroy();
    const h = txt(this, GAME_WIDTH / 2 + 20, PANEL_Y + 34, `Câu ${idx + 1}/${this.fnExam.length} · Khối ${KNOWLEDGE_LABEL[q.category]} (còn ${level} điểm)`, 14, C.gray).setName('examHeader');
    this.phaseRoot.add(h);

    if (level < BALANCE.knowledgeMin) {
      // Chưa tích luỹ đủ lượng → không thể "đọc" được câu hỏi (mỗi khối còn lại >= 2)
      const garbled: QuizQuestion = {
        ...q,
        question: `▓▓▓▓ ▓▓▓ ▓▓▓▓▓▓ ▓▓ ▓▓▓▓▓ ▓▓▓▓?\n(Kiến thức khối "${KNOWLEDGE_LABEL[q.category]}" chưa đủ để đọc câu hỏi này — còn ${level} điểm)`,
        options: ['▓▓▓▓ ▓▓▓▓▓ ▓▓', '▓▓▓ ▓▓▓▓▓▓ ▓▓▓▓', '▓▓▓▓▓ ▓▓ ▓▓▓', '▓▓ ▓▓▓▓ ▓▓▓▓▓'],
        correctIndex: -1,
      };
      this.fnQuiz.show(garbled, () => {
        this.fnWrong.push(q.category);
        Sfx.wrong();
        this.playerHit();
        floatText(this, 720, PANEL_Y + 120, 'Kiến thức chưa đủ để giải!', C.red, 20);
        this.fnIndex++;
        this.time.delayedCall(900, () => this.fnAskExam());
      });
      return;
    }
    this.fnQuiz.show(q, (_i, correct) => {
      if (correct) {
        Sfx.correct();
        this.bossHit();
      } else {
        this.fnWrong.push(q.category);
        Sfx.wrong();
        this.playerHit();
        floatText(this, 720, PANEL_Y + 120, `Sai! Đáp án: ${q.options[q.correctIndex].slice(0, 40)}…`, C.red, 15);
      }
      this.fnIndex++;
      this.time.delayedCall(900, () => this.fnAskExam());
    });
  }

  private fnCheckDone(): void {
    if (this.phase !== 'negation') return;
    if (this.fnExamDone && (this.fnPhysDone || this.fnDoomed)) this.time.delayedCall(600, () => this.fnFinish());
  }

  private fnGiveUp(): void {
    if (this.phase !== 'negation') return;
    const m = modal(this, 520, 180, 95);
    m.root.add(txt(this, 0, -50, 'Bỏ cuộc thử thách này?', 26, C.cream).setOrigin(0.5));
    m.root.add(new Button(this, -110, 40, 'BỎ CUỘC', () => { m.close(); this.fnFinish(true); }, { w: 200, h: 44, fill: C.redHex }));
    m.root.add(new Button(this, 110, 40, 'TIẾP TỤC', () => m.close(), { w: 200, h: 44 }));
  }

  /** Kết thúc phase cuối: áp công thức thắng/thua, khôi phục chỉ số, sang Ending */
  private fnFinish(gaveUp = false): void {
    if (this.phase !== 'negation') return;
    this.phase = 'result';
    this.cleanupInput();
    const physOk = this.fnPhysDone;
    const knowOk = this.fnExamDone && this.fnWrong.length === 0;
    const won = physOk && knowOk && !gaveUp;

    // lý do thua: chỉ số lúc vào phase cuối (đã trừ tiêu hao 2 phase đầu) chưa đạt ngưỡng + câu sai
    const reasons: string[] = [];
    const snapMgr = new StatsManager(this.finalSnapshot);
    snapMgr.deficits().forEach((d) => reasons.push(`${d.label}: ${d.current}/${d.required} (sau tiêu hao 2 phase đầu)`));
    if (!won && reasons.length === 0) {
      if (!knowOk) reasons.push(`Trả lời sai ${this.fnWrong.length} câu (${[...new Set(this.fnWrong)].map((c) => KNOWLEDGE_LABEL[c]).join(', ')})`);
      if (!physOk) reasons.push(`Chưa hoàn thành đủ 3 bài tập ×${BALANCE.bossExerciseReps}`);
      if (gaveUp) reasons.push('Đã bỏ cuộc');
    }
    // khôi phục chỉ số đã tích luỹ (phần tiêu hao chỉ diễn ra trong trận)
    game.stats.stats = this.snapshot;
    game.lastBossResult = { won, reasons };
    game.phase = 'ended';
    if (won) game.badges.champion = true;
    game.save();

    Sfx.stopBgm();
    this.sweat.stop();
    this.tweens.killTweensOf(this.avatar);
    this.avatar.clearTint().setScale(1);
    if (won) {
      Sfx.win();
      this.tweens.add({ targets: [this.boss, this.bossGlow], scale: 0, angle: 1080, alpha: 0, duration: 1500, ease: 'Cubic.In' });
      this.cameras.main.flash(600, 255, 255, 255);
      floatText(this, GAME_WIDTH / 2, 120, 'CHẤT ĐÃ ĐỔI!', C.gold, 48);
      this.avatar.setTexture(ensureAvatar(this, game.stats.stats, 'happy', 4));
    } else {
      Sfx.lose();
      this.cameras.main.shake(600, 0.01);
      this.avatar.setTexture(ensureAvatar(this, game.stats.stats, 'tired', 4));
      floatText(this, GAME_WIDTH / 2, 120, 'LƯỢNG CHƯA ĐỦ...', C.red, 40);
    }
    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.ending));
    });
  }

  // ───────────────────────────── UPDATE ─────────────────────────────
  update(_t: number, delta: number): void {
    if (this.busy && this.phase !== 'negation') return;
    if (this.phase === 'quantity') {
      if (this.qz.burst) {
        this.qz.burstTimer -= delta;
        if (this.qz.burstTimer <= 0) this.qzEndBurst(false);
      } else {
        this.qz.energy -= (delta / QZ.drainMs) * this.qz.drainMul;
        if (this.qz.energy <= 0) {
          this.qz.energy = 0;
          this.qzDraw();
          return this.failPhase('quantity');
        }
      }
      this.qzDraw();
    } else if (this.phase === 'struggle') {
      this.sp.timer -= delta;
      this.spEngine?.update(delta);
      if (this.sp.qActive) {
        this.sp.qTimer -= delta;
        if (this.sp.qTimer <= 0) {
          this.sp.qActive = false;
          this.spQuiz?.lock();
          Sfx.wrong();
          floatText(this, 720, PANEL_Y + 60, 'Hết giờ câu này!', C.red, 18);
          if (this.spCat) this.drainKnowledge(this.spCat, true, 720, ARENA_H - 30);
          this.time.delayedCall(500, () => { if (!this.spCheck()) this.spAsk(); });
        }
      }
      this.spTimer.setText(`⏱ ${Math.max(0, this.sp.timer / 1000).toFixed(1)}s`);
      this.spDraw();
      if (this.sp.timer <= 0) return this.failPhase('struggle');
    }
  }
}
