import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../store/orderStore';
import type { GarmentStyle, Order } from '../types/orders';
import { STYLE_LABELS } from '../types/orders';
import { deliveredCount, daysUntil, isOrderDone, orderAlert, stalledItems, WARN_DAYS } from '../utils/orders';

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

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 4,
  border: '1px solid #3498db',
  background: '#3498db',
  color: '#fff',
  cursor: 'pointer',
};

function Badge({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, color, background: bg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export function OrderBadges({ order }: { order: Order }) {
  const alert = orderAlert(order);
  const stalled = stalledItems(order).length;
  if (isOrderDone(order)) return <Badge color="#fff" bg="#27ae60">已完成</Badge>;
  return (
    <span style={{ display: 'inline-flex', gap: 6 }}>
      {alert === 'overdue' && <Badge color="#fff" bg="#e74c3c">已逾期 {Math.abs(daysUntil(order.deliveryDate))} 天</Badge>}
      {alert === 'due-soon' && <Badge color="#fff" bg="#e67e22">剩 {daysUntil(order.deliveryDate)} 天交货</Badge>}
      {stalled > 0 && <Badge color="#fff" bg="#8e44ad">停滞 {stalled} 件</Badge>}
    </span>
  );
}

function NewOrderForm({ onDone }: { onDone: (id: string) => void }) {
  const createOrder = useOrderStore((s) => s.createOrder);
  const [customer, setCustomer] = useState('');
  const [style, setStyle] = useState<GarmentStyle>('sweater');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [note, setNote] = useState('');

  const canSubmit = customer.trim() && deliveryDate && quantity >= 1;

  return (
    <div style={{ ...card, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 600 }}>新建订单</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={{ ...inputStyle, width: 110 }} placeholder="客户 *" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        <select style={inputStyle} value={style} onChange={(e) => setStyle(e.target.value as GarmentStyle)}>
          <option value="sweater">毛衣</option>
          <option value="scarf">围巾</option>
        </select>
        <input style={{ ...inputStyle, width: 90 }} placeholder="尺码" value={size} onChange={(e) => setSize(e.target.value)} />
        <input style={{ ...inputStyle, width: 90 }} placeholder="颜色" value={color} onChange={(e) => setColor(e.target.value)} />
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          件数
          <input style={{ ...inputStyle, width: 64 }} type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </label>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          交货日期 *
          <input style={inputStyle} type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </label>
        <input style={{ ...inputStyle, flex: 1, minWidth: 140 }} placeholder="备注（可选）" value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          style={{ ...btnPrimary, opacity: canSubmit ? 1 : 0.5 }}
          disabled={!canSubmit}
          onClick={() => onDone(createOrder({ customer, style, size, color, quantity, deliveryDate, note }))}
        >
          下单
        </button>
      </div>
    </div>
  );
}

export default function Orders() {
  const orders = useOrderStore((s) => s.orders);
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      const doneA = isOrderDone(a) ? 1 : 0;
      const doneB = isOrderDone(b) ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB; // 未完成的排前面
      return a.deliveryDate.localeCompare(b.deliveryDate); // 交货早的排前面
    });
  }, [orders]);

  const summary = useMemo(() => {
    const active = orders.filter((o) => !isOrderDone(o));
    return {
      active: active.length,
      alert: active.filter((o) => orderAlert(o) !== null).length,
      stalled: orders.reduce((n, o) => n + stalledItems(o).length, 0),
    };
  }, [orders]);

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate('/')} style={{ padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #bdc3c7', background: '#fff', cursor: 'pointer' }}>
          ← 图解
        </button>
        <h1 style={{ fontSize: 24, margin: 0, flex: 1 }}>定制订单</h1>
        <span style={{ fontSize: 13, color: '#888' }}>
          进行中 {summary.active} · 临近交货 {summary.alert} · 停滞 {summary.stalled} 件（提前 {WARN_DAYS} 天提醒）
        </span>
        <button onClick={() => setShowForm((v) => !v)} style={btnPrimary}>
          {showForm ? '收起' : '新建订单'}
        </button>
      </div>

      {showForm && (
        <NewOrderForm
          onDone={(id) => {
            setShowForm(false);
            navigate(`/orders/${id}`);
          }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((order) => {
          const done = deliveredCount(order);
          const stalled = stalledItems(order);
          const alert = orderAlert(order);
          return (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              style={{
                ...card,
                cursor: 'pointer',
                borderLeft: `4px solid ${alert === 'overdue' ? '#e74c3c' : alert === 'due-soon' ? '#e67e22' : stalled.length > 0 ? '#8e44ad' : '#e0dcd5'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>{order.orderNo}</span>
                {order.parentOrderId && <Badge color="#fff" bg="#16a085">补单</Badge>}
                <OrderBadges order={order} />
                <span style={{ marginLeft: 'auto', fontSize: 13, color: '#666' }}>
                  交货 {order.deliveryDate}
                  {order.deliveryHistory.length > 0 && `（改期 ${order.deliveryHistory.length} 次）`}
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: '#555' }}>
                {order.customer} · {STYLE_LABELS[order.style]} · {order.size || '尺码未定'} · {order.color || '颜色未定'} · 共 {order.quantity} 件
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#ecf0f1', overflow: 'hidden' }}>
                  <div style={{ width: `${(done / order.quantity) * 100}%`, height: '100%', background: '#27ae60' }} />
                </div>
                <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                  已交付 {done}/{order.quantity} 件
                </span>
              </div>
              {stalled.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#8e44ad' }}>
                  {stalled.map((i) => `第 ${i.seq} 件停滞：${i.stalled?.reason}`).join('；')}
                </div>
              )}
            </div>
          );
        })}
        {orders.length === 0 && (
          <div style={{ color: '#888', fontSize: 14, textAlign: 'center', padding: 40 }}>
            暂无订单，点击右上角「新建订单」开始接单
          </div>
        )}
      </div>
    </div>
  );
}
