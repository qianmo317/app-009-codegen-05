import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, OrderEvent, Piece, Stage, Worker } from './types';
import { STAGES } from './types';
import {
  addDays,
  generateOrderCode,
  isOrderFinished,
  nextStage,
  today,
  uid,
} from './helpers';

function makePieces(quantity: number, assigneeId: string | null): Piece[] {
  return Array.from({ length: quantity }, (_, i) => ({
    id: uid(),
    seq: i + 1,
    stage: '接单' as Stage,
    status: 'pending' as const,
    assigneeId,
    blockReason: null,
    blockedSince: null,
    stageDoneAt: {},
  }));
}

export interface NewOrderInput {
  customerName: string;
  customerPhone?: string;
  style: string;
  size: string;
  color: string;
  quantity: number;
  dueDate: string;
  note?: string;
  assigneeId?: string | null;
  sourceOrderId?: string;
  sourcePieceSeq?: number;
  kind?: Order['kind'];
}

interface OrderState {
  orders: Order[];
  workers: Worker[];
  events: OrderEvent[];

  createOrder: (input: NewOrderInput) => string;
  deleteOrder: (id: string) => void;
  reschedule: (orderId: string, newDate: string, reason?: string) => void;
  assignPiece: (orderId: string, pieceId: string, workerId: string | null) => void;
  startPiece: (orderId: string, pieceId: string) => void;
  advancePiece: (orderId: string, pieceId: string) => void;
  blockPiece: (orderId: string, pieceId: string, reason: string) => void;
  handoffPiece: (orderId: string, pieceId: string, toWorkerId: string, note: string) => void;
  resumePiece: (orderId: string, pieceId: string) => void;
  deliverPiece: (orderId: string, pieceId: string) => void;
  /** 已交出去的件要改动：原单不动，另开一张补单 */
  createRepairOrder: (sourceOrderId: string, sourcePieceId: string, note: string, dueDate?: string) => string | null;

  addWorker: (name: string) => string;
  toggleWorkerActive: (id: string) => void;
}

function logEvent(events: OrderEvent[], e: Omit<OrderEvent, 'id' | 'at'>): OrderEvent[] {
  return [{ id: uid(), at: new Date().toISOString(), ...e }, ...events].slice(0, 500);
}

function updateOrder(orders: Order[], orderId: string, fn: (o: Order) => Order): Order[] {
  return orders.map((o) => (o.id === orderId ? fn(o) : o));
}

function updatePiece(o: Order, pieceId: string, fn: (p: Piece) => Piece): Order {
  return {
    ...o,
    closed: false,
    pieces: o.pieces.map((p) => (p.id === pieceId ? fn(p) : p)),
  };
}

