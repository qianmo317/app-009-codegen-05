import { useMemo, useState } from 'react';
import { useOrderStore } from './store';
import { STATUS_LABEL } from './helpers';
import { btn, card, colors, input, label, tag } from './ui';

export default function WorkersPage() {
  const workers = useOrderStore((s) => s.workers);
  const orders = useOrderStore((s) => s.orders);
  const addWorker = useOrderStore((s) => s.addWorker);
  const toggleWorkerActive = useOrderStore((s) => s.toggleWorkerActive);
  const [name, setName] = useState('');

  // 每个人手上还没交的件
  const workload = useMemo(() => {
    const map = new Map<string, { label: string; orderCode: string }[]>();
    for (const o of orders) {
      for (const p of o.pieces) {
        if (p.status === 'delivered' || !p.assigneeId) continue;
        const list = map.get(p.assigneeId) ?? [];
        list.push({ label: `${o.code} 第${p.seq}件 · ${p.stage} · ${STATUS_LABEL[p.status]}`, orderCode: o.code });
        map.set(p.assigneeId, list);
      }
    }
    return map;
  }, [orders]);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>人手安排</h1>

      <div style={{ ...card, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={label}>加一个做工的人</label>
          <input
            style={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                addWorker(name);
                setName('');
              }
            }}
            placeholder="姓名 / 称呼，如 李姐"
          />
        </div>
        <button
          style={btn('primary')}
          onClick={() => {
            if (name.trim()) {
              addWorker(name);
              setName('');
            }
          }}
        >
          添加
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {workers.map((w) => {
          const items = workload.get(w.id) ?? [];
          return (
            <div key={w.id} style={{ ...card, opacity: w.active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{w.name}</span>
                {w.active ? <span style={tag(colors.ok)}>在岗</span> : <span style={tag(colors.muted)}>已离岗</span>}
                <span style={{ marginLeft: 'auto', fontSize: 13, color: colors.muted }}>
                  手上 {items.length} 件未交
                </span>
                <button style={btn('subtle')} onClick={() => toggleWorkerActive(w.id)}>
                  {w.active ? '设为离岗' : '恢复在岗'}
                </button>
              </div>
              {items.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {items.map((it, i) => (
                    <div key={i} style={{ fontSize: 13, color: colors.text }}>
                      · {it.label}
                      {it.label.includes('卡住') && <span style={{ color: colors.danger, marginLeft: 6 }}>（等换人 / 解决）</span>}
                    </div>
                  ))}
                </div>
              )}
              {!w.active && items.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: colors.danger }}>
                  离岗但手上还有没交的件，请在单子里给这些件换人接手。
                </div>
              )}
            </div>
          );
        })}
        {workers.length === 0 && <div style={{ ...card, color: colors.muted, textAlign: 'center' }}>还没有登记人手</div>}
      </div>
    </div>
  );
}
