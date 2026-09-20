import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { BALANCE, KNOWLEDGE_KEYS, KNOWLEDGE_LABEL, KNOWLEDGE_SHORT, PHYSICAL_KEYS, PHYSICAL_LABEL } from '../data/balance';
import { EXERCISES } from '../data/exercises';
import type { BossLog, DayAction, KnowledgeKey, PhysicalKey } from '../data/types';
import { ensureAvatar, totalKnowledge, totalPhysical, type Habits } from '../gfx/Avatar';
import { SkyLayer } from '../gfx/Sky';
import { ADMIN, Players, rankPlayers, type PlayerRecord } from '../systems/Players';
import { SaveSystem } from '../systems/SaveSystem';
import { Sfx } from '../systems/Sfx';
import { Button, drawRadar, modal, txt } from '../ui/Widgets';
import { SOURCE_NOTE, badgeText, fmtDate, loadRanking } from './ScoreboardScene';

const PHASE_LABEL: Record<string, string> = { training: 'Đang rèn luyện', boss: 'Đang đánh boss', ended: 'Đã kết thúc' };
const NO_HABITS: Habits = { noStudyDays: 0, noGymDays: 0 };
type Tab = 'days' | 'boss' | 'stats';

/** Gom các lượt trong ngày: "Ngực ×2 (Pec Fly), Tay ×1" / "Chất, Lượng ×2" */
function summarizeActions(actions: DayAction[] | undefined): { gym: string; study: string } {
  const g = new Map<PhysicalKey, number>();
  const s = new Map<KnowledgeKey, number>();
  (actions ?? []).forEach((a) => {
    if (a.kind === 'gym') g.set(a.key, (g.get(a.key) ?? 0) + 1);
    else s.set(a.key, (s.get(a.key) ?? 0) + 1);
  });
  const gym = [...g].map(([k, n]) => `${PHYSICAL_LABEL[k]}${n > 1 ? ` ×${n}` : ''} (${EXERCISES[k].name})`).join(', ');
  const study = [...s].map(([k, n]) => `${KNOWLEDGE_LABEL[k]}${n > 1 ? ` ×${n}` : ''}`).join(', ');
  return { gym, study };
}

/** Trang quản trị: danh sách người chơi (server) + chi tiết: nhân vật hiện tại, từng ngày đã tập/học gì, 3 phase boss đã làm gì */
export class AdminScene extends Phaser.Scene {
  private detail!: Phaser.GameObjects.Container;
  private listRoot!: Phaser.GameObjects.Container;
  private selected: string | null = null;
  private players: PlayerRecord[] = [];
  private status!: Phaser.GameObjects.Text;
  private summary!: Phaser.GameObjects.Text;
  private tab: Tab = 'days';
  /** tên vừa xoá trong phiên này — lọc khỏi danh sách phòng khi server còn trả bản cache */
  private deleted = new Set<string>();
  private loading = false;

  constructor() {
    super(SCENE.admin);
  }

  create(): void {
    const sky = new SkyLayer(this, GAME_HEIGHT);
    sky.set(2);
    const g = this.add.graphics();
    g.fillStyle(C.borderHex, 1).fillRect(16, 12, GAME_WIDTH - 32, GAME_HEIGHT - 24);
    g.fillStyle(0x0b0716, 0.96).fillRect(20, 16, GAME_WIDTH - 40, GAME_HEIGHT - 32);
    g.fillStyle(C.borderHex, 1).fillRect(300, 60, 3, GAME_HEIGHT - 110);
    txt(this, 32, 22, 'TRANG QUẢN TRỊ — admin', 28, C.red);
    this.summary = txt(this, GAME_WIDTH - 32, 24, '', 18, C.gray).setOrigin(1, 0);
    this.status = txt(this, GAME_WIDTH - 32, 44, 'Đang tải từ máy chủ...', 13, C.gray).setOrigin(1, 0);
    new Button(this, GAME_WIDTH - 110, GAME_HEIGHT - 36, 'ĐĂNG XUẤT', () => this.logout(), { w: 170, h: 36, size: 18, fill: C.redHex });
    new Button(this, 120, GAME_HEIGHT - 36, 'BẢNG XẾP HẠNG', () => this.scene.start(SCENE.scoreboard), { w: 180, h: 36, size: 18, fill: C.blueHex });
    new Button(this, 250, GAME_HEIGHT - 36, '⟳', () => void this.reload(), { w: 50, h: 36, size: 20 });

    this.listRoot = this.add.container(0, 0);
    this.detail = this.add.container(0, 0);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    void this.reload();
    // cập nhật "thời gian thực": tự tải lại mỗi 30 giây (không quá dày để đỡ tốn quota Advanced Operations của Blob), giữ nguyên người đang chọn & tab
    this.time.addEvent({ delay: 30000, loop: true, callback: () => void this.reload() });
  }

