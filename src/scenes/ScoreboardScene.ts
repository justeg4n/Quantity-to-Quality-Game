import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../config/constants';
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

/** Bảng xếp hạng: lịch sử & thành tựu của mọi người chơi trên máy này (localStorage) */
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
    txt(this, GAME_WIDTH / 2, 30, '★  BẢNG XẾP HẠNG  ★', 34, C.gold).setOrigin(0.5, 0);

    const rows = Players.ranked();
    const cols = [50, 90, 300, 380, 460, 540, 630, 760];
    const headers = ['#', 'Người chơi', 'Thắng', 'Ván', 'Gym*', 'Học*', 'Huy hiệu', 'Chơi gần nhất'];
    headers.forEach((h, i) => txt(this, cols[i], 82, h, 17, C.gray));
    g.fillStyle(C.borderHex, 0.5).fillRect(46, 104, GAME_WIDTH - 92, 2);

    if (rows.length === 0) {
      txt(this, GAME_WIDTH / 2, 240, 'Chưa có ai chơi. Hãy là người đầu tiên ghi tên lên bảng!', 22, C.cream).setOrigin(0.5);
    }
    const rowH = 30;
    rows.slice(0, 12).forEach((r, i) => {
      const y = 114 + i * rowH;
      if (i % 2 === 0) g.fillStyle(0xffffff, 0.04).fillRect(46, y - 4, GAME_WIDTH - 92, rowH);
      const col = i === 0 ? C.gold : C.cream;
      const vals = [`${i + 1}`, r.name, `${r.wins}`, `${r.games}`, `${r.bestTotalGym}`, `${r.bestTotalStudy}`, badgeIcons(r.badges), fmtDate(r.lastPlayedAt)];
      vals.forEach((v, c) => txt(this, cols[c], y, v, 19, c === 1 ? col : C.cream));
      if (r.badges.champion) this.add.image(cols[1] - 14, y + 10, 'icon-badge').setScale(0.8);
    });
    txt(this, 50, GAME_HEIGHT - 78, '* Tổng điểm Gym / Học cao nhất trong một ván. Xếp hạng theo số trận thắng, rồi tổng điểm.   Huy hiệu: 👑 Vô địch · ⚖ Cân bằng · 📖 Học bá · 💪 Lực sĩ', 15, C.gray);
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 44, '◀ VỀ MÀN HÌNH CHÍNH', () => this.back(), { w: 280, h: 42, size: 20 });
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private back(): void {
    Sfx.click();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE.title));
  }
}
