'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChipStore,
  AdminFeeRecord,
  ADMIN_TON_WALLET,
  DEFAULT_ADMIN_TRON_WALLET,
  DEFAULT_ADMIN_TON_WALLET,
  detectWalletNetwork,
  CHIP_PER_USDT,
} from '../../lib/store';

// ============================================================================
// ENVIRONMENT GATE: System mock data only loaded in local dev mode
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
  const [feeRecords, setFeeRecords] = useState<AdminFeeRecord[]>([]);
  const [treasuryStats, setTreasuryStats] = useState({
    tonWallet: ADMIN_TON_WALLET,
    totalFeeUsdt: 0,
    totalVolumeUsdt: 0,
    totalTxCount: 0,
    chipEquivalent: 0,
  });
  const [walletConfig, setWalletConfig] = useState({
    tronWallet: DEFAULT_ADMIN_TRON_WALLET,
    tonWallet: DEFAULT_ADMIN_TON_WALLET,
    activeNetwork: 'TRON' as 'TRON' | 'TON',
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editTron, setEditTron] = useState('');
  const [editTon, setEditTon] = useState('');
  const [editNetwork, setEditNetwork] = useState<'TRON' | 'TON'>('TRON');
  const [configMsg, setConfigMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [activeTab, setActiveTab] = useState<'FEES' | 'POOLS' | 'JOURNAL'>('FEES');
  const [simulating, setSimulating] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = () => {
    const fees = ChipStore.getAdminFeeRecords();
    setFeeRecords(fees);
    const stats = ChipStore.getAdminTreasuryStats();
    setTreasuryStats(stats);
    const cfg = ChipStore.getAdminWalletConfig();
    setWalletConfig(cfg);
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

  const activeAddress =
    walletConfig.activeNetwork === 'TON'
      ? walletConfig.tonWallet || DEFAULT_ADMIN_TON_WALLET
      : walletConfig.tronWallet || DEFAULT_ADMIN_TRON_WALLET;

  const activeWalletMeta = detectWalletNetwork(activeAddress);

  const handleCopyTonWallet = () => {
    navigator.clipboard.writeText(activeAddress);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const handleOpenConfigModal = () => {
    setEditTron(walletConfig.tronWallet || DEFAULT_ADMIN_TRON_WALLET);
    setEditTon(walletConfig.tonWallet || DEFAULT_ADMIN_TON_WALLET);
    setEditNetwork(walletConfig.activeNetwork);
    setConfigMsg(null);
    setShowConfigModal(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editNetwork === 'TRON' && !editTron.trim().startsWith('T')) {
        setConfigMsg({ text: 'Địa chỉ TRON (TRC-20) phải bắt đầu bằng chữ T (34 ký tự).', type: 'error' });
        return;
      }
      if (editNetwork === 'TON' && !editTon.trim().startsWith('EQ') && !editTon.trim().startsWith('UQ')) {
        setConfigMsg({ text: 'Địa chỉ ví TON phải bắt đầu bằng EQ... hoặc UQ... (48 ký tự).', type: 'error' });
        return;
      }
      const updated = ChipStore.setAdminWalletConfig({
        tronWallet: editTron.trim(),
        tonWallet: editTon.trim(),
        activeNetwork: editNetwork,
      });
      setWalletConfig(updated);
      setConfigMsg({ text: '✓ Cập nhật cấu hình ví quản trị thành công!', type: 'success' });
      loadData();
      setTimeout(() => setShowConfigModal(false), 1200);
    } catch (err: any) {
      setConfigMsg({ text: err.message || 'Lỗi lưu cấu hình', type: 'error' });
    }
  };

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
      setTimeout(() => setFeedback(null), 3500);
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
            🏛️ QUẢN TRỊ HỆ THỐNG — VÍ QUẢN TRỊ &amp; QUỸ PHÍ GIAO DỊCH 1%
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Ví Quản Trị Hệ Thống &amp; Quỹ Thu Phí</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Quản trị địa chỉ ví TON thu phí giao dịch 1% (USDT), theo dõi doanh thu phí và hạn mức kho quỹ tổng.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={loadData}
            className="btn-secondary"
            style={{ fontSize: '0.88rem', padding: '8px 16px', cursor: 'pointer' }}
          >
            🔄 Làm mới số dư
          </button>

          {IS_LOCAL_DEV && (
            <button
              onClick={handleAllocateTreasury}
              disabled={simulating}
              className="nav-btn"
              style={{ cursor: 'pointer', border: 'none', gap: '8px', fontSize: '0.88rem', padding: '8px 16px' }}
            >
              {simulating ? 'Đang hạch toán...' : '🧪 Điều chuyển 100k CHIP'}
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="alert-box alert-success" style={{ marginBottom: 0 }}>
          <span>✅</span>
          <div>{feedback}</div>
        </div>
      )}

      {/* Hero Card: Connected Official Admin Treasury Wallet (Supports both TRON TRC-20 & TON) */}
      <section
        className="glass-card"
        style={{
          background:
            activeWalletMeta.isTron
              ? 'radial-gradient(circle at 100% 0%, rgba(239, 68, 68, 0.22) 0%, rgba(18, 20, 24, 0.98) 70%)'
              : 'radial-gradient(circle at 100% 0%, rgba(0, 152, 234, 0.22) 0%, rgba(18, 20, 24, 0.98) 70%)',
          border: `1.5px solid ${activeWalletMeta.isTron ? 'rgba(239, 68, 68, 0.45)' : 'rgba(0, 152, 234, 0.45)'}`,
          boxShadow: `0 16px 48px ${activeWalletMeta.isTron ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 152, 234, 0.15)'}`,
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                className="badge badge-gold"
                style={{
                  background: activeWalletMeta.isTron ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 152, 234, 0.2)',
                  color: activeWalletMeta.isTron ? '#f87171' : '#38bdf8',
                  border: `1px solid ${activeWalletMeta.isTron ? '#f87171' : '#38bdf8'}`,
                }}
              >
                {activeWalletMeta.icon} VÍ {activeWalletMeta.shortName.toUpperCase()} QUẢN TRỊ CHÍNH THỨC
              </span>
              <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
                ● Đang kết nối trực tiếp
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', margin: '4px 0 6px 0', color: '#ffffff' }}>
              Địa Chỉ Ví Quản Trị Nhận Toàn Bộ Phí Giao Dịch Hội Viên
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, maxWidth: '720px', lineHeight: 1.5 }}>
              Mọi giao dịch USDT của hội viên trên toàn bộ nền tảng (quy đổi CHIP ↔ USDT, rút tiền) đều tự động chịu mức phí <b>1% * khối lượng giao dịch</b> và được ghi nhận trực tiếp vào địa chỉ ví dưới đây ({activeWalletMeta.networkName}).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleOpenConfigModal}
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '8px 14px', cursor: 'pointer' }}
            >
              ⚙️ Cấu Hình / Đổi Ví Quản Trị
            </button>
            <a
              href={activeWalletMeta.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                fontSize: '0.82rem',
                padding: '8px 14px',
                textDecoration: 'none',
                background: activeWalletMeta.isTron ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 152, 234, 0.15)',
                borderColor: activeWalletMeta.isTron ? '#f87171' : '#38bdf8',
                color: activeWalletMeta.isTron ? '#fca5a5' : '#7dd3fc',
              }}
            >
              🔍 Xem trên {activeWalletMeta.explorerName} ({activeWalletMeta.shortName}) ↗
            </a>
          </div>
        </div>

        {/* The Official Wallet Address Display */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.55)',
            border: `1px solid ${activeWalletMeta.isTron ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 152, 234, 0.4)'}`,
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '1.2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
            <span style={{ fontSize: '1.5rem' }}>{activeWalletMeta.icon}</span>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ĐỊA CHỈ VÍ QUẢN TRỊ ({activeWalletMeta.networkName.toUpperCase()})
              </div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: activeWalletMeta.isTron ? '#fca5a5' : '#38bdf8',
                  wordBreak: 'break-all',
                  marginTop: '2px',
                }}
              >
                {activeAddress}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCopyTonWallet}
              className="nav-btn"
              style={{
                fontSize: '0.82rem',
                padding: '8px 16px',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              {copiedAddr ? '✓ Đã sao chép ví!' : '📋 Sao chép địa chỉ ví'}
            </button>
          </div>
        </div>

        {/* Blockchain Explorer & Network Notice Alert Box */}
        <div
          style={{
            background: 'rgba(234, 179, 8, 0.08)',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>💡</span>
          <div style={{ fontSize: '0.82rem', color: '#fef08a', lineHeight: 1.55 }}>
            <strong>Hướng dẫn tra cứu Blockchain Explorer &amp; Tránh lỗi 404:</strong><br />
            &bull; <strong>Mạng TRON (TRC-20 USDT)</strong>: Địa chỉ bắt đầu bằng chữ <code>T...</code> (34 ký tự như <code>TBztwgxtz...</code>). Phải tra cứu trên <strong>Tronscan.org</strong>.<br />
            &bull; <strong>Mạng TON (The Open Network)</strong>: Địa chỉ bắt đầu bằng <code>EQ...</code> hoặc <code>UQ...</code> (48 ký tự). Tra cứu trên <strong>Tonviewer.com</strong>.<br />
            <em>* Lưu ý: Nếu mở địa chỉ mạng TRON trên Tonviewer sẽ bị lỗi <strong>404 Invalid address</strong> vì hai blockchain hoạt động độc lập. Hệ thống đã tự động liên kết chính xác sang <strong>Tronscan</strong>.</em>
          </div>
        </div>

        {/* 4 Summary Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              TỔNG PHÍ THU VỀ VÍ (USDT)
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'Outfit, sans-serif', marginTop: '4px' }}>
              {treasuryStats.totalFeeUsdt.toFixed(4)} <span style={{ fontSize: '0.9rem' }}>USDT</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#f5d77f', marginTop: '2px' }}>
              ≈ {Math.round(treasuryStats.totalFeeUsdt * CHIP_PER_USDT).toLocaleString()} CHIP quy ước
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              KHỐI LƯỢNG GIAO DỊCH USDT
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit, sans-serif', marginTop: '4px' }}>
              {treasuryStats.totalVolumeUsdt.toFixed(2)} <span style={{ fontSize: '0.9rem' }}>USDT</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Tổng Volume phát sinh giao dịch
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              TỶ LỆ PHÍ MẶC ĐỊNH
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f5d77f', fontFamily: 'Outfit, sans-serif', marginTop: '4px' }}>
              1.00%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '2px' }}>
              Áp dụng cho mọi giao dịch USDT
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              TỔNG LỆNH THU PHÍ
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', fontFamily: 'Outfit, sans-serif', marginTop: '4px' }}>
              {treasuryStats.totalTxCount} <span style={{ fontSize: '0.9rem' }}>lệnh</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Đã ghi nhận vào ví TON quản trị
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-bronze)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('FEES')}
          style={{
            background: activeTab === 'FEES' ? 'rgba(0, 152, 234, 0.2)' : 'transparent',
            border: activeTab === 'FEES' ? '1px solid #38bdf8' : '1px solid transparent',
            color: activeTab === 'FEES' ? '#38bdf8' : 'var(--text-secondary)',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          💰 Sổ Ký Quỹ Thu Phí Giao Dịch 1% ({feeRecords.length})
        </button>

        <button
          onClick={() => setActiveTab('POOLS')}
          style={{
            background: activeTab === 'POOLS' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
            border: activeTab === 'POOLS' ? '1px solid var(--border-bronze)' : '1px solid transparent',
            color: activeTab === 'POOLS' ? '#f5d77f' : 'var(--text-secondary)',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          🏦 Kho Quỹ Master CHIP &amp; Sub-Pools
        </button>

        <button
          onClick={() => setActiveTab('JOURNAL')}
          style={{
            background: activeTab === 'JOURNAL' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            border: activeTab === 'JOURNAL' ? '1px solid var(--border-medium)' : '1px solid transparent',
            color: activeTab === 'JOURNAL' ? '#ffffff' : 'var(--text-secondary)',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          📜 Nhật Ký Bút Toán Kép
        </button>
      </div>

      {/* TAB 1: SỔ KÝ QUỸ THU PHÍ GIAO DỊCH 1% USDT */}
      {activeTab === 'FEES' && (
        <section className="glass-card" style={{ padding: '1.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.18rem', margin: 0, color: '#f5d77f' }}>
                Sổ Nhật Ký Thu Phí Giao Dịch 1% Về Ví Quản Trị
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Tất cả các khoản phí 1% phát sinh từ giao dịch của hội viên đều được ghi nhận tự động vào ví <b>{ADMIN_TON_WALLET}</b>
              </p>
            </div>
            <span className="badge badge-success">
              ✓ 100% Ghi nhận chính xác
            </span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>MÃ GIAO DỊCH</th>
                  <th>THỜI GIAN</th>
                  <th>HỘI VIÊN THỰC HIỆN</th>
                  <th>LOẠI GIAO DỊCH</th>
                  <th>KHỐI LƯỢNG (USDT)</th>
                  <th>TỶ LỆ</th>
                  <th>PHÍ GHI NHẬN (USDT)</th>
                  <th>VÍ TON NHẬN PHÍ</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {feeRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      Chưa phát sinh giao dịch thu phí nào từ hội viên.
                    </td>
                  </tr>
                ) : (
                  feeRecords.map((fee) => (
                    <tr key={fee.id}>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#ffffff' }}>
                        {fee.id}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {fee.timestamp}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#ffffff' }}>
                        {fee.userEmail || fee.userId}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background:
                              fee.txType === 'CONVERT_CHIP_TO_USDT'
                                ? 'rgba(212, 175, 55, 0.15)'
                                : fee.txType === 'CONVERT_USDT_TO_CHIP'
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              fee.txType === 'CONVERT_CHIP_TO_USDT'
                                ? '#f5d77f'
                                : fee.txType === 'CONVERT_USDT_TO_CHIP'
                                ? '#38bdf8'
                                : '#f87171',
                          }}
                        >
                          {fee.txTypeLabel ||
                            (fee.txType === 'CONVERT_CHIP_TO_USDT'
                              ? 'Quy đổi CHIP ➔ USDT'
                              : fee.txType === 'CONVERT_USDT_TO_CHIP'
                              ? 'Quy đổi USDT ➔ CHIP'
                              : 'Rút USDT về ví TON')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
                        {fee.volumeUsdt.toFixed(4)} USDT
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {(fee.feeRate * 100).toFixed(0)}%
                      </td>
                      <td style={{ fontWeight: 800, color: '#38bdf8', fontFamily: 'Outfit, sans-serif' }}>
                        +{fee.feeUsdt.toFixed(4)} USDT
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: '#34d399' }}>
                        {fee.beneficiaryWallet.slice(0, 6)}...{fee.beneficiaryWallet.slice(-6)}
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
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                          }}
                        >
                          ✓ ĐÃ GHI NHẬN
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: KHO QUỸ MASTER & SUB-POOLS */}
      {activeTab === 'POOLS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                <span className="badge badge-gold">MASTER TREASURY</span>
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
                  Quy đổi nội bộ: ≈ ${(treasuryBalance / 5000000).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
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
        </div>
      )}

      {/* TAB 3: NHẬT KÝ HẠCH TOÁN SỔ CÁI */}
      {activeTab === 'JOURNAL' && (
        <div className="glass-card" style={{ padding: '1.4rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.2rem' }}>Nhật Ký Hạch Toán Toàn Hệ Thống</h3>

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
                      Chưa có giao dịch hạch toán nào trong hệ thống.
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
      )}

      {/* Admin Wallet Configuration Modal */}
      {showConfigModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              borderColor: 'var(--border-bronze)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 175, 55, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#f5d77f' }}>
                  ⚙️ Cấu Hình Địa Chỉ Ví Quản Trị Hệ Thống
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px', margin: 0 }}>
                  Quản lý địa chỉ nhận phí 1% USDT và hoàn quỹ tài sản khi xóa tài khoản.
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {configMsg && (
              <div
                className={`alert-box ${configMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}
                style={{ padding: '0.8rem 1rem', marginBottom: '1rem' }}
              >
                <span>{configMsg.type === 'success' ? '✓' : '⚠️'}</span>
                <div>{configMsg.text}</div>
              </div>
            )}

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Network Choice */}
              <div className="form-group">
                <label className="form-label">Chọn Mạng Lưới Quản Trị Mặc Định:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditNetwork('TRON')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '8px',
                      background: editNetwork === 'TRON' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: editNetwork === 'TRON' ? '1.5px solid #ef4444' : '1px solid var(--border-subtle)',
                      color: editNetwork === 'TRON' ? '#fca5a5' : 'var(--text-secondary)',
                      fontWeight: editNetwork === 'TRON' ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                    }}
                  >
                    🔴 TRON (TRC-20 USDT)
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Explorer: Tronscan
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditNetwork('TON')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '8px',
                      background: editNetwork === 'TON' ? 'rgba(0, 152, 234, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: editNetwork === 'TON' ? '1.5px solid #0098ea' : '1px solid var(--border-subtle)',
                      color: editNetwork === 'TON' ? '#7dd3fc' : 'var(--text-secondary)',
                      fontWeight: editNetwork === 'TON' ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                    }}
                  >
                    💎 TON (USDT Jetton)
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Explorer: Tonviewer
                    </div>
                  </button>
                </div>
              </div>

              {/* TRON Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="tron-addr">
                  Địa Chỉ Ví TRON TRC-20 (bắt đầu bằng T, 34 ký tự):
                </label>
                <input
                  id="tron-addr"
                  type="text"
                  className="form-input"
                  placeholder="TBztwgxtzSBPvFA56VM5Mpozh6Gj84KPhh"
                  value={editTron}
                  onChange={(e) => setEditTron(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}
                  required
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Tra cứu tại: <a href={`https://tronscan.org/#/address/${editTron.trim()}`} target="_blank" rel="noreferrer" style={{ color: '#f87171' }}>tronscan.org</a>
                </div>
              </div>

              {/* TON Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="ton-addr">
                  Địa Chỉ Ví TON (bắt đầu bằng EQ... hoặc UQ..., 48 ký tự):
                </label>
                <input
                  id="ton-addr"
                  type="text"
                  className="form-input"
                  placeholder="EQBvW8Z5huBkMJYdn3PCDnHoKK3xNJa_W0C_z8LgqG12Ton"
                  value={editTon}
                  onChange={(e) => setEditTon(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}
                  required
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Tra cứu tại: <a href={`https://tonviewer.com/${editTon.trim()}`} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>tonviewer.com</a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowConfigModal(false)}
                  style={{ flex: 1 }}
                >
                  Đóng
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                  💾 Lưu Cấu Hình Ví Quản Trị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
