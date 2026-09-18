import Phaser from 'phaser';

/**
 * Gắn "hành động" (Space trên bàn phím hoặc chạm/click vào vùng trống) cho mini-game.
 * Trả về hàm gỡ bỏ.
 */
export function bindAction(scene: Phaser.Scene, cb: () => void): () => void {
  const kb = scene.input.keyboard;
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    cb();
  };
  kb?.addCapture('SPACE');
  kb?.on('keydown-SPACE', onKey);
  const onPointer = (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
    if (over.length === 0) cb();
  };
  scene.input.on('pointerdown', onPointer);
  return () => {
    kb?.off('keydown-SPACE', onKey);
    scene.input.off('pointerdown', onPointer);
  };
}

/** Phím số 1-4 để chọn đáp án */
export function bindNumberKeys(scene: Phaser.Scene, cb: (index: number) => void): () => void {
  const kb = scene.input.keyboard;
  const handlers: Array<[string, () => void]> = [];
  ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((k, i) => {
    const h = () => cb(i);
    kb?.on(`keydown-${k}`, h);
    handlers.push([k, h]);
  });
  return () => handlers.forEach(([k, h]) => kb?.off(`keydown-${k}`, h));
}

/**
 * Giữ / thả (hold-mode): SPACE keydown → onDown, keyup → onUp; chạm vùng trống → onDown, nhả chuột → onUp.
 * Trả về hàm gỡ bỏ.
 */
export function bindHold(scene: Phaser.Scene, onDown: () => void, onUp: () => void): () => void {
  const kb = scene.input.keyboard;
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    onDown();
  };
  const onKeyUp = () => onUp();
  kb?.addCapture('SPACE');
  kb?.on('keydown-SPACE', onKeyDown);
  kb?.on('keyup-SPACE', onKeyUp);
  const onPointerDown = (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
    if (over.length === 0) onDown();
  };
  const onPointerUp = () => onUp();
  scene.input.on('pointerdown', onPointerDown);
  scene.input.on('pointerup', onPointerUp);
  return () => {
    kb?.off('keydown-SPACE', onKeyDown);
    kb?.off('keyup-SPACE', onKeyUp);
    scene.input.off('pointerdown', onPointerDown);
    scene.input.off('pointerup', onPointerUp);
  };
}

export type DirKey = 'up' | 'down' | 'left' | 'right';

/** Phím mũi tên + WASD → hướng (alternate / sequence mode). Trả về hàm gỡ bỏ. */
export function bindDirKeys(scene: Phaser.Scene, cb: (dir: DirKey) => void): () => void {
  const kb = scene.input.keyboard;
  const map: Array<[string, DirKey]> = [
    ['UP', 'up'], ['W', 'up'],
    ['DOWN', 'down'], ['S', 'down'],
    ['LEFT', 'left'], ['A', 'left'],
    ['RIGHT', 'right'], ['D', 'right'],
  ];
  const handlers: Array<[string, (e: KeyboardEvent) => void]> = [];
  map.forEach(([k, dir]) => {
    const h = (e: KeyboardEvent) => {
      if (e.repeat) return;
      cb(dir);
    };
    kb?.addCapture(k);
    kb?.on(`keydown-${k}`, h);
    handlers.push([k, h]);
  });
  return () => handlers.forEach(([k, h]) => kb?.off(`keydown-${k}`, h));
}
