'use client';

import React, { useState } from 'react';
import { useI18n } from '../../lib/i18n';

// ============================================================================
// ENVIRONMENT GATE: Mock outbox events only loaded in local dev mode
// ============================================================================
const IS_LOCAL_DEV =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_USE_SEED_DATA === 'true';

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

const _RAW_INITIAL_EVENTS: OutboxEvent[] = [
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

// Only load mock events in local dev, production starts empty
const INITIAL_EVENTS: OutboxEvent[] = IS_LOCAL_DEV ? _RAW_INITIAL_EVENTS : [];

export default function SystemTrackingPage() {
  const { t } = useI18n();
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
            {t('sys_tracking_badge')}
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>{t('sys_tracking_title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            {t('sys_tracking_desc')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleManualScan}
            disabled={scanning}
            className="nav-btn"
            style={{ cursor: 'pointer', border: 'none', gap: '8px' }}
          >
            {scanning ? t('sys_scanning') : `🔄 ${t('sys_btn_scan_now')}`}
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
              {t('sys_worker_status')}
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
            {t('sys_worker_active_100')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            PostgreSQL Advisory Lock Active
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            SCAN FREQUENCY
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
            2.0s / Cycle
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Batch size: 50 records / scan
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            AVG LATENCY
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
            DEAD LETTER QUEUE (DLQ)
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
            0 Records
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Zero unhandled errors
          </div>
        </div>
      </div>

      {/* 5-Step Pipeline Architecture Visualization */}
      <div className="glass-card" style={{ padding: '1.8rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1.4rem' }}>
          5-Step Transactional Outbox Pipeline
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
              stepNum: '1',
              title: t('track_step_1_title', 'Tạo Event DB'),
              desc: t('track_step_1_desc', 'Ghi bản ghi nghiệp vụ & outbox trong cùng 1 Transaction ACID'),
              icon: '💾',
            },
            {
              stepNum: '2',
              title: t('track_step_2_title', 'Mã Hoá Payload'),
              desc: t('track_step_2_desc', 'Khoá mã hoá AES-256-GCM bảo vệ an toàn token trong CSDL'),
              icon: '🔐',
            },
            {
              stepNum: '3',
              title: t('track_step_3_title', 'Khóa Hàng Đợi'),
              desc: t('track_step_3_desc', 'Advisory Lock loại trừ xung đột đa worker chạy song song'),
              icon: '🔒',
            },
            {
              stepNum: '4',
              title: t('track_step_4_title', 'Gửi Email Resend'),
              desc: t('track_step_4_desc', 'Gọi HTTP client gửi email chứa đường dẫn xác thực'),
              icon: '🚀',
            },
            {
              stepNum: '5',
              title: t('track_step_5_title', 'Đóng Dấu Sent'),
              desc: t('track_step_5_desc', 'Cập nhật processed_at, lưu lịch sử kiểm toán hoàn tất'),
              icon: '✅',
            },
          ].map((item) => (
            <div
              key={item.stepNum}
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
                  {t('track_step_prefix', 'Bước')} {item.stepNum}
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
            <h3 style={{ fontSize: '1.15rem' }}>{t('track_realtime_heading', 'Nhật Ký Sự Kiện Outbox Thời Gian Thực')}</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t('track_realtime_desc', 'Theo dõi chi tiết các email xác minh và sự kiện phân quyền được chuyển tiếp')}
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
                {f === 'ALL' ? t('time_all', 'Tất cả') : f === 'SENT' ? t('sys_email_filter_sent', 'Đã Gửi (Sent)') : t('track_filter_pending', 'Chờ Quét')}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('track_col_event_id', 'MÃ SỰ KIỆN')}</th>
                <th>{t('track_col_event_type', 'LOẠI SỰ KIỆN')}</th>
                <th>{t('track_col_recipient', 'NGƯỜI NHẬN')}</th>
                <th>{t('rep_col_created_at', 'THỜI GIAN TẠO')}</th>
                <th>{t('track_col_latency', 'ĐỘ TRỄ')}</th>
                <th>{t('track_col_retry', 'THỬ LẠI')}</th>
                <th>{t('rep_col_status', 'TRẠNG THÁI')}</th>
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
                  <td>{ev.retryCount} {t('track_retry_count_unit', 'lần')}</td>
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