  private async reload(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    const { players, source } = await loadRanking().finally(() => { this.loading = false; });
    if (!this.scene.isActive(SCENE.admin)) return;
    this.players = rankPlayers(players.filter((p) => !this.deleted.has(p.name)));
    this.status.setText(SOURCE_NOTE[source]).setColor(source === 'server' ? C.green : C.orange);
    const games = this.players.reduce((s, r) => s + r.games, 0);
    const wins = this.players.reduce((s, r) => s + r.wins, 0);
    this.summary.setText(`${this.players.length} người chơi · ${games} ván · ${wins} thắng`);
    if (!this.selected || !this.players.some((p) => p.name === this.selected)) this.selected = this.players[0]?.name ?? null;
    this.renderList();
    this.renderDetail();
  }

  // ───────────────────────── danh sách bên trái ─────────────────────────
  private renderList(): void {
    this.listRoot.removeAll(true);
    const rows = this.players;
    this.listRoot.add(txt(this, 32, 66, `NGƯỜI CHƠI (${rows.length})`, 18, C.gray));
    if (!rows.length) this.listRoot.add(txt(this, 32, 96, 'Chưa có dữ liệu.', 18, C.cream));
    rows.slice(0, 13).forEach((r, i) => {
      const y = 92 + i * 30;
      const sel = r.name === this.selected;
      const bg = this.add.rectangle(30, y - 3, 262, 28, sel ? 0x2a1d4a : 0x000000, sel ? 1 : 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { if (!sel) bg.setFillStyle(0x1a1030, 1); });
      bg.on('pointerout', () => { if (!sel) bg.setFillStyle(0x000000, 0.001); });
      bg.on('pointerup', () => { Sfx.click(); this.selected = r.name; this.renderList(); this.renderDetail(); });
      this.listRoot.add(bg);
      this.listRoot.add(txt(this, 38, y, `${i + 1}. ${r.name}`, 19, sel ? C.gold : C.cream));
      this.listRoot.add(txt(this, 288, y, `${r.wins}W/${r.games}`, 15, C.gray).setOrigin(1, 0));
      const cur = r.current;
      const st = cur ? (cur.phase === 'ended' ? (cur.lastWon ? '✔' : '✘') : cur.phase === 'boss' ? '⚔' : `N${cur.day}`) : '';
      this.listRoot.add(txt(this, 232, y, st, 15, cur?.phase === 'ended' ? (cur.lastWon ? C.green : C.red) : C.sky));
    });
  }

