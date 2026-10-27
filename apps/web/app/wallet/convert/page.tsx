'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '../../lib/i18n';
import {
  ChipStore,
  StoredUser,
  ConversionOrder,
  CHIP_PER_USDT,
  chipToUsdt,
  usdtToChip,
} from '../../lib/store';
import WalletNavTabs from '../components/WalletNavTabs';

// ============================================================================
// ENVIRONMENT GATE: Preset simulation input only loaded in local dev mode
// ============================================================================
const IS_LOCAL_DEV =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_USE_SEED_DATA === 'true';

export default function ConvertPage() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  // Direction: 'CHIP_TO_USDT' or 'USDT_TO_CHIP'
  const [direction, setDirection] = useState<'CHIP_TO_USDT' | 'USDT_TO_CHIP'>('CHIP_TO_USDT');
  const [sourceInput, setSourceInput] = useState<string>(IS_LOCAL_DEV ? '5000000' : '');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [conversions, setConversions] = useState<ConversionOrder[]>([]);

  const loadData = () => {
    let mem = ChipStore.getCurrentMember();
    if (!mem) {
      const users = ChipStore.getUsers();
      mem = users.find((u) => u.roles.includes('USER')) || users[0];
      if (mem) ChipStore.setMemberSession(mem);
    }
    setCurrentUser(mem);
    setConversions(ChipStore.getConversions());
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

  const numSource = parseFloat(sourceInput) || 0;

  // Real-time calculation based on 1 USDT = 5,000,000 CHIP
  const calculatedTarget =
    direction === 'CHIP_TO_USDT'
      ? chipToUsdt(numSource)
      : usdtToChip(numSource);

  const availableSourceBalance =
    direction === 'CHIP_TO_USDT'
      ? currentUser?.chipsBalance || 0
      : currentUser?.usdtBalance || 0;

  const handlePercentage = (percent: number) => {
    const raw = (availableSourceBalance * percent) / 100;
    if (direction === 'CHIP_TO_USDT') {
      setSourceInput(Math.floor(raw).toString());
    } else {
      setSourceInput(Number(raw.toFixed(4)).toString());
    }
  };

  const toggleDirection = () => {
    setDirection((prev) => (prev === 'CHIP_TO_USDT' ? 'USDT_TO_CHIP' : 'CHIP_TO_USDT'));
    setSourceInput(direction === 'CHIP_TO_USDT' ? '1' : '5000000');
    setFeedback(null);
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentUser) {
      setFeedback({ message: 'Vui lòng đăng nhập để thực hiện quy đổi.', type: 'error' });
      return;
    }

    if (numSource <= 0) {
      setFeedback({ message: 'Vui lòng nhập số lượng lớn hơn 0.', type: 'error' });
      return;
    }

    if (numSource > availableSourceBalance) {
      setFeedback({
        message: `Số dư không đủ! Khả dụng: ${availableSourceBalance.toLocaleString()} ${
          direction === 'CHIP_TO_USDT' ? 'CHIP' : 'USDT'
        }`,
        type: 'error',
      });
      return;
    }

    // Open 2FA modal
    setTwoFactorCode('');
    setShowTwoFactorModal(true);
  };

  const handleExecuteConvert = () => {
    if (!currentUser) return;

    if (currentUser.twoFactorEnabled && twoFactorCode.trim().length < 6) {
      setFeedback({ message: 'Vui lòng nhập đủ mã xác thực 2FA 6 chữ số.', type: 'error' });
      return;
    }

    setIsConverting(true);
    setFeedback(null);

    setTimeout(() => {
      try {
        const fromAsset = direction === 'CHIP_TO_USDT' ? 'CHIP' : 'USDT';
        const res = ChipStore.convertAssets(currentUser.id, fromAsset, numSource);
        setCurrentUser(res.user);
        setConversions(ChipStore.getConversions());
        setShowTwoFactorModal(false);
        setIsConverting(false);
        setFeedback({
          message: `🎉 Quy đổi thành công! Đã chuyển ${numSource.toLocaleString()} ${fromAsset} sang ${
            res.order.targetAmount.toLocaleString()
          } ${res.order.toAsset} theo tỷ giá 1 USDT = 5,000,000 CHIP.`,
          type: 'success',
        });
      } catch (err: any) {
        setIsConverting(false);
        setFeedback({ message: err.message || 'Lỗi xử lý quy đổi tài sản.', type: 'error' });
      }
    }, 600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Wallet Sub Navigation Tabs */}
      <WalletNavTabs currentUser={currentUser} />

      {/* Page Header */}
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
            🔄 ATOMIC TWO-WAY LEDGER SWAP
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>{t('convert_title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            {t('convert_desc')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/wallet" className="btn-secondary" style={{ fontSize: '0.88rem', padding: '8px 16px' }}>
            📊 {t('tab_overview')}
          </Link>
          <Link href="/wallet/withdraw" className="btn-secondary" style={{ fontSize: '0.88rem', padding: '8px 16px' }}>
            📤 {t('tab_withdraw')}
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

      {/* Main Converter Card & Rates Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Conversion Box */}
        <div
          className="glass-card"
          style={{
            background:
              'linear-gradient(135deg, rgba(28, 23, 14, 0.95) 0%, rgba(18, 20, 24, 0.95) 100%)',
            border: '1.5px solid var(--border-bronze)',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.2rem',
            }}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-bronze-light)' }}>
              {direction === 'CHIP_TO_USDT' ? 'QUY ĐỔI: CHIP ➔ USDT' : 'QUY ĐỔI: USDT ➔ CHIP'}
            </span>
            <button
              onClick={toggleDirection}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid var(--border-bronze)',
                color: '#f5d77f',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              ⇅ Đổi chiều quy đổi
            </button>
          </div>

          <form onSubmit={handleOpenConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Source Input */}
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-medium)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bạn chuyển:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Khả dụng:{' '}
                  <b style={{ color: '#ffffff' }}>
                    {availableSourceBalance.toLocaleString()}{' '}
                    {direction === 'CHIP_TO_USDT' ? 'CHIP' : 'USDT'}
                  </b>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  step={direction === 'CHIP_TO_USDT' ? '1' : '0.000001'}
                  min="0"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    fontFamily: 'Outfit, sans-serif',
                    outline: 'none',
                  }}
                  placeholder="0.0"
                />
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    background: direction === 'CHIP_TO_USDT' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                    color: direction === 'CHIP_TO_USDT' ? '#f5d77f' : '#38bdf8',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  {direction === 'CHIP_TO_USDT' ? '🪙 CHIP' : '💵 USDT'}
                </span>
              </div>

              {/* Percentage buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                {[25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePercentage(p)}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-secondary)',
                      padding: '5px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {p === 100 ? 'Tối đa' : `${p}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Display */}
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-medium)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bạn nhận được (ước tính):</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>Tỷ giá cố định 1:5,000,000</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    flex: 1,
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: '#34d399',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {calculatedTarget.toLocaleString()}
                </div>
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    background: direction === 'CHIP_TO_USDT' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                    color: direction === 'CHIP_TO_USDT' ? '#38bdf8' : '#f5d77f',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  {direction === 'CHIP_TO_USDT' ? '💵 USDT' : '🪙 CHIP'}
                </span>
              </div>
            </div>

            {/* Rate Details */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(212, 175, 55, 0.05)',
                border: '1px solid var(--border-bronze)',
                borderRadius: '8px',
                fontSize: '0.82rem',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Tỷ giá áp dụng:</span>
              <span style={{ fontWeight: 700, color: '#f5d77f' }}>1 USDT = 5,000,000 CHIP (Phí: 0%)</span>
            </div>

            <button
              type="submit"
              className="nav-btn"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Xác Nhận Quy Đổi Tức Thì
            </button>
          </form>
        </div>

        {/* Regulatory & Formula Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="glass-card" style={{ padding: '1.4rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#f5d77f', marginBottom: '8px' }}>
              📜 Quy Định Chuyển Đổi Giá CHIP sang USDT
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
              Căn cứ theo tài liệu <b>CHIPCOIN_TELEGRAM_WALLET.md</b>, hệ thống áp dụng tỷ giá nội bộ bất biến:
            </p>

            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.7, paddingLeft: '20px' }}>
              <li>
                <b>Tỷ giá chuẩn:</b> <code>1 USDT = 5,000,000 CHIP</code>.
              </li>
              <li>
                <b>Đơn vị nguyên tử:</b> <code>1 micro-USDT = 5 CHIP</code> (1 USDT có 6 chữ số thập phân trên TON).
              </li>
              <li>
                <b>Cơ chế hai chiều:</b> Thành viên có thể đổi CHIP sang USDT nội bộ hoặc dùng USDT đổi lấy CHIP để tăng cấp bậc hội viên.
              </li>
              <li>
                <b>Bảo đảm sổ cái kép:</b> Mọi lệnh quy đổi được hạch toán đồng thời giữa tài khoản cá nhân và quỹ thanh khoản của hệ thống.
              </li>
              <li>
                <b>Quyền rút tiền ra ngoài:</b> Số dư USDT quy đổi có thể rút về ví TON cá nhân hoặc Telegram Wallet khi thành viên đạt từ hạng <b>CHIP PLATINUM</b> trở lên.
              </li>
            </ul>
          </div>

          <div
            className="glass-card"
            style={{
              padding: '1.4rem',
              background: 'linear-gradient(135deg, rgba(0, 152, 234, 0.08) 0%, rgba(18, 20, 24, 0.95) 100%)',
              border: '1px solid rgba(0, 152, 234, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>💎</span>
              <h4 style={{ margin: 0, color: '#38bdf8', fontSize: '0.98rem' }}>
                Hệ Sinh Thái TON & Telegram Wallet
              </h4>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Địa chỉ ví TON đã liên kết:{' '}
              {currentUser?.tonWalletAddress ? (
                <code style={{ color: '#38bdf8' }}>
                  {currentUser.tonWalletAddress.slice(0, 8)}...{currentUser.tonWalletAddress.slice(-6)}
                </code>
              ) : (
                <span style={{ color: '#fbbf24' }}>Chưa liên kết</span>
              )}
            </p>
            {!currentUser?.tonWalletAddress && (
              <Link
                href="/ton-wallet"
                className="btn-secondary"
                style={{
                  display: 'inline-block',
                  marginTop: '12px',
                  fontSize: '0.8rem',
                  padding: '6px 14px',
                }}
              >
                Kết nối ví TON ngay →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Conversion History Table */}
      <div className="glass-card" style={{ padding: '1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Lịch Sử Quy Đổi CHIP ↔ USDT</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Nhật ký các giao dịch hoán đổi tài sản nội bộ
            </span>
          </div>
          <span className="badge badge-active">Double-Entry Settled</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>MÃ LỆNH</th>
                <th>THỜI GIAN</th>
                <th>CHIỀU ĐỔI</th>
                <th>SỐ LƯỢNG CHUYỂN</th>
                <th>SỐ LƯỢNG NHẬN</th>
                <th>TỶ GIÁ ÁP DỤNG</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {conversions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    Chưa có giao dịch quy đổi nào được thực hiện.
                  </td>
                </tr>
              ) : (
                conversions.map((conv) => (
                  <tr key={conv.id}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#ffffff', fontWeight: 600 }}>
                      {conv.id}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(conv.createdAt).toLocaleString('sv-SE').replace('T', ' ')}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: conv.fromAsset === 'CHIP' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: conv.fromAsset === 'CHIP' ? '#f5d77f' : '#38bdf8',
                        }}
                      >
                        {conv.fromAsset} ➔ {conv.toAsset}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>
                      {conv.sourceAmount.toLocaleString()} {conv.fromAsset}
                    </td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>
                      +{conv.targetAmount.toLocaleString()} {conv.toAsset}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{conv.rateApplied}</td>
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
                        ĐÃ HẠCH TOÁN
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2FA Security Challenge Modal */}
      {showTwoFactorModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '440px',
              width: '100%',
              background: 'linear-gradient(135deg, #1c170e 0%, #121418 100%)',
              border: '1.5px solid var(--accent-bronze)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#f5d77f', fontSize: '1.2rem' }}>🔐 Xác Thực Giao Dịch 2FA</h3>
              <button
                onClick={() => setShowTwoFactorModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '16px' }}>
              Bạn đang yêu cầu chuyển đổi{' '}
              <b style={{ color: '#ffffff' }}>
                {numSource.toLocaleString()} {direction === 'CHIP_TO_USDT' ? 'CHIP' : 'USDT'}
              </b>{' '}
              thành{' '}
              <b style={{ color: '#34d399' }}>
                {calculatedTarget.toLocaleString()} {direction === 'CHIP_TO_USDT' ? 'USDT' : 'CHIP'}
              </b>
              . Vui lòng nhập mã bảo mật 6 số (TOTP/Email OTP):
            </p>

            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="654321"
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--accent-bronze)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
                (Mẹo thử nghiệm: Có thể nhập bất kỳ 6 số nào hoặc 123456)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowTwoFactorModal(false)}
                className="btn-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteConvert}
                disabled={isConverting}
                className="nav-btn"
                style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer' }}
              >
                {isConverting ? 'Đang hạch toán...' : 'Xác Nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
