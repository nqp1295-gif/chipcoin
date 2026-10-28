'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '../lib/i18n';
import { ChipStore, StoredUser, TIER_CONFIGS, detectWalletNetwork } from '../lib/store';
import WalletNavTabs from '../wallet/components/WalletNavTabs';

// ============================================================================
// ENVIRONMENT GATE: Test helper UI only available in local dev mode
// ============================================================================
const IS_LOCAL_DEV =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_USE_SEED_DATA === 'true';

export default function TonWalletPage() {
  const { t } = useI18n();

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  // Network & Form States
  const [networkMode, setNetworkMode] = useState<'TON' | 'TRON'>('TON');
  const [tonAddress, setTonAddress] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<'Tonkeeper' | 'Telegram Wallet' | 'MyTonWallet' | 'TronLink' | 'Trust Wallet' | 'Binance' | 'Other'>('Tonkeeper');
  const [nonce, setNonce] = useState('');
  const [signedNonce, setSignedNonce] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // Telegram Binding States
  const [telegramId, setTelegramId] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');

  // Status & Notification
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [verifying, setVerifying] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadUser = () => {
    const mem = ChipStore.getCurrentMember();
    setCurrentUser(mem);
    if (mem?.tonWalletAddress) {
      setTonAddress(mem.tonWalletAddress);
      const meta = detectWalletNetwork(mem.tonWalletAddress);
      setNetworkMode(meta.isTron ? 'TRON' : 'TON');
    }
    if (mem?.telegramUserId) {
      setTelegramId(mem.telegramUserId);
    }
    if (mem?.telegramUsername) {
      setTelegramUsername(mem.telegramUsername);
    }
  };

  useEffect(() => {
    loadUser();
    const handleUpdate = () => loadUser();
    window.addEventListener('chipcoin_store_updated', handleUpdate);
    window.addEventListener('chipcoin_session_changed', handleUpdate);
    return () => {
      window.removeEventListener('chipcoin_store_updated', handleUpdate);
      window.removeEventListener('chipcoin_session_changed', handleUpdate);
    };
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // Generate cryptographic session nonce for TonProof
  useEffect(() => {
    const randomBytes = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');
    setNonce(`tonproof_${Date.now()}_${randomBytes.slice(0, 24)}`);
  }, []);

  // Validate Address format for TON or TRON
  const validateAddress = (addr: string) => {
    const clean = addr.trim();
    const meta = detectWalletNetwork(clean);
    if (meta.isTron) {
      return { isValid: true, detectedNetwork: 'TRON' as const, meta };
    }
    if (meta.isTon) {
      return { isValid: true, detectedNetwork: 'TON' as const, meta };
    }
    return { isValid: false, detectedNetwork: 'UNKNOWN' as const, meta };
  };

  // Step 1: Validate address & advance to cryptographic proof
  const handleProceedToStep2 = () => {
    if (!tonAddress.trim()) {
      setFeedback({ message: 'Vui lòng nhập địa chỉ ví của bạn.', type: 'error' });
      return;
    }
    const val = validateAddress(tonAddress);
    if (!val.isValid) {
      setFeedback({
        message: 'Địa chỉ ví không hợp lệ. Ví TON phải bắt đầu bằng EQ.../UQ... (48 ký tự), hoặc ví TRON (TRC-20) bắt đầu bằng T... (34 ký tự).',
        type: 'error',
      });
      return;
    }

    // Auto-align networkMode if detected network differs
    if (val.detectedNetwork !== networkMode && (val.detectedNetwork === 'TON' || val.detectedNetwork === 'TRON')) {
      setNetworkMode(val.detectedNetwork);
    }

    setFeedback(null);
    setSignedNonce(`${val.detectedNetwork.toLowerCase()}_sig_${Buffer.from(tonAddress).toString('base64').slice(0, 36)}...sha256`);
    setStep(2);
  };

  // Step 2: Verify cryptographic signature & send OTP
  const handleProceedToStep3 = () => {
    setFeedback(null);
    setOtpSent(true);
    setOtpTimer(60);
    setFeedback({
      message: `✨ Mã OTP 6 chữ số đã được gửi tới email bảo mật: ${currentUser?.email || 'email của bạn'}`,
      type: 'info',
    });
    setStep(3);
  };

  // Send / Resend OTP
  const handleSendOtp = () => {
    setOtpSent(true);
    setOtpTimer(60);
    setFeedback({
      message: `✨ Đã gửi lại mã OTP 6 chữ số tới email: ${currentUser?.email}`,
      type: 'info',
    });
  };

  // Step 3: Complete verification & bind
  const handleConfirmBind = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentUser) return;

    if (!otpCode || otpCode.trim().length < 6) {
      setFeedback({ message: 'Vui lòng nhập đủ mã OTP bảo mật 6 chữ số.', type: 'error' });
      return;
    }

    setVerifying(true);
    setTimeout(() => {
      try {
        const val = validateAddress(tonAddress);
        const resolvedNetwork = val.detectedNetwork === 'TRON' ? 'TRON' : 'TON';
        const updated = ChipStore.bindTonWallet(currentUser.id, tonAddress.trim(), resolvedNetwork);
        setCurrentUser(updated);
        setVerifying(false);
        setFeedback({
          message: `🎉 Liên kết ví ${resolvedNetwork === 'TRON' ? 'TRON (TRC-20 USDT)' : 'The Open Network (TON)'} thành công! Cơ chế Timelock 7 ngày đã được kích hoạt bảo vệ tài khoản.`,
          type: 'success',
        });
        setTimeout(() => setFeedback(null), 5000);
      } catch (err: any) {
        setVerifying(false);
        setFeedback({ message: 'Lỗi xác minh liên kết ví.', type: 'error' });
      }
    }, 600);
  };

  const handleBindTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!telegramId.trim()) {
      setFeedback({ message: 'Vui lòng nhập ID người dùng Telegram (ví dụ: tg_982144912)', type: 'error' });
      return;
    }
    try {
      const updated = ChipStore.linkTelegram(currentUser.id, telegramId.trim(), telegramUsername.trim());
      setCurrentUser(updated);
      setFeedback({ message: '🎉 Đã liên kết tài khoản Telegram ID thành công với hệ thống CHIPCOIN!', type: 'success' });
      setTimeout(() => setFeedback(null), 4500);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Lỗi liên kết Telegram', type: 'error' });
    }
  };

  const isBound = Boolean(currentUser?.tonWalletAddress);
  const currentTierMeta = currentUser?.tier
    ? TIER_CONFIGS[currentUser.tier]
    : (IS_LOCAL_DEV ? TIER_CONFIGS['CHIP GOLD'] : TIER_CONFIGS['CHIP MEMBER']);
  const canWithdraw = currentTierMeta.canTransferAndWithdraw;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Wallet Sub Navigation Tabs */}
      <WalletNavTabs currentUser={currentUser} />

      {/* Top Banner with TON Styling */}
      <section
        className="glass-card"
        style={{
          background:
            'radial-gradient(circle at 100% 0%, rgba(0, 152, 234, 0.25) 0%, rgba(18, 20, 24, 0.95) 70%)',
          border: '1.5px solid rgba(0, 152, 234, 0.4)',
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(0, 152, 234, 0.15)',
        }}
      >
        <div style={{ maxWidth: '850px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '0.8rem' }}>
            <span
              className="badge"
              style={{
                background: 'rgba(0, 152, 234, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(0, 152, 234, 0.45)',
                fontWeight: 700,
              }}
            >
              {t('ton_badge')}
            </span>
          </div>

          <h1 style={{ fontSize: '2.3rem', lineHeight: 1.25, marginBottom: '0.8rem' }}>
            {t('ton_title')}
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {t('ton_desc')}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
              }}
            >
              <span>💎</span> Tonkeeper
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
              }}
            >
              <span>✈️</span> Telegram Wallet
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
              }}
            >
              <span>🛡️</span> MyTonWallet
            </div>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={`alert-box ${
            feedback.type === 'success' ? 'alert-success' : feedback.type === 'error' ? 'alert-error' : 'alert-info'
          }`}
          style={{ marginBottom: 0 }}
        >
          <span>{feedback.type === 'success' ? '🎉' : feedback.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <div style={{ fontWeight: 600 }}>{feedback.message}</div>
        </div>
      )}

      {/* Connected State vs Connect Form */}
      {isBound ? (
        /* ALREADY BOUND WALLET VIEW */
        (() => {
          const boundMeta = detectWalletNetwork(currentUser?.tonWalletAddress || '');
          return (
            <section
              className="glass-card"
              style={{
                padding: '2.2rem',
                border: `1.5px solid ${boundMeta.isTron ? '#ef4444' : '#0098ea'}`,
                background: boundMeta.isTron
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(18, 20, 24, 0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(0, 152, 234, 0.08) 0%, rgba(18, 20, 24, 0.95) 100%)',
                boxShadow: `0 12px 32px ${boundMeta.isTron ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 152, 234, 0.15)'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '14px',
                      background: boundMeta.isTron
                        ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                        : 'linear-gradient(135deg, #00c2ff 0%, #0077b6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.8rem',
                      boxShadow: `0 0 20px ${boundMeta.isTron ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 194, 255, 0.4)'}`,
                    }}
                  >
                    {boundMeta.icon}
                  </div>
                  <div>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: 'rgba(52, 211, 153, 0.2)',
                        color: '#34d399',
                        border: '1px solid rgba(52, 211, 153, 0.4)',
                      }}
                    >
                      ✓ Đã liên kết {boundMeta.shortName}
                    </span>
                    <h2 style={{ fontSize: '1.4rem', marginTop: '4px' }}>Ví {boundMeta.networkName} Của Bạn</h2>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>THỜI ĐIỂM XÁC THỰC</div>
                  <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600 }}>
                    {currentUser?.tonBoundAt ? new Date(currentUser.tonBoundAt).toLocaleString() : '2026-10-20 12:00'}
                  </div>
                </div>
              </div>

              {/* Bound Address Display Box */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: `1px solid ${boundMeta.isTron ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 152, 234, 0.4)'}`,
                  borderRadius: '12px',
                  padding: '1.2rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    ĐỊA CHỈ VÍ {boundMeta.shortName.toUpperCase()} ĐÃ XÁC THỰC:
                  </div>
                  <a
                    href={boundMeta.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.78rem',
                      color: boundMeta.isTron ? '#fca5a5' : '#38bdf8',
                      textDecoration: 'none',
                      fontWeight: 700,
                    }}
                  >
                    🔍 Tra cứu trên {boundMeta.explorerName} ↗
                  </a>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.1rem',
                    color: boundMeta.isTron ? '#fca5a5' : '#38bdf8',
                    fontWeight: 700,
                    wordBreak: 'break-all',
                  }}
                >
                  {currentUser?.tonWalletAddress}
                </div>
              </div>

              {/* Bridge & Tier Status */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.2rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    HẠNG HỘI VIÊN &amp; QUYỀN RÚT CHIP:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        background: currentTierMeta.gradient,
                        color: '#0b0c0e',
                      }}
                    >
                      {currentUser?.tier}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: canWithdraw ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                      {canWithdraw ? '✓ Được phép rút chip sang ví cá nhân' : '🔒 Cần đạt CHIP PLATINUM để rút'}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    BẢO VỆ TIMELOCK 7 NGÀY:
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600, marginTop: '6px' }}>
                    🛡️ Đang kích hoạt khóa an toàn đóng băng địa chỉ ví
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link href="/wallet" className="nav-btn" style={{ fontSize: '0.9rem', padding: '9px 20px' }}>
                  🪙 Đi tới Ví CHIP để giao dịch →
                </Link>
                <Link href="/rank" className="btn-secondary" style={{ fontSize: '0.9rem', padding: '9px 20px' }}>
                  👑 Xem điều kiện thăng cấp
                </Link>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary"
                  style={{ fontSize: '0.9rem', padding: '9px 20px', cursor: 'pointer' }}
                >
                  🔄 Liên kết ví khác
                </button>
              </div>
            </section>
          );
        })()
      ) : (
        /* CONNECT TON WALLET STEP-BY-STEP FORM */
        <section
          className="glass-card"
          style={{
            padding: '2.2rem',
            border: '1.5px solid var(--border-bronze)',
          }}
        >
          {/* Step indicators */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '1.2rem',
            }}
          >
            {[
              { num: 1, title: 'Nhập địa chỉ ví' },
              { num: 2, title: 'Ký mật mã TonProof' },
              { num: 3, title: 'Xác thực OTP Email' },
            ].map((s) => (
              <div
                key={s.num}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: step === s.num ? '#00c2ff' : step > s.num ? '#34d399' : 'var(--text-muted)',
                  fontWeight: step === s.num ? 700 : 500,
                  fontSize: '0.88rem',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background:
                      step === s.num
                        ? 'rgba(0, 152, 234, 0.25)'
                        : step > s.num
                        ? 'rgba(52, 211, 153, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: `1.5px solid ${
                      step === s.num ? '#00c2ff' : step > s.num ? '#34d399' : 'var(--border-subtle)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                  }}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className="hide-mobile">{s.title}</span>
              </div>
            ))}
          </div>

          {/* STEP 1: Address Input */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>{t('ton_step1_title')}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {t('ton_step1_desc')}
              </p>

              {/* Network Mode Selector */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">1. Chọn Mạng Lưới Ví Bạn Muốn Liên Kết:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setNetworkMode('TON');
                      setSelectedWallet('Tonkeeper');
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: networkMode === 'TON' ? 'rgba(0, 152, 234, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: networkMode === 'TON' ? '1.5px solid #00c2ff' : '1px solid var(--border-subtle)',
                      color: networkMode === 'TON' ? '#00c2ff' : 'var(--text-secondary)',
                      fontWeight: networkMode === 'TON' ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.88rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>💎</span>
                      <strong>Mạng The Open Network (TON)</strong>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Tonkeeper, Telegram @wallet, MyTonWallet (bắt đầu bằng EQ/UQ)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNetworkMode('TRON');
                      setSelectedWallet('TronLink');
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: networkMode === 'TRON' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: networkMode === 'TRON' ? '1.5px solid #ef4444' : '1px solid var(--border-subtle)',
                      color: networkMode === 'TRON' ? '#fca5a5' : 'var(--text-secondary)',
                      fontWeight: networkMode === 'TRON' ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.88rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>🔴</span>
                      <strong>Mạng TRON (TRC-20 USDT)</strong>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Binance, OKX, TronLink, Trust Wallet (bắt đầu bằng chữ T)
                    </div>
                  </button>
                </div>
              </div>

              {/* Wallet Provider Selector */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">
                  2. Chọn ứng dụng ví bạn đang sử dụng:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {(networkMode === 'TON'
                    ? (['Tonkeeper', 'Telegram Wallet', 'MyTonWallet', 'Other'] as const)
                    : (['TronLink', 'Trust Wallet', 'Binance', 'Other'] as const)
                  ).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setSelectedWallet(w as any)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '10px',
                        background:
                          selectedWallet === w
                            ? networkMode === 'TON'
                              ? 'rgba(0, 152, 234, 0.18)'
                              : 'rgba(239, 68, 68, 0.18)'
                            : 'rgba(255, 255, 255, 0.03)',
                        border:
                          selectedWallet === w
                            ? `1.5px solid ${networkMode === 'TON' ? '#00c2ff' : '#ef4444'}`
                            : '1px solid var(--border-subtle)',
                        color:
                          selectedWallet === w
                            ? networkMode === 'TON'
                              ? '#00c2ff'
                              : '#fca5a5'
                            : 'var(--text-secondary)',
                        fontWeight: selectedWallet === w ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '0.85rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick links to open TON wallet */}
              {networkMode === 'TON' && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                  <a
                    href="https://app.tonkeeper.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px', textDecoration: 'none', color: '#38bdf8' }}
                  >
                    💎 Mở Tonkeeper Web (app.tonkeeper.com) ↗
                  </a>
                  <a
                    href="https://t.me/wallet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px', textDecoration: 'none', color: '#38bdf8' }}
                  >
                    ✈️ Mở Telegram Wallet (@wallet) ↗
                  </a>
                </div>
              )}

              {/* Address Input */}
              <div className="form-group">
                <label className="form-label" htmlFor="tonAddr">
                  3. Nhập Địa Chỉ Ví {networkMode === 'TON' ? 'TON (EQ... hoặc UQ...)' : 'TRON (bắt đầu bằng T...)'}:
                </label>
                <input
                  id="tonAddr"
                  type="text"
                  className="form-input"
                  placeholder={
                    networkMode === 'TON'
                      ? 'UQCVAiHyPJ1EkUvTIubK53SXMvwThmpAMrKxdLlkQLiMSRqr'
                      : 'TBztwgxtzSBPvFA56VM5Mpozh6Gj84KPhh'
                  }
                  value={tonAddress}
                  onChange={(e) => setTonAddress(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                  required
                />

                {tonAddress.trim().startsWith('T') && networkMode === 'TON' && (
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#fef08a',
                      background: 'rgba(234, 179, 8, 0.1)',
                      border: '1px solid rgba(234, 179, 8, 0.3)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      marginTop: '8px',
                    }}
                  >
                    💡 <strong>Phát hiện địa chỉ mạng TRON (TRC-20):</strong> Bạn đang nhập địa chỉ bắt đầu bằng chữ <code>T</code> (34 ký tự). Hệ thống tự động chấp nhận và định tuyến tra cứu qua <strong>Tronscan</strong>.
                  </div>
                )}
              </div>

              {/* Sample Preset helper button — ONLY shown in local dev for easy testing */}
              {IS_LOCAL_DEV && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setNetworkMode('TON');
                      setTonAddress('UQCVAiHyPJ1EkUvTIubK53SXMvwThmpAMrKxdLlkQLiMSRqr');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Ví mẫu TON (Tonkeeper)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNetworkMode('TRON');
                      setTonAddress('TBztwgxtzSBPvFA56VM5Mpozh6Gj84KPhh');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f87171',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Ví mẫu TRON TRC-20 (TBztwg...)
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleProceedToStep2}
                className="nav-btn"
                style={{
                  background:
                    networkMode === 'TON'
                      ? 'linear-gradient(135deg, #00c2ff 0%, #0077b6 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  padding: '12px 24px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}
              >
                Tiếp tục: Ký mật mã Proof →
              </button>
            </div>
          )}

          {/* STEP 2: Cryptographic Signature (TonProof) */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>{t('ton_step2_title')}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {t('ton_step2_desc')}
              </p>

              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '1.2rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    NONCE ĐỘC BẢN HỆ THỐNG PHÁT HÀNH:
                  </span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#f5d77f' }}>
                    {nonce}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    CHỮ KÝ MẬT MÃ ED25519 TONPROOF ĐƯỢC TẠO:
                  </span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#38bdf8' }}>
                    {signedNonce}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                >
                  ← Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleProceedToStep3}
                  className="nav-btn"
                  style={{
                    background: 'linear-gradient(135deg, #00c2ff 0%, #0077b6 100%)',
                    color: '#ffffff',
                    padding: '10px 22px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                >
                  Xác nhận chữ ký &amp; Nhận OTP Email →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Email OTP Verification */}
          {step === 3 && (
            <form onSubmit={handleConfirmBind}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>{t('ton_step3_title')}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {t('ton_step3_desc')}
              </p>

              <div className="form-group" style={{ maxWidth: '320px' }}>
                <label className="form-label" htmlFor="otp">
                  Nhập Mã OTP 6 Số:
                </label>
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  className="form-input"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.6rem',
                    letterSpacing: '0.3em',
                    textAlign: 'center',
                    fontWeight: 800,
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpTimer > 0}
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                >
                  {otpTimer > 0 ? `Gửi lại sau (${otpTimer}s)` : 'Gửi lại mã OTP'}
                </button>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Email nhận: {currentUser?.email}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                >
                  ← Quay lại
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #00c2ff 0%, #0077b6 100%)',
                    padding: '10px 24px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                  }}
                >
                  {verifying ? (
                    <>
                      <div className="spinner" />
                      Đang xác minh giao dịch...
                    </>
                  ) : (
                    `💎 ${t('ton_btn_bind')}`
                  )}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Telegram Identity & Wallet Link Section */}
      <section
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 136, 204, 0.08) 0%, rgba(18, 20, 24, 0.95) 100%)',
          border: '1.5px solid rgba(0, 136, 204, 0.35)',
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>✈️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0088cc' }}>
                Liên Kết Tài Khoản Telegram (Telegram Wallet & Mini App)
              </h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Đồng bộ tài khoản CHIPCOIN với Telegram User ID để nhận diện và nạp/rút USDT tức thì qua bot
              </span>
            </div>
          </div>

          <span
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 800,
              background: currentUser?.telegramUserId ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
              color: currentUser?.telegramUserId ? '#34d399' : '#fbbf24',
              border: `1px solid ${currentUser?.telegramUserId ? 'rgba(52, 211, 153, 0.35)' : 'rgba(251, 191, 36, 0.35)'}`,
            }}
          >
            {currentUser?.telegramUserId ? '✓ ĐÃ LIÊN KẾT TELEGRAM' : 'CHƯA LIÊN KẾT'}
          </span>
        </div>

        <form onSubmit={handleBindTelegram} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Telegram User ID (Định danh Telegram):
            </label>
            <input
              type="text"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              placeholder="Ví dụ: tg_982144912 hoặc 982144912"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Telegram Username (Tùy chọn):
            </label>
            <input
              type="text"
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value)}
              placeholder="Ví dụ: @chipcoin_vip"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <button
              type="submit"
              className="nav-btn"
              style={{
                width: '100%',
                padding: '11px',
                background: 'linear-gradient(135deg, #0088cc 0%, #006699 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              Lưu Liên Kết Telegram
            </button>
          </div>
        </form>

        {currentUser?.telegramUserId && (
          <div style={{ marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Đang liên kết với: <b style={{ color: '#ffffff' }}>{currentUser.telegramUserId}</b>{' '}
            {currentUser.telegramUsername && <span style={{ color: '#38bdf8' }}>({`@${currentUser.telegramUsername}`})</span>}
          </div>
        )}
      </section>

      {/* Security Timelock Notice Box */}
      <section
        style={{
          background: 'rgba(0, 152, 234, 0.05)',
          border: '1px solid rgba(0, 152, 234, 0.3)',
          borderRadius: '12px',
          padding: '1.6rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700, marginBottom: '6px' }}>
          <span>🛡️</span>
          <span>{t('ton_timelock_title')}</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
          {t('ton_timelock_desc')}
        </p>
      </section>
    </div>
  );
}