  // ───────────────────────── chi tiết bên phải ─────────────────────────
  private renderDetail(): void {
    this.detail.removeAll(true);
    const x0 = 318;
    const r = this.players.find((p) => p.name === this.selected) ?? null;
    if (!r) {
      this.detail.add(txt(this, x0, 96, 'Chọn một người chơi ở cột trái để xem tiến trình.', 19, C.cream));
      return;
    }
    const add = <T extends Phaser.GameObjects.GameObject>(t: T): T => { this.detail.add(t); return t; };
    const cur = r.current;

    // ── hàng đầu: nhân vật hiện tại + tóm tắt ──
    const ax = x0 + 44;
    if (cur) {
      add(this.add.image(ax, 176, ensureAvatar(this, cur.stats, cur.phase === 'ended' ? (cur.lastWon ? 'happy' : 'tired') : 'idle', 2, cur.habits ?? NO_HABITS)).setOrigin(0.5, 1));
      add(txt(this, ax, 178, 'hiện tại', 12, C.gray).setOrigin(0.5, 0));
    } else {
      add(txt(this, ax, 120, '(chưa\nchơi)', 14, C.gray, { align: 'center' }).setOrigin(0.5, 0));
    }
    const tx = x0 + 96;
    add(txt(this, tx, 62, r.name.toUpperCase(), 26, C.gold));
    add(txt(this, tx, 92, `Ván ${r.games} · Thắng ${r.wins} · Thua ${r.losses} · Gym* ${r.bestTotalGym} · Học* ${r.bestTotalStudy} · Tạo ${fmtDate(r.createdAt)} · Gần nhất ${fmtDate(r.lastPlayedAt)}`, 14, C.cream, { wordWrap: { width: 530 } }));
    add(txt(this, tx, 128, `Huy hiệu: ${badgeText(r.badges)}`, 15, C.gold));
    if (cur) {
      const status = `${PHASE_LABEL[cur.phase] ?? cur.phase}${cur.phase === 'ended' ? (cur.lastWon ? ' — THẮNG' : ' — THUA') : ''}`;
      add(txt(this, tx, 150, `${status} · Ngày ${cur.day} · Còn ${cur.pointsLeft} điểm · Gym ${cur.totalGym} · Học ${cur.totalStudy} · Boss thử ${cur.bossAttempts}${cur.newGamePlus ? ` · NG+${cur.newGamePlus}` : ''} · TC ${totalPhysical(cur.stats)} / KT ${totalKnowledge(cur.stats)}`, 14, C.sky, { wordWrap: { width: 530 } }));
    }

    // ── tab ──
    const tabs: Array<[Tab, string]> = [['days', 'NGÀY 1–4'], ['boss', 'THỬ THÁCH 3 PHASE'], ['stats', 'CHỈ SỐ']];
    tabs.forEach(([id, label], i) => {
      const active = this.tab === id;
      add(new Button(this, x0 + 70 + i * 150, 206, label, () => { this.tab = id; this.renderDetail(); }, { w: 140, h: 30, size: 15, fill: active ? C.purpleHex : 0x2a1d4a }));
    });
    const line = this.add.graphics();
    line.fillStyle(C.borderHex, 0.4).fillRect(x0, 224, GAME_WIDTH - x0 - 30, 2);
    add(line);

    if (this.tab === 'days') this.renderDays(r, x0, 232);
    else if (this.tab === 'boss') this.renderBoss(r, x0, 232);
    else this.renderStats(r, x0, 232);

    add(new Button(this, GAME_WIDTH - 250, GAME_HEIGHT - 36, 'XOÁ NGƯỜI CHƠI', () => this.confirmDelete(r), { w: 190, h: 36, size: 17, fill: 0x3a2a2a }));
  }

