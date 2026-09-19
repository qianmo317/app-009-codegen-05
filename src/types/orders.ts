/** 工序步骤：接单 → 备线 → 织 → 缝合 → 打包 → 交付 */
export const STAGES = ['received', 'yarn', 'knitting', 'seaming', 'packing', 'delivered'] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  received: '接单',
  yarn: '备线',
  knitting: '织',
  seaming: '缝合',
  packing: '打包',
  delivered: '交付',
};

export type ItemEventType = 'create' | 'assign' | 'advance' | 'stall' | 'resume' | 'deliver';

/** 一件活的事件流水：谁、什么时候、做了什么 */
export type ItemEvent = {
  id: string;
  at: string; // ISO 时间戳
  type: ItemEventType;
  fromStage?: Stage;
  toStage?: Stage;
  assignee?: string; // 经手人
  note?: string; // 说明（停滞原因、交接说明等）
};

/** 一单里的「一件活」，同一张单子做了几件就分开记几件 */
export type OrderItem = {
  id: string;
  seq: number; // 第几件
  stage: Stage;
  assignee: string; // 当前负责人
  stalled: { reason: string; since: string } | null; // 停滞信息（原因必填）
  events: ItemEvent[];
};

/** 改期留痕：早先约定的日期留一条 */
export type DeliveryChange = {
  id: string;
  at: string;
  oldDate: string;
  newDate: string;
  reason: string;
};

export type GarmentStyle = 'sweater' | 'scarf';

export const STYLE_LABELS: Record<GarmentStyle, string> = {
  sweater: '毛衣',
  scarf: '围巾',
};

export type Order = {
  id: string;
  orderNo: string;
  customer: string;
  style: GarmentStyle;
  size: string;
  color: string;
  quantity: number;
  deliveryDate: string; // 当前约定的交货日期 YYYY-MM-DD
  deliveryHistory: DeliveryChange[]; // 改期记录（含早先的日期）
  items: OrderItem[];
  note: string;
  createdAt: string;
  /** 补单指向原单；普通订单为 null */
  parentOrderId: string | null;
  /** 补单说明：针对原单哪几件、要改什么 */
  supplementNote: string;
};
