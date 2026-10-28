'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '../../lib/i18n';
import {
  ChipStore,
  StoredUser,
  WithdrawalOrder,
  TIER_CONFIGS,
} from '../../lib/store';
import WalletNavTabs from '../components/WalletNavTabs';

// ============================================================================
// ENVIRONMENT GATE: Simulation presets only enabled in local dev mode
// ============================================================================
const IS_LOCAL_DEV =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_USE_SEED_DATA === 'true';

export default function WithdrawPage() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  const [destAddress, setDestAddress] = useState('');
  const [amountUsdt, setAmountUsdt] = useState<string>(IS_LOCAL_DEV ? '2.0' : '');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalOrder[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadData = () => {
    const mem = ChipStore.getCurrentMember();
    setCurrentUser(mem);
    if (mem?.tonWalletAddress && !destAddress) {
      setDestAddress(mem.tonWalletAddress);
    }
    setWithdrawals(ChipStore.getWithdrawals());
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

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const numUsdt = parseFloat(amountUsdt) || 0;
  const gasFee = 0.10;
  const fee1Percent = Number((numUsdt * 0.01).toFixed(4));
  const totalFee = Number((fee1Percent + gasFee).toFixed(4));
  const netAmount = numUsdt > totalFee ? Number((numUsdt - totalFee).toFixed(4)) : 0;

  const defaultTier = IS_LOCAL_DEV ? 'CHIP GOLD' : 'CHIP MEMBER';
  const currentTierMeta = currentUser?.tier ? TIER_CONFIGS[currentUser.tier] : TIER_CONFIGS[defaultTier];
  const canWithdraw = currentTierMeta.canTransferAndWithdraw;

  const handleSendOtp = () => {
    setOtpSent(true);
    setOtpTimer(60);
    setFeedback({
      message: `✨ Mã xác thực rút tiền 6 chữ số đã được gửi tới email bảo mật: ${currentUser?.email || 'email của bạn'}`,
      type: 'info',
    });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentUser) {
      setFeedback({ message: 'Vui lòng đăng nhập tài khoản.', type: 'error' });
      return;
    }

    if (!canWithdraw) {
      setFeedback({
        message: 'Tài khoản chưa đủ điều kiện rút tiền. Yêu cầu đạt từ hạng CHIP PLATINUM trở lên.',
        type: 'error',
      });
      return;
    }

    if (!destAddress.trim()) {
      setFeedback({ message: 'Vui lòng nhập địa chỉ ví TON đích nhận tiền.', type: 'error' });
      return;
    }

    if (numUsdt <= totalFee) {
      setFeedback({ message: `Số lượng rút phải lớn hơn tổng phí giao dịch (${totalFee} USDT gồm 1% phí hệ thống + 0.1 USDT gas).`, type: 'error' });
      return;
    }

    if (numUsdt > (currentUser.usdtBalance || 0)) {
      setFeedback({
        message: `Số dư USDT không đủ. Bạn hiện có ${(currentUser.usdtBalance || 0).toFixed(4)} USDT.`,
        type: 'error',
      });
      return;
    }

    if (!otpCode || otpCode.trim().length < 6) {
      setFeedback({ message: 'Vui lòng nhập đủ mã OTP xác thực rút tiền 6 chữ số.', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      try {
        const res = ChipStore.createWithdrawal(currentUser.id, numUsdt, destAddress.trim(), otpCode);
        setCurrentUser(res.user);
        setWithdrawals(ChipStore.getWithdrawals());
        setIsSubmitting(false);
        setFeedback({
          message: `🎉 Lệnh rút ${numUsdt} USDT đã được hạch toán thành công! Mã giao dịch TON: ${res.withdrawal.txHash}`,
          type: 'success',
        });
      } catch (err: any) {
        setIsSubmitting(false);
        setFeedback({ message: err.message || 'Lỗi xử lý lệnh rút tiền.', type: 'error' });
      }
    }, 800);
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
            📤 ON-CHAIN TON JETTON DISBURSEMENT
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>{t('withdraw_title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            {t('withdraw_desc')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/wallet/convert" className="btn-secondary" style={{ fontSize: '0.88rem', padding: '8px 16px' }}>
            🔄 {t('tab_convert')}
          </Link>
          <Link href="/rank" className="btn-secondary" style={{ fontSize: '0.88rem', padding: '8px 16px' }}>
            👑 {t('wallet_check_rank', 'Kiểm tra Hạng')}
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

      {/* Main Grid: Withdrawal Form & Tier Gate Warning */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Withdrawal Form */}
        <div
          className="glass-card"
          style={{
            background:
              'linear-gradient(135deg, rgba(28, 23, 14, 0.95) 0%, rgba(18, 20, 24, 0.95) 100%)',
            border: '1.5px solid var(--border-bronze)',
            opacity: canWithdraw ? 1 : 0.85,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f5d77f' }}>
              {t('withdraw_form_title')}
            </h3>
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
              {currentUser?.tier || defaultTier}
            </span>
          </div>

          <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Destination Address */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {t('withdraw_dest_label')}
                </label>
                {currentUser?.tonWalletAddress && (
                  <button
                    type="button"
                    onClick={() => setDestAddress(currentUser.tonWalletAddress || '')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {t('withdraw_use_linked_btn')}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={destAddress}
                onChange={(e) => setDestAddress(e.target.value)}
                placeholder={t('wallet_ton_addr_placeholder', 'EQ... hoặc UQ... (48 ký tự)')}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                }}
              />
            </div>

            {/* Amount */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t('withdraw_amount_label')}</label>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {t('convert_available')} <b style={{ color: '#38bdf8' }}>{(currentUser?.usdtBalance || 0).toFixed(4)} USDT</b>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                }}
              >
                <input
                  type="number"
                  step="0.01"
                  min="0.11"
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
                <button
                  type="button"
                  onClick={() => setAmountUsdt((currentUser?.usdtBalance || 0).toString())}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('convert_max')}
                </button>
              </div>
            </div>

            {/* Fee & Net Breakdown */}
            <div
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>{t('withdraw_sys_fee_label')}</span>
                <span style={{ color: '#f5d77f', fontWeight: 600 }}>{fee1Percent.toFixed(4)} USDT</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '8px', borderLeft: '2px solid var(--accent-bronze)' }}>
                {t('convert_fee_treasury_note')} <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>TBzt...4KPhh</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>{t('withdraw_ton_gas_label')}</span>
                <span>{gasFee.toFixed(2)} USDT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffffff', fontWeight: 700, borderTop: '1px solid var(--border-medium)', paddingTop: '8px' }}>
                <span>{t('withdraw_net_label')}</span>
                <span style={{ color: '#34d399', fontSize: '1.05rem' }}>{netAmount.toFixed(4)} USDT</span>
              </div>
            </div>

            {/* 2FA OTP Code */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t('withdraw_otp_label')}</label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpTimer > 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: otpTimer > 0 ? 'var(--text-muted)' : '#f5d77f',
                    fontSize: '0.75rem',
                    cursor: otpTimer > 0 ? 'default' : 'pointer',
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  {otpTimer > 0 ? `Resend (${otpTimer}s)` : t('withdraw_btn_otp')}
                </button>
              </div>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="654321"
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '1.1rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.2em',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!canWithdraw || isSubmitting}
              className="nav-btn"
              style={{
                padding: '14px',
                fontSize: '0.95rem',
                fontWeight: 700,
                border: 'none',
                cursor: canWithdraw ? 'pointer' : 'not-allowed',
                background: canWithdraw
                  ? 'var(--gradient-bronze)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: canWithdraw ? '#0b0c0e' : 'var(--text-muted)',
              }}
            >
              {!canWithdraw
                ? `🔒 ${t('withdraw_locked_btn')}`
                : isSubmitting
                ? t('state_loading')
                : t('withdraw_btn_submit')}
            </button>
          </form>
        </div>

        {/* Tier Gate Explanation Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div
            className="glass-card"
            style={{
              padding: '1.4rem',
              border: canWithdraw ? '1px solid rgba(52, 211, 153, 0.3)' : '1.5px solid rgba(251, 191, 36, 0.5)',
              background: canWithdraw
                ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.05) 0%, rgba(18, 20, 24, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(18, 20, 24, 0.95) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>{canWithdraw ? '🔓' : '🔒'}</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: canWithdraw ? '#34d399' : '#fbbf24' }}>
                  {canWithdraw ? t('withdraw_status_unlocked') : t('withdraw_status_locked')}
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {t('rank_current_tier')}: <b>{currentUser?.tier || defaultTier}</b>
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {canWithdraw
                ? t('withdraw_unlocked_msg')
                : t('withdraw_locked_msg')}
            </p>

            <div
              style={{
                background: 'rgba(0,0,0,0.4)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                border: '1px solid var(--border-medium)',
              }}
            >
              <div style={{ fontWeight: 700, color: '#f5d77f', marginBottom: '4px' }}>
                {t('withdraw_cond_title')}
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>{t('withdraw_cond_1')}</li>
                <li>{t('withdraw_cond_2')}</li>
                <li>{t('withdraw_cond_3')}</li>
              </ul>
            </div>

            <Link
              href="/rank"
              className="nav-btn"
              style={{
                display: 'inline-block',
                textAlign: 'center',
                marginTop: '14px',
                padding: '10px 16px',
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              {t('withdraw_view_progress')}
            </Link>
          </div>

          {/* Security & Cooldown Notice */}
          <div className="glass-card" style={{ padding: '1.4rem' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-bronze-light)', fontSize: '0.95rem' }}>
              🛡️ {t('withdraw_sec_title')}
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {t('withdraw_sec_desc')}
            </p>
          </div>
        </div>
      </div>

      {/* Withdrawal Orders Table */}
      <div className="glass-card" style={{ padding: '1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>{t('withdraw_history_title')}</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t('withdraw_history_sub')}
            </span>
          </div>
          <span className="badge badge-active">Double-Entry Settled</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('withdraw_col_order')}</th>
                <th>{t('convert_col_time')}</th>
                <th>{t('withdraw_col_dest')}</th>
                <th>{t('withdraw_col_amount')}</th>
                <th>{t('withdraw_col_gas')}</th>
                <th>{t('withdraw_col_net')}</th>
                <th>{t('withdraw_col_txhash')}</th>
                <th>{t('col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    {t('withdraw_no_records')}
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#ffffff', fontWeight: 600 }}>
                      {w.id}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(w.createdAt).toLocaleString('sv-SE').replace('T', ' ')}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--accent-bronze-light)' }}>
                      {w.destinationTonAddress.slice(0, 8)}...{w.destinationTonAddress.slice(-6)}
                    </td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>
                      {w.amountUsdt.toFixed(2)} USDT
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {w.feeUsdt.toFixed(2)} USDT
                    </td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>
                      {w.netAmountUsdt.toFixed(4)} USDT
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {w.txHash || '—'}
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
                        {t('status_settled')}
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
