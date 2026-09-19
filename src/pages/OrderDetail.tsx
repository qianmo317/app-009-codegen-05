import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrderStore } from '../store/orderStore';
import type { ItemEvent, Order, OrderItem } from '../types/orders';
import { STAGE_LABELS, STAGES, STYLE_LABELS } from '../types/orders';
import { daysUntil, formatDateTime, isOrderDone, orderAlert } from '../utils/orders';
import { OrderBadges } from './Orders';

const card: React.CSSProperties = {
  border: '1px solid #e0dcd5',
  borderRadius: 8,
  padding: 12,
  background: '#fff',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 4,
  border: '1px solid #d5cdc2',
  fontSize: 13,
};

const btn: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: 4,
  border: '1px solid #3498db',
  background: '#fff',
  color: '#3498db',
  cursor: 'pointer',
  fontSize: 13,
};

const btnPrimary: React.CSSProperties = { ...btn, background: '#3498db', color: '#fff' };

function eventText(e: ItemEvent): string {
  switch (e.type) {
    case 'create':
      return e.note ?? '接单';
    case 'assign':
      return e.note ?? `指派给 ${e.assignee}`;
    case 'advance':
      return `${e.assignee ? `${e.assignee}：` : ''}${STAGE_LABELS[e.fromStage!]} → ${STAGE_LABELS[e.toStage!]}`;
    case 'deliver':
      return `${e.assignee ? `${e.assignee}：` : ''}已交付`;
    case 'stall':
      return `停滞：${e.note}`;
    case 'resume':
      return `复工：${e.note}`;
  }
}

