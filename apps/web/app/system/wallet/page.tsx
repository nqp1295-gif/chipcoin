'use client';

import React, { useState } from 'react';

// ============================================================================
// ENVIRONMENT GATE: System mock data only loaded in local dev mode
// In production, treasury balance starts at 0 and transactions start empty.
// ============================================================================
const IS_LOCAL_DEV =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_USE_SEED_DATA === 'true';

interface LedgerTransaction {
  id: string;
  timestamp: string;
  type: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  balanceAfter: number;
  hash: string;
  status: 'SETTLED' | 'PENDING';
}

const _RAW_SYSTEM_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: 'TX-SYS-20261026-9041',
    timestamp: '2026-10-26 21:40:12',
    type: 'Cấp thưởng hoạt động thành viên',
    debitAccount: 'SYSTEM_TREASURY_001',
    creditAccount: 'CHIP-MEMBER-POOL-ALPHA',
    amount: 15000,
    balanceAfter: 499985000,
    hash: '0x8f2a...c391',
    status: 'SETTLED',
  },
  {
    id: 'TX-SYS-20261026-8812',
    timestamp: '2026-10-26 18:15:30',
    type: 'Bơm quỹ kích hoạt Email Welcome Pool',
    debitAccount: 'SYSTEM_GENESIS_LEDGER',
    creditAccount: 'SYSTEM_WELCOME_POOL',
    amount: 500000,
    balanceAfter: 500000000,
    hash: '0x3e1d...7a4f',
    status: 'SETTLED',
  },
  {
    id: 'TX-SYS-20261025-7650',
    timestamp: '2026-10-25 14:02:44',
    type: 'Phân bổ ngân sách Outbox Worker Ops',
    debitAccount: 'SYSTEM_TREASURY_001',
    creditAccount: 'SYSTEM_OPS_REWARD',
    amount: 250000,
    balanceAfter: 500500000,
    hash: '0x99cb...b210',
    status: 'SETTLED',
  },
  {
    id: 'TX-SYS-20261024-6519',
    timestamp: '2026-10-24 09:22:18',
    type: 'Khởi tạo khối Genesis Treasury Master',
    debitAccount: 'SYSTEM_GENESIS_ROOT',
    creditAccount: 'SYSTEM_TREASURY_001',
    amount: 500000000,
    balanceAfter: 500000000,
    hash: '0x12a8...e901',
    status: 'SETTLED',
  },
];

const SYSTEM_TRANSACTIONS: LedgerTransaction[] = IS_LOCAL_DEV ? _RAW_SYSTEM_TRANSACTIONS : [];