  /** Ngày 1..4: đã tập nhóm cơ nào (bài gì), học khối nào; ngày đang chơi dở hiện riêng */
  private renderDays(r: PlayerRecord, x0: number, y0: number): void {
    const cur = r.current;
    const add = (t: Phaser.GameObjects.GameObject) => this.detail.add(t);
    if (!cur) {
      add(txt(this, x0, y0, '(chưa bắt đầu ván nào)', 15, C.gray));
      return;
    }
    const w = GAME_WIDTH - x0 - 30;
    let y = y0;
    for (let d = 1; d <= BALANCE.totalDays; d++) {
      const rec = cur.log.find((l) => l.day === d);
      const inProgress = !rec && cur.day === d && cur.phase === 'training';
      const actions = rec?.actions ?? (inProgress ? cur.todayActions : undefined);
      const { gym, study } = summarizeActions(actions);
      const head = rec
        ? `NGÀY ${d}  —  Gym ${rec.gym} · Học ${rec.study}${rec.study === 0 ? '  ⚠ bỏ học' : ''}${rec.gym === 0 ? '  ⚠ bỏ tập' : ''}`
        : inProgress
          ? `NGÀY ${d}  —  đang chơi (còn ${cur.pointsLeft} điểm)`
          : `NGÀY ${d}  —  chưa tới`;
      add(txt(this, x0, y, head, 15, rec ? C.gold : inProgress ? C.sky : C.gray));
      y += 18;
      if (rec && !rec.actions) {
        // bản lưu trước khi có ghi nhận chi tiết từng lượt
        add(txt(this, x0 + 12, y, '(bản lưu cũ — chỉ có tổng số lượt, không có chi tiết đã tập/học gì)', 12, C.gray));
        y += 14;
      } else if (rec || inProgress) {
        const gymLine = txt(this, x0 + 12, y, `🏋 ${gym || 'không tập'}`, 13, C.orange, { wordWrap: { width: w - 12 } });
        add(gymLine);
        y += gymLine.height + 1;
        const stLine = txt(this, x0 + 12, y, `📖 ${study || 'không học'}`, 13, C.sky, { wordWrap: { width: w - 12 } });
        add(stLine);
        y += stLine.height + 1;
      }
      y += 6;
    }
  }

  /** Thử thách 3 phase: thứ tự, bài tập đã làm, câu hỏi từng khối đúng/sai, kết quả từng phase */
  private renderBoss(r: PlayerRecord, x0: number, y0: number): void {
    const add = (t: Phaser.GameObjects.GameObject) => this.detail.add(t);
    const log: BossLog | null | undefined = r.current?.bossLog ?? r.history[r.history.length - 1]?.log;
    if (!log) {
      add(txt(this, x0, y0, r.history.length ? '(trận này chơi ở bản cũ — chưa có nhật ký phase)' : '(chưa đánh thử thách cuối)', 15, C.gray));
      this.renderHistory(r, x0, y0 + 24);
      return;
    }
    const w = GAME_WIDTH - x0 - 30;
    let y = y0;
    const head = `Trận ${fmtDate(log.at)} — ${log.won === null ? 'đang đánh' : log.won ? 'THẮNG' : 'THUA'}${log.reasons.length ? ` · ${log.reasons.join('; ')}` : ''}`;
    const ht = txt(this, x0, y, head, 14, log.won ? C.green : log.won === false ? C.red : C.sky, { wordWrap: { width: w } });
    add(ht);
    y += ht.height + 4;
    log.order.forEach((kind, i) => {
      const p = log.phases.find((ph) => ph.kind === kind);
      const resTxt = !p ? 'chưa tới' : p.result === 'pass' ? '✔ qua' : p.result === 'fail' ? '✘ thua' : p.result === 'quit' ? 'bỏ cuộc' : 'đang chơi';
      const resCol = !p ? C.gray : p.result === 'pass' ? C.green : p.result === 'playing' ? C.sky : C.red;
      const title = txt(this, x0, y, `PHASE ${i + 1} — ${p?.label ?? kind}   ${resTxt}${p && p.attempts > 1 ? `  (thử ${p.attempts} lần)` : ''}`, 15, resCol);
      add(title);
      y += 18;
      if (p) {
        const exLine = txt(this, x0 + 12, y, `🏋 ${p.exercises.length ? p.exercises.join(' · ') : '—'}`, 13, C.orange, { wordWrap: { width: w - 12 } });
        add(exLine);
        y += exLine.height + 1;
        const qs = p.questions.length ? p.questions.map((q) => `${KNOWLEDGE_SHORT[q.cat]} ${q.correct ? '✔' : '✘'}`).join(' · ') : '—';
        const qLine = txt(this, x0 + 12, y, `📖 ${qs}   (${p.questions.filter((q) => q.correct).length}/${p.questions.length} đúng)`, 13, C.sky, { wordWrap: { width: w - 12 } });
        add(qLine);
        y += qLine.height + 1;
      }
      y += 6;
    });
    this.renderHistory(r, x0, y + 2);
  }

