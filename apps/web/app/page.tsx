'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from './lib/i18n';
import { ChipStore, StoredUser, TIER_CONFIGS } from './lib/store';

export default function UserOverviewPage() {
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

  const balance = currentUser?.chipsBalance ?? 1250000;
  const streakDays = currentUser?.streakDays ?? 5;
  const currentTier = currentUser?.tier ?? 'CHIP GOLD';
  const tierMeta = TIER_CONFIGS[currentTier];

  const handleQuickCheckin = () => {
    if (!currentUser) {
      setFeedback('Vui lòng đăng nhập tài khoản để nhận điểm danh!');
      setTimeout(() => setFeedback(null), 3500);
      return;
    }
    const bonus = 250;
    const { user, promoted } = ChipStore.addChips(currentUser.id, bonus, 'Điểm danh nhanh tại trang tổng quan');
    setCurrentUser(user);

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
            <span className="badge badge-gold">NỀN TẢNG TÍCH LUỸ ĐIỂM THƯỞNG NỘI BỘ</span>
          </div>

          <h1
            style={{
              fontSize: '2.4rem',
              lineHeight: 1.25,
              marginBottom: '1rem',
              fontWeight: 800,
            }}
          >
            Chào Mừng Đến Với{' '}
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
              marginBottom: '1.8rem',
            }}
          >
            Nền tảng tích luỹ điểm thưởng nội bộ bảo mật với cơ chế sổ cái kép Double-entry Ledger.
            Hoàn tất nhiệm vụ, duy trì điểm danh hàng ngày và tích lũy điểm CHIP an toàn tuyệt đối.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/activities"
              className="nav-btn"
              style={{ fontSize: '0.95rem', padding: '10px 24px' }}
            >
              ⭐ Hoạt Động Tích Lũy
            </Link>

            <Link
              href="/rank"
              className="btn-secondary"
              style={{ fontSize: '0.95rem', padding: '10px 24px' }}
            >
              👑 Thăng Hạng Hội Viên
            </Link>

            <Link
              href="/wallet"
              className="btn-secondary"
              style={{ fontSize: '0.95rem', padding: '10px 24px' }}
            >
              🪙 Ví Của Tôi
            </Link>

            <button
              onClick={handleQuickCheckin}
              className="nav-btn"
              style={{
                fontSize: '0.95rem',
                padding: '10px 24px',
                background: 'rgba(212, 175, 55, 0.15)',
                color: '#f5d77f',
                border: '1px solid var(--border-bronze)',
                cursor: 'pointer',
              }}
            >
              🎁 Điểm Danh Hôm Nay (+250)
            </button>
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
              SỐ DƯ ĐIỂM CỦA BẠN
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
            {balance.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            ≈ ${(balance / 10000).toFixed(2)} USD (Quy đổi nội bộ)
          </div>
        </div>

        {/* Cấp bậc hội viên */}
        <div className="glass-card glow-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              HẠNG THÀNH VIÊN
            </span>
            <span style={{ color: tierMeta.badgeColor }}>👑</span>
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: tierMeta.badgeColor,
              marginTop: '8px',
            }}
          >
            {currentTier}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#34d399', marginTop: '4px' }}>
            {tierMeta.bonusRate > 0
              ? `+${tierMeta.bonusRate * 100}% thưởng hoa hồng nhánh`
              : 'Xác thực email thành công'}
          </div>
        </div>

        {/* Chuỗi điểm danh Streak */}
        <div className="glass-card glow-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              CHUỖI NGÀY LIÊN TỤC
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
            {streakDays} / 7 Ngày
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Duy trì chuỗi mở Hòm Bí Mật
          </div>
        </div>

        {/* Trạng thái xác minh */}
        <div className="glass-card glow-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              TRẠNG THÁI TÀI KHOẢN
            </span>
            <span className="status-dot-pulse" />
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#34d399',
              marginTop: '8px',
            }}
          >
            ĐÃ KÍCH HOẠT
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Email bảo mật &amp; Sổ cái Active
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
              <span className="badge badge-gold">TRANG RIÊNG BIỆT</span>
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Trung Tâm Hoạt Động Tích Lũy</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Khám phá toàn bộ nhiệm vụ nhận điểm thưởng: Chuỗi điểm danh hàng ngày, Xác minh email,
              Tham gia cộng đồng và thử nghiệm hạch toán sổ cái kép.
            </p>
          </div>
          <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-subtle)' }}>
            <Link
              href="/activities"
              className="nav-btn"
              style={{ display: 'inline-flex', padding: '10px 20px', fontSize: '0.9rem' }}
            >
              Mở trang Hoạt Động Tích Lũy →
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
                5 CẤP BẬC HỘI VIÊN
              </span>
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Tiến Trình Thăng Hạng Hội Viên</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Theo dõi chi tiết hạn mức đạt chuẩn cho từng cấp bậc (CHIP MEMBER, GOLD, PLATINUM, DIAMOND, SPECIAL).
              Mở khóa quyền rút chip và hoa hồng giới thiệu lên đến 20%.
            </p>
          </div>
          <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-subtle)' }}>
            <Link
              href="/rank"
              className="nav-btn"
              style={{
                display: 'inline-flex',
                padding: '10px 20px',
                fontSize: '0.9rem',
                background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                color: '#0b0c0e',
              }}
            >
              Xem điều kiện thăng hạng →
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Activity Table for Member */}
      <section className="glass-card" style={{ padding: '1.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem' }}>Lịch Sử Nhận Thưởng Gần Đây</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Nhật ký giao dịch tích luỹ điểm thưởng của tài khoản
            </span>
          </div>

          <Link href="/wallet" className="nav-btn" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
            Xem toàn bộ ví →
          </Link>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>MÃ GIAO DỊCH</th>
                <th>HOẠT ĐỘNG</th>
                <th>THỜI GIAN</th>
                <th>ĐIỂM NHẬN</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 600 }}>
                  TX-20261026-9041
                </td>
                <td style={{ color: '#ffffff', fontWeight: 500 }}>Thưởng hoàn thành nhiệm vụ cộng đồng</td>
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
                    ✓ ĐÃ CỘNG VÍ
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 600 }}>
                  TX-20261026-8812
                </td>
                <td style={{ color: '#ffffff', fontWeight: 500 }}>Thưởng xác minh email thành công</td>
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
                    ✓ ĐÃ CỘNG VÍ
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 600 }}>
                  TX-20261025-7650
                </td>
                <td style={{ color: '#ffffff', fontWeight: 500 }}>Thưởng duy trì chuỗi điểm danh 5 ngày</td>
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
                    ✓ ĐÃ CỘNG VÍ
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
