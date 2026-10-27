'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '../lib/i18n';
import { ChipStore, StoredUser, StoredReferralLink, TIER_CONFIGS } from '../lib/store';

export default function ReferralsPage() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [referrals, setReferrals] = useState<StoredReferralLink[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = () => {
    let mem = ChipStore.getCurrentMember();
    if (!mem) {
      const users = ChipStore.getUsers();
      mem = users.find((u) => u.roles.includes('USER')) || users[0];
      if (mem) ChipStore.setMemberSession(mem);
    }
    setCurrentUser(mem);
    if (mem) {
      const list = ChipStore.getReferralsByReferrer(mem.referralCode);
      setReferrals(list);
    } else {
      const list = ChipStore.getReferrals();
      setReferrals(list.slice(0, 5));
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

  const referralCode = currentUser?.referralCode || 'CHIP-MEMBER-7721';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://chipcoin.io';
  const referralUrl = `${origin}/register?ref=${referralCode}`;

  const currentTier = currentUser?.tier || 'CHIP GOLD';
  const tierConfig = TIER_CONFIGS[currentTier];

  const totalReferrals = referrals.length;
  const verifiedCount = referrals.filter((r) => r.isEmailVerified).length;
  const totalCommission = referrals.reduce((sum, r) => sum + r.commissionPaidToReferrer, 0);

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header Banner */}
      <section
        className="glass-card"
        style={{
          background:
            'radial-gradient(circle at 100% 0%, rgba(212, 175, 55, 0.18) 0%, rgba(18, 20, 24, 0.95) 70%)',
          border: '1px solid var(--border-bronze)',
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '850px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '0.8rem' }}>
            <span className="badge badge-gold">{t('ref_badge')}</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', lineHeight: 1.25, marginBottom: '0.8rem' }}>
            {t('ref_title')}
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: 1.6, marginBottom: '1.6rem' }}>
            {t('ref_desc')}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/rank" className="nav-btn" style={{ fontSize: '0.92rem', padding: '9px 20px' }}>
              👑 {t('nav_rank')}
            </Link>
            <Link href="/wallet" className="btn-secondary" style={{ fontSize: '0.92rem', padding: '9px 20px' }}>
              🪙 {t('nav_wallet')}
            </Link>
          </div>
        </div>
      </section>

      {/* Share Box & Referral Links */}
      <section
        className="glass-card"
        style={{
          padding: '2rem',
          border: '1px solid var(--border-bronze)',
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{t('ref_box_code_title')} &amp; {t('ref_box_link_title')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {t('ref_table_sub')}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Referral Code Box */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.4rem',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              {t('ref_box_code_title')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: 'var(--accent-bronze-light)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-bronze)',
                  letterSpacing: '0.06em',
                }}
              >
                {referralCode}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(referralCode, 'code')}
                className="nav-btn"
                style={{ padding: '12px 18px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
              >
                {copiedCode ? `✓ ${t('btn_copied')}` : `📋 ${t('btn_copy')}`}
              </button>
            </div>
          </div>

          {/* Referral Link Box */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.4rem',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              {t('ref_box_link_title')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="form-input"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  color: '#ffffff',
                }}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(referralUrl, 'link')}
                className="nav-btn"
                style={{ padding: '12px 18px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
              >
                {copiedLink ? `✓ ${t('btn_copied')}` : `🔗 ${t('btn_copy')}`}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Metrics */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.2rem',
        }}
      >
        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {t('ref_stat_total')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
            {totalReferrals}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            F1 Members
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {t('ref_stat_verified')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>
            {verifiedCount}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('status_verified')}
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {t('ref_stat_rate')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: tierConfig.badgeColor, marginTop: '6px' }}>
            +{tierConfig.bonusRate * 100}%
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            [{currentTier}]
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {t('ref_stat_earned')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f5d77f', marginTop: '6px' }}>
            {totalCommission.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            CHIP Credited
          </div>
        </div>
      </section>

      {/* Referral Branches Table */}
      <section className="glass-card" style={{ padding: '1.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem' }}>{t('ref_table_title')}</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t('ref_table_sub')}
            </span>
          </div>

          <span className="badge badge-gold">
            {referrals.length} F1
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>HỘI VIÊN ĐƯỢC GIỚI THIỆU</th>
                <th>NGÀY THAM GIA</th>
                <th>XÁC THỰC EMAIL</th>
                <th>ĐIỂM F1 ĐÃ TÍCH LŨY</th>
                <th>HOA HỒNG PHÂN BỔ BẠN NHẬN</th>
              </tr>
            </thead>
            <tbody>
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Chưa có hội viên nào trong nhánh giới thiệu. Hãy chia sẻ mã của bạn để nhận ngay +10,000 CHIP!
                  </td>
                </tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: '#ffffff', fontWeight: 600 }}>{r.referredEmail}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(r.registeredAt).toLocaleDateString()} {new Date(r.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      {r.isEmailVerified ? (
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'rgba(52, 211, 153, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(52, 211, 153, 0.35)',
                          }}
                        >
                          ✓ {t('status_verified')}
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'rgba(251, 191, 36, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(251, 191, 36, 0.35)',
                          }}
                        >
                          ⏳ {t('status_pending')}
                        </span>
                      )}
                    </td>
                    <td style={{ color: '#ffffff', fontWeight: 600 }}>
                      {r.refereeChipsEarned.toLocaleString()} CHIP
                    </td>
                    <td style={{ color: '#34d399', fontWeight: 700 }}>
                      +{r.commissionPaidToReferrer.toLocaleString()} CHIP
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tier Commission Explanation */}
      <section
        style={{
          background: 'rgba(212, 175, 55, 0.05)',
          border: '1px solid var(--border-bronze)',
          borderRadius: '12px',
          padding: '1.4rem 1.8rem',
        }}
      >
        <div style={{ fontWeight: 700, color: '#f5d77f', fontSize: '1rem', marginBottom: '6px' }}>
          {t('ref_rules_title')}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            marginTop: '10px',
            fontSize: '0.85rem',
          }}
        >
          <div>• <strong>CHIP MEMBER</strong>: 0% thưởng thêm</div>
          <div>• <strong>CHIP GOLD</strong>: 3% thưởng chip F1 kiếm được</div>
          <div>• <strong>CHIP PLATINUM</strong>: 5% thưởng chip F1 + Quyền rút chip</div>
          <div>• <strong>CHIP DIAMOND</strong>: 10% thưởng chip F1 + Đặc quyền mở rộng</div>
          <div>• <strong>CHIP SPECIAL</strong>: 20% thưởng chip F1 + Đặc quyền tối đa</div>
        </div>
      </section>
    </div>
  );
}
