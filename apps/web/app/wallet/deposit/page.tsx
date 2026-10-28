'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '../../lib/i18n';
import {
  ChipStore,
  StoredUser,
  DepositIntent,
  CHIP_PER_USDT,
  detectWalletNetwork,
} from '../../lib/store';
import WalletNavTabs from '../components/WalletNavTabs';

// ============================================================================
// ENVIRONMENT GATE: Simulation features only available in local dev mode
// ============================================================================
const IS_LOCAL_DEV =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_USE_SEED_DATA === 'true';

export default function DepositPage() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  const [amountUsdt, setAmountUsdt] = useState<string>('5.0');
  const [activeIntent, setActiveIntent] = useState<DepositIntent | null>(null);
  const [deposits, setDeposits] = useState<DepositIntent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadData = () => {
    const mem = ChipStore.getCurrentMember();
    setCurrentUser(mem);
    const list = ChipStore.getDeposits();
    setDeposits(list);
    if (!activeIntent && list.length > 0) {
      setActiveIntent(list[0]);
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

  const numUsdt = parseFloat(amountUsdt) || 0;
  const equivalentChips = Math.round(numUsdt * CHIP_PER_USDT);

  const handleCreateIntent = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentUser) {
      setFeedback({ message: 'Vui lòng đăng nhập để nạp USDT.', type: 'error' });
      return;
    }

    if (numUsdt <= 0) {
      setFeedback({ message: 'Số lượng nạp USDT phải lớn hơn 0.', type: 'error' });
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      try {
        const intent = ChipStore.createDepositIntent(currentUser.id, numUsdt);
        setActiveIntent(intent);
        setDeposits(ChipStore.getDeposits());
        setIsGenerating(false);
        setFeedback({
          message: `✨ Đã tạo lệnh nạp #${intent.id}. Vui lòng chuyển đúng số tiền và kèm Memo bên dưới!`,
          type: 'info',
        });
      } catch (err: any) {
        setIsGenerating(false);
        setFeedback({ message: err.message || 'Lỗi tạo lệnh nạp tiền.', type: 'error' });
      }
    }, 400);
  };

  const handleSimulateOnChainPayment = (intentId: string) => {
    setIsSimulating(true);
    setFeedback(null);

    setTimeout(() => {
      try {
        const res = ChipStore.confirmDeposit(intentId);
        setCurrentUser(res.user);
        setActiveIntent(res.intent);
        setDeposits(ChipStore.getDeposits());
        setIsSimulating(false);
        setFeedback({
          message: `🎉 Đã nhận và hạch toán thành công +${res.intent.amountUsdt} USDT vào tài khoản qua mạng TON! Số dư USDT hiện tại: ${res.user.usdtBalance.toFixed(4)} USDT.`,
          type: 'success',
        });
      } catch (err: any) {
        setIsSimulating(false);
        setFeedback({ message: err.message || 'Lỗi hạch toán lệnh nạp.', type: 'error' });
      }
    }, 600);
  };

  const handleCopyAddr = () => {
    if (!activeIntent) return;
    navigator.clipboard.writeText(activeIntent.depositAddress);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 1800);
  };

  const handleCopyMemo = () => {
    if (!activeIntent) return;
    navigator.clipboard.writeText(activeIntent.memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 1800);
  };

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
            📥 TON JETTON USDT GATEWAY
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>{t('deposit_title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            {t('deposit_desc')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/wallet/convert" className="btn-secondary" style={{ fontSize: '0.88rem', padding: '8px 16px' }}>
            🔄 {t('tab_convert')}
          </Link>
          <Link href="/ton-wallet" className="btn-secondary" style={{ fontSize: '0.88rem', padding: '8px 16px' }}>
            💎 {t('tab_connect')}
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={`alert-box ${
            feedback.type === 'success'
              ? 'alert-success'
              : feedback.type === 'error'
              ? 'alert-error'
              : 'alert-info'
          }`}
          style={{ marginBottom: 0 }}
        >
          <span>{feedback.type === 'success' ? '✅' : feedback.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <div>{feedback.message}</div>
        </div>
      )}

      {/* Main Grid: Deposit Intent Form & Active Invoice */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Step 1: Create Deposit Intent Form */}
        <div
          className="glass-card"
          style={{
            background:
              'linear-gradient(135deg, rgba(28, 23, 14, 0.95) 0%, rgba(18, 20, 24, 0.95) 100%)',
            border: '1.5px solid var(--border-bronze)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.2rem' }}>
            <span style={{ fontSize: '1.2rem' }}>1️⃣</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f5d77f' }}>
              {t('deposit_create_title')}
            </h3>
          </div>

          <form onSubmit={handleCreateIntent} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {t('deposit_amount_label')}
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '10px',
                  padding: '8px 14px',
                }}
              >
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={amountUsdt}
                  onChange={(e) => setAmountUsdt(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    outline: 'none',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                />
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>USDT</span>
              </div>
            </div>

            {/* Quick Amount Options */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {['2.0', '5.0', '10.0', '50.0', '100.0'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountUsdt(val)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-secondary)',
                    padding: '6px 4px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  +{val}
                </button>
              ))}
            </div>

            {/* Conversion Preview */}
            <div
              style={{
                background: 'rgba(212, 175, 55, 0.06)',
                border: '1px solid var(--border-bronze)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('convert_official_rate')}</span>
                <span style={{ fontWeight: 600, color: '#f5d77f' }}>1 USDT = 5,000,000 CHIP</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('deposit_col_chip_equiv')}:</span>
                <span style={{ fontWeight: 700, color: '#34d399' }}>
                  ≈ {equivalentChips.toLocaleString()} CHIP
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="nav-btn"
              style={{
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isGenerating ? t('state_loading') : t('deposit_btn_create')}
            </button>
          </form>
        </div>

        {/* Step 2: Payment Details & Telegram Wallet Transfer */}
        <div
          className="glass-card"
          style={{
            background:
              'linear-gradient(135deg, rgba(14, 23, 28, 0.95) 0%, rgba(18, 20, 24, 0.95) 100%)',
            border: '1.5px solid rgba(0, 152, 234, 0.4)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>2️⃣</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#38bdf8' }}>
                {t('deposit_sim_title')}
              </h3>
            </div>
            {activeIntent && (
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: activeIntent.status === 'SETTLED' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                  color: activeIntent.status === 'SETTLED' ? '#34d399' : '#fbbf24',
                }}
              >
                {activeIntent.status === 'SETTLED' ? `✓ ${t('status_settled')}` : `⏳ ${t('deposit_waiting_payment')}`}
              </span>
            )}
          </div>

          {activeIntent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Amount to send */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border-medium)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('deposit_amount_to_send')}</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
                  {activeIntent.amountUsdt.toFixed(2)}{' '}
                  <span style={{ color: '#38bdf8', fontSize: '1rem' }}>USDT</span>
                </span>
              </div>

              {/* Deposit Address */}
              <div>
                {(() => {
                  const depMeta = detectWalletNetwork(activeIntent.depositAddress);
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {t('deposit_receive_addr')} ({depMeta.networkName}):
                      </span>
                      <a
                        href={depMeta.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.74rem', color: depMeta.isTron ? '#f87171' : '#38bdf8', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {t('deposit_lookup_explorer')}
                      </a>
                    </div>
                  );
                })()}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-medium)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.82rem',
                  }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff' }}>
                    {activeIntent.depositAddress}
                  </span>
                  <button
                    onClick={handleCopyAddr}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {copiedAddr ? t('deposit_copied') : t('deposit_copy')}
                  </button>
                </div>
              </div>

              {/* Deposit Memo / Comment (CRITICAL) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700 }}>
                    ⚠️ {t('deposit_memo_warning')}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('deposit_memo_desc')}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(251, 191, 36, 0.1)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px dashed #fbbf24',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#fbbf24',
                  }}
                >
                  <span style={{ flex: 1 }}>{activeIntent.memo}</span>
                  <button
                    onClick={handleCopyMemo}
                    style={{
                      background: '#fbbf24',
                      border: 'none',
                      color: '#0b0c0e',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {copiedMemo ? t('deposit_copied') : t('deposit_btn_copy_memo')}
                  </button>
                </div>
              </div>

              {/* Actions & Simulation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <a
                  href={`https://t.me/wallet?startattach=w_transfer_to_${activeIntent.depositAddress}_memo_${activeIntent.memo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    fontSize: '0.92rem',
                    textDecoration: 'none',
                    background: 'linear-gradient(135deg, #0088cc 0%, #006699 100%)',
                    color: '#ffffff',
                    border: 'none',
                  }}
                >
                  ✈️ {t('deposit_btn_telegram')}
                </a>

                {IS_LOCAL_DEV && activeIntent.status !== 'SETTLED' && (
                  <button
                    onClick={() => handleSimulateOnChainPayment(activeIntent.id)}
                    disabled={isSimulating}
                    style={{
                      background: 'rgba(52, 211, 153, 0.15)',
                      border: '1px solid rgba(52, 211, 153, 0.4)',
                      color: '#34d399',
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isSimulating ? t('deposit_sim_listening') : t('deposit_sim_dev_btn')}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
              {t('deposit_enter_amount_hint')}
            </div>
          )}
        </div>
      </div>

      {/* Deposit Ledger History */}
      <div className="glass-card" style={{ padding: '1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>{t('deposit_history_title')}</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t('deposit_history_sub')}
            </span>
          </div>
          <span className="badge badge-active">TON Mainnet Jettons</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('deposit_col_order')}</th>
                <th>{t('deposit_col_time')}</th>
                <th>{t('deposit_col_usdt')}</th>
                <th>{t('deposit_col_chip_equiv')}</th>
                <th>{t('deposit_col_memo')}</th>
                <th>{t('deposit_col_txhash')}</th>
                <th>{t('col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    {t('deposit_no_records')}
                  </td>
                </tr>
              ) : (
                deposits.map((dep) => (
                  <tr key={dep.id}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#ffffff', fontWeight: 600 }}>
                      {dep.id}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(dep.createdAt).toLocaleString('sv-SE').replace('T', ' ')}
                    </td>
                    <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                      +{dep.amountUsdt.toFixed(2)} USDT
                    </td>
                    <td style={{ fontWeight: 700, color: '#f5d77f' }}>
                      ≈ {dep.equivalentChip.toLocaleString()} CHIP
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#fbbf24', fontSize: '0.82rem' }}>
                      {dep.memo}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {dep.txHash || '—'}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: dep.status === 'SETTLED' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                          color: dep.status === 'SETTLED' ? '#34d399' : '#fbbf24',
                          border: `1px solid ${dep.status === 'SETTLED' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                        }}
                      >
                        {dep.status === 'SETTLED' ? t('deposit_status_settled', 'ĐÃ HẠCH TOÁN') : t('deposit_status_waiting', 'CHỜ THANH TOÁN')}
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
