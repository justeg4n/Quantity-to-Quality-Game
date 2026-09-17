import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE, KNOWLEDGE_DESC, KNOWLEDGE_KEYS, KNOWLEDGE_LABEL, KNOWLEDGE_SHORT } from '../data/balance';
import { PROFESSOR_LINES } from '../data/dialogue';
import type { KnowledgeKey } from '../data/types';
import { questionsByCategory } from '../data/questions';
import { ensureAvatar } from '../gfx/Avatar';
import { game } from '../systems/GameState';
import { Sfx } from '../systems/Sfx';
import { enablePause } from './PauseScene';
import { Button, PointsHud, SpeechBubble, StatBar, floatText, modal, txt } from '../ui/Widgets';

interface AthensReturn {
  studied?: KnowledgeKey;
  bothCorrect?: boolean;
}

export class AthensScene extends Phaser.Scene {
  private hud!: PointsHud;
  private bubble!: SpeechBubble;

  constructor() {
    super(SCENE.athens);
  }

  create(data: AthensReturn): void {
    enablePause(this);
    game.athensVisits += 1;

    // ─── Nội thất ───
    this.add.rectangle(0, 0, GAME_WIDTH, 200, 0xbde0fe).setOrigin(0);
    this.add.rectangle(0, 196, GAME_WIDTH, 8, 0x8d99ae).setOrigin(0);
    this.add.tileSprite(0, 204, GAME_WIDTH, GAME_HEIGHT - 204, 'tile-marble').setOrigin(0);
    for (const cx of [60, 330, 630, 900]) this.add.image(cx, 200, 'column').setOrigin(0.5, 1).setScale(1, 3.5);
    this.add.image(GAME_WIDTH / 2, 190, 'bust').setOrigin(0.5, 1).setScale(1.5);
    txt(this, GAME_WIDTH / 2, 30, 'A T H E N S', 30, C.dark).setOrigin(0.5);
    txt(this, GAME_WIDTH / 2, 62, '"Lượng đổi — Chất đổi"', 20, C.blue).setOrigin(0.5);

    // ─── Giáo sư ───
    this.add.image(90, 330, 'npc-professor').setOrigin(0.5, 1).setScale(1.6);
    txt(this, 90, 336, 'GIÁO SƯ', 18, C.blue).setOrigin(0.5, 0);
    this.bubble = new SpeechBubble(this, 30, 90, 260);
    this.bubble.say(this.professorLine(data));

    // ─── 6 góc học tập ───
    const cols = [250, 390, 530];
    const rows = [290, 440];
    KNOWLEDGE_KEYS.forEach((k, i) => this.makeCorner(k, cols[i % 3], rows[Math.floor(i / 3)]));

    // ─── Panel chỉ số ───
    const px0 = 660;
    const pg = this.add.graphics();
    pg.fillStyle(C.borderHex, 1).fillRect(px0 - 10, 210, 300, 320);
    pg.fillStyle(C.panel, 1).fillRect(px0 - 6, 214, 292, 312);
    txt(this, px0 + 140, 222, 'KIẾN THỨC', 22, C.sky).setOrigin(0.5, 0);
    KNOWLEDGE_KEYS.forEach((k, i) => {
      new StatBar(this, px0 + 4, 262 + i * 30, KNOWLEDGE_SHORT[k], game.stats.knowledge(k), 0, C.skyHex, 210);
    });
    const av = this.add.image(px0 + 140, 520, ensureAvatar(this, game.stats.stats, 'idle', 2)).setOrigin(0.5, 1);
    this.add.image(px0 + 140, 372, 'icon-book');
    if (game.day.philosopherBadge) {
      this.add.image(px0 + 200, 400, 'icon-laurel');
      txt(this, px0 + 200, 416, 'Triết gia', 16, C.green).setOrigin(0.5, 0);
    }
    this.time.addEvent({ delay: 900, loop: true, callback: () => av.setTexture(ensureAvatar(this, game.stats.stats, av.texture.key.includes('idle') ? 'happy' : 'idle', 2)) });

    // ─── HUD ───
    this.hud = new PointsHud(this, 16, 12);
    this.hud.set(game.day.currentDay, game.pointsLeft, BALANCE.totalDays);
    new Button(this, GAME_WIDTH - 110, 30, '◀ QUẢNG TRƯỜNG', () => this.leave(), { w: 200, h: 40, size: 20 });

    if (data?.studied) {
      const k = data.studied;
      this.time.delayedCall(200, () => {
        floatText(this, px0 + 140, 300, `+1 ${KNOWLEDGE_SHORT[k]}!`, C.green, 30);
        Sfx.statUp();
        if (data.bothCorrect) this.time.delayedCall(600, () => floatText(this, px0 + 140, 330, 'HUY HIỆU TRIẾT GIA!', C.gold, 26));
      });
    }
    if (game.pointsLeft === 0) this.time.delayedCall(1200, () => this.bubble.say('Hết điểm hôm nay. Về nghỉ, để tri thức "lắng" xuống.'));
    this.cameras.main.fadeIn(300, 0, 0, 0);
    Sfx.playBgm('athens', 110);
  }

