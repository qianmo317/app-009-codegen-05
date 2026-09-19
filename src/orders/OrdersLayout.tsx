import { NavLink, Outlet } from 'react-router-dom';
import { colors } from './ui';

const navItem = (active: boolean): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 6,
  fontSize: 14,
  textDecoration: 'none',
  color: active ? '#fff' : colors.text,
  background: active ? colors.primary : 'transparent',
  fontWeight: active ? 600 : 400,
});

export default function OrdersLayout() {
  return (
    <div style={{ minHeight: '100%', background: colors.bg }}>
      <header
        style={{
          background: '#fff',
          borderBottom: `1px solid ${colors.border}`,
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16, color: colors.primaryDark, marginRight: 8 }}>
          🧶 定做跟单
        </span>
        <NavLink to="/orders" end style={({ isActive }) => navItem(isActive)}>
          单子看板
        </NavLink>
        <NavLink to="/orders/new" style={({ isActive }) => navItem(isActive)}>
          接单登记
        </NavLink>
        <NavLink to="/orders/workers" style={({ isActive }) => navItem(isActive)}>
          人手
        </NavLink>
        <NavLink to="/" style={{ marginLeft: 'auto', fontSize: 13, color: colors.muted, textDecoration: 'none' }}>
          ← 返回图解工具
        </NavLink>
      </header>
      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}
