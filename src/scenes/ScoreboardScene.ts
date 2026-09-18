import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
import { ensureAvatar, totalKnowledge, totalPhysical } from '../gfx/Avatar';
import { SkyLayer } from '../gfx/Sky';
import { Players, type PlayerRecord } from '../systems/Players';
import { Sfx } from '../systems/Sfx';
import { Button, txt } from '../ui/Widgets';

const BADGE_LABEL: Array<[keyof PlayerRecord['badges'], string]> = [
  ['champion', 'Vô địch'],
  ['balanced', 'Cân bằng'],
  ['scholar', 'Học bá'],
  ['athlete', 'Lực sĩ'],
];

export function badgeText(b: PlayerRecord['badges']): string {
  const got = BADGE_LABEL.filter(([k]) => b[k]).map(([, l]) => l);
  return got.length ? got.join(' · ') : '—';
}

const BADGE_ICON: Record<keyof PlayerRecord['badges'], string> = { champion: '👑', balanced: '⚖', scholar: '📖', athlete: '💪' };

/** Dạng gọn cho bảng: 👑 ⚖ 📖 💪 */
export function badgeIcons(b: PlayerRecord['badges']): string {
  const got = BADGE_LABEL.filter(([k]) => b[k]).map(([k]) => BADGE_ICON[k]);
  return got.length ? got.join(' ') : '—';
}

export function fmtDate(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Tải bảng xếp hạng: ưu tiên server (mọi máy), nếu backend không sẵn sàng thì dùng dữ liệu máy này.
 * Trả kèm cờ để scene hiển thị trạng thái nguồn dữ liệu.
 */
export async function loadRanking(): Promise<{ players: PlayerRecord[]; source: 'server' | 'server-temp' | 'local' }> {
  const r = await Players.fetchRanked();
  if (r) return { players: r.players, source: r.persistent ? 'server' : 'server-temp' };
  return { players: Players.ranked(), source: 'local' };
}

export const SOURCE_NOTE: Record<'server' | 'server-temp' | 'local', string> = {
  server: '☁ Dữ liệu từ máy chủ — mọi người chơi trên mọi máy.',
  'server-temp': '⚠ Máy chủ chưa gắn kho lưu trữ (chạy tạm ở /tmp) — dữ liệu có thể mất khi khởi động lại. Xem README để bật Vercel Blob (miễn phí).',
  local: '⚠ Không kết nối được máy chủ — chỉ hiển thị dữ liệu trên máy này.',
};

/** Bảng xếp hạng (chỉ admin mở từ trang quản trị): mọi người chơi kèm nhân vật cuối cùng của ván gần nhất để so sánh */
export class ScoreboardScene extends Phaser.Scene {
  constructor() {
    super(SCENE.scoreboard);
  }

  create(): void {
    const sky = new SkyLayer(this, GAME_HEIGHT);
    sky.set(0.9);
    const g = this.add.graphics();
    g.fillStyle(C.borderHex, 1).fillRect(30, 16, GAME_WIDTH - 60, GAME_HEIGHT - 32);
    g.fillStyle(0x0b0716, 0.95).fillRect(34, 20, GAME_WIDTH - 68, GAME_HEIGHT - 40);
    txt(this, GAME_WIDTH / 2, 26, '★  BẢNG XẾP HẠNG NHÂN VẬT  ★', 32, C.gold).setOrigin(0.5, 0);
    const status = txt(this, GAME_WIDTH / 2, 62, 'Đang tải từ máy chủ...', 16, C.gray).setOrigin(0.5, 0);
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 40, '◀ VỀ TRANG QUẢN TRỊ', () => this.back(), { w: 280, h: 40, size: 20 });
    this.cameras.main.fadeIn(300, 0, 0, 0);

    void loadRanking().then(({ players, source }) => {
      if (!this.scene.isActive(SCENE.scoreboard)) return;
      status.setText(SOURCE_NOTE[source]).setColor(source === 'server' ? C.green : C.orange);
      this.renderRows(players);
    });
  }

  private renderRows(rows: PlayerRecord[]): void {
    const g = this.add.graphics();
    const cols = [46, 70, 130, 330, 400, 470, 560, 640, 740, 840];
    const headers = ['#', 'NV', 'Người chơi', 'Thắng', 'Ván', 'Điểm NV', 'TC/KT', 'Gym*/Học*', 'Huy hiệu', 'Gần nhất'];
    headers.forEach((h, i) => txt(this, cols[i], 86, h, 16, C.gray));
    g.fillStyle(C.borderHex, 0.5).fillRect(46, 106, GAME_WIDTH - 92, 2);
    if (rows.length === 0) {
      txt(this, GAME_WIDTH / 2, 260, 'Chưa có ai chơi. Hãy là người đầu tiên ghi tên lên bảng!', 22, C.cream).setOrigin(0.5);
      return;
    }
    const rowH = 46;
    rows.slice(0, 8).forEach((r, i) => {
      const y = 114 + i * rowH;
      if (i % 2 === 0) g.fillStyle(0xffffff, 0.04).fillRect(46, y - 2, GAME_WIDTH - 92, rowH);
      const fa = r.finalAvatar;
      // nhân vật cuối cùng (ván gần nhất): thắng → happy, thua → tired; chưa có → bóng mờ
      if (fa) {
        const key = ensureAvatar(this, fa.stats, fa.won ? 'happy' : 'tired', 1, fa.habits);
        this.add.image(cols[1] + 20, y + rowH - 4, key).setOrigin(0.5, 1);
      } else {
        txt(this, cols[1] + 20, y + 12, '?', 22, C.gray).setOrigin(0.5, 0);
      }
      const nameCol = i === 0 ? C.gold : C.cream;
      txt(this, cols[0], y + 10, `${i + 1}`, 20, nameCol);
      txt(this, cols[2], y + 2, r.name, 20, nameCol);
      txt(this, cols[2], y + 24, fa ? `${fa.won ? 'THẮNG' : 'THUA'} · ${fmtDate(fa.at)}` : 'chưa hoàn thành ván nào', 13, fa ? (fa.won ? C.green : C.red) : C.gray);
      txt(this, cols[3], y + 10, `${r.wins}`, 20, C.cream);
      txt(this, cols[4], y + 10, `${r.games}`, 20, C.cream);
      txt(this, cols[5], y + 10, fa ? `${fa.score}` : '—', 20, C.gold);
      txt(this, cols[6], y + 10, fa ? `${totalPhysical(fa.stats)} / ${totalKnowledge(fa.stats)}` : '—', 17, C.cream);
      txt(this, cols[7], y + 10, `${r.bestTotalGym} / ${r.bestTotalStudy}`, 17, C.cream);
      txt(this, cols[8], y + 10, badgeIcons(r.badges), 18, C.cream);
      txt(this, cols[9], y + 10, fmtDate(r.lastPlayedAt), 15, C.gray);
    });
    txt(this, 46, GAME_HEIGHT - 72, 'Xếp theo: trận thắng → Điểm NV (thể chất + kiến thức của nhân vật cuối) → Gym*/Học* (điểm cao nhất một ván).   👑 Vô địch · ⚖ Cân bằng · 📖 Học bá · 💪 Lực sĩ', 13, C.gray, { wordWrap: { width: GAME_WIDTH - 92 } });
  }

  private back(): void {
    Sfx.click();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.admin));
  }
}
