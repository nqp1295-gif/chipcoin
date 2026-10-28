'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '../lib/i18n';
import { ChipStore, StoredUser, TIER_CONFIGS, chipToUsdt } from '../lib/store';
import WalletNavTabs from './components/WalletNavTabs';

// ============================================================================
// ENVIRONMENT GATE: Hardcoded transaction data only shown in local dev mode
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

const _RAW_INITIAL_TRANSACTIONS: LedgerTransaction[] = [
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

// Only load seed transactions in local dev, production starts empty
const INITIAL_TRANSACTIONS: LedgerTransaction[] = IS_LOCAL_DEV ? _RAW_INITIAL_TRANSACTIONS : [];

export default function WalletPage() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [balance, setBalance] = useState(0);
  const [escrow, setEscrow] = useState(0);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>(INITIAL_TRANSACTIONS);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = () => {
    const mem = ChipStore.getCurrentMember();
    setCurrentUser(mem);
    if (mem) {
      setBalance(mem.chipsBalance);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('chipcoin_store_updated', handleUpdate);
    window.addEventListener('chipcoin_session_changed', handleUpdate);
    return () => {
      window.removeEventListener('chipcoin_store_updated', handleUpdate);
      window.removeEventListener('chipcoin_session_changed', handleUpdate);
    };
  }, []);

  const walletAddress = currentUser?.id
    ? `CHIP-${currentUser.id.toUpperCase()}-WALLET`
    : 'CHIP-ACC-7918-9921-WALLET';

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Simulate bonus — ONLY available in local dev mode
  const handleGrantBonus = () => {
    setSimulating(true);
    setFeedback(null);

    setTimeout(() => {
      const grantAmount = 5000;
      if (currentUser) {
        const { user } = ChipStore.addChips(currentUser.id, grantAmount, 'Thưởng trải nghiệm giao dịch mới');
        setBalance(user.chipsBalance);
        setCurrentUser(user);
      } else {
        setBalance(balance + grantAmount);
      }

      const newTx: LedgerTransaction = {
        id: `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
          1000 + Math.random() * 9000
        )}`,
        timestamp: new Date().toLocaleString('sv-SE').replace('T', ' '),
        type: 'Thưởng trải nghiệm giao dịch mới',
        debitAccount: 'SYSTEM_DEV_TREASURY',
        creditAccount: walletAddress,
        amount: grantAmount,
        balanceAfter: balance + grantAmount,
        hash: `0x${Math.random().toString(16).substring(2, 6)}...${Math.random()
          .toString(16)
          .substring(2, 6)}`,
        status: 'SETTLED',
      };

      setTransactions([newTx, ...transactions]);
      setSimulating(false);
      setFeedback(`Đã thực hiện giao dịch sổ kép: +${grantAmount.toLocaleString()} CHIP`);
      setTimeout(() => setFeedback(null), 3500);
    }, 500);
  };

  const defaultTier = IS_LOCAL_DEV ? 'CHIP GOLD' : 'CHIP MEMBER';
  const currentTierMeta = currentUser?.tier ? TIER_CONFIGS[currentUser.tier] : TIER_CONFIGS[defaultTier];
  const canWithdraw = currentTierMeta.canTransferAndWithdraw;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Wallet Sub Navigation Tabs */}
      <WalletNavTabs currentUser={currentUser} />

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
            {t('wallet_badge')}
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>{t('wallet_title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            {t('wallet_desc')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Simulate bonus button — ONLY shown in local dev mode */}
          {IS_LOCAL_DEV && (
            <button
              onClick={handleGrantBonus}
              disabled={simulating}
              className="nav-btn"
              style={{ cursor: 'pointer', border: 'none', gap: '8px' }}
            >
              {simulating ? 'Đang hạch toán...' : t('wallet_btn_bonus')}
            </button>
          )}

          <Link href="/wallet/convert" className="btn-secondary" style={{ fontSize: '0.88rem', padding: '8px 16px' }}>
            🔄 {t('tab_convert')}
          </Link>

          <Link href="/ton-wallet" className="btn-secondary" style={{ fontSize: '0.88rem', padding: '8px 16px' }}>
            💎 {t('nav_ton_wallet')}
          </Link>
        </div>
      </div>

      {feedback && (
        <div className="alert-box alert-success" style={{ marginBottom: 0 }}>
          <span>✅</span>
          <div>{feedback}</div>
        </div>
      )}

      {/* Luxury Metallic Wallet Cards (Dual Balances: CHIP & USDT) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* 1. Main CHIP Balance Card */}
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
              {t('wallet_total_balance')} (CHIP)
            </span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                background: currentTierMeta.gradient,
                color: '#0b0c0e',
              }}
            >
              👑 {currentUser?.tier || defaultTier}
            </span>
          </div>

          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: '#ffffff',
              margin: '14px 0 4px 0',
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
                fontSize: '1.2rem',
                fontWeight: 700,
                background: 'var(--gradient-bronze)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CHIP
            </span>
          </div>

          <div style={{ fontSize: '0.84rem', color: '#38bdf8', marginBottom: '12px' }}>
            ≈ {chipToUsdt(balance).toFixed(4)} USDT (Tỷ giá 1 USDT = 5,000,000 CHIP)
          </div>

          <div
            style={{
              display: 'flex',
              gap: '20px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-bronze)',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('wallet_available')}</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#34d399' }}>
                {(balance - escrow).toLocaleString()} CHIP
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('wallet_escrow')}</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#fbbf24' }}>
                {escrow.toLocaleString()} CHIP
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Hạch toán</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--accent-bronze-light)' }}>
                Double-Entry
              </div>
            </div>
          </div>
        </div>

        {/* 2. Internal USDT Balance Card */}
        <div
          className="glass-card"
          style={{
            background:
              'linear-gradient(135deg, rgba(14, 23, 28, 0.95) 0%, rgba(18, 20, 24, 0.95) 50%, rgba(10, 22, 28, 0.95) 100%)',
            border: '1.5px solid rgba(0, 152, 234, 0.4)',
            boxShadow: '0 16px 48px rgba(0, 152, 234, 0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#38bdf8',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              SỐ DƯ USDT NỘI BỘ (TON NETWORK)
            </span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
              }}
            >
              💎 TON JETTON
            </span>
          </div>

          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: '#ffffff',
              margin: '14px 0 4px 0',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'baseline',
              gap: '10px',
            }}
          >
            <span>{(currentUser?.usdtBalance || 0).toFixed(4)}</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>
              USDT
            </span>
          </div>

          <div style={{ fontSize: '0.84rem', color: '#f5d77f', marginBottom: '12px' }}>
            ≈ {Math.round((currentUser?.usdtBalance || 0) * 5000000).toLocaleString()} CHIP
          </div>

          <div
            style={{
              display: 'flex',
              gap: '14px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(0, 152, 234, 0.2)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ví TON liên kết:</div>
              <div style={{ fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace', color: currentUser?.tonWalletAddress ? '#34d399' : '#fbbf24' }}>
                {currentUser?.tonWalletAddress
                  ? `${currentUser.tonWalletAddress.slice(0, 8)}...${currentUser.tonWalletAddress.slice(-6)}`
                  : 'Chưa liên kết ví TON'}
              </div>
            </div>

            <Link
              href="/wallet/deposit"
              className="nav-btn"
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              + Nạp USDT
            </Link>
          </div>
        </div>

        {/* 3. Action Center & Double-Entry Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
              {t('wallet_addr_title')}
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
                {copied ? `✓ ${t('btn_copied')}` : t('btn_copy')}
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
              {t('wallet_immutable_title')}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              {t('wallet_immutable_desc')}
            </div>

            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: canWithdraw ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
              {canWithdraw
                ? '✓ Hạng hiện tại cho phép gửi/nhận và rút USDT sang mạng TON'
                : '🔒 Rút USDT yêu cầu đạt từ hạng CHIP PLATINUM trở lên'}
            </div>
          </div>

          {/* Quick Hub Links */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
            <Link
              href="/wallet/convert"
              style={{
                textAlign: 'center',
                padding: '8px',
                background: 'rgba(212, 175, 55, 0.12)',
                border: '1px solid var(--border-bronze)',
                borderRadius: '6px',
                color: '#f5d77f',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              🔄 Đổi CHIP ↔ USDT
            </Link>
            <Link
              href="/wallet/withdraw"
              style={{
                textAlign: 'center',
                padding: '8px',
                background: canWithdraw ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${canWithdraw ? 'rgba(52, 211, 153, 0.3)' : 'var(--border-medium)'}`,
                borderRadius: '6px',
                color: canWithdraw ? '#34d399' : 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              📤 Rút USDT (TON)
            </Link>
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
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>{t('wallet_ledger_history_title')}</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t('wallet_ledger_history_sub')}
            </span>
          </div>

          <span className="badge badge-active">Xác Thực Bảo Mật PostgreSQL</span>
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