  private renderHistory(r: PlayerRecord, x0: number, y: number): void {
    const hist = r.history.slice(-4).reverse();
    if (!hist.length) return;
    this.detail.add(txt(this, x0, y, 'CÁC TRẬN TRƯỚC', 13, C.gray));
    const lines = hist.map((h) => `${fmtDate(h.at)}  ${h.won ? 'THẮNG' : 'THUA'}  (lần ${h.attempts}, Gym ${h.totalGym}/Học ${h.totalStudy})${h.reasons.length ? ` — ${h.reasons.join('; ').slice(0, 60)}` : ''}`);
    this.detail.add(txt(this, x0, y + 16, lines.join('\n'), 12, C.cream, { lineSpacing: 2, wordWrap: { width: GAME_WIDTH - x0 - 30 } }));
  }

  /** Chỉ số 12 trục + radar + nhân vật cuối ván gần nhất */
  private renderStats(r: PlayerRecord, x0: number, y0: number): void {
    const add = (t: Phaser.GameObjects.GameObject) => this.detail.add(t);
    const cur = r.current;
    if (!cur) {
      add(txt(this, x0, y0, '(chưa bắt đầu ván nào)', 15, C.gray));
      return;
    }
    add(txt(this, x0, y0, 'THỂ CHẤT', 15, C.orange));
    PHYSICAL_KEYS.forEach((k, i) => add(txt(this, x0, y0 + 20 + i * 18, `${PHYSICAL_LABEL[k]}: ${cur.stats.physical[k]}`, 14, C.cream)));
    add(txt(this, x0 + 150, y0, 'KIẾN THỨC', 15, C.sky));
    KNOWLEDGE_KEYS.forEach((k, i) => add(txt(this, x0 + 150, y0 + 20 + i * 18, `${KNOWLEDGE_LABEL[k]}: ${cur.stats.knowledge[k]}`, 14, C.cream)));
    const rg = this.add.graphics();
    add(rg);
    const values = [...PHYSICAL_KEYS.map((k) => cur.stats.physical[k]), ...KNOWLEDGE_KEYS.map((k) => cur.stats.knowledge[k])];
    drawRadar(rg, x0 + 480, y0 + 80, 70, values, 8, C.greenHex);
    const fa = r.finalAvatar;
    if (fa) {
      add(this.add.image(x0 + 340, y0 + 150, ensureAvatar(this, fa.stats, fa.won ? 'happy' : 'tired', 2, fa.habits)).setOrigin(0.5, 1));
      add(txt(this, x0 + 340, y0 + 152, `nhân vật cuối · ${fa.won ? 'THẮNG' : 'THUA'} · Điểm NV ${fa.score}`, 12, fa.won ? C.green : C.red).setOrigin(0.5, 0));
    }
  }

  private confirmDelete(r: PlayerRecord): void {
    const m = modal(this, 560, 190, 100);
    m.root.add(txt(this, 0, -55, `Xoá toàn bộ dữ liệu của "${r.name}" (cả trên máy chủ)?`, 21, C.cream, { wordWrap: { width: 500 }, align: 'center' }).setOrigin(0.5));
    m.root.add(new Button(this, -110, 40, 'XOÁ', async () => {
      m.close();
      this.status.setText(`Đang xoá "${r.name}"...`).setColor(C.orange);
      SaveSystem.clear(r.name);
      const ok = await Players.remove(r.name, ADMIN.password);
      this.deleted.add(r.name);
      this.selected = null;
      this.players = this.players.filter((p) => p.name !== r.name);
      this.renderList();
      this.renderDetail();
      if (!ok) this.status.setText('⚠ Đã xoá trên máy này; máy chủ không phản hồi — sẽ thử lại khi tải lại.').setColor(C.orange);
      else this.status.setText(`✔ Đã xoá "${r.name}" trên máy chủ.`).setColor(C.green);
      this.time.delayedCall(1500, () => void this.reload());
    }, { w: 200, h: 44, fill: C.redHex }));
    m.root.add(new Button(this, 110, 40, 'HUỶ', () => m.close(), { w: 200, h: 44 }));
  }

  private logout(): void {
    Sfx.click();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.title));
  }
}