/** 工序流水线：接单 → 备线 → 织 → 缝合 → 打包 → 交付 */
function StagePipeline({ item }: { item: OrderItem }) {
  const current = STAGES.indexOf(item.stage);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {STAGES.map((st, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <span key={st} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <span style={{ color: '#c8c0b4', fontSize: 11 }}>›</span>}
            <span
              style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 10,
                background: done ? '#27ae60' : active ? '#3498db' : '#ecf0f1',
                color: done || active ? '#fff' : '#999',
                fontWeight: active ? 600 : 400,
              }}
            >
              {STAGE_LABELS[st]}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function ItemCard({ orderId, item }: { orderId: string; item: OrderItem }) {
  const advanceItem = useOrderStore((s) => s.advanceItem);
  const assignItem = useOrderStore((s) => s.assignItem);
  const stallItem = useOrderStore((s) => s.stallItem);
  const resumeItem = useOrderStore((s) => s.resumeItem);
  const [stallReason, setStallReason] = useState('');
  const [stallOpen, setStallOpen] = useState(false);
  const [newAssignee, setNewAssignee] = useState('');
  const [showLog, setShowLog] = useState(false);

  const idx = STAGES.indexOf(item.stage);
  const next = STAGES[idx + 1] as (typeof STAGES)[number] | undefined;
  const delivered = item.stage === 'delivered';

  return (
    <div style={{ ...card, borderLeft: `4px solid ${item.stalled ? '#8e44ad' : delivered ? '#27ae60' : '#3498db'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600 }}>第 {item.seq} 件</span>
        {item.stalled && (
          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, color: '#fff', background: '#8e44ad' }}>
            停滞中
          </span>
        )}
        {delivered && (
          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, color: '#fff', background: '#27ae60' }}>
            已交付
          </span>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          负责人
          <input
            key={`${item.id}-${item.assignee}`}
            defaultValue={item.assignee}
            placeholder="未指派"
            style={{ ...inputStyle, width: 90, padding: '3px 6px' }}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value.trim() !== item.assignee) {
                assignItem(orderId, item.id, e.target.value);
              }
            }}
          />
        </span>
      </div>

      <div style={{ marginTop: 8 }}>
        <StagePipeline item={item} />
      </div>

      {item.stalled && (
        <div style={{ marginTop: 8, padding: 8, borderRadius: 4, background: '#f4ecf7', fontSize: 13, color: '#6c3483' }}>
          停滞原因：{item.stalled.reason}（{formatDateTime(item.stalled.since)} 起）
        </div>
      )}

      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!delivered && !item.stalled && (
          <>
            <button style={btnPrimary} onClick={() => advanceItem(orderId, item.id)}>
              {next === 'delivered' ? '确认交付' : `推进到${STAGE_LABELS[next!]}`}
            </button>
            {!stallOpen ? (
              <button style={{ ...btn, borderColor: '#8e44ad', color: '#8e44ad' }} onClick={() => setStallOpen(true)}>
                停滞
              </button>
            ) : (
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <input
                  style={{ ...inputStyle, width: 200 }}
                  placeholder="停滞原因（必填）"
                  value={stallReason}
                  onChange={(e) => setStallReason(e.target.value)}
                />
                <button
                  style={{ ...btn, borderColor: '#8e44ad', color: '#8e44ad', opacity: stallReason.trim() ? 1 : 0.5 }}
                  disabled={!stallReason.trim()}
                  onClick={() => {
                    stallItem(orderId, item.id, stallReason);
                    setStallReason('');
                    setStallOpen(false);
                  }}
                >
                  确认停滞
                </button>
                <button style={{ ...btn, borderColor: '#bdc3c7', color: '#888' }} onClick={() => setStallOpen(false)}>
                  取消
                </button>
              </span>
            )}
          </>
        )}
        {item.stalled && (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input
              style={{ ...inputStyle, width: 110 }}
              placeholder="接手的工人"
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
            />
            <button
              style={{ ...btnPrimary, borderColor: '#8e44ad', background: '#8e44ad', opacity: newAssignee.trim() ? 1 : 0.5 }}
              disabled={!newAssignee.trim()}
              onClick={() => {
                resumeItem(orderId, item.id, newAssignee);
                setNewAssignee('');
              }}
            >
              换人接手
            </button>
          </span>
        )}
        <button style={{ ...btn, borderColor: '#d5cdc2', color: '#888', marginLeft: 'auto' }} onClick={() => setShowLog((v) => !v)}>
          {showLog ? '收起记录' : `记录 ${item.events.length}`}
        </button>
      </div>

      {showLog && (
        <div style={{ marginTop: 8, borderTop: '1px dashed #e0dcd5', paddingTop: 6 }}>
          {[...item.events].reverse().map((e) => (
            <div key={e.id} style={{ fontSize: 12, color: '#777', padding: '2px 0' }}>
              <span style={{ color: '#aaa', marginRight: 8 }}>{formatDateTime(e.at)}</span>
              {eventText(e)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 改交货日期：早先的日期留一条 */
function DeliverySection({ order }: { order: Order }) {
  const changeDeliveryDate = useOrderStore((s) => s.changeDeliveryDate);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const canSubmit = newDate && newDate !== order.deliveryDate;

  return (
    <div style={{ ...card, marginTop: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        交货日期：<span style={{ color: '#c0392b' }}>{order.deliveryDate}</span>
        {order.deliveryHistory.length > 0 && (
          <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>（改期 {order.deliveryHistory.length} 次）</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={inputStyle} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
        <input
          style={{ ...inputStyle, width: 220 }}
          placeholder="改期原因（可选）"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          style={{ ...btn, opacity: canSubmit ? 1 : 0.5 }}
          disabled={!canSubmit}
          onClick={() => {
            changeDeliveryDate(order.id, newDate, reason);
            setNewDate('');
            setReason('');
          }}
        >
          改期
        </button>
      </div>
      {order.deliveryHistory.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px dashed #e0dcd5', paddingTop: 6 }}>
          {[...order.deliveryHistory].reverse().map((h) => (
            <div key={h.id} style={{ fontSize: 12, color: '#777', padding: '2px 0' }}>
              <span style={{ color: '#aaa', marginRight: 8 }}>{formatDateTime(h.at)}</span>
              {h.oldDate} → {h.newDate}
              {h.reason && `（${h.reason}）`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 已交出去的件再改动：另开一张补单 */
function SupplementSection({ order }: { order: Order }) {
  const createSupplementOrder = useOrderStore((s) => s.createSupplementOrder);
  const navigate = useNavigate();
  const delivered = order.items.filter((i) => i.stage === 'delivered');
  const [checked, setChecked] = useState<number[]>([]);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  if (delivered.length === 0) return null;
  const canSubmit = checked.length > 0 && date;

  return (
    <div style={{ ...card, marginTop: 12, borderLeft: '4px solid #16a085' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>已交付件要改动 → 开补单</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        {delivered.map((i) => (
          <label key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={checked.includes(i.seq)}
              onChange={(e) =>
                setChecked((v) => (e.target.checked ? [...v, i.seq] : v.filter((s) => s !== i.seq)))
              }
            />
            第 {i.seq} 件
          </label>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          新交货日期
          <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <input
          style={{ ...inputStyle, flex: 1, minWidth: 160 }}
          placeholder="要改什么（如：改短袖子、换扣子）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          style={{ ...btnPrimary, borderColor: '#16a085', background: '#16a085', opacity: canSubmit ? 1 : 0.5 }}
          disabled={!canSubmit}
          onClick={() => {
            const id = createSupplementOrder(order.id, { itemSeqs: checked, deliveryDate: date, note });
            if (id) navigate(`/orders/${id}`);
          }}
        >
          开补单
        </button>
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orders = useOrderStore((s) => s.orders);
  const deleteOrder = useOrderStore((s) => s.deleteOrder);
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>订单不存在</p>
        <button onClick={() => navigate('/orders')} style={{ marginTop: 16, padding: '8px 16px' }}>
          返回订单列表
        </button>
      </div>
    );
  }

  const alert = orderAlert(order);
  const parent = order.parentOrderId ? orders.find((o) => o.id === order.parentOrderId) : null;
  const supplements = orders.filter((o) => o.parentOrderId === order.id);

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate('/orders')} style={{ padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #bdc3c7', background: '#fff', cursor: 'pointer' }}>
          ← 订单列表
        </button>
        <h1 style={{ fontSize: 20, margin: 0 }}>
          {order.orderNo}
          {order.parentOrderId && <span style={{ fontSize: 13, color: '#16a085' }}>（补单）</span>}
        </h1>
        <OrderBadges order={order} />
        <button
          style={{ ...btn, borderColor: '#e74c3c', color: '#e74c3c', marginLeft: 'auto' }}
          onClick={() => {
            if (window.confirm('删除这张单子？它的补单也会一起删掉。')) {
              deleteOrder(order.id);
              navigate('/orders');
            }
          }}
        >
          删除
        </button>
      </div>

      {alert && (
        <div style={{ ...card, marginBottom: 12, background: alert === 'overdue' ? '#fdedec' : '#fef5e7', borderColor: alert === 'overdue' ? '#e74c3c' : '#e67e22', fontSize: 13 }}>
          {alert === 'overdue'
            ? `⚠ 已过交货日期 ${Math.abs(daysUntil(order.deliveryDate))} 天，还有 ${order.items.filter((i) => i.stage !== 'delivered').length} 件没做完`
            : `⚠ 还有 ${daysUntil(order.deliveryDate)} 天交货，还没做完，抓紧安排`}
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 14, lineHeight: 1.9 }}>
          客户：{order.customer} · 款式：{STYLE_LABELS[order.style]} · 尺码：{order.size || '未定'} · 颜色：{order.color || '未定'} · 件数：{order.quantity}
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
          下单时间 {formatDateTime(order.createdAt)}
          {order.note && ` · 备注：${order.note}`}
        </div>
        {parent && (
          <div style={{ fontSize: 13, marginTop: 6 }}>
            补单来源：
            <a style={{ color: '#16a085', cursor: 'pointer' }} onClick={() => navigate(`/orders/${parent.id}`)}>
              {parent.orderNo}
            </a>
            {order.supplementNote && `（${order.supplementNote}）`}
            {order.note && ` · 改动：${order.note}`}
          </div>
        )}
        {supplements.length > 0 && (
          <div style={{ fontSize: 13, marginTop: 6 }}>
            本单补单：
            {supplements.map((s, i) => (
              <span key={s.id}>
                {i > 0 && '、'}
                <a style={{ color: '#16a085', cursor: 'pointer' }} onClick={() => navigate(`/orders/${s.id}`)}>
                  {s.orderNo}
                </a>
              </span>
            ))}
          </div>
        )}
      </div>

      <DeliverySection order={order} />

      <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 600 }}>
        分件进度（{order.items.filter((i) => i.stage === 'delivered').length}/{order.quantity} 件已交付）
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {order.items.map((item) => (
          <ItemCard key={item.id} orderId={order.id} item={item} />
        ))}
      </div>

      {!isOrderDone(order) && <div style={{ height: 12 }} />}
      <SupplementSection order={order} />
    </div>
  );
}
