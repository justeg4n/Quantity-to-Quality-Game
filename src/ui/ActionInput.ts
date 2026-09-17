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
