import { STAGES, type Order, type Piece, type Stage, type Urgency } from './types';

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** 今天，YYYY-MM-DD（按本地时区） */
export function today(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 给日期加 n 天 */
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** 还有几天到期（负数表示已过期） */
export function daysUntil(iso: string, ref: string = today()): number {
  const a = new Date(ref + 'T00:00:00').getTime();
  const b = new Date(iso + 'T00:00:00').getTime();
  return Math.round((b - a) / 86400000);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return iso; // YYYY-MM-DD 本身已清晰
}

/** 提前预警的天数窗口 */
export const URGENT_WINDOW_DAYS = 3;

/**
 * 一张单子的按期程度：
 * - 已全部交货不再预警
 * - 已过期且没做完 → overdue
 * - 窗口内到期且没做完 → urgent
 */
export function orderUrgency(order: Order, ref: string = today()): Urgency {
  if (order.closed || order.pieces.every((p) => p.status === 'delivered')) return 'normal';
  const left = daysUntil(order.dueDate, ref);
  if (left < 0) return 'overdue';
  if (left <= URGENT_WINDOW_DAYS) return 'urgent';
  return 'normal';
}

export function isOrderFinished(order: Order): boolean {
  return order.pieces.length > 0 && order.pieces.every((p) => p.status === 'delivered');
}

export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

/** 单件在工序上的进度 0~1（打包完成视为 1） */
export function pieceProgress(p: Piece): number {
  if (p.status === 'delivered') return 1;
  // 当前工序按是否在做/卡住算一半
  return Math.min(1, (stageIndex(p.stage) + (p.status === 'pending' ? 0 : 0.5)) / STAGES.length);
}

/** 下一道工序，最后一道之后为 null */
export function nextStage(stage: Stage): Stage | null {
  const i = stageIndex(stage);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export function workerName(workers: { id: string; name: string }[], id: string | null): string {
  if (!id) return '未指派';
  return workers.find((w) => w.id === id)?.name ?? '已离岗';
}

export const STATUS_LABEL: Record<Piece['status'], string> = {
  pending: '待开工',
  doing: '制作中',
  blocked: '卡住',
  done: '已完成',
  delivered: '已交货',
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  normal: '正常',
  urgent: '临近交货',
  overdue: '已逾期',
};

export const URGENCY_COLOR: Record<Urgency, string> = {
  normal: '#27ae60',
  urgent: '#e67e22',
  overdue: '#e74c3c',
};

/** 单号：DZ-日期-序号（按当天已有单数） */
export function generateOrderCode(orders: Order[], ref: string = today()): string {
  const day = ref.replace(/-/g, '');
  const prefix = `DZ-${day}-`;
  const n = orders.filter((o) => o.code.startsWith(prefix)).length + 1;
  return prefix + String(n).padStart(4, '0');
}
