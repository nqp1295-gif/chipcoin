'use client';

import React, { useState } from 'react';

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

const INITIAL_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: 'TX-20261026-9041',
    timestamp: '2026-10-26 21:40:12',
    type: 'Cấp thưởng hoạt động nội bộ',
    debitAccount: 'SYSTEM_TREASURY_001',
    creditAccount: 'CHIP-ACC-7918-9921-LEDGER',
    amount: 15000,
    balanceAfter: 1250000,
    hash: '0x8f2a...c391',
    status: 'SETTLED',
  },
  {
    id: 'TX-20261026-8812',
    timestamp: '2026-10-26 18:15:30',
    type: 'Xác minh email thành công',
    debitAccount: 'SYSTEM_WELCOME_POOL',
    creditAccount: 'CHIP-ACC-7918-9921-LEDGER',
    amount: 5000,
    balanceAfter: 1235000,
    hash: '0x3e1d...7a4f',
    status: 'SETTLED',
  },
  {
    id: 'TX-20261025-7650',
    timestamp: '2026-10-25 14:02:44',
    type: 'Nhiệm vụ kiểm soát outbox',
    debitAccount: 'SYSTEM_OPS_REWARD',
    creditAccount: 'CHIP-ACC-7918-9921-LEDGER',
    amount: 25000,
    balanceAfter: 1230000,
    hash: '0x99cb...b210',
    status: 'SETTLED',
  },
  {
    id: 'TX-20261024-6519',
    timestamp: '2026-10-24 09:22:18',
    type: 'Khởi tạo tài khoản hệ thống',
    debitAccount: 'SYSTEM_GENESIS_LEDGER',
    creditAccount: 'CHIP-ACC-7918-9921-LEDGER',
    amount: 1205000,
    balanceAfter: 1205000,
    hash: '0x12a8...e901',
    status: 'SETTLED',
  },
];

export default function WalletPage() {
  const [balance, setBalance] = useState(1250000);
  const [escrow, setEscrow] = useState(70000);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>(INITIAL_TRANSACTIONS);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const walletAddress = 'CHIP-ACC-7918-9921-LEDGER';

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleGrantBonus = () => {
    setSimulating(true);
    setFeedback(null);

    setTimeout(() => {
      const grantAmount = 5000;
      const newBal = balance + grantAmount;
      const newTx: LedgerTransaction = {
        id: `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
          1000 + Math.random() * 9000
        )}`,
        timestamp: new Date().toLocaleString('sv-SE').replace('T', ' '),
        type: 'Thưởng trải nghiệm giao dịch mới',
        debitAccount: 'SYSTEM_TEST_TREASURY',
        creditAccount: walletAddress,
        amount: grantAmount,
        balanceAfter: newBal,
        hash: `0x${Math.random().toString(16).substring(2, 6)}...${Math.random()
          .toString(16)
          .substring(2, 6)}`,
        status: 'SETTLED',
      };

      setBalance(newBal);
      setTransactions([newTx, ...transactions]);
      setSimulating(false);
      setFeedback(`Đã thực hiện giao dịch sổ kép: +${grantAmount.toLocaleString()} CHIP`);
    }, 500);
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
            🪙 QUẢN LÝ TÀI SẢN & SỔ CÁI
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Ví Điểm Thưởng CHIP</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Hệ thống hạch toán kép (Double-entry Ledger) bảo đảm bất biến số dư điểm thưởng
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleGrantBonus}
            disabled={simulating}
            className="nav-btn"
            style={{ cursor: 'pointer', border: 'none', gap: '8px' }}
          >
            {simulating ? 'Đang hạch toán...' : '✨ + Nhận Thưởng 5,000 CHIP'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="alert-box alert-success" style={{ marginBottom: 0 }}>
          <span>✅</span>
          <div>{feedback}</div>
        </div>
      )}

      {/* Luxury Metallic Wallet Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Main VIP Balance Card */}
        <div
          className="glass-card"
          style={{
            background:
              'linear-gradient(135deg, rgba(28, 23, 14, 0.95) 0%, rgba(18, 20, 24, 0.95) 50%, rgba(26, 21, 10, 0.95) 100%)',
            border: '1.5px solid var(--accent-bronze)',
            boxShadow: '0 16px 48px rgba(212, 175, 55, 0.2)',
            position: 'relative',
            overflow: 'hidden',
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
              TỔNG SỐ DƯ TÀI KHOẢN
            </span>
            <span className="badge badge-draft">HẠCH TOÁN KÉP ACID</span>
          </div>

          <div
            style={{
              fontSize: '2.8rem',
              fontWeight: 800,
              color: '#ffffff',
              margin: '14px 0 6px 0',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'baseline',
              gap: '10px',
            }}
          >
            <span>{balance.toLocaleString()}</span>
            <span
              style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                background: 'var(--gradient-bronze)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CHIP
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '24px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-bronze)',
              marginTop: '14px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Khả dụng</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399' }}>
                {(balance - escrow).toLocaleString()} CHIP
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tạm giữ (Escrow)</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fbbf24' }}>
                {escrow.toLocaleString()} CHIP
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quy chuẩn</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-bronze-light)' }}>
                Điểm nội bộ
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Address & Status Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
              MÃ ĐỊNH DANH VÍ SỔ CÁI
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0,0,0,0.45)',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-medium)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.88rem',
                color: 'var(--accent-bronze-light)',
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {walletAddress}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid var(--border-bronze)',
                  color: '#f5d77f',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {copied ? '✓ Đã chép' : 'Sao chép'}
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(212, 175, 55, 0.06)',
              border: '1px solid var(--border-bronze)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginTop: '1rem',
            }}
          >
            <div style={{ fontWeight: 600, color: '#f5d77f', fontSize: '0.88rem', marginBottom: '4px' }}>
              🛡️ Cam kết sổ cái bất biến (Double-Entry)
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              Mọi giao dịch cấp hoặc trừ điểm CHIP đều có tài khoản đối ứng (Debit/Credit).
              Tổng dư nợ toàn hệ thống luôn tuyệt đối bằng 0.
            </div>
          </div>
        </div>
      </div>

      {/* Ledger History Table */}
      <div className="glass-card" style={{ padding: '1.4rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.2rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Lịch Sử Nhật Ký Sổ Cái Kép</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Danh sách các bút toán đã được ghi nhận vào PostgreSQL Ledger
            </span>
          </div>

          <span className="badge badge-active">PostgreSQL Strict Ledger</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>MÃ BÚT TOÁN (TXID)</th>
                <th>THỜI GIAN</th>
                <th>NGHIỆP VỤ</th>
                <th>TÀI KHOẢN ĐỐI ỨNG (NỢ &rarr; CÓ)</th>
                <th>SỐ LƯỢNG</th>
                <th>SỐ DƯ SAU</th>
                <th>HASH</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#ffffff' }}>
                    {tx.id}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{tx.timestamp}</td>
                  <td style={{ color: 'var(--text-main)', fontWeight: 500 }}>{tx.type}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{tx.debitAccount}</span>
                    <span style={{ color: 'var(--accent-bronze)', margin: '0 4px' }}>&rarr;</span>
                    <span style={{ color: 'var(--accent-bronze-light)' }}>
                      {tx.creditAccount.slice(0, 12)}...
                    </span>
                  </td>
                  <td style={{ color: '#34d399', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                    +{tx.amount.toLocaleString()} CHIP
                  </td>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>
                    {tx.balanceAfter.toLocaleString()}
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {tx.hash}
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
                      ĐÃ GHI SỔ
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
