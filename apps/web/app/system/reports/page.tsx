'use client';

import React, { useState } from 'react';

interface ReportRow {
  date: string;
  newUsers: number;
  activeAccounts: number;
  chipsGranted: number;
  transactionsCount: number;
  outboxSent: number;
  successRate: string;
}

const SAMPLE_REPORTS: ReportRow[] = [
  { date: '2026-10-26', newUsers: 14, activeAccounts: 58, chipsGranted: 70000, transactionsCount: 124, outboxSent: 42, successRate: '100%' },
  { date: '2026-10-25', newUsers: 22, activeAccounts: 74, chipsGranted: 110000, transactionsCount: 198, outboxSent: 65, successRate: '100%' },
  { date: '2026-10-24', newUsers: 19, activeAccounts: 69, chipsGranted: 95000, transactionsCount: 162, outboxSent: 58, successRate: '98.3%' },
  { date: '2026-10-23', newUsers: 31, activeAccounts: 92, chipsGranted: 155000, transactionsCount: 240, outboxSent: 89, successRate: '100%' },
  { date: '2026-10-22', newUsers: 18, activeAccounts: 65, chipsGranted: 90000, transactionsCount: 145, outboxSent: 51, successRate: '100%' },
  { date: '2026-10-21', newUsers: 25, activeAccounts: 81, chipsGranted: 125000, transactionsCount: 188, outboxSent: 73, successRate: '100%' },
  { date: '2026-10-20', newUsers: 12, activeAccounts: 48, chipsGranted: 60000, transactionsCount: 95, outboxSent: 38, successRate: '97.4%' },
];

export default function SystemReportsPage() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'quarter'>('7d');
  const [downloading, setDownloading] = useState(false);

  const handleExportCSV = () => {
    setDownloading(true);
    try {
      const headers = ['Ngày', 'Tài Khoản Mới', 'Hoạt Động', 'CHIP Đã Cấp', 'Giao Dịch Sổ Cái', 'Email Outbox', 'Tỉ Lệ Thành Công'];
      const rows = SAMPLE_REPORTS.map((r) => [
        r.date,
        r.newUsers,
        r.activeAccounts,
        r.chipsGranted,
        r.transactionsCount,
        r.outboxSent,
        r.successRate,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `chipcoin_report_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
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
            📊 QUẢN TRỊ HỆ THỐNG — THỐNG KÊ & BÁO CÁO TOÀN DIỆN
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Thống Kê Báo Cáo Hệ Thống</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Tổng hợp dữ liệu sổ cái, tăng trưởng người dùng và hiệu năng xử lý Transactional Outbox
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Timeframe selector */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
            }}
          >
            {(['7d', '30d', 'quarter'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                style={{
                  background: timeframe === t ? 'var(--gradient-bronze)' : 'transparent',
                  color: timeframe === t ? '#0b0c0e' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {t === '7d' ? '7 Ngày qua' : t === '30d' ? '30 Ngày' : 'Quý Này'}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={downloading}
            className="nav-btn"
            style={{ cursor: 'pointer', border: 'none', gap: '8px' }}
          >
            {downloading ? 'Đang xuất...' : '📥 Xuất Báo Cáo CSV'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            TỔNG ĐIỂM CHIP ĐÃ CẤP
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--accent-bronze)',
              marginTop: '6px',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            705,000 CHIP
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--success)', marginTop: '4px' }}>
            &uarr; +18.4% so với tuần trước
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            TỔNG GIAO DỊCH SỔ CÁI
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#ffffff',
              marginTop: '6px',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            1,152 GD
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--success)', marginTop: '4px' }}>
            Độ chính xác sổ kép: 100%
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            THÀNH VIÊN MỚI
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#7dd3fc',
              marginTop: '6px',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            137 Người
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tỉ lệ kích hoạt email: 92.6%
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            EMAIL OUTBOX THÀNH CÔNG
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#34d399',
              marginTop: '6px',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            416 Email
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tỉ lệ gửi đạt: 99.7%
          </div>
        </div>
      </div>

      {/* Visual Analytics Sections */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Phân bổ cấp độ tài khoản */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.2rem' }}>Phân Bổ Phân Quyền Nhân Sự & Người Dùng</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: '#f5d77f' }}>👑 Cấp 1 - Quản Trị Viên (ADMIN)</span>
                <span>4.5%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '4.5%', height: '100%', background: '#d4af37' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: '#a5b4fc' }}>💼 Cấp 2 - Trợ Lý (ASSISTANT)</span>
                <span>8.2%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '8.2%', height: '100%', background: '#818cf8' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: '#7dd3fc' }}>🔍 Cấp 3 - Chuyên Viên (SPECIALIST)</span>
                <span>15.3%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '15.3%', height: '100%', background: '#38bdf8' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: '#cbd5e1' }}>👤 Cấp 4 - Thành Viên (USER)</span>
                <span>72.0%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '72%', height: '100%', background: '#94a3b8' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Phân bổ kênh cấp điểm thưởng */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.2rem' }}>Phân Bổ Kênh Cấp Thưởng Điểm CHIP</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>🎯 Nhiệm Vụ Cộng Đồng Hoàn Tất</span>
                <span style={{ color: 'var(--accent-bronze)' }}>45% (317,250 CHIP)</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '45%', height: '100%', background: 'var(--gradient-bronze)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>🎁 Thưởng Đăng Ký & Xác Minh Email</span>
                <span style={{ color: '#34d399' }}>30% (211,500 CHIP)</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '30%', height: '100%', background: '#34d399' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>🤝 Giới Thiệu Thành Viên Mới</span>
                <span style={{ color: '#818cf8' }}>15% (105,750 CHIP)</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '15%', height: '100%', background: '#818cf8' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>⚖️ Cấp Thưởng Quản Trị Đặc Cách</span>
                <span style={{ color: '#fbbf24' }}>10% (70,500 CHIP)</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '10%', height: '100%', background: '#fbbf24' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Data Table */}
      <div className="glass-card" style={{ padding: '1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Chi Tiết Thống Kê Theo Ngày</h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Hiển thị 7 bản ghi gần nhất
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>NGÀY</th>
                <th>TÀI KHOẢN MỚI</th>
                <th>HOẠT ĐỘNG</th>
                <th>CHIP ĐÃ CẤP</th>
                <th>GIAO DỊCH SỔ CÁI</th>
                <th>EMAIL OUTBOX</th>
                <th>TỈ LỆ THÀNH CÔNG</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_REPORTS.map((row) => (
                <tr key={row.date}>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>{row.date}</td>
                  <td>+{row.newUsers}</td>
                  <td>{row.activeAccounts}</td>
                  <td style={{ color: 'var(--accent-bronze)', fontWeight: 600 }}>
                    +{row.chipsGranted.toLocaleString()} CHIP
                  </td>
                  <td>{row.transactionsCount} GD</td>
                  <td>{row.outboxSent} emails</td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background:
                          row.successRate === '100%'
                            ? 'rgba(52, 211, 153, 0.15)'
                            : 'rgba(251, 191, 36, 0.15)',
                        color: row.successRate === '100%' ? '#34d399' : '#fbbf24',
                        border:
                          row.successRate === '100%'
                            ? '1px solid rgba(52, 211, 153, 0.35)'
                            : '1px solid rgba(251, 191, 36, 0.35)',
                      }}
                    >
                      {row.successRate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
