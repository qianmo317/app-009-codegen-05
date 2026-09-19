import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useOrderStore } from './store';
import PieceCard from './PieceCard';
import {
  URGENT_WINDOW_DAYS,
  URGENCY_LABEL,
  daysUntil,
  isOrderFinished,
  orderUrgency,
  today,
} from './helpers';
import { btn, card, colors, input, label, tag } from './ui';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, padding: 20, width: 420, maxWidth: '92vw' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const order = useOrderStore((s) => s.orders.find((o) => o.id === id));
  const events = useOrderStore((s) => s.events.filter((e) => e.orderId === id));
  const reschedule = useOrderStore((s) => s.reschedule);
  const deleteOrder = useOrderStore((s) => s.deleteOrder);

  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState(order?.dueDate ?? today());
  const [changeReason, setChangeReason] = useState('');
  const source = useOrderStore((s) =>
    order?.sourceOrderId ? s.orders.find((o) => o.id === order.sourceOrderId) ?? null : null
  );

  if (!order) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ ...card, color: colors.muted }}>找不到这张单子，可能已被删除。</div>
        <Link to="/orders" style={{ color: colors.primary, fontSize: 13 }}>
          ← 回看板
        </Link>
      </div>
    );
  }

  const urgency = orderUrgency(order);
  const left = daysUntil(order.dueDate);
  const finished = isOrderFinished(order);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Link to="/orders" style={{ color: colors.muted, fontSize: 13, textDecoration: 'none' }}>
        ← 回看板
      </Link>

      {/* 抬头 */}
      <div style={{ ...card, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>{order.code}</h1>
          {order.kind === 'repair' && <span style={tag('#8e44ad')}>补单</span>}
          {finished ? (
            <span style={tag(colors.ok)}>已交清</span>
          ) : (
            <span style={tag(urgency === 'normal' ? colors.muted : urgency === 'overdue' ? colors.danger : colors.warning)}>
              {URGENCY_LABEL[urgency]}
            </span>
          )}
          <button
            style={{ ...btn('subtle'), marginLeft: 'auto' }}
            onClick={() => {
              if (confirm(`确定删除单子 ${order.code}？此操作不可恢复。`)) {
                deleteOrder(order.id);
                navigate('/orders');
              }
            }}
          >
            删除
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 15, lineHeight: 1.9 }}>
          <b>{order.customerName}</b>
          {order.customerPhone && <span style={{ color: colors.muted, marginLeft: 8 }}>{order.customerPhone}</span>}
          <br />
          {order.style} · {order.size} · {order.color} · 共 {order.quantity} 件
          {order.note && (
            <>
              <br />
              <span style={{ color: colors.muted, fontSize: 13 }}>备注：{order.note}</span>
            </>
          )}
          {source && (
            <>
              <br />
              <span style={{ fontSize: 13, color: '#8e44ad' }}>
                补单来源：原单 {source.code} 第 {order.sourcePieceSeq} 件（原件保持已交货）
              </span>
            </>
          )}
        </div>

        {/* 交货日期 + 预警条 */}
        <div
          style={{
            marginTop: 14,
            borderRadius: 8,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            background:
              urgency === 'overdue' ? '#fdf0ef' : urgency === 'urgent' ? '#fef5ec' : '#f7f6f3',
            border: `1px solid ${urgency === 'overdue' ? colors.danger : urgency === 'urgent' ? colors.warning : colors.border}`,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: colors.muted }}>交货日期</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{order.dueDate}</div>
          </div>
          {!finished && (
            <div
              style={{
                fontWeight: 600,
                color: urgency === 'overdue' ? colors.danger : urgency === 'urgent' ? colors.warning : colors.muted,
              }}
            >
              {left < 0
                ? `已过期 ${-left} 天，还没做好，优先处理`
                : left === 0
                  ? '今天就到期'
                  : left <= URGENT_WINDOW_DAYS
                    ? `只剩 ${left} 天`
                    : `还有 ${left} 天`}
            </div>
          )}
          <button style={{ ...btn('ghost'), marginLeft: 'auto' }} onClick={() => { setNewDate(order.dueDate); setChangeReason(''); setShowReschedule(true); }}>
            改交货日期
          </button>
        </div>

        {/* 日期变更留痕：早先那个日期留一条 */}
        {order.dueDateHistory.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>交货日期变更记录（早先日期保留）</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {order.dueDateHistory.map((h, i) => (
                <div key={i} style={{ fontSize: 13, background: '#faf8f5', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '6px 10px' }}>
                  <s style={{ color: colors.muted }}>{h.from}</s> → <b>{h.to}</b>
                  <span style={{ color: colors.muted, marginLeft: 8 }}>{h.changedAt} 改</span>
                  {h.reason && <span style={{ marginLeft: 8 }}>原因：{h.reason}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 每件分开跟 */}
      <h2 style={{ fontSize: 16, margin: '20px 0 10px' }}>
        分件进度
        <span style={{ fontSize: 13, color: colors.muted, fontWeight: 400, marginLeft: 8 }}>
          接单 → 备线 → 织 → 缝合 → 打包
        </span>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
        {order.pieces.map((p) => (
          <PieceCard key={p.id} order={order} piece={p} />
        ))}
      </div>

      {/* 动态 */}
      <h2 style={{ fontSize: 16, margin: '20px 0 10px' }}>跟单动态</h2>
      <div style={{ ...card, padding: 12, maxHeight: 260, overflowY: 'auto' }}>
        {events.length === 0 && <div style={{ color: colors.muted, fontSize: 13 }}>还没有动态</div>}
        {events.map((e) => (
          <div key={e.id} style={{ fontSize: 13, padding: '6px 0', borderBottom: `1px dashed ${colors.border}`, display: 'flex', gap: 10 }}>
            <span style={{ color: colors.muted, whiteSpace: 'nowrap' }}>{new Date(e.at).toLocaleString('zh-CN', { hour12: false })}</span>
            <span>{e.message}</span>
          </div>
        ))}
      </div>

      {showReschedule && (
        <Modal title="改交货日期" onClose={() => setShowReschedule(false)}>
          <div style={{ fontSize: 13, color: colors.muted, marginBottom: 10 }}>
            当前 <b style={{ color: colors.text }}>{order.dueDate}</b>，改后早先日期会在单子上留一条记录。
          </div>
          <label style={label}>新交货日期</label>
          <input type="date" style={input} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <label style={{ ...label, marginTop: 10 }}>为什么改（选填，建议写）</label>
          <input style={input} value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder="如：客户出差 / 配线要等" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button style={btn('subtle')} onClick={() => setShowReschedule(false)}>
              取消
            </button>
            <button
              style={btn('primary')}
              disabled={!newDate || newDate === order.dueDate}
              onClick={() => {
                reschedule(order.id, newDate, changeReason.trim() || undefined);
                setShowReschedule(false);
              }}
            >
              确认改期
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
