import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from './store';
import type { Order, Urgency } from './types';
import {
  URGENT_WINDOW_DAYS,
  URGENCY_LABEL,
  daysUntil,
  isOrderFinished,
  orderUrgency,
} from './helpers';
import { btn, card, colors, tag } from './ui';

type Filter = 'all' | 'attention' | 'active' | 'closed' | 'repair';

function summary(order: Order): string {
  const total = order.pieces.length;
  const delivered = order.pieces.filter((p) => p.status === 'delivered').length;
  const blocked = order.pieces.filter((p) => p.status === 'blocked').length;
  const doing = order.pieces.filter((p) => p.status === 'doing').length;
  return `交 ${delivered}/${total} · 制作 ${doing} · 卡住 ${blocked}`;
}

export default function BoardPage() {
  const orders = useOrderStore((s) => s.orders);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const keyword = q.trim();
    return orders
      .map((o) => ({ order: o, urgency: orderUrgency(o) }))
      .filter(({ order, urgency }) => {
        if (keyword) {
          const hay = `${order.code} ${order.customerName} ${order.style} ${order.color} ${order.size}`.toLowerCase();
          if (!hay.includes(keyword.toLowerCase())) return false;
        }
        switch (filter) {
          case 'attention':
            return urgency !== 'normal' || order.pieces.some((p) => p.status === 'blocked');
          case 'active':
            return !isOrderFinished(order);
          case 'closed':
            return isOrderFinished(order);
          case 'repair':
            return order.kind === 'repair';
          default:
            return true;
        }
      })
      .sort((a, b) => {
        // 有风险的排前面，其次按交货日期
        const rank = (u: Urgency) => (u === 'overdue' ? 0 : u === 'urgent' ? 1 : 2);
        if (rank(a.urgency) !== rank(b.urgency)) return rank(a.urgency) - rank(b.urgency);
        return a.order.dueDate.localeCompare(b.order.dueDate);
      });
  }, [orders, filter, q]);

  const counts = useMemo(() => {
    return {
      overdue: orders.filter((o) => orderUrgency(o) === 'overdue').length,
      urgent: orders.filter((o) => orderUrgency(o) === 'urgent').length,
      blocked: orders.filter((o) => o.pieces.some((p) => p.status === 'blocked')).length,
      active: orders.filter((o) => !isOrderFinished(o)).length,
    };
  }, [orders]);

  const filterTab = (key: Filter, text: string) => (
    <button
      onClick={() => setFilter(key)}
      style={{
        ...btn(filter === key ? 'primary' : 'subtle'),
        fontWeight: filter === key ? 600 : 400,
      }}
    >
      {text}
    </button>
  );

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>单子看板</h1>
        <button style={btn('primary')} onClick={() => navigate('/orders/new')}>
          ＋ 接一张新单
        </button>
      </div>

      {/* 风险概览 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ ...card, flex: '1 1 160px', padding: 14, borderLeft: `4px solid ${colors.danger}` }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.danger }}>{counts.overdue}</div>
          <div style={{ fontSize: 13, color: colors.muted }}>已过交货期没好</div>
        </div>
        <div style={{ ...card, flex: '1 1 160px', padding: 14, borderLeft: `4px solid ${colors.warning}` }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.warning }}>{counts.urgent}</div>
          <div style={{ fontSize: 13, color: colors.muted }}>{URGENT_WINDOW_DAYS} 天内到期</div>
        </div>
        <div style={{ ...card, flex: '1 1 160px', padding: 14, borderLeft: `4px solid #8e44ad` }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#8e44ad' }}>{counts.blocked}</div>
          <div style={{ fontSize: 13, color: colors.muted }}>有件卡住等人接手</div>
        </div>
        <div style={{ ...card, flex: '1 1 160px', padding: 14, borderLeft: `4px solid ${colors.ok}` }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.ok }}>{counts.active}</div>
          <div style={{ fontSize: 13, color: colors.muted }}>在跟的活</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {filterTab('all', '全部')}
        {filterTab('attention', '要盯的')}
        {filterTab('active', '制作中')}
        {filterTab('closed', '已交清')}
        {filterTab('repair', '补单')}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜单号 / 客户 / 款式 / 颜色"
          style={{ marginLeft: 'auto', maxWidth: 260, padding: '7px 10px', borderRadius: 6, border: `1px solid ${colors.border}` }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(({ order, urgency }) => {
          const left = daysUntil(order.dueDate);
          const finished = isOrderFinished(order);
          return (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              style={{
                ...card,
                padding: 16,
                cursor: 'pointer',
                borderLeft: `4px solid ${urgency === 'overdue' ? colors.danger : urgency === 'urgent' ? colors.warning : colors.border}`,
                opacity: finished ? 0.75 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{order.code}</span>
                {order.kind === 'repair' && <span style={tag('#8e44ad')}>补单</span>}
                {finished ? (
                  <span style={tag(colors.ok)}>已交清</span>
                ) : (
                  <span style={tag(urgency === 'normal' ? colors.muted : urgency === 'overdue' ? colors.danger : colors.warning)}>
                    {URGENCY_LABEL[urgency]}
                  </span>
                )}
                {order.pieces.some((p) => p.status === 'blocked') && <span style={tag(colors.danger)}>有件停住</span>}
                <span style={{ marginLeft: 'auto', fontSize: 13, color: colors.muted }}>
                  交货 {order.dueDate}
                  {!finished && (
                    <b style={{ color: left < 0 ? colors.danger : left <= URGENT_WINDOW_DAYS ? colors.warning : colors.muted, marginLeft: 6 }}>
                      {left < 0 ? `已超 ${-left} 天` : left === 0 ? '今天到期' : `还剩 ${left} 天`}
                    </b>
                  )}
                </span>
              </div>
              <div style={{ marginTop: 10, fontSize: 14 }}>
                <b>{order.customerName}</b> · {order.style} · {order.size} · {order.color} · ×{order.quantity}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: colors.muted }}>{summary(order)}</div>
              {order.dueDateHistory.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: colors.warning }}>
                  交货日期改过 {order.dueDateHistory.length} 次（原 {order.dueDateHistory[0].from}）
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <div style={{ ...card, textAlign: 'center', color: colors.muted, padding: 40 }}>没有符合条件的单子</div>
        )}
      </div>
    </div>
  );
}