export default function SystemWalletPage() {
  const [treasuryBalance, setTreasuryBalance] = useState(IS_LOCAL_DEV ? 499985000 : 0);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>(SYSTEM_TRANSACTIONS);
  const [simulating, setSimulating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAllocateTreasury = () => {
    setSimulating(true);
    setFeedback(null);

    setTimeout(() => {
      const allocateAmount = 100000;
      const newBal = treasuryBalance - allocateAmount;
      const newTx: LedgerTransaction = {
        id: `TX-SYS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
          1000 + Math.random() * 9000
        )}`,
        timestamp: new Date().toLocaleString('sv-SE').replace('T', ' '),
        type: 'Điều chuyển ngân sách thưởng thành viên',
        debitAccount: 'SYSTEM_TREASURY_001',
        creditAccount: 'CHIP-MEMBER-COMMUNITY-REWARD',
        amount: allocateAmount,
        balanceAfter: newBal,
        hash: `0x${Math.random().toString(16).substring(2, 6)}...${Math.random()
          .toString(16)
          .substring(2, 6)}`,
        status: 'SETTLED',
      };

      setTreasuryBalance(newBal);
      setTransactions([newTx, ...transactions]);
      setSimulating(false);
      setFeedback(`Đã hạch toán điều chuyển: ${allocateAmount.toLocaleString()} CHIP vào Quỹ Thành Viên.`);
    }, 600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          paddingBottom: '1.2rem',
          borderBottom: '1px solid var(--border-bronze)',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--accent-bronze)',
              fontSize: '0.82rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}
          >
            🪙 QUẢN TRỊ HỆ THỐNG — SỔ CÁI KÉP & KHO QUỸ MASTER
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Sổ Cái Kép & Kho Quỹ Hệ Thống</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Quản trị kho quỹ Treasury, điều chuyển hạn mức điểm thưởng và kiểm soát cân đối Nợ/Có
          </p>
        </div>

        {/* Allocate test button — ONLY shown in local dev mode */}
        {IS_LOCAL_DEV && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleAllocateTreasury}
              disabled={simulating}
              className="nav-btn"
              style={{ cursor: 'pointer', border: 'none', gap: '8px' }}
            >
              {simulating ? 'Đang hạch toán...' : '🧪 Mô phỏng điều chuyển 100,000 CHIP'}
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="alert-box alert-success" style={{ marginBottom: 0 }}>
          <span>✅</span>
          <div>{feedback}</div>
        </div>
      )}

      {/* Treasury Pool Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <div
          className="glass-card"
          style={{
            background:
              'linear-gradient(135deg, rgba(28, 23, 14, 0.95) 0%, rgba(18, 20, 24, 0.95) 50%, rgba(26, 21, 10, 0.95) 100%)',
            border: '1.5px solid var(--accent-bronze)',
            boxShadow: '0 16px 48px rgba(212, 175, 55, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--accent-bronze-light)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              KHO QUỸ TỔNG (SYSTEM TREASURY)
            </span>
            <span className="badge badge-gold">MASTER LEDGER</span>
          </div>

          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                fontFamily: 'Outfit, sans-serif',
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              {treasuryBalance.toLocaleString()}{' '}
              <span style={{ fontSize: '1.2rem', color: 'var(--accent-bronze)' }}>CHIP</span>
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Quy đổi nội bộ: ≈ ${(treasuryBalance / 10000).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>Tài khoản gốc: SYSTEM_TREASURY_001</span>
            <span style={{ color: '#34d399', fontWeight: 600 }}>Cân đối 100% ACID</span>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              PHÂN BỔ QUỸ CON (SUB-POOLS)
            </span>
            <span className="status-dot-pulse" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '1.2rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Quỹ Kích Hoạt (Welcome Pool)</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>
                  {(IS_LOCAL_DEV ? 25000000 : 0).toLocaleString()} CHIP
                </span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>
                <div style={{ width: IS_LOCAL_DEV ? '40%' : '0%', height: '100%', background: '#34d399', borderRadius: '3px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Quỹ Nhiệm Vụ &amp; Streak (Missions Pool)</span>
                <span style={{ color: 'var(--accent-bronze)', fontWeight: 600 }}>
                  {(IS_LOCAL_DEV ? 60000000 : 0).toLocaleString()} CHIP
                </span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>
                <div style={{ width: IS_LOCAL_DEV ? '65%' : '0%', height: '100%', background: 'var(--gradient-bronze)', borderRadius: '3px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Quỹ Dự Phòng Hệ Thống (Reserve Pool)</span>
                <span style={{ color: '#818cf8', fontWeight: 600 }}>
                  {(IS_LOCAL_DEV ? 414985000 : 0).toLocaleString()} CHIP
                </span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>
                <div style={{ width: IS_LOCAL_DEV ? '85%' : '0%', height: '100%', background: '#818cf8', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Journal Ledger Table */}
      <div className="glass-card" style={{ padding: '1.4rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1.2rem' }}>Nhật Ký Hạch Toán Sổ Cái Kép Toàn Hệ Thống</h3>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>MÃ GD (TXID)</th>
                <th>THỜI GIAN</th>
                <th>LOẠI HẠCH TOÁN</th>
                <th>TÀI KHOẢN NỢ (DEBIT)</th>
                <th>TÀI KHOẢN CÓ (CREDIT)</th>
                <th>SỐ TIỀN (CHIP)</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Chưa có giao dịch hạch toán nào trong sổ cái hệ thống.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#ffffff' }}>
                      {tx.id}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{tx.timestamp}</td>
                    <td style={{ fontWeight: 500, color: '#ffffff' }}>{tx.type}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: '#f87171' }}>
                      {tx.debitAccount}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: '#34d399' }}>
                      {tx.creditAccount}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-bronze)' }}>
                      {tx.amount.toLocaleString()} CHIP
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: 'rgba(52, 211, 153, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(52, 211, 153, 0.35)',
                        }}
                      >
                        ✓ SETTLED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
