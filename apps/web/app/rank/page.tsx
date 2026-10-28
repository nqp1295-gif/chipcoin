'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '../lib/i18n';
import {
  ChipStore,
  StoredUser,
  MemberTier,
  TIER_CONFIGS,
  TierConfig,
  TierPromotionRecord,
} from '../lib/store';

const TIERS_ORDER: MemberTier[] = [
  'CHIP MEMBER',
  'CHIP GOLD',
  'CHIP PLATINUM',
  'CHIP DIAMOND',
  'CHIP SPECIAL',
];

// ============================================================================
// ENVIRONMENT GATE: Mock fallback preview data only loaded in local dev mode
// ============================================================================
const IS_LOCAL_DEV =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_USE_SEED_DATA === 'true';

export default function RankPage() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [promotions, setPromotions] = useState<TierPromotionRecord[]>([]);

  const loadData = () => {
    const mem = ChipStore.getCurrentMember();
    setCurrentUser(mem);
    const allPromos = ChipStore.getPromotions();
    setPromotions(allPromos);
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

  const chips = currentUser?.chipsBalance ?? (IS_LOCAL_DEV ? 1250000 : 0);
  const currentTier: MemberTier = currentUser?.tier ?? (IS_LOCAL_DEV ? 'CHIP GOLD' : 'CHIP MEMBER');
  const referrals = currentUser ? ChipStore.getReferralsByReferrer(currentUser.referralCode) : [];
  const verifiedReferrals = referrals.filter((r) => r.isEmailVerified).length;

  // Determine current tier index
  const currentTierIndex = TIERS_ORDER.indexOf(currentTier);
  const nextTier: MemberTier | null =
    currentTierIndex < TIERS_ORDER.length - 1 ? TIERS_ORDER[currentTierIndex + 1] : null;
  const nextTierConfig: TierConfig | null = nextTier ? TIER_CONFIGS[nextTier] : null;

  // Next tier progress calculation
  const chipsProgress = nextTierConfig
    ? Math.min(100, Math.round((chips / nextTierConfig.minChips) * 100))
    : 100;
  const refsProgress = nextTierConfig
    ? Math.min(100, Math.round((verifiedReferrals / nextTierConfig.minVerifiedReferrals) * 100))
    : 100;
  const overallProgress = Math.round((chipsProgress + refsProgress) / 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header Banner */}
      <section
        className="glass-card"
        style={{
          background:
            'radial-gradient(circle at 100% 0%, rgba(212, 175, 55, 0.2) 0%, rgba(18, 20, 24, 0.95) 70%)',
          border: '1px solid var(--border-bronze)',
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '850px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '0.8rem' }}>
            <span className="badge badge-gold">{t('rank_badge')}</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', lineHeight: 1.25, marginBottom: '0.8rem' }}>
            {t('rank_title')}
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: 1.6, marginBottom: '1.6rem' }}>
            {t('rank_desc')}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/activities" className="nav-btn" style={{ fontSize: '0.92rem', padding: '9px 20px' }}>
              ⭐ {t('nav_activities')}
            </Link>
            <Link href="/referrals" className="btn-secondary" style={{ fontSize: '0.92rem', padding: '9px 20px' }}>
              🤝 {t('nav_referrals')}
            </Link>
            <Link href="/wallet" className="btn-secondary" style={{ fontSize: '0.92rem', padding: '9px 20px' }}>
              🪙 {t('nav_wallet')}
            </Link>
          </div>
        </div>
      </section>

      {/* User Status & Progress Tracker */}
      <section
        className="glass-card"
        style={{
          padding: '2rem',
          border: '1px solid var(--border-bronze)',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(18, 20, 24, 0.9) 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* Left: User Tier info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: TIER_CONFIGS[currentTier].gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 16px ${TIER_CONFIGS[currentTier].badgeColor}44`,
              }}
            >
              👑
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                {t('rank_current_tier')}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: TIER_CONFIGS[currentTier].badgeColor }}>
                {currentTier}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>
                {TIER_CONFIGS[currentTier].bonusRate > 0
                  ? `✓ +${TIER_CONFIGS[currentTier].bonusRate * 100}% bonus`
                  : '✓ Email Verified'}
              </div>
            </div>
          </div>

          {/* Right: Key Stats */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {t('rank_total_chips')}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
                {chips.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--accent-bronze)' }}>CHIP</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {t('rank_f1_verified')}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
                {verifiedReferrals} <span style={{ fontSize: '0.9rem', color: '#34d399' }}>F1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress towards Next Tier */}
        {nextTierConfig ? (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {t('rank_progress_to')} <strong style={{ color: nextTierConfig.badgeColor }}>{nextTierConfig.name}</strong>:
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-bronze)' }}>
                {overallProgress}% {t('rank_completed')}
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
                marginBottom: '1.2rem',
              }}
            >
              <div
                style={{
                  width: `${overallProgress}%`,
                  height: '100%',
                  background: 'var(--gradient-bronze)',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease',
                  boxShadow: '0 0 10px var(--accent-bronze-glow)',
                }}
              />
            </div>

            {/* Breakdown progress items */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
              }}
            >
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('rank_target_chips')}</span>
                  <span style={{ fontWeight: 700, color: chipsProgress >= 100 ? '#34d399' : '#ffffff' }}>
                    {chips.toLocaleString()} / {nextTierConfig.minChips.toLocaleString()} CHIP ({chipsProgress}%)
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${chipsProgress}%`, height: '100%', background: chipsProgress >= 100 ? '#34d399' : '#fbbf24' }} />
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('rank_target_f1')}</span>
                  <span style={{ fontWeight: 700, color: refsProgress >= 100 ? '#34d399' : '#ffffff' }}>
                    {verifiedReferrals} / {nextTierConfig.minVerifiedReferrals} ({refsProgress}%)
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${refsProgress}%`, height: '100%', background: refsProgress >= 100 ? '#34d399' : '#38bdf8' }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1.2rem', color: '#f43f5e', fontWeight: 700, fontSize: '0.95rem' }}>
            {t('rank_special_congrats')}
          </div>
        )}
      </section>

      {/* 5 Tiers Detailed Cards */}
      <section>
        <div style={{ marginBottom: '1.4rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{t('rank_table_title')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            {t('rank_table_sub')}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {TIERS_ORDER.map((tierKey, index) => {
            const config = TIER_CONFIGS[tierKey];
            const isCurrent = tierKey === currentTier;
            const isUnlocked = index <= currentTierIndex;

            return (
              <div
                key={tierKey}
                className="glass-card glow-hover"
                style={{
                  border: isCurrent
                    ? `2px solid ${config.badgeColor}`
                    : isUnlocked
                    ? '1px solid var(--border-bronze)'
                    : '1px solid var(--border-subtle)',
                  padding: '1.8rem',
                  position: 'relative',
                  background: isCurrent
                    ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(18, 20, 24, 0.95) 100%)'
                    : undefined,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: config.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        color: '#0b0c0e',
                        fontWeight: 800,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.4rem', color: config.badgeColor }}>
                          {config.name}
                        </h3>
                        {isCurrent && (
                          <span
                            className="badge badge-gold"
                            style={{ background: 'var(--gradient-bronze)', color: '#0b0c0e' }}
                          >
                            {t('rank_badge_current')}
                          </span>
                        )}
                        {!isCurrent && isUnlocked && (
                          <span className="badge" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
                            {t('rank_badge_unlocked')}
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
                            {t('rank_badge_locked')}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>
                        {config.description}
                      </div>
                    </div>
                  </div>

                  {/* Commission Rate Pill */}
                  <div
                    style={{
                      background: config.bonusRate > 0 ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${config.bonusRate > 0 ? config.badgeColor : 'var(--border-subtle)'}`,
                      borderRadius: '10px',
                      padding: '8px 16px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      {t('rank_commission_bonus')}
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: config.bonusRate > 0 ? config.badgeColor : 'var(--text-muted)' }}>
                      {config.bonusRate > 0 ? `+${config.bonusRate * 100}%` : '0%'}
                    </div>
                  </div>
                </div>

                {/* Requirements & Privileges Breakdown */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.2rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Requirements */}
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                      {t('rank_req_title')}
                    </div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem' }}>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#34d399' }}>✓</span>
                        <span>Đã đăng ký tài khoản xác thực email</span>
                      </li>
                      {config.minChips > 0 && (
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: chips >= config.minChips ? '#34d399' : 'var(--text-muted)' }}>
                            {chips >= config.minChips ? '✓' : '○'}
                          </span>
                          <span>
                            Thu thập &gt; <strong>{config.minChips.toLocaleString()} CHIP</strong> (Hiện có: {chips.toLocaleString()})
                          </span>
                        </li>
                      )}
                      {config.minVerifiedReferrals > 0 && (
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: verifiedReferrals >= config.minVerifiedReferrals ? '#34d399' : 'var(--text-muted)' }}>
                            {verifiedReferrals >= config.minVerifiedReferrals ? '✓' : '○'}
                          </span>
                          <span>
                            Giới thiệu được <strong>{config.minVerifiedReferrals} người</strong> đăng ký xác thực email (Hiện có: {verifiedReferrals})
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Privileges */}
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                      {t('rank_priv_title')}
                    </div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem' }}>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: config.bonusRate > 0 ? '#34d399' : 'var(--text-muted)' }}>
                          {config.bonusRate > 0 ? '✓' : '○'}
                        </span>
                        <span>
                          {config.bonusRate > 0
                            ? `Thưởng ${config.bonusRate * 100}% chip từ người được giới thiệu kiếm được`
                            : 'Không có thưởng thêm'}
                        </span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: config.canTransferAndWithdraw ? '#34d399' : 'var(--text-muted)' }}>
                          {config.canTransferAndWithdraw ? '✓' : '○'}
                        </span>
                        <span>
                          {config.canTransferAndWithdraw
                            ? 'Được phép gửi / nhận chip và rút chip khỏi hệ thống'
                            : 'Chưa hỗ trợ rút chip (cần đạt từ CHIP PLATINUM trở lên)'}
                        </span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: config.extendedPrivileges ? '#34d399' : 'var(--text-muted)' }}>
                          {config.extendedPrivileges ? '✓' : '○'}
                        </span>
                        <span>
                          {config.extendedPrivileges
                            ? 'Đặc quyền mở rộng từ hệ thống (Hạn mức cao, ưu tiên đối soát giao dịch)'
                            : 'Đặc quyền cơ bản'}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Promotion History Table */}
      <section className="glass-card" style={{ padding: '1.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem' }}>{t('rank_history_title')}</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t('rank_history_sub')}
            </span>
          </div>
          <span className="badge badge-gold">Live Synced</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>HỘI VIÊN</th>
                <th>HẠNG CŨ</th>
                <th>HẠNG MỚI</th>
                <th>ĐIỀU KIỆN ĐẠT ĐƯỢC</th>
                <th>THỜI GIAN</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: '#ffffff', fontWeight: 600 }}>{p.userEmail}</td>
                  <td>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.oldTier}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: 'rgba(212, 175, 55, 0.18)',
                        color: TIER_CONFIGS[p.newTier]?.badgeColor || '#f5d77f',
                        border: '1px solid rgba(212, 175, 55, 0.35)',
                      }}
                    >
                      {p.newTier}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.milestoneMet}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {new Date(p.promotedAt).toLocaleDateString()} {new Date(p.promotedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
