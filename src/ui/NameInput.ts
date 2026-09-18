import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { ADMIN, Players } from '../systems/Players';

export type NameResult = { kind: 'player'; name: string } | { kind: 'admin' };

/**
 * Hộp nhập tên trước khi vào game (DOM overlay để dùng bàn phím thật, kể cả trên mobile).
 * Gõ "admin" → hiện thêm ô mật khẩu; đúng mật khẩu → vào trang quản trị.
 */
export function promptName(scene: Phaser.Scene, onDone: (r: NameResult) => void, onCancel?: () => void): void {
  const last = Players.currentName() ?? '';
  const html = `
<div id="q2q-name" style="width:520px;font-family:'VT323',monospace;color:#f6d8a8;background:#1a1030;border:4px solid #f6d8a8;box-shadow:0 0 0 4px #0b0716;padding:22px 26px;box-sizing:border-box;">
  <div style="font-size:30px;color:#ffd166;text-align:center;margin-bottom:10px;">BẠN LÀ AI?</div>
  <div style="font-size:19px;color:#8d99ae;text-align:center;margin-bottom:14px;">Nhập tên để lưu tiến trình & thành tựu lên bảng xếp hạng.</div>
  <input id="q2q-nick" maxlength="16" placeholder="Tên người chơi (tối đa 16 ký tự)" autocomplete="off" value="${last.replace(/"/g, '')}"
    style="width:100%;box-sizing:border-box;font-family:inherit;font-size:24px;padding:8px 12px;background:#0b0716;color:#fff;border:3px solid #f6d8a8;outline:none;" />
  <div id="q2q-passrow" style="display:none;margin-top:10px;">
    <div style="font-size:18px;color:#ef476f;margin-bottom:4px;">Tài khoản quản trị — nhập mật khẩu:</div>
    <input id="q2q-pass" type="password" placeholder="Mật khẩu admin" autocomplete="off"
      style="width:100%;box-sizing:border-box;font-family:inherit;font-size:24px;padding:8px 12px;background:#0b0716;color:#fff;border:3px solid #ef476f;outline:none;" />
  </div>
  <div id="q2q-err" style="font-size:18px;color:#ef476f;min-height:22px;margin-top:8px;text-align:center;"></div>
  <div style="display:flex;gap:14px;justify-content:center;margin-top:8px;">
    <button id="q2q-ok" style="font-family:inherit;font-size:24px;padding:8px 26px;background:#06d6a0;color:#0b0716;border:3px solid #f6d8a8;cursor:pointer;">VÀO GAME ▶</button>
    <button id="q2q-cancel" style="font-family:inherit;font-size:24px;padding:8px 26px;background:#2a1d4a;color:#f6d8a8;border:3px solid #f6d8a8;cursor:pointer;">HUỶ</button>
  </div>
</div>`;
  const dom = scene.add.dom(GAME_WIDTH / 2, GAME_HEIGHT / 2).createFromHTML(html).setDepth(200);
  const node = dom.node as HTMLElement;
  const nick = node.querySelector<HTMLInputElement>('#q2q-nick')!;
  const passRow = node.querySelector<HTMLElement>('#q2q-passrow')!;
  const pass = node.querySelector<HTMLInputElement>('#q2q-pass')!;
  const err = node.querySelector<HTMLElement>('#q2q-err')!;
  const ok = node.querySelector<HTMLButtonElement>('#q2q-ok')!;
  const cancel = node.querySelector<HTMLButtonElement>('#q2q-cancel')!;

  // Phaser bắt phím toàn cục — tắt trong lúc gõ để không kích hoạt SPACE/WASD của game
  const kb = scene.input.keyboard;
  if (kb) kb.enabled = false;
  const close = () => {
    if (kb) kb.enabled = true;
    dom.destroy();
  };

  const refresh = () => {
    const isAdmin = Players.isAdmin(nick.value);
    passRow.style.display = isAdmin ? 'block' : 'none';
    ok.textContent = isAdmin ? 'ĐĂNG NHẬP QUẢN TRỊ ▶' : 'VÀO GAME ▶';
    err.textContent = '';
  };
  const submit = () => {
    const name = Players.normalize(nick.value);
    if (!name) {
      err.textContent = 'Hãy nhập tên trước đã!';
      nick.focus();
      return;
    }
    if (Players.isAdmin(name)) {
      if (pass.value !== ADMIN.password) {
        err.textContent = 'Sai mật khẩu quản trị.';
        pass.focus();
        pass.select();
        return;
      }
      close();
      onDone({ kind: 'admin' });
      return;
    }
    close();
    onDone({ kind: 'player', name });
  };

  nick.addEventListener('input', refresh);
  nick.addEventListener('keydown', (e) => { if (e.key === 'Enter') { if (Players.isAdmin(nick.value)) pass.focus(); else submit(); } });
  pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  ok.addEventListener('click', submit);
  cancel.addEventListener('click', () => { close(); onCancel?.(); });
  refresh();
  setTimeout(() => nick.focus(), 50);
}
