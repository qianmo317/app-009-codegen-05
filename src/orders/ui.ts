import type { CSSProperties } from 'react';

export const colors = {
  bg: '#f5f3ef',
  card: '#ffffff',
  border: '#e0dcd5',
  text: '#333',
  muted: '#888',
  primary: '#8e6e4f',
  primaryDark: '#73563d',
  danger: '#e74c3c',
  warning: '#e67e22',
  ok: '#27ae60',
  info: '#3498db',
};

export const card: CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: 16,
};

export const btn = (variant: 'primary' | 'ghost' | 'danger' | 'subtle' = 'ghost'): CSSProperties => {
  const base: CSSProperties = {
    padding: '6px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
  };
  switch (variant) {
    case 'primary':
      return { ...base, background: colors.primary, color: '#fff', borderColor: colors.primary };
    case 'danger':
      return { ...base, background: '#fff', color: colors.danger, borderColor: colors.danger };
    case 'subtle':
      return { ...base, background: '#f0ece5', color: colors.text, borderColor: colors.border };
    default:
      return { ...base, background: '#fff', color: colors.primary, borderColor: colors.primary };
  }
};

export const input: CSSProperties = {
  padding: '7px 10px',
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
  width: '100%',
  background: '#fff',
};

export const label: CSSProperties = {
  fontSize: 12,
  color: colors.muted,
  marginBottom: 4,
  display: 'block',
};

export const tag = (color: string, bg = '#fff'): CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 12,
  color,
  border: `1px solid ${color}`,
  background: bg,
  lineHeight: 1.6,
});