  private professorLine(data: AthensReturn): string {
    if (data?.bothCorrect) return 'Cả hai câu đều đúng! Ngươi xứng đáng với huy hiệu Triết gia hôm nay.';
    if (data?.studied) return `Khối "${KNOWLEDGE_LABEL[data.studied]}" +1. Hãy đọc kỹ phần giải thích, đó là nơi chất xuất hiện.`;
    return PROFESSOR_LINES[(game.athensVisits - 1) % PROFESSOR_LINES.length];
  }

  private makeCorner(k: KnowledgeKey, x: number, y: number): void {
    const c = this.add.container(x, y);
    const glow = this.add.rectangle(0, -10, 124, 120, 0x118ab2, 0);
    c.add(glow);
    c.add(this.add.image(0, 0, 'desk').setOrigin(0.5, 1).setScale(2));
    c.add(this.add.image(-16, -66, 'scroll'));
    c.add(this.add.image(20, -66, 'icon-book'));
    c.add(txt(this, 0, 6, KNOWLEDGE_LABEL[k].toUpperCase(), k === 'diemNutBuocNhay' || k === 'quanHeLuongChat' ? 15 : 20, C.blue).setOrigin(0.5, 0));
    c.add(txt(this, 0, 28, KNOWLEDGE_DESC[k].length > 26 ? KNOWLEDGE_DESC[k].slice(0, 25) + '…' : KNOWLEDGE_DESC[k], 13, C.dark).setOrigin(0.5, 0));
    const v = game.stats.knowledge(k);
    c.add(txt(this, 50, -92, `${v}`, 20, C.gold, { stroke: '#0b0716', strokeThickness: 3 }).setOrigin(0.5));
    c.setSize(124, 130);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => { glow.setFillStyle(0x118ab2, 0.15); Sfx.hover(); });
    c.on('pointerout', () => glow.setFillStyle(0x118ab2, 0));
    c.on('pointerup', () => this.select(k));
  }

  private select(k: KnowledgeKey): void {
    Sfx.unlock();
    Sfx.click();
    if (game.pointsLeft === 0) {
      this.bubble.say('Hết điểm rồi. Ra quảng trường kết thúc ngày đi.');
      return;
    }
    const seen = questionsByCategory(k).filter((q) => game.seenQuestions.has(q.id)).length;
    const total = questionsByCategory(k).length;
    const m = modal(this, 540, 250);
    m.root.add(txt(this, 0, -95, `Khối: ${KNOWLEDGE_LABEL[k]}`, 26, C.gold).setOrigin(0.5));
    m.root.add(txt(this, 0, -60, KNOWLEDGE_DESC[k], 19, C.cream).setOrigin(0.5));
    m.root.add(txt(this, 0, -28, `Trả lời ${BALANCE.questionsPerStudy} câu trắc nghiệm → +1 điểm khối này.\nĐã gặp ${seen}/${total} câu trong ngân hàng.`, 18, C.cream, { align: 'center' }).setOrigin(0.5));
    m.root.add(txt(this, 0, 14, `Hiện tại: ${KNOWLEDGE_LABEL[k]} = ${game.stats.knowledge(k)}   ·   Tốn 1 điểm đầu ngày`, 19, C.orange).setOrigin(0.5));
    m.root.add(new Button(this, -110, 80, 'HỌC  (−1 ⌛)', () => { m.close(); this.startQuiz(k); }, { w: 200, h: 46, fill: C.blueHex }));
    m.root.add(new Button(this, 110, 80, 'HUỶ', () => m.close(), { w: 200, h: 46 }));
  }

  private startQuiz(k: KnowledgeKey): void {
    const spentIndex = game.pointsLeft - 1;
    if (!game.spend('study')) return;
    this.hud.spend(spentIndex);
    Sfx.stopBgm();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.quiz, { category: k }));
  }

  private leave(): void {
    Sfx.door();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.town, { from: 'athens' }));
  }
}
