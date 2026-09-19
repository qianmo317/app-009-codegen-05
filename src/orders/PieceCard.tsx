import { useState } from 'react';
import { useOrderStore } from './store';
import type { Order, Piece } from './types';
import { STAGES } from './types';
import {
  STATUS_LABEL,
  daysUntil,
  nextStage,
  pieceProgress,
  workerName,
} from './helpers';
import { btn, colors, input, label, tag } from './ui';

const statusColor: Record<Piece['status'], string> = {
  pending: colors.muted,
  doing: colors.info,
  blocked: colors.danger,
  done: colors.warning,
  delivered: colors.ok,
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 10, padding: 20, width: 420, maxWidth: '92vw' }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

export default function PieceCard({ order, piece }: { order: Order; piece: Piece }) {
  const workers = useOrderStore((s) => s.workers);
  const startPiece = useOrderStore((s) => s.startPiece);
  const advancePiece = useOrderStore((s) => s.advancePiece);
  const blockPiece = useOrderStore((s) => s.blockPiece);
  const handoffPiece = useOrderStore((s) => s.handoffPiece);
  const resumePiece = useOrderStore((s) => s.resumePiece);
  const deliverPiece = useOrderStore((s) => s.deliverPiece);
  const createRepairOrder = useOrderStore((s) => s.createRepairOrder);

  const [showBlock, setShowBlock] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  const [showRepair, setShowRepair] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [toWorker, setToWorker] = useState('');
  const [handoffNote, setHandoffNote] = useState('');
  const [repairNote, setRepairNote] = useState('');

  const activeWorkers = workers.filter((w) => w.active);
  const isDelivered = piece.status === 'delivered';
  const isDone = piece.status === 'done';
  const progress = Math.round(pieceProgress(piece) * 100);
  const curIdx = STAGES.indexOf(piece.stage);
  const ns = nextStage(piece.stage);

  return (
    <div
      style={{
        border: `1px solid ${piece.status === 'blocked' ? colors.danger : colors.border}`,
        borderLeft: `4px solid ${isDelivered ? colors.ok : piece.status === 'blocked' ? colors.danger : colors.primary}`,
        borderRadius: 8,
        padding: 14,
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontWeight: 700 }}>第 {piece.seq} 件</span>
        <span style={tag(statusColor[piece.status])}>{STATUS_LABEL[piece.status]}</span>
        {piece.status === 'blocked' && piece.blockedSince && (
          <span style={{ fontSize: 12, color: colors.danger }}>
            自 {piece.blockedSince} 起停 · 已停 {-daysUntil(piece.blockedSince)} 天
          </span>
        )}
      </div>

      {/* 工序步骤条 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 4 }}>
        {STAGES.map((st, i) => {
          const complete = i < curIdx || isDelivered || isDone;
          const current = i === curIdx && !isDelivered && !isDone;
          return (
            <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  fontSize: 12,
                  padding: '3px 9px',
                  borderRadius: 999,
                  color: complete ? '#fff' : current ? colors.primaryDark : colors.muted,
                  background: complete ? colors.ok : current ? '#efe7dd' : '#f2f0ec',
                  border: current ? `1px solid ${colors.primary}` : '1px solid transparent',
                  fontWeight: current ? 700 : 400,
                }}
              >
                {st}
                {complete ? ' ✓' : ''}
              </span>
              {i < STAGES.length - 1 && <span style={{ color: colors.border }}>→</span>}
            </div>
          );
        })}
      </div>

      <div style={{ height: 4, background: '#eee', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: colors.primary }} />
      </div>

      <div style={{ fontSize: 13, marginBottom: 10 }}>
        在做的人：
        <select
          value={piece.assigneeId ?? ''}
          disabled={isDelivered}
          onChange={(e) => useOrderStore.getState().assignPiece(order.id, piece.id, e.target.value || null)}
          style={{ fontSize: 13, padding: '3px 6px', borderRadius: 4, border: `1px solid ${colors.border}`, marginLeft: 4 }}
        >
          <option value="">未指派</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id} disabled={!w.active}>
              {w.name}
              {!w.active ? '（离岗）' : ''}
            </option>
          ))}
        </select>
      </div>

      {piece.status === 'blocked' && (
        <div
          style={{
            background: '#fdf0ef',
            border: `1px solid ${colors.danger}`,
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: 13,
            color: colors.danger,
            marginBottom: 10,
          }}
        >
          <b>停住原因：</b>
          {piece.blockReason}
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {piece.status === 'pending' && (
          <button style={btn('primary')} onClick={() => startPiece(order.id, piece.id)}>
            开工
          </button>
        )}
        {(piece.status === 'doing' || piece.status === 'blocked') && ns && (
          <button style={btn('primary')} onClick={() => advancePiece(order.id, piece.id)}>
            完成「{piece.stage}」→ 进「{ns}」
          </button>
        )}
        {piece.status === 'doing' && !ns && (
          <button style={btn('primary')} onClick={() => advancePiece(order.id, piece.id)}>
            完成打包
          </button>
        )}
        {piece.status === 'blocked' && (
          <button style={btn('subtle')} onClick={() => resumePiece(order.id, piece.id)}>
            恢复制作
          </button>
        )}
        {(piece.status === 'doing' || piece.status === 'pending') && (
          <button style={btn('danger')} onClick={() => setShowBlock(true)}>
            做不下去了
          </button>
        )}
        {!isDelivered && (
          <button style={btn('ghost')} onClick={() => setShowHandoff(true)} disabled={!piece.assigneeId && piece.status === 'delivered'}>
            换人接手
          </button>
        )}
        {isDone && (
          <button style={btn('primary')} onClick={() => deliverPiece(order.id, piece.id)}>
            确认交货
          </button>
        )}
        {isDelivered && (
          <button style={btn('danger')} onClick={() => setShowRepair(true)}>
            交后要改动 · 开补单
          </button>
        )}
      </div>

      {/* 卡住原因弹窗（必填） */}
      {showBlock && (
        <Modal title={`第 ${piece.seq} 件为什么做不下去？`} onClose={() => setShowBlock(false)}>
          <label style={label}>停在哪一道：{piece.stage}（原因必须写明）</label>
          <textarea
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            rows={3}
            style={{ ...input, resize: 'vertical' }}
            placeholder="例如：配线缺货 / 尺寸要再跟客户确认 / 机器坏了"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button style={btn('subtle')} onClick={() => setShowBlock(false)}>
              取消
            </button>
            <button
              style={btn('danger')}
              disabled={!blockReason.trim()}
              onClick={() => {
                blockPiece(order.id, piece.id, blockReason);
                setBlockReason('');
                setShowBlock(false);
              }}
            >
              标记停住
            </button>
          </div>
        </Modal>
      )}

      {/* 换人接手弹窗 */}
      {showHandoff && (
        <Modal title={`第 ${piece.seq} 件换人接手`} onClose={() => setShowHandoff(false)}>
          <div style={{ fontSize: 13, color: colors.muted, marginBottom: 10 }}>
            当前：{workerName(workers, piece.assigneeId)} · 工序仍停在「{piece.stage}」
          </div>
          <label style={label}>交给谁</label>
          <select style={input} value={toWorker} onChange={(e) => setToWorker(e.target.value)}>
            <option value="">请选择…</option>
            {activeWorkers.filter((w) => w.id !== piece.assigneeId).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <label style={{ ...label, marginTop: 10 }}>交接说明（进度 / 注意点）</label>
          <textarea
            value={handoffNote}
            onChange={(e) => setHandoffNote(e.target.value)}
            rows={2}
            style={{ ...input, resize: 'vertical' }}
            placeholder="例如：前片已织完，注意领口花纹别错"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button style={btn('subtle')} onClick={() => setShowHandoff(false)}>
              取消
            </button>
            <button
              style={btn('primary')}
              disabled={!toWorker}
              onClick={() => {
                handoffPiece(order.id, piece.id, toWorker, handoffNote);
                setToWorker('');
                setHandoffNote('');
                setShowHandoff(false);
              }}
            >
              确认交接
            </button>
          </div>
        </Modal>
      )}

      {/* 已交件改动 → 补单弹窗 */}
      {showRepair && (
        <Modal title={`第 ${piece.seq} 件交后改动 · 另开补单`} onClose={() => setShowRepair(false)}>
          <div style={{ fontSize: 13, color: colors.muted, marginBottom: 10 }}>
            原单这一件保持「已交货」不动，补单单独走一遍工序。
          </div>
          <label style={label}>改动内容</label>
          <textarea
            value={repairNote}
            onChange={(e) => setRepairNote(e.target.value)}
            rows={3}
            style={{ ...input, resize: 'vertical' }}
            placeholder="例如：袖口太松，重织收口 / 长度再加 3cm"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button style={btn('subtle')} onClick={() => setShowRepair(false)}>
              取消
            </button>
            <button
              style={btn('primary')}
              disabled={!repairNote.trim()}
              onClick={() => {
                createRepairOrder(order.id, piece.id, repairNote);
                setRepairNote('');
                setShowRepair(false);
              }}
            >
              开补单
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