// ---------- 初始示例数据 ----------
function seed(): Pick<OrderState, 'orders' | 'workers' | 'events'> {
  const w1: Worker = { id: 'w-li', name: '李姐', active: true };
  const w2: Worker = { id: 'w-wang', name: '王师傅', active: true };
  const w3: Worker = { id: 'w-zhao', name: '小赵', active: true };

  const mk = (partial: Partial<Piece> & { seq: number }): Piece => ({
    id: uid(),
    stage: '接单',
    status: 'pending',
    assigneeId: null,
    blockReason: null,
    blockedSince: null,
    stageDoneAt: {},
    ...partial,
  });

  const o1: Order = {
    id: uid(),
    code: 'DZ-20260918-0001',
    customerName: '陈芳',
    customerPhone: '138****2211',
    style: '高领毛衣',
    size: 'M',
    color: '酒红',
    quantity: 2,
    dueDate: addDays(today(), 2),
    createdAt: addDays(today(), -6),
    dueDateHistory: [
      { from: addDays(today(), -2), to: addDays(today(), 2), changedAt: addDays(today(), -3), reason: '客户出差，推迟取货' },
    ],
    note: '袖口要收紧一点',
    kind: 'normal',
    closed: false,
    pieces: [
      mk({ seq: 1, stage: '织', status: 'doing', assigneeId: w1.id, stageDoneAt: { 接单: addDays(today(), -6), 备线: addDays(today(), -5) } }),
      mk({ seq: 2, stage: '缝合', status: 'blocked', assigneeId: w2.id, blockReason: '配线颜色对不上，等供应商补线', blockedSince: addDays(today(), -1), stageDoneAt: { 接单: addDays(today(), -6), 备线: addDays(today(), -5), 织: addDays(today(), -2) } }),
    ],
  };

  const o2: Order = {
    id: uid(),
    code: 'DZ-20260917-0002',
    customerName: '周先生',
    style: '围巾',
    size: '均码',
    color: '米白',
    quantity: 1,
    dueDate: addDays(today(), -1),
    createdAt: addDays(today(), -8),
    dueDateHistory: [],
    kind: 'normal',
    closed: false,
    pieces: [
      mk({ seq: 1, stage: '备线', status: 'doing', assigneeId: w3.id, stageDoneAt: { 接单: addDays(today(), -8) } }),
    ],
  };

  const o3: Order = {
    id: uid(),
    code: 'DZ-20260910-0003',
    customerName: '林阿姨',
    style: '开衫毛衣',
    size: 'L',
    color: '藏青',
    quantity: 1,
    dueDate: addDays(today(), -4),
    createdAt: addDays(today(), -12),
    dueDateHistory: [],
    kind: 'normal',
    closed: true,
    pieces: [
      mk({
        seq: 1,
        stage: '打包',
        status: 'delivered',
        assigneeId: w1.id,
        stageDoneAt: { 接单: addDays(today(), -12), 备线: addDays(today(), -11), 织: addDays(today(), -8), 缝合: addDays(today(), -6), 打包: addDays(today(), -4) },
      }),
    ],
  };

  return { workers: [w1, w2, w3], orders: [o1, o2, o3], events: [] };
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      ...seed(),

      createOrder: (input) => {
        const now = today();
        const order: Order = {
          id: uid(),
          code: input.kind === 'repair' ? generateRepairCode(get().orders) : generateOrderCode(get().orders),
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          style: input.style,
          size: input.size,
          color: input.color,
          quantity: input.quantity,
          dueDate: input.dueDate,
          createdAt: now,
          dueDateHistory: [],
          note: input.note,
          pieces: makePieces(input.quantity, input.assigneeId ?? null),
          sourceOrderId: input.sourceOrderId,
          sourcePieceSeq: input.sourcePieceSeq,
          kind: input.kind ?? 'normal',
          closed: false,
        };
        set((s) => ({
          orders: [order, ...s.orders],
          events: logEvent(s.events, {
            orderId: order.id,
            message: `${order.kind === 'repair' ? '补单' : '新单'} ${order.code}：${order.customerName} 定做 ${order.style} ${order.size} ${order.color} ×${order.quantity}，交货 ${order.dueDate}`,
          }),
        }));
        return order.id;
      },

      deleteOrder: (id) =>
        set((s) => ({
          orders: s.orders.filter((o) => o.id !== id),
          events: s.events.filter((e) => e.orderId !== id),
        })),

      // 改交货日期：先把早先那个日期留一条，再改
      reschedule: (orderId, newDate, reason) =>
        set((s) => ({
          orders: updateOrder(s.orders, orderId, (o) => {
            if (newDate === o.dueDate) return o;
            return {
              ...o,
              dueDate: newDate,
              dueDateHistory: [
                ...o.dueDateHistory,
                { from: o.dueDate, to: newDate, changedAt: today(), reason },
              ],
            };
          }),
          events: (() => {
            const o = s.orders.find((x) => x.id === orderId);
            return o && newDate !== o.dueDate
              ? logEvent(s.events, { orderId, message: `交货日期由 ${o.dueDate} 改为 ${newDate}${reason ? '（' + reason + '）' : ''}` })
              : s.events;
          })(),
        })),

      assignPiece: (orderId, pieceId, workerId) =>
        set((s) => ({
          orders: updateOrder(s.orders, orderId, (o) =>
            updatePiece(o, pieceId, (p) => ({ ...p, assigneeId: workerId }))
          ),
        })),

      // 开工 / 换人接手后接着做
      startPiece: (orderId, pieceId) =>
        set((s) => ({
          orders: updateOrder(s.orders, orderId, (o) =>
            updatePiece(o, pieceId, (p) =>
              p.status === 'delivered' || p.status === 'done'
                ? p
                : { ...p, status: 'doing', blockReason: null, blockedSince: null }
            )
          ),
          events: logEvent(s.events, {
            orderId,
            pieceId,
            message: `第 ${pieceSeq(s, orderId, pieceId)} 件在「${pieceStage(s, orderId, pieceId)}」开工`,
          }),
        })),

      // 当前工序做完，进入下一道；最后一道（打包）做完 = 整件完工待交货
      advancePiece: (orderId, pieceId) =>
        set((s) => ({
          orders: updateOrder(s.orders, orderId, (o) =>
            updatePiece(o, pieceId, (p) => {
              if (p.status === 'delivered') return p;
              const ns = nextStage(p.stage);
              const doneAt = { ...p.stageDoneAt, [p.stage]: new Date().toISOString() };
              if (ns === null) {
                return { ...p, status: 'done', stageDoneAt: doneAt };
              }
              return { ...p, stage: ns, status: 'doing', blockReason: null, blockedSince: null, stageDoneAt: doneAt };
            })
          ),
          events: (() => {
            const p = findPiece(s.orders, orderId, pieceId);
            if (!p || p.status === 'delivered') return s.events;
            const ns = nextStage(p.stage);
            return logEvent(s.events, {
              orderId,
              pieceId,
              message: ns ? `第 ${p.seq} 件完成「${p.stage}」，进入「${ns}」` : `第 ${p.seq} 件完成「${p.stage}」，待交货`,
            });
          })(),
        })),

      // 做不下去停在一处：必须写明原因
      blockPiece: (orderId, pieceId, reason) =>
        set((s) => ({
          orders: updateOrder(s.orders, orderId, (o) =>
            updatePiece(o, pieceId, (p) =>
              p.status === 'delivered' || p.status === 'done'
                ? p
                : { ...p, status: 'blocked', blockReason: reason.trim(), blockedSince: today() }
            )
          ),
          events: logEvent(s.events, {
            orderId,
            pieceId,
            message: `第 ${pieceSeq(s, orderId, pieceId)} 件卡在「${pieceStage(s, orderId, pieceId)}」：${reason.trim()}`,
          }),
        })),

      // 换人接手：工序不动，写明交接说明
      handoffPiece: (orderId, pieceId, toWorkerId, note) =>
        set((s) => {
          const from = findPiece(s.orders, orderId, pieceId)?.assigneeId;
          const wName = (id: string | null | undefined) => s.workers.find((w) => w.id === id)?.name ?? '未指派';
          return {
            orders: updateOrder(s.orders, orderId, (o) =>
              updatePiece(o, pieceId, (p) => ({ ...p, assigneeId: toWorkerId }))
            ),
            events: logEvent(s.events, {
              orderId,
              pieceId,
              message: `第 ${pieceSeq(s, orderId, pieceId)} 件由 ${wName(from)} 交给 ${wName(toWorkerId)} 接手${note ? '：' + note : ''}`,
            }),
          };
        }),

      // 卡住的件恢复制作
      resumePiece: (orderId, pieceId) =>
        set((s) => ({
          orders: updateOrder(s.orders, orderId, (o) =>
            updatePiece(o, pieceId, (p) =>
              p.status === 'blocked'
                ? { ...p, status: 'doing', blockReason: null, blockedSince: null }
                : p
            )
          ),
          events: logEvent(s.events, { orderId, pieceId, message: `第 ${pieceSeq(s, orderId, pieceId)} 件恢复制作` }),
        })),

      // 打包完工后交货
      deliverPiece: (orderId, pieceId) =>
        set((s) => {
          let delivered = false;
          const orders = updateOrder(s.orders, orderId, (o) =>
            updatePiece(o, pieceId, (p) => {
              if (p.status !== 'done') return p;
              delivered = true;
              return { ...p, status: 'delivered', stage: '打包', stageDoneAt: { ...p.stageDoneAt, 打包: new Date().toISOString() } };
            })
          );
          const order = orders.find((o) => o.id === orderId);
          if (order && delivered && isOrderFinished(order)) {
            order.closed = true;
          }
          return {
            orders,
            events: delivered
              ? logEvent(s.events, { orderId, pieceId, message: `第 ${pieceSeq(s, orderId, pieceId)} 件已交货` })
              : s.events,
          };
        }),

      // 已交出去的件要改动：另开补单，原单件保持已交货不动
      createRepairOrder: (sourceOrderId, sourcePieceId, note, dueDate) => {
        const src = get().orders.find((o) => o.id === sourceOrderId);
        const piece = src?.pieces.find((p) => p.id === sourcePieceId);
        if (!src || !piece) return null;
        return get().createOrder({
          customerName: src.customerName,
          customerPhone: src.customerPhone,
          style: src.style,
          size: src.size,
          color: src.color,
          quantity: 1,
          dueDate: dueDate ?? addDays(today(), 7),
          note: `补单（原单 ${src.code} 第 ${piece.seq} 件返修/改动）：${note}`,
          sourceOrderId: src.id,
          sourcePieceSeq: piece.seq,
          kind: 'repair',
          assigneeId: piece.assigneeId,
        });
      },

      addWorker: (name) => {
        const w: Worker = { id: uid(), name: name.trim(), active: true };
        set((s) => ({ workers: [...s.workers, w] }));
        return w.id;
      },

      toggleWorkerActive: (id) =>
        set((s) => ({
          workers: s.workers.map((w) => (w.id === id ? { ...w, active: !w.active } : w)),
        })),
    }),
    { name: 'knitting-order-tracking' }
  )
);

function findPiece(orders: Order[], orderId: string, pieceId: string): Piece | undefined {
  return orders.find((o) => o.id === orderId)?.pieces.find((p) => p.id === pieceId);
}

// 事件记录里取件号 / 当前工序
function pieceSeq(s: OrderState, orderId: string, pieceId: string): number {
  return findPiece(s.orders, orderId, pieceId)?.seq ?? 0;
}
function pieceStage(s: OrderState, orderId: string, pieceId: string): Stage {
  return findPiece(s.orders, orderId, pieceId)?.stage ?? STAGES[0];
}

function generateRepairCode(orders: Order[], ref: string = today()): string {
  const day = ref.replace(/-/g, '');
  const prefix = `BD-${day}-`;
  const n = orders.filter((o) => o.code.startsWith(prefix)).length + 1;
  return prefix + String(n).padStart(4, '0');
}
