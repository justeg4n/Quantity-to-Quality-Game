import { KNOWLEDGE_KEYS } from '../data/balance';
import { QUESTIONS, questionsByCategory } from '../data/questions';
import type { KnowledgeKey, QuizQuestion } from '../data/types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Trả về câu hỏi với thứ tự đáp án đã xáo trộn (correctIndex cập nhật theo). */
export function shuffleOptions(q: QuizQuestion): QuizQuestion {
  const idx = shuffle(q.options.map((_, i) => i));
  return {
    ...q,
    options: idx.map((i) => q.options[i]),
    correctIndex: idx.indexOf(q.correctIndex),
  };
}

export const QuizEngine = {
  /**
   * Rút `count` câu của 1 khối, ưu tiên câu CHƯA từng gặp để tránh lặp liên tiếp.
   */
  draw(category: KnowledgeKey, count: number, seen: Set<string>): QuizQuestion[] {
    const pool = questionsByCategory(category);
    const unseen = shuffle(pool.filter((q) => !seen.has(q.id)));
    const rest = shuffle(pool.filter((q) => seen.has(q.id)));
    return [...unseen, ...rest].slice(0, count).map(shuffleOptions);
  },

  /** Rút ngẫu nhiên từ toàn bộ 6 khối, tránh trùng id trong cùng đợt. */
  drawAny(count: number, exclude: Set<string> = new Set()): QuizQuestion[] {
    const pool = shuffle(QUESTIONS.filter((q) => !exclude.has(q.id)));
    return pool.slice(0, count).map(shuffleOptions);
  },

  /**
   * Đề thi pha 3: 5 câu từ 5 khối khác nhau (ngẫu nhiên 5/6 khối).
   * Ưu tiên câu người chơi ĐÃ học (thưởng cho việc tích luỹ), nếu không thì rút mới.
   * Nếu có khối nào chưa đủ ngưỡng, đảm bảo khối đó xuất hiện trong đề
   * để công thức thắng/thua luôn được phản ánh chính xác.
   */
  drawBossExam(seen: Set<string>, knowledge: Record<KnowledgeKey, number>, min: number, count: number): QuizQuestion[] {
    const weak = KNOWLEDGE_KEYS.filter((k) => knowledge[k] < min);
    const strong = shuffle(KNOWLEDGE_KEYS.filter((k) => knowledge[k] >= min));
    const cats = [...shuffle(weak), ...strong].slice(0, count);
    while (cats.length < count) cats.push(KNOWLEDGE_KEYS[Math.floor(Math.random() * KNOWLEDGE_KEYS.length)]);
    const used = new Set<string>();
    return cats.map((cat) => {
      const pool = questionsByCategory(cat).filter((q) => !used.has(q.id));
      const seenPool = shuffle(pool.filter((q) => seen.has(q.id)));
      const pick = seenPool[0] ?? shuffle(pool)[0];
      used.add(pick.id);
      return shuffleOptions(pick);
    });
  },
};
