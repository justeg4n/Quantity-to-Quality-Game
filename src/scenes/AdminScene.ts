import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { KNOWLEDGE_KEYS, KNOWLEDGE_SHORT, PHYSICAL_KEYS, PHYSICAL_LABEL } from '../data/balance';
import { SkyLayer } from '../gfx/Sky';
import { Players, type PlayerRecord } from '../systems/Players';
import { SaveSystem } from '../systems/SaveSystem';
import { Sfx } from '../systems/Sfx';
import { Button, drawRadar, modal, txt } from '../ui/Widgets';
import { badgeText, fmtDate } from './ScoreboardScene';

const PHASE_LABEL: Record<string, string> = { training: 'Đang rèn luyện', boss: 'Đang đánh boss', ended: 'Đã kết thúc' };

/** Trang quản trị: bảng xếp hạng + tiến trình chi tiết của từng người chơi, xoá dữ liệu */
export class AdminScene extends Phaser.Scene {
  private detail!: Phaser.GameObjects.Container;
  private listRoot!: Phaser.GameObjects.Container;
  private selected: string | null = null;

  constructor() {
    super(SCENE.admin);
  }

  create(): void {
    const sky = new SkyLayer(this, GAME_HEIGHT);
    sky.set(2);
    const g = this.add.graphics();
    g.fillStyle(C.borderHex, 1).fillRect(16, 12, GAME_WIDTH - 32, GAME_HEIGHT - 24);
    g.fillStyle(0x0b0716, 0.96).fillRect(20, 16, GAME_WIDTH - 40, GAME_HEIGHT - 32);
    g.fillStyle(C.borderHex, 1).fillRect(330, 60, 3, GAME_HEIGHT - 110);
    txt(this, 32, 22, 'TRANG QUẢN TRỊ — admin', 28, C.red);
    const all = Players.list();
    const games = all.reduce((s, r) => s + r.games, 0);
    const wins = all.reduce((s, r) => s + r.wins, 0);
    txt(this, GAME_WIDTH - 32, 28, `${all.length} người chơi · ${games} ván · ${wins} thắng`, 18, C.gray).setOrigin(1, 0);
    new Button(this, GAME_WIDTH - 110, GAME_HEIGHT - 36, 'ĐĂNG XUẤT', () => this.logout(), { w: 170, h: 36, size: 18, fill: C.redHex });
    new Button(this, 130, GAME_HEIGHT - 36, 'BẢNG XẾP HẠNG', () => this.scene.start(SCENE.scoreboard), { w: 200, h: 36, size: 18, fill: C.blueHex });

    this.listRoot = this.add.container(0, 0);
    this.detail = this.add.container(0, 0);
    this.selected = Players.ranked()[0]?.name ?? null;
    this.renderList();
    this.renderDetail();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private renderList(): void {
    this.listRoot.removeAll(true);
    const rows = Players.ranked();
    this.listRoot.add(txt(this, 32, 66, `NGƯỜI CHƠI (${rows.length})`, 18, C.gray));
    if (!rows.length) this.listRoot.add(txt(this, 32, 96, 'Chưa có dữ liệu.', 18, C.cream));
    rows.slice(0, 13).forEach((r, i) => {
      const y = 92 + i * 30;
      const sel = r.name === this.selected;
      const bg = this.add.rectangle(32, y - 3, 290, 28, sel ? 0x2a1d4a : 0x000000, sel ? 1 : 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { if (!sel) bg.setFillStyle(0x1a1030, 1); });
      bg.on('pointerout', () => { if (!sel) bg.setFillStyle(0x000000, 0.001); });
      bg.on('pointerup', () => { Sfx.click(); this.selected = r.name; this.renderList(); this.renderDetail(); });
      this.listRoot.add(bg);
      this.listRoot.add(txt(this, 40, y, `${i + 1}. ${r.name}`, 19, sel ? C.gold : C.cream));
      this.listRoot.add(txt(this, 316, y, `${r.wins}W/${r.games}`, 16, C.gray).setOrigin(1, 0));
      const cur = r.current;
      const st = cur ? (cur.phase === 'ended' ? (cur.lastWon ? '✔' : '✘') : cur.phase === 'boss' ? '⚔' : `N${cur.day}`) : '';
      this.listRoot.add(txt(this, 250, y, st, 16, cur?.phase === 'ended' ? (cur.lastWon ? C.green : C.red) : C.sky));
    });
  }

  private renderDetail(): void {
    this.detail.removeAll(true);
    const x0 = 350;
    const r = this.selected ? Players.get(this.selected) : null;
    if (!r) {
      this.detail.add(txt(this, x0, 96, 'Chọn một người chơi ở cột trái để xem tiến trình.', 19, C.cream));
      return;
    }
    const add = (t: Phaser.GameObjects.GameObject) => this.detail.add(t);
    add(txt(this, x0, 62, r.name.toUpperCase(), 28, C.gold));
    add(txt(this, x0, 94, `Tạo: ${fmtDate(r.createdAt)}   ·   Chơi gần nhất: ${fmtDate(r.lastPlayedAt)}`, 15, C.gray));
    add(txt(this, x0, 114, `Ván: ${r.games}   ·   Thắng: ${r.wins}   ·   Thua: ${r.losses}   ·   Gym* ${r.bestTotalGym}   ·   Học* ${r.bestTotalStudy}   ·   Max KT ${r.maxKnowledge} / TC ${r.maxPhysical}`, 16, C.cream));
    add(txt(this, x0, 136, `Huy hiệu: ${badgeText(r.badges)}`, 16, C.gold));

    // tiến trình ván hiện tại
    const cur = r.current;
    add(txt(this, x0, 164, 'VÁN HIỆN TẠI', 18, C.sky));
    if (cur) {
      const status = `${PHASE_LABEL[cur.phase] ?? cur.phase}${cur.phase === 'ended' ? (cur.lastWon ? ' — THẮNG' : ' — THUA') : ''}`;
      add(txt(this, x0, 186, `${status}   ·   Ngày ${cur.day}   ·   Còn ${cur.pointsLeft} điểm   ·   Gym ${cur.totalGym} · Học ${cur.totalStudy}   ·   Boss thử ${cur.bossAttempts}${cur.newGamePlus ? `   ·   NG+${cur.newGamePlus}` : ''}`, 15, C.cream, { wordWrap: { width: 400 } }));
      const phys = PHYSICAL_KEYS.map((k) => `${PHYSICAL_LABEL[k]} ${cur.stats.physical[k]}`).join(' · ');
      const know = KNOWLEDGE_KEYS.map((k) => `${KNOWLEDGE_SHORT[k]} ${cur.stats.knowledge[k]}`).join(' · ');
      add(txt(this, x0, 226, phys, 14, C.orange));
      add(txt(this, x0, 244, know, 14, C.sky));
      // radar 12 trục
      const rg = this.add.graphics();
      add(rg);
      const values = [...PHYSICAL_KEYS.map((k) => cur.stats.physical[k]), ...KNOWLEDGE_KEYS.map((k) => cur.stats.knowledge[k])];
      drawRadar(rg, GAME_WIDTH - 110, 190, 66, values, 8, C.greenHex);
      // nhật ký ngày
      add(txt(this, x0, 268, 'NHẬT KÝ NGÀY', 18, C.sky));
      const logLines = cur.log.length
        ? cur.log.map((d) => `N${d.day}: Gym ${d.gym} · Học ${d.study}${d.study === 0 ? ' (bỏ học)' : ''}${d.gym === 0 ? ' (bỏ tập)' : ''}`)
        : ['(chưa kết thúc ngày nào)'];
      add(txt(this, x0, 290, logLines.join('\n'), 14, C.cream, { lineSpacing: 2 }));
    } else {
      add(txt(this, x0, 186, '(chưa bắt đầu ván nào)', 15, C.gray));
    }

    // lịch sử boss
    add(txt(this, x0 + 300, 268, 'LỊCH SỬ THỬ THÁCH', 18, C.sky));
    const hist = r.history.slice(-6).reverse();
    const hl = hist.length
      ? hist.map((h) => `${fmtDate(h.at)}  ${h.won ? 'THẮNG' : 'THUA'}  (lần ${h.attempts}, Gym ${h.totalGym}/Học ${h.totalStudy})${h.reasons.length ? ` — ${h.reasons.join('; ').slice(0, 60)}` : ''}`)
      : ['(chưa đánh boss)'];
    add(txt(this, x0 + 300, 290, hl.join('\n'), 13, C.cream, { lineSpacing: 2, wordWrap: { width: 280 } }));

    add(new Button(this, GAME_WIDTH - 250, GAME_HEIGHT - 36, 'XOÁ NGƯỜI CHƠI', () => this.confirmDelete(r), { w: 190, h: 36, size: 17, fill: 0x3a2a2a }));
  }

  private confirmDelete(r: PlayerRecord): void {
    const m = modal(this, 520, 180, 100);
    m.root.add(txt(this, 0, -50, `Xoá toàn bộ dữ liệu của "${r.name}"?`, 22, C.cream).setOrigin(0.5));
    m.root.add(new Button(this, -110, 40, 'XOÁ', () => { m.close(); Players.remove(r.name); SaveSystem.clear(r.name); this.selected = null; this.renderList(); this.renderDetail(); }, { w: 200, h: 44, fill: C.redHex }));
    m.root.add(new Button(this, 110, 40, 'HUỶ', () => m.close(), { w: 200, h: 44 }));
  }

  private logout(): void {
    Sfx.click();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.title));
  }
}
