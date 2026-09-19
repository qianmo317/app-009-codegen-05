import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GarmentStyle, ItemEvent, Order, OrderItem } from '../types/orders';
import { STAGES } from '../types/orders';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowIso() {
  return new Date().toISOString();
}

/** 单号：D年月日-当日序号，如 D20260919-01 */
function makeOrderNo(orders: Order[]): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const seq = orders.filter((o) => o.orderNo.includes(ymd)).length + 1;
  return `D${ymd}-${pad(seq)}`;
}

function makeItem(seq: number, note?: string): OrderItem {
  return {
    id: generateId(),
    seq,
    stage: 'received',
    assignee: '',
    stalled: null,
    events: [{ id: generateId(), at: nowIso(), type: 'create', note }],
  };
}

function updateOrderItem(
  orders: Order[],
  orderId: string,
  itemId: string,
  fn: (item: OrderItem) => OrderItem
): Order[] {
  return orders.map((o) =>
    o.id !== orderId
      ? o
      : { ...o, items: o.items.map((it) => (it.id === itemId ? fn(it) : it)) }
  );
}

export type NewOrderInput = {
  customer: string;
  style: GarmentStyle;
  size: string;
  color: string;
  quantity: number;
  deliveryDate: string;
  note?: string;
};

export type SupplementInput = {
  itemSeqs: number[]; // 要改动的已交付件
  deliveryDate: string;
  note: string; // 要改什么
};

interface OrderState {
  orders: Order[];
}

interface OrderActions {
  createOrder: (input: NewOrderInput) => string;
  deleteOrder: (orderId: string) => void;
  /** 推进到下一道工序（停滞中需先换人接手） */
  advanceItem: (orderId: string, itemId: string) => void;
  /** 指定/更换负责人 */
  assignItem: (orderId: string, itemId: string, assignee: string) => void;
  /** 做不下去停在一处，必须写明原因 */
  stallItem: (orderId: string, itemId: string, reason: string) => void;
  /** 换人接手：停滞的件由另一个人接着做 */
  resumeItem: (orderId: string, itemId: string, newAssignee: string) => void;
  /** 改交货日期，早先的日期留一条记录 */
  changeDeliveryDate: (orderId: string, newDate: string, reason: string) => void;
  /** 已交出去的件再改动，另开一张补单 */
  createSupplementOrder: (orderId: string, input: SupplementInput) => string | null;
}

export const useOrderStore = create<OrderState & OrderActions>()(
  persist(
    (set, get) => ({
      orders: [],

      createOrder: (input) => {
        const quantity = Math.max(1, Math.floor(input.quantity) || 1);
        const order: Order = {
          id: generateId(),
          orderNo: makeOrderNo(get().orders),
          customer: input.customer.trim(),
          style: input.style,
          size: input.size.trim(),
          color: input.color.trim(),
          quantity,
          deliveryDate: input.deliveryDate,
          deliveryHistory: [],
          items: Array.from({ length: quantity }, (_, i) => makeItem(i + 1)),
          note: input.note?.trim() ?? '',
          createdAt: nowIso(),
          parentOrderId: null,
          supplementNote: '',
        };
        set((s) => ({ orders: [...s.orders, order] }));
        return order.id;
      },

      deleteOrder: (orderId) => {
        // 连带删掉它的补单
        set((s) => ({
          orders: s.orders.filter((o) => o.id !== orderId && o.parentOrderId !== orderId),
        }));
      },

      advanceItem: (orderId, itemId) => {
        set((s) => ({
          orders: updateOrderItem(s.orders, orderId, itemId, (item) => {
            if (item.stalled) return item; // 停滞中不能推进
            const idx = STAGES.indexOf(item.stage);
            if (idx < 0 || idx >= STAGES.length - 1) return item;
            const toStage = STAGES[idx + 1];
            const event: ItemEvent = {
              id: generateId(),
              at: nowIso(),
              type: toStage === 'delivered' ? 'deliver' : 'advance',
              fromStage: item.stage,
              toStage,
              assignee: item.assignee || undefined,
            };
            return { ...item, stage: toStage, events: [...item.events, event] };
          }),
        }));
      },

      assignItem: (orderId, itemId, assignee) => {
        const name = assignee.trim();
        if (!name) return;
        set((s) => ({
          orders: updateOrderItem(s.orders, orderId, itemId, (item) => {
            if (item.assignee === name) return item;
            const event: ItemEvent = {
              id: generateId(),
              at: nowIso(),
              type: 'assign',
              assignee: name,
              note: item.assignee ? `由 ${item.assignee} 改为 ${name}` : undefined,
            };
            return { ...item, assignee: name, events: [...item.events, event] };
          }),
        }));
      },

      stallItem: (orderId, itemId, reason) => {
        const text = reason.trim();
        if (!text) return; // 停滞必须写明原因
        set((s) => ({
          orders: updateOrderItem(s.orders, orderId, itemId, (item) => {
            if (item.stalled || item.stage === 'delivered') return item;
            const event: ItemEvent = {
              id: generateId(),
              at: nowIso(),
              type: 'stall',
              assignee: item.assignee || undefined,
              note: text,
            };
            return {
              ...item,
              stalled: { reason: text, since: nowIso() },
              events: [...item.events, event],
            };
          }),
        }));
      },

      resumeItem: (orderId, itemId, newAssignee) => {
        const name = newAssignee.trim();
        if (!name) return; // 换人接手必须写新负责人
        set((s) => ({
          orders: updateOrderItem(s.orders, orderId, itemId, (item) => {
            if (!item.stalled) return item;
            const event: ItemEvent = {
              id: generateId(),
              at: nowIso(),
              type: 'resume',
              assignee: name,
              note: `停滞原因「${item.stalled.reason}」，由 ${item.assignee || '（未指派）'} 交给 ${name} 接手`,
            };
            return { ...item, assignee: name, stalled: null, events: [...item.events, event] };
          }),
        }));
      },

      changeDeliveryDate: (orderId, newDate, reason) => {
        if (!newDate) return;
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== orderId || o.deliveryDate === newDate) return o;
            return {
              ...o,
              deliveryDate: newDate,
              deliveryHistory: [
                ...o.deliveryHistory,
                {
                  id: generateId(),
                  at: nowIso(),
                  oldDate: o.deliveryDate, // 早先的日期留一条
                  newDate,
                  reason: reason.trim(),
                },
              ],
            };
          }),
        }));
      },

      createSupplementOrder: (orderId, input) => {
        const src = get().orders.find((o) => o.id === orderId);
        if (!src) return null;
        // 只有已交出去的件才能开补单
        const deliveredSeqs = src.items.filter((i) => i.stage === 'delivered').map((i) => i.seq);
        const seqs = input.itemSeqs.filter((seq) => deliveredSeqs.includes(seq));
        if (seqs.length === 0 || !input.deliveryDate) return null;
        const order: Order = {
          id: generateId(),
          orderNo: makeOrderNo(get().orders),
          customer: src.customer,
          style: src.style,
          size: src.size,
          color: src.color,
          quantity: seqs.length,
          deliveryDate: input.deliveryDate,
          deliveryHistory: [],
          items: seqs.map((seq, i) => makeItem(i + 1, `补单：原单 ${src.orderNo} 第 ${seq} 件`)),
          note: input.note.trim(),
          createdAt: nowIso(),
          parentOrderId: src.id,
          supplementNote: `原单 ${src.orderNo} 第 ${seqs.join('、')} 件`,
        };
        set((s) => ({ orders: [...s.orders, order] }));
        return order.id;
      },
    }),
    {
      name: 'knitting-order-storage',
    }
  )
);
