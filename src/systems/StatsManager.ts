import { BALANCE, KNOWLEDGE_KEYS, KNOWLEDGE_LABEL, PHYSICAL_KEYS, PHYSICAL_LABEL } from '../data/balance';
import type { KnowledgeKey, PhysicalKey, PlayerStats } from '../data/types';

export interface DeficitItem {
  key: PhysicalKey | KnowledgeKey;
  label: string;
  current: number;
  required: number;
  type: 'physical' | 'knowledge';
}

/** Quản lý 12 chỉ số và kiểm tra ngưỡng thắng/thua (giữ đúng công thức mục 8–9). */
export class StatsManager {
  stats: PlayerStats;

  constructor(stats?: PlayerStats) {
    this.stats = stats ?? StatsManager.empty();
  }

  static empty(): PlayerStats {
    return {
      physical: { nguc: 0, vai: 0, lung: 0, tay: 0, bung: 0, chan: 0 },
      knowledge: { chat: 0, luong: 0, quanHeLuongChat: 0, do: 0, diemNutBuocNhay: 0, vanDung: 0 },
    };
  }

  addPhysical(key: PhysicalKey, amount = 1): number {
    this.stats.physical[key] = Math.max(0, this.stats.physical[key] + amount);
    return this.stats.physical[key];
  }

  addKnowledge(key: KnowledgeKey, amount = 1): number {
    this.stats.knowledge[key] = Math.max(0, this.stats.knowledge[key] + amount);
    return this.stats.knowledge[key];
  }

  physical(key: PhysicalKey): number {
    return this.stats.physical[key];
  }

  knowledge(key: KnowledgeKey): number {
    return this.stats.knowledge[key];
  }

  totalPhysical(): number {
    return PHYSICAL_KEYS.reduce((s, k) => s + this.stats.physical[k], 0);
  }

  totalKnowledge(): number {
    return KNOWLEDGE_KEYS.reduce((s, k) => s + this.stats.knowledge[k], 0);
  }

  /** Danh sách chỉ số chưa đạt ngưỡng tối thiểu. Rỗng => đủ điều kiện thắng. */
  deficits(): DeficitItem[] {
    const out: DeficitItem[] = [];
    for (const k of PHYSICAL_KEYS) {
      const req = BALANCE.physicalMin[k];
      if (this.stats.physical[k] < req) {
        out.push({ key: k, label: PHYSICAL_LABEL[k], current: this.stats.physical[k], required: req, type: 'physical' });
      }
    }
    for (const k of KNOWLEDGE_KEYS) {
      const req = BALANCE.knowledgeMin;
      if (this.stats.knowledge[k] < req) {
        out.push({ key: k, label: KNOWLEDGE_LABEL[k], current: this.stats.knowledge[k], required: req, type: 'knowledge' });
      }
    }
    return out;
  }

  /**
   * THẮNG khi và chỉ khi:
   *   Ngực>=3 AND Vai>=3 AND Lưng>=3 AND Chân>=3 AND Bụng>=3 AND Tay>=6
   *   AND mỗi khối kiến thức >= 2
   */
  meetsWinCondition(): boolean {
    return this.deficits().length === 0;
  }

  clone(): PlayerStats {
    return JSON.parse(JSON.stringify(this.stats));
  }
}
