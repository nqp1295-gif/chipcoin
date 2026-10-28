'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from './lib/i18n';
import { ChipStore, StoredUser, TIER_CONFIGS } from './lib/store';

// ============================================================================
// ENVIRONMENT GATE: Hardcoded preview data only shown in local dev mode
// ============================================================================
const IS_LOCAL_DEV =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_USE_SEED_DATA === 'true';

export default function UserOverviewPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = () => {
    const mem = ChipStore.getCurrentMember();
    setCurrentUser(mem);
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

  const balance = currentUser?.chipsBalance ?? 0;
  const streakDays = currentUser?.streakDays ?? 0;
  const currentTier = currentUser?.tier ?? 'CHIP MEMBER';
  const tierMeta = TIER_CONFIGS[currentTier];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isClaimedToday = currentUser?.lastClaimDate === todayStr;

  const handleQuickCheckin = () => {
    if (!currentUser) {
      setFeedback('Vui lòng đăng nhập hoặc tạo tài khoản để thực hiện điểm danh và nhận thưởng!');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
      return;
    }

    // Check if already claimed today
    if (currentUser.lastClaimDate === todayStr) {
      setFeedback('Bạn đã điểm danh hôm nay rồi! Hãy quay lại vào ngày mai.');
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    const bonus = 250;
    const { user, promoted } = ChipStore.addChips(currentUser.id, bonus, 'Điểm danh nhanh tại trang tổng quan');
    ChipStore.recordDailyCheckin(currentUser.id);
    // Re-fetch user to get updated streak
    const refreshed = ChipStore.getUserById(currentUser.id);
    setCurrentUser(refreshed || user);

    if (promoted) {
      setFeedback(`🎉 Chúc mừng! Bạn đã được thăng hạng lên [${user.tier}]!`);
    } else {
      setFeedback(`🎉 Chúc mừng! Bạn đã điểm danh và nhận +${bonus} CHIP vào ví!`);
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Hero Banner Section */}
      <section
        className="glass-card"
        style={{
          background:
            'radial-gradient(circle at 100% 0%, rgba(212, 175, 55, 0.15) 0%, rgba(18, 20, 24, 0.95) 70%)',
          border: '1px solid var(--border-bronze)',
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '850px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', marginBottom: '1rem' }}>
            {currentUser ? (
              <span className="badge badge-gold">{t('overview_hero_badge')}</span>
            ) : (
              <span
                className="badge"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#f5d77f',
                  border: '1px solid var(--border-bronze)',
                }}
              >
                👁️ Chế Độ Khách — Chỉ Xem Tổng Quan
              </span>
            )}
          </div>

          <h1
            style={{
              fontSize: '2.4rem',
              lineHeight: 1.25,
              marginBottom: '1rem',
              fontWeight: 800,
            }}
          >
            {t('overview_hero_welcome')}{' '}
            <span
              style={{
                background: 'var(--gradient-bronze)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CHIPCOIN
            </span>
          </h1>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1.05rem',
              lineHeight: 1.6,
              marginBottom: currentUser ? '1.8rem' : '1.2rem',
            }}
          >
            {t('overview_hero_desc')}
          </p>

          {!currentUser && (
            <div
              style={{
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid var(--border-bronze)',
                borderRadius: '10px',
                padding: '12px 18px',
                marginBottom: '1.8rem',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                color: '#fef3c7',
              }}
            >
              👋 <strong>Chào mừng bạn đến với CHIPCOIN!</strong> Bạn đang xem ở chế độ Khách vãng lai. Vui lòng <strong>Đăng nhập</strong> hoặc <strong>Đăng ký tài khoản</strong> để kích hoạt ví điểm, điểm danh hàng ngày và truy cập đầy đủ các trang thông tin cá nhân.
            </div>
          )}

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {currentUser ? (
              <>
                <Link
                  href="/activities"
                  className="nav-btn"
                  style={{ fontSize: '0.95rem', padding: '10px 24px' }}
                >
                  {t('overview_btn_activities')}
                </Link>

                <Link
                  href="/rank"
                  className="btn-secondary"
                  style={{ fontSize: '0.95rem', padding: '10px 24px' }}
                >
                  {t('overview_btn_rank')}
                </Link>

                <Link
                  href="/wallet"
                  className="btn-secondary"
                  style={{ fontSize: '0.95rem', padding: '10px 24px' }}
                >
                  {t('overview_btn_wallet')}
                </Link>

                <button
                  onClick={handleQuickCheckin}
                  className="nav-btn"
                  disabled={isClaimedToday}
                  style={{
                    fontSize: '0.95rem',
                    padding: '10px 24px',
                    background: isClaimedToday ? 'rgba(52, 211, 153, 0.2)' : 'rgba(212, 175, 55, 0.15)',
                    color: isClaimedToday ? '#34d399' : '#f5d77f',
                    border: isClaimedToday ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid var(--border-bronze)',
                    cursor: isClaimedToday ? 'default' : 'pointer',
                  }}
                >
                  {isClaimedToday ? '✓ Đã điểm danh hôm nay' : t('overview_btn_checkin')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="nav-btn"
                  style={{ fontSize: '0.95rem', padding: '10px 24px' }}
                >
                  ✨ Đăng Ký Tài Khoản Nhận Thưởng
                </Link>

                <Link
                  href="/login"
                  className="btn-secondary"
                  style={{ fontSize: '0.95rem', padding: '10px 24px' }}
                >
                  🔑 Đăng Nhập
                </Link>

                <button
                  onClick={handleQuickCheckin}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.95rem',
                    padding: '10px 24px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-muted)',
                    border: '1px dashed var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                  title="Cần đăng nhập để điểm danh"
                >
                  🔒 Đăng nhập để điểm danh (+250)
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {feedback && (
        <div className="alert-box alert-success" style={{ marginBottom: 0 }}>
          <span>✨</span>
          <div>{feedback}</div>
        </div>
      )}

      {/* Member Glance Statistics Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.2rem',
        }}
      >
        {/* Số dư cá nhân */}
        <div className="glass-card glow-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {t('overview_stat_balance')}
            </span>
            <span className="badge badge-gold">CHIP</span>
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              marginTop: '8px',
            }}
          >
            {currentUser ? balance.toLocaleString() : '--'}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#38bdf8', marginTop: '4px' }}>
            {currentUser
              ? `≈ ${(balance / 5000000).toFixed(4)} USDT (1 USDT = 5,000,000 CHIP)`
              : 'Đăng nhập để xem số dư'}
          </div>
        </div>

        {/* Cấp bậc hội viên */}
        <div className="glass-card glow-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {t('overview_stat_tier')}
            </span>
            <span style={{ color: currentUser ? tierMeta.badgeColor : 'var(--text-muted)' }}>👑</span>
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: currentUser ? tierMeta.badgeColor : 'var(--text-muted)',
              marginTop: '8px',
            }}
          >
            {currentUser ? currentTier : 'Khách Truy Cập'}
          </div>
          <div style={{ fontSize: '0.82rem', color: currentUser ? '#34d399' : 'var(--text-muted)', marginTop: '4px' }}>
            {currentUser
              ? (tierMeta.bonusRate > 0 ? `+${tierMeta.bonusRate * 100}% bonus` : 'Active')
              : 'Chưa đăng ký tài khoản'}
          </div>
        </div>

        {/* Chuỗi điểm danh Streak */}
        <div className="glass-card glow-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {t('overview_stat_streak')}
            </span>
            <span style={{ color: '#fbbf24' }}>🔥</span>
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              marginTop: '8px',
            }}
          >
            {currentUser ? `${streakDays} / 7` : '0 / 7'}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {currentUser ? 'Streak Status' : 'Cần đăng nhập'}
          </div>
        </div>

        {/* Trạng thái xác minh */}
        <div className="glass-card glow-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {t('overview_stat_status')}
            </span>
            <span className={currentUser ? 'status-dot-pulse' : ''} style={!currentUser ? { width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' } : undefined} />
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: currentUser ? '#34d399' : 'var(--text-muted)',
              marginTop: '8px',
            }}
          >
            {currentUser ? t('overview_status_active') : 'Chưa Đăng Ký'}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {currentUser ? 'Tài Khoản Đang Hoạt Động' : 'Vui lòng đăng ký tài khoản'}
          </div>
        </div>
      </section>

      {/* Feature Spotlight: Hoạt Động Tích Lũy & Thăng Hạng */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.4rem',
        }}
      >
        {/* Card 1: Hoạt Động Tích Lũy Highlight */}
        <div
          className="glass-card glow-hover"
          style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(18, 20, 24, 0.85) 100%)',
            border: '1px solid var(--border-bronze)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '2rem' }}>⭐</span>
              <span className="badge badge-gold">{t('overview_box1_badge')}</span>
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{t('overview_box1_title')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              {t('overview_box1_desc')}
            </p>
          </div>
          <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-subtle)' }}>
            <Link
              href={currentUser ? '/activities' : '/login?redirect=/activities'}
              className="nav-btn"
              style={{ display: 'inline-flex', padding: '10px 20px', fontSize: '0.9rem' }}
            >
              {currentUser ? t('overview_box1_btn') : 'Đăng nhập để tham gia →'}
            </Link>
          </div>
        </div>

        {/* Card 2: Thăng Hạng Highlight */}
        <div
          className="glass-card glow-hover"
          style={{
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(18, 20, 24, 0.85) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '2rem' }}>👑</span>
              <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                {t('overview_box2_badge')}
              </span>
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{t('overview_box2_title')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              {t('overview_box2_desc')}
            </p>
          </div>
          <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-subtle)' }}>
            <Link
              href={currentUser ? '/rank' : '/login?redirect=/rank'}
              className="nav-btn"
              style={{
                display: 'inline-flex',
                padding: '10px 20px',
                fontSize: '0.9rem',
                background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                color: '#0b0c0e',
              }}
            >
              {currentUser ? t('overview_box2_btn') : 'Đăng nhập xem cấp bậc →'}
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Activity Table for Member */}
      <section className="glass-card" style={{ padding: '1.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem' }}>{t('overview_recent_tx')}</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t('overview_recent_tx_sub')}
            </span>
          </div>

          <Link
            href={currentUser ? '/wallet' : '/login'}
            className="nav-btn"
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
          >
            {currentUser ? t('overview_view_all') : 'Đăng nhập để xem ví →'}
          </Link>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('col_tx_id')}</th>
                <th>{t('col_activity')}</th>
                <th>{t('col_time')}</th>
                <th>{t('col_points')}</th>
                <th>{t('col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {!currentUser ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                    <div style={{ marginBottom: '8px', fontSize: '1.5rem' }}>🔒</div>
                    <div>
                      Bạn đang xem ở chế độ Khách. Vui lòng{' '}
                      <Link href="/login" style={{ color: '#f5d77f', textDecoration: 'underline', fontWeight: 600 }}>
                        Đăng nhập
                      </Link>{' '}
                      hoặc{' '}
                      <Link href="/register" style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: 600 }}>
                        Đăng ký tài khoản
                      </Link>{' '}
                      để xem lịch sử tích lũy điểm thưởng cá nhân.
                    </div>
                  </td>
                </tr>
              ) : IS_LOCAL_DEV ? (
                <>
              <tr>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 600 }}>
                  TX-20261026-9041
                </td>
                <td style={{ color: '#ffffff', fontWeight: 500 }}>Community Mission Reward</td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>2026-10-26 21:40</td>
                <td style={{ color: '#34d399', fontWeight: 700 }}>+15,000 CHIP</td>
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
                    {t('badge_credited')}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 600 }}>
                  TX-20261026-8812
                </td>
                <td style={{ color: '#ffffff', fontWeight: 500 }}>Email Verification Reward</td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>2026-10-26 18:15</td>
                <td style={{ color: '#34d399', fontWeight: 700 }}>+5,000 CHIP</td>
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
                    {t('badge_credited')}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 600 }}>
                  TX-20261025-7650
                </td>
                <td style={{ color: '#ffffff', fontWeight: 500 }}>Daily Streak Reward (Day 5)</td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>2026-10-25 14:02</td>
                <td style={{ color: '#34d399', fontWeight: 700 }}>+25,000 CHIP</td>
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
                    {t('badge_credited')}
                  </span>
                </td>
              </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    Chưa có giao dịch nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
