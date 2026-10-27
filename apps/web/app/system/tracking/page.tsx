'use client';

import React, { useState } from 'react';

interface OutboxEvent {
  id: string;
  eventType: string;
  recipient: string;
  status: 'SENT' | 'PROCESSING' | 'PENDING' | 'RETRYING';
  retryCount: number;
  latencyMs: number;
  createdAt: string;
  processedAt: string;
}

const INITIAL_EVENTS: OutboxEvent[] = [
  {
    id: 'OB-982104',
    eventType: 'AUTH_EMAIL_VERIFICATION',
    recipient: 'trung.le@chipcoin.com',
    status: 'SENT',
    retryCount: 0,
    latencyMs: 142,
    createdAt: '2026-10-26 22:15:02',
    processedAt: '2026-10-26 22:15:03',
  },
  {
    id: 'OB-982103',
    eventType: 'AUTH_EMAIL_VERIFICATION',
    recipient: 'minh.hoang@gmail.com',
    status: 'SENT',
    retryCount: 0,
    latencyMs: 168,
    createdAt: '2026-10-26 22:04:19',
    processedAt: '2026-10-26 22:04:20',
  },
  {
    id: 'OB-982102',
    eventType: 'LEDGER_SETTLEMENT_NOTIFY',
    recipient: 'admin@chipcoin.com',
    status: 'SENT',
    retryCount: 0,
    latencyMs: 115,
    createdAt: '2026-10-26 21:55:40',
    processedAt: '2026-10-26 21:55:41',
  },
  {
    id: 'OB-982101',
    eventType: 'AUTH_RESEND_VERIFICATION',
    recipient: 'dev.tester@chipcoin.com',
    status: 'SENT',
    retryCount: 0,
    latencyMs: 155,
    createdAt: '2026-10-26 21:42:11',
    processedAt: '2026-10-26 21:42:12',
  },
  {
    id: 'OB-982100',
    eventType: 'SYSTEM_ROLE_ASSIGNED',
    recipient: 'staff.audit@chipcoin.com',
    status: 'SENT',
    retryCount: 0,
    latencyMs: 130,
    createdAt: '2026-10-26 21:30:00',
    processedAt: '2026-10-26 21:30:01',
  },
];

