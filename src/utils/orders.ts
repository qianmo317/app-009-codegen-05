import type { Order, OrderItem } from '../types/orders';

/** 提前多少天算「快到交货日期」 */
export const WARN_DAYS = 3;

/** 距交货日期还剩几天（负数 = 已逾期），按自然日算 */
export function daysUntil(dateStr: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
  return Math.round((target - today) / 86400000);
}

export function deliveredCount(order: Order): number {
  return order.items.filter((i) => i.stage === 'delivered').length;
}

export function isOrderDone(order: Order): boolean {
  return order.items.length > 0 && order.items.every((i) => i.stage === 'delivered');
}

export function stalledItems(order: Order): OrderItem[] {
  return order.items.filter((i) => i.stalled !== null);
}

export type OrderAlert = 'overdue' | 'due-soon' | null;

/** 还没做完、又快到交货日期的单子要提前标出来 */
export function orderAlert(order: Order): OrderAlert {
  if (isOrderDone(order)) return null;
  const left = daysUntil(order.deliveryDate);
  if (left < 0) return 'overdue';
  if (left <= WARN_DAYS) return 'due-soon';
  return null;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
