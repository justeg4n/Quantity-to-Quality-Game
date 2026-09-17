import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE, KNOWLEDGE_LABEL } from '../data/balance';
import type { KnowledgeKey, QuizQuestion } from '../data/types';
import { ensureAvatar } from '../gfx/Avatar';
import { game } from '../systems/GameState';
import { QuizEngine } from '../systems/QuizEngine';
import { Sfx } from '../systems/Sfx';
import { bindNumberKeys } from '../ui/ActionInput';
import { QuizPanel } from '../ui/QuizPanel';
import { Button, txt } from '../ui/Widgets';

export class QuizScene extends Phaser.Scene {
  private category!: KnowledgeKey;
  private questions: QuizQuestion[] = [];
  private answers: number[] = [];
  private panel!: QuizPanel;
  private progress!: Phaser.GameObjects.Text;
  private unbindKeys: (() => void) | null = null;

  constructor() {
    super(SCENE.quiz);
  }

  create(data: { category: KnowledgeKey }): void {
    this.category = data.category;
    this.answers = [];
    this.questions = QuizEngine.draw(this.category, BALANCE.questionsPerStudy, game.seenQuestions);

    // ─── Nền ───
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xbde0fe).setOrigin(0);
    this.add.tileSprite(0, 420, GAME_WIDTH, 120, 'tile-marble').setOrigin(0);
    this.add.image(40, 420, 'column').setOrigin(0.5, 1).setScale(1, 7);
    this.add.image(GAME_WIDTH - 40, 420, 'column').setOrigin(0.5, 1).setScale(1, 7);
    const pg = this.add.graphics();
    pg.fillStyle(C.borderHex, 1).fillRect(80, 20, GAME_WIDTH - 160, GAME_HEIGHT - 40);
    pg.fillStyle(0x0b0716, 1).fillRect(83, 23, GAME_WIDTH - 166, GAME_HEIGHT - 46);
    pg.fillStyle(C.panel, 1).fillRect(86, 26, GAME_WIDTH - 172, GAME_HEIGHT - 52);

    txt(this, GAME_WIDTH / 2, 36, `KHỐI: ${KNOWLEDGE_LABEL[this.category].toUpperCase()}`, 28, C.gold).setOrigin(0.5, 0);
    this.progress = txt(this, GAME_WIDTH - 100, 42, '', 20, C.cream).setOrigin(1, 0);
    txt(this, 100, 42, 'Chọn bằng chuột hoặc phím 1–4', 16, C.gray);

    this.panel = new QuizPanel(this, 110, 80, { w: GAME_WIDTH - 220, questionSize: 23, optionSize: 20 });
    this.unbindKeys = bindNumberKeys(this, (i) => this.panel.choose(i));
    this.events.once('shutdown', () => this.unbindKeys?.());

    this.showQuestion(0);
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private showQuestion(i: number): void {
    const q = this.questions[i];
    this.progress.setText(`Câu ${i + 1} / ${this.questions.length}`);
    this.panel.show(q, (idx) => {
      this.answers[i] = idx;
      this.time.delayedCall(350, () => {
        if (i + 1 < this.questions.length) this.showQuestion(i + 1);
        else this.showResults();
      });
    });
  }

  private showResults(): void {
    this.panel.destroy();
    game.markSeen(this.questions.map((q) => q.id));
    const correctCount = this.questions.filter((q, i) => this.answers[i] === q.correctIndex).length;
    const both = correctCount === this.questions.length;
    // +1 điểm khả năng theo luật gốc (không phụ thuộc đúng/sai)
    game.stats.addKnowledge(this.category, 1);
    if (both) game.day.philosopherBadge = true;
    game.save();
    if (both) Sfx.correct();
    else Sfx.wrong();

    this.progress.setText(`Đúng ${correctCount}/${this.questions.length}`);
    const root = this.add.container(110, 76);
    let y = 0;
    this.questions.forEach((q, i) => {
      const ok = this.answers[i] === q.correctIndex;
      const icon = this.add.image(10, y + 12, ok ? 'icon-check' : 'icon-cross');
      root.add(icon);
      const qt = txt(this, 30, y, `Câu ${i + 1}: ${q.question}`, 18, C.white, { wordWrap: { width: GAME_WIDTH - 260 } });
      root.add(qt);
      y += qt.height + 4;
      const at = txt(this, 30, y, `✔ Đáp án: ${q.options[q.correctIndex]}`, 18, C.green, { wordWrap: { width: GAME_WIDTH - 260 } });
      root.add(at);
      y += at.height + 2;
      if (!ok) {
        const wt = txt(this, 30, y, `✘ Bạn chọn: ${q.options[this.answers[i]]}`, 17, C.red, { wordWrap: { width: GAME_WIDTH - 260 } });
        root.add(wt);
        y += wt.height + 2;
      }
      const et = txt(this, 30, y, q.explanation, 17, C.cream, { wordWrap: { width: GAME_WIDTH - 260 } });
      root.add(et);
      y += et.height + 2;
      if (!ok && q.gymExample) {
        const gt = txt(this, 30, y, `🏋 ${q.gymExample}`, 16, C.gold, { wordWrap: { width: GAME_WIDTH - 260 } });
        root.add(gt);
        y += gt.height + 2;
      }
      y += 10;
    });
    // nếu quá dài, thu nhỏ để vừa khung
    const maxH = GAME_HEIGHT - 76 - 110;
    if (y > maxH) root.setScale(maxH / y);

    const av = this.add.image(GAME_WIDTH - 130, GAME_HEIGHT - 60, ensureAvatar(this, game.stats.stats, both ? 'happy' : 'idle', 2)).setOrigin(0.5, 1);
    if (both) this.add.image(GAME_WIDTH - 130, GAME_HEIGHT - 150, 'icon-laurel');
    this.tweens.add({ targets: av, y: av.y - 6, duration: 400, yoyo: true, repeat: -1 });
    txt(this, GAME_WIDTH / 2 - 60, GAME_HEIGHT - 84, `+1 ${KNOWLEDGE_LABEL[this.category]} → ${game.stats.knowledge(this.category)}${both ? '   ·   ★ Huy hiệu Triết gia hôm nay!' : ''}`, 22, both ? C.gold : C.green).setOrigin(0.5);
    new Button(this, GAME_WIDTH / 2 - 60, GAME_HEIGHT - 48, 'VỀ ATHENS ▶', () => this.back(both), { w: 240, h: 44 });
    Sfx.statUp();
  }

  private back(both: boolean): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.athens, { studied: this.category, bothCorrect: both }));
  }
}