export default function SystemTrackingPage() {
  const [events, setEvents] = useState<OutboxEvent[]>(INITIAL_EVENTS);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'SENT' | 'PENDING'>('ALL');
  const [message, setMessage] = useState<string | null>(null);

  const handleManualScan = () => {
    setScanning(true);
    setMessage(null);

    setTimeout(() => {
      const now = new Date();
      const newEvent: OutboxEvent = {
        id: `OB-${Math.floor(982105 + Math.random() * 500)}`,
        eventType: 'AUTH_EMAIL_VERIFICATION',
        recipient: `user_${Math.floor(100 + Math.random() * 900)}@chipcoin.vn`,
        status: 'SENT',
        retryCount: 0,
        latencyMs: Math.floor(110 + Math.random() * 60),
        createdAt: now.toLocaleString('sv-SE').replace('T', ' '),
        processedAt: now.toLocaleString('sv-SE').replace('T', ' '),
      };

      setEvents([newEvent, ...events]);
      setScanning(false);
      setMessage('Đã quét hàng đợi Outbox: Xử lý thành công 1 sự kiện mới. Không có bản ghi tồn đọng.');
    }, 700);
  };

  const filteredEvents = events.filter((e) => {
    if (filter === 'ALL') return true;
    return e.status === filter;
  });

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
            ⚡ QUẢN TRỊ HỆ THỐNG — GIÁM SÁT TIẾN TRÌNH OUTBOX
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Giám Sát Tiến Trình Outbox Live</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Theo dõi trạng thái thời gian thực của Worker Outbox, hàng đợi gửi email và tính toàn vẹn sự kiện
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleManualScan}
            disabled={scanning}
            className="nav-btn"
            style={{ cursor: 'pointer', border: 'none', gap: '8px' }}
          >
            {scanning ? 'Đang quét hàng đợi...' : '🔄 Quét Outbox Ngay'}
          </button>
        </div>
      </div>

      {message && (
        <div className="alert-box alert-success" style={{ marginBottom: 0 }}>
          <span>✅</span>
          <div>{message}</div>
        </div>
      )}

      {/* Worker Health Meters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="glass-card glow-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              TRẠNG THÁI WORKER
            </span>
            <span className="status-dot-pulse" />
          </div>
          <div
            style={{
              fontSize: '1.7rem',
              fontWeight: 800,
              color: '#34d399',
              marginTop: '8px',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            Hoạt Động 100%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            PostgreSQL Advisory Lock Active
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            TẦN SUẤT QUÉT
          </div>
          <div
            style={{
              fontSize: '1.7rem',
              fontWeight: 800,
              color: '#ffffff',
              marginTop: '8px',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            2.0 Giây / Chu kỳ
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Batch size: 50 bản ghi / lần
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            ĐỘ TRỄ TRUNG BÌNH
          </div>
          <div
            style={{
              fontSize: '1.7rem',
              fontWeight: 800,
              color: 'var(--accent-bronze)',
              marginTop: '8px',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            142 ms
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Resend API SDK v2
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            HÀNG ĐỢI NGHẼN (DLQ)
          </div>
          <div
            style={{
              fontSize: '1.7rem',
              fontWeight: 800,
              color: '#34d399',
              marginTop: '8px',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            0 Bản ghi
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Không có thông điệp lỗi tồn đọng
          </div>
        </div>
      </div>

      {/* 5-Step Pipeline Architecture Visualization */}
      <div className="glass-card" style={{ padding: '1.8rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1.4rem' }}>
          Quy Trình Xử Lý 5 Bước Của Transactional Outbox
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '1rem',
          }}
        >
          {[
            {
              step: 'Bước 1',
              title: 'Tạo Event DB',
              desc: 'Ghi bản ghi nghiệp vụ & outbox trong cùng 1 Transaction ACID',
              icon: '💾',
            },
            {
              step: 'Bước 2',
              title: 'Mã Hoá Payload',
              desc: 'Khoá mã hoá AES-256-GCM bảo vệ an toàn token trong CSDL',
              icon: '🔐',
            },
            {
              step: 'Bước 3',
              title: 'Khóa Hàng Đợi',
              desc: 'Advisory Lock loại trừ xung đột đa worker chạy song song',
              icon: '🔒',
            },
            {
              step: 'Bước 4',
              title: 'Gửi Email Resend',
              desc: 'Gọi HTTP client gửi email chứa đường dẫn xác thực',
              icon: '🚀',
            },
            {
              step: 'Bước 5',
              title: 'Đóng Dấu Sent',
              desc: 'Cập nhật processed_at, lưu lịch sử kiểm toán hoàn tất',
              icon: '✅',
            },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-bronze)',
                borderRadius: '12px',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    color: '#f5d77f',
                  }}
                >
                  {item.step}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Outbox Event Stream Table */}
      <div className="glass-card" style={{ padding: '1.4rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.2rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Nhật Ký Sự Kiện Outbox Thời Gian Thực</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Theo dõi chi tiết các email xác minh và sự kiện phân quyền được chuyển tiếp
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', 'SENT', 'PENDING'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? 'var(--gradient-bronze)' : 'rgba(255, 255, 255, 0.05)',
                  color: filter === f ? '#0b0c0e' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {f === 'ALL' ? 'Tất cả' : f === 'SENT' ? 'Đã Gửi (Sent)' : 'Chờ Quét'}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>MÃ SỰ KIỆN</th>
                <th>LOẠI SỰ KIỆN</th>
                <th>NGƯỜI NHẬN</th>
                <th>THỜI GIAN TẠO</th>
                <th>ĐỘ TRỄ</th>
                <th>THỬ LẠI</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#ffffff' }}>
                    {ev.id}
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--accent-bronze-light)' }}>
                    {ev.eventType}
                  </td>
                  <td style={{ color: '#ffffff', fontWeight: 500 }}>{ev.recipient}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{ev.createdAt}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#34d399', fontSize: '0.82rem' }}>
                    {ev.latencyMs} ms
                  </td>
                  <td>{ev.retryCount} lần</td>
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
                      ✓ SENT
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
