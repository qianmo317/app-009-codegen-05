import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from './store';
import { addDays, today } from './helpers';
import { btn, card, colors, input, label } from './ui';

export default function NewOrderPage() {
  const createOrder = useOrderStore((s) => s.createOrder);
  const workers = useOrderStore((s) => s.workers);
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [style, setStyle] = useState('毛衣');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dueDate, setDueDate] = useState(addDays(today(), 10));
  const [assigneeId, setAssigneeId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!customerName.trim()) return setError('请填写客户称呼');
    if (!style.trim()) return setError('请填写款式');
    if (!size.trim()) return setError('请填写尺码');
    if (!color.trim()) return setError('请填写颜色');
    if (quantity < 1) return setError('件数至少 1 件');
    if (!dueDate) return setError('请约好交货日期');
    const id = createOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      style: style.trim(),
      size: size.trim(),
      color: color.trim(),
      quantity,
      dueDate,
      assigneeId: assigneeId || null,
      note: note.trim() || undefined,
    });
    navigate(`/orders/${id}`);
  };

  const field = (
    lbl: string,
    node: React.ReactNode,
    hint?: string
  ) => (
    <div>
      <label style={label}>
        {lbl}
        {hint && <span style={{ color: colors.border }}> · {hint}</span>}
      </label>
      {node}
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>接单登记</h1>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {field('客户称呼 *', <input style={input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="如：陈芳" />)}
          {field('联系电话', <input style={input} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="选填" />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
          {field(
            '款式 *',
            (
              <input style={input} value={style} onChange={(e) => setStyle(e.target.value)} list="style-list" />
            ),
            '毛衣 / 围巾…'
          )}
          <datalist id="style-list">
            <option value="毛衣" />
            <option value="高领毛衣" />
            <option value="开衫毛衣" />
            <option value="围巾" />
            <option value="披肩" />
            <option value="马甲" />
          </datalist>
          {field('尺码 *', <input style={input} value={size} onChange={(e) => setSize(e.target.value)} placeholder="如 M / 均码" />)}
          {field('颜色 *', <input style={input} value={color} onChange={(e) => setColor(e.target.value)} placeholder="如 酒红" />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {field('件数 *', (
            <input
              type="number"
              min={1}
              style={input}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          ), '同一张单做几件，每件单独跟')}
          {field('说好的交货日期 *', (
            <input type="date" style={input} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          ))}
        </div>
        {field(
          '接单时先安排给谁',
          (
            <select style={input} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">暂不指派</option>
              {workers.filter((w) => w.active).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          ),
          '之后每件都可以单独换人'
        )}
        {field('备注', <textarea rows={2} style={{ ...input, resize: 'vertical' }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="客户特别交代，如袖口收紧" />)}

        {error && <div style={{ color: colors.danger, fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={btn('primary')} onClick={submit}>
            开单并开始跟单
          </button>
          <button style={btn('subtle')} onClick={() => navigate('/orders')}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
