'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function UserOverviewPage() {
  const [balance, setBalance] = useState(1250000);
  const [streakDays, setStreakDays] = useState(5);
  const [claimedToday, setClaimedToday] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleClaimDaily = () => {
    if (claimedToday) return;
    const bonus = 250;
    setBalance((prev) => prev + bonus);
    setStreakDays((prev) => prev + 1);
    setClaimedToday(true);
    setFeedback(`🎉 Chúc mừng! Bạn đã điểm danh ngày thứ ${streakDays + 1} và nhận +${bonus} CHIP vào ví!`);
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
              href="/wallet"
              className="nav-btn"
              style={{ fontSize: '0.95rem', padding: '10px 24px' }}
            >
              🪙 Mở Ví Của Tôi
            </Link>

            <Link
              href="/resend-verification"
              className="btn-secondary"
              style={{ fontSize: '0.95rem', padding: '10px 24px' }}
            >
              ✉️ Kích Hoạt / Gửi Mã Email
            </Link>

            <button
              onClick={handleClaimDaily}
              disabled={claimedToday}
              className="nav-btn"
              style={{
                fontSize: '0.95rem',
                padding: '10px 24px',
                background: claimedToday
                  ? 'rgba(52, 211, 153, 0.2)'
                  : 'var(--gradient-bronze)',
                color: claimedToday ? '#34d399' : '#0b0c0e',
                border: claimedToday ? '1px solid rgba(52, 211, 153, 0.4)' : 'none',
                cursor: claimedToday ? 'default' : 'pointer',
              }}
            >
              {claimedToday ? '✓ Đã Điểm Danh Hôm Nay' : '🎁 Điểm Danh Nhận +250 CHIP'}
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
              fontFamily: 'Outfit, sans-serif',
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
            <span style={{ color: '#f5d77f' }}>👑</span>
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#f5d77f',
              marginTop: '8px',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            VIP 3 GOLD
          </div>
          <div style={{ fontSize: '0.82rem', color: '#34d399', marginTop: '4px' }}>
            +15% thưởng mọi hoạt động
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
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            {streakDays} / 7 Ngày
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Giữ chuỗi để mở Hòm Bí Mật
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
              fontSize: '2rem',
              fontWeight: 800,
              color: '#34d399',
              marginTop: '8px',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            ĐÃ KÍCH HOẠT
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Email bảo mật & Sổ cái Active
          </div>
        </div>
      </section>

      {/* Member Earning Methods (Tham khảo Cointiply / Labs từ Thamkhao-ui.md) */}
      <section>
        <div style={{ marginBottom: '1.2rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Các Hoạt Động Tích Luỹ Điểm Thưởng</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Hoàn thành các mốc nhiệm vụ nội bộ để nhận thêm điểm thưởng CHIP vào ví cá nhân
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.4rem',
          }}
        >
          {/* Nhiệm vụ 1: Kích hoạt email */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>✉️</span>
                <span className="badge badge-gold">+5,000 CHIP</span>
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Kích Hoạt Tài Khoản Qua Email</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                Xác thực địa chỉ email thành công qua đường dẫn kích hoạt bảo mật. Điểm thưởng sẽ được ghi ngay vào sổ cái kép của bạn.
              </p>
            </div>
            <div style={{ paddingTop: '1.2rem', borderTop: '1px solid var(--border-subtle)', marginTop: '1.2rem' }}>
              <Link href="/resend-verification" className="glance-link" style={{ fontSize: '0.88rem' }}>
                Gửi lại email mã kích hoạt →
              </Link>
            </div>
          </div>

          {/* Nhiệm vụ 2: Điểm danh chuỗi ngày (Daily Streak) */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>📅</span>
                <span className="badge badge-gold">+250 Đến +2,000 CHIP</span>
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Điểm Danh Hàng Ngày (Streak)</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                Đăng nhập và điểm danh mỗi ngày để duy trì chuỗi liên tục. Đạt mốc 7 ngày liên tiếp để nhận thưởng Hộp Quà Bí Mật.
              </p>
            </div>
            <div style={{ paddingTop: '1.2rem', borderTop: '1px solid var(--border-subtle)', marginTop: '1.2rem' }}>
              <button
                onClick={handleClaimDaily}
                disabled={claimedToday}
                style={{
                  background: 'none',
                  border: 'none',
                  color: claimedToday ? '#34d399' : 'var(--accent-bronze)',
                  fontWeight: 600,
                  cursor: claimedToday ? 'default' : 'pointer',
                  padding: 0,
                  fontSize: '0.88rem',
                }}
              >
                {claimedToday ? '✓ Đã nhận thưởng hôm nay' : 'Nhấn nhận thưởng ngay →'}
              </button>
            </div>
          </div>

          {/* Nhiệm vụ 3: Giới thiệu thành viên mới */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>🤝</span>
                <span className="badge badge-gold">+10,000 CHIP / Bạn</span>
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Mời Bạn Bè Tham Gia</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                Chia sẻ liên kết thành viên cá nhân của bạn. Nhận hoa hồng điểm thưởng nội bộ khi bạn bè đăng ký và kích hoạt tài khoản.
              </p>
            </div>
            <div style={{ paddingTop: '1.2rem', borderTop: '1px solid var(--border-subtle)', marginTop: '1.2rem' }}>
              <Link href="/wallet" className="glance-link" style={{ fontSize: '0.88rem' }}>
                Xem ví & chi tiết điểm thưởng →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity Table for Member */}
      <section className="glass-card" style={{ padding: '1.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
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
                <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#ffffff', fontWeight: 600 }}>
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
                <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#ffffff', fontWeight: 600 }}>
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
                <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#ffffff', fontWeight: 600 }}>
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

      {/* Regulatory & Safety Notice */}
      <section
        style={{
          background: 'rgba(212, 175, 55, 0.05)',
          border: '1px solid var(--border-bronze)',
          borderRadius: '12px',
          padding: '1.2rem 1.6rem',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <span style={{ fontSize: '1.8rem' }}>🛡️</span>
        <div>
          <div style={{ fontWeight: 700, color: '#f5d77f', fontSize: '0.92rem' }}>
            Thông Báo Minh Bạch Điểm Thưởng Nội Bộ
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px', lineHeight: 1.5 }}>
            CHIPCOIN là hệ thống điểm thưởng tích lũy nội bộ phục vụ thành viên, hoàn toàn không phải đồng tiền mã hoá (cryptocurrency)
            và chưa mở tính năng rút tiền ra ngoài hệ thống. Số dư được bảo vệ bởi kiến trúc sổ cái kép PostgreSQL bất biến.
          </div>
        </div>
      </section>
    </div>
  );
}
