// 定做毛衣/围巾跟单模块的领域模型

/** 一道活从接单到打包要走的工序（顺序即流转顺序） */
export const STAGES = ['接单', '备线', '织', '缝合', '打包'] as const;
export type Stage = (typeof STAGES)[number];

/** 单件的状态 */
export type PieceStatus = 'pending' | 'doing' | 'blocked' | 'done' | 'delivered';

/** 同一张单子里的每一件，分开记账、分开跟工序 */
export interface Piece {
  id: string;
  /** 件号，同单内从 1 开始 */
  seq: number;
  stage: Stage;
  status: PieceStatus;
  /** 当前在做 / 负责这一件的人 */
  assigneeId: string | null;
  /** 停在一处做不下去时写明的原因 */
  blockReason: string | null;
  /** 卡住的起始日期 YYYY-MM-DD */
  blockedSince: string | null;
  /** 各工序完成时间，用于看进度 */
  stageDoneAt: Partial<Record<Stage, string>>;
  note?: string;
}

export interface DueDateHistory {
  /** 早先约定的交货日期 */
  from: string;
  /** 改成的日期 */
  to: string;
  changedAt: string;
  reason?: string;
}

export interface Order {
  id: string;
  /** 单号，如 DZ-20260919-0001 */
  code: string;
  customerName: string;
  customerPhone?: string;
  /** 款式（毛衣 / 围巾 …） */
  style: string;
  size: string;
  color: string;
  /** 件数；pieces.length 与之对应 */
  quantity: number;
  /** 当前说好的交货日期 YYYY-MM-DD */
  dueDate: string;
  createdAt: string;
  /** 改过交货日期时，早先的日期在这里留一条 */
  dueDateHistory: DueDateHistory[];
  pieces: Piece[];
  note?: string;
  /** 补单：来源原单 */
  sourceOrderId?: string;
  /** 补单：对应的原单件号 */
  sourcePieceSeq?: number;
  kind: 'normal' | 'repair';
  closed: boolean;
}

export interface Worker {
  id: string;
  name: string;
  /** 是否在岗；离岗的人不能再被派活，但历史记录保留 */
  active: boolean;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  pieceId?: string;
  at: string;
  message: string;
}

/** 按期程度，用于「快到交货日期还没好提前标出来」 */
export type Urgency = 'normal' | 'urgent' | 'overdue';
