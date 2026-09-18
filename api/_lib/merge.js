/**
 * Gộp 2 hồ sơ cùng tên (cùng người chơi trên nhiều máy): đếm lấy max, huy hiệu OR,
 * lịch sử hợp nhất theo thời điểm, ván hiện tại / nhân vật cuối lấy bản mới hơn.
 * Dùng chung cho server (api/) và client (src/) — giữ file này thuần JS.
 * @template {Record<string, any>} T
 * @param {T | null | undefined} a
 * @param {T | null | undefined} b
 * @returns {T}
 */
export function mergeRecords(a, b) {
  if (!a) return /** @type {T} */ (b);
  if (!b) return a;
  const newer = (b.lastPlayedAt ?? 0) >= (a.lastPlayedAt ?? 0) ? b : a;
  const older = newer === a ? b : a;
  const max = (k) => Math.max(a[k] ?? 0, b[k] ?? 0);
  const badges = { ...(older.badges ?? {}) };
  for (const k of Object.keys(newer.badges ?? {})) badges[k] = !!(badges[k] || newer.badges[k]);
  const seen = new Set();
  const history = [...(a.history ?? []), ...(b.history ?? [])]
    .filter((h) => (seen.has(h.at) ? false : (seen.add(h.at), true)))
    .sort((x, y) => x.at - y.at)
    .slice(-50);
  const pickNewer = (k) => {
    const x = a[k];
    const y = b[k];
    if (!x) return y ?? null;
    if (!y) return x;
    return (y.at ?? b.lastPlayedAt ?? 0) >= (x.at ?? a.lastPlayedAt ?? 0) ? y : x;
  };
  // nhân vật tốt nhất: thắng > thua, rồi Điểm NV cao hơn — không bao giờ bị ván sau kém hơn thay thế
  const better = (x, y) => {
    if (!x) return y ?? null;
    if (!y) return x;
    if (!!y.won !== !!x.won) return y.won ? y : x;
    return (y.score ?? 0) > (x.score ?? 0) ? y : x;
  };
  return /** @type {T} */ ({
    ...older,
    ...newer,
    name: newer.name ?? older.name,
    createdAt: Math.min(a.createdAt ?? Date.now(), b.createdAt ?? Date.now()),
    lastPlayedAt: Math.max(a.lastPlayedAt ?? 0, b.lastPlayedAt ?? 0),
    games: max('games'),
    wins: max('wins'),
    losses: max('losses'),
    bestTotalGym: max('bestTotalGym'),
    bestTotalStudy: max('bestTotalStudy'),
    maxKnowledge: max('maxKnowledge'),
    maxPhysical: max('maxPhysical'),
    badges,
    history,
    current: pickNewer('current'),
    finalAvatar: pickNewer('finalAvatar'),
    bestAvatar: better(better(a.bestAvatar, b.bestAvatar), better(a.finalAvatar, b.finalAvatar)),
  });
}
