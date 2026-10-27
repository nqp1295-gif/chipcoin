'use client';

import React, { useState } from 'react';

export default function SystemSettingsPage() {
  const [appName, setAppName] = useState('CHIPCOIN Platform');
  const [pointSymbol, setPointSymbol] = useState('CHIP');
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [minPasswordLength, setMinPasswordLength] = useState(12);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(24);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(60);
  const [workerPollingIntervalMs, setWorkerPollingIntervalMs] = useState(2000);
  const [maxOutboxRetries, setMaxOutboxRetries] = useState(5);
  const [senderEmail, setSenderEmail] = useState('jinofc.ytb@gmail.com');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
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
            ⚙️ QUẢN TRỊ HỆ THỐNG — TRUNG TÂM CẤU HÌNH
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Cấu Hình Toàn Bộ Hệ Thống</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Thiết lập tham số an toàn, giới hạn tốc độ và cấu hình kết nối Outbox Worker
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="nav-btn"
            style={{ cursor: 'pointer', border: 'none', gap: '8px' }}
          >
            {saving ? 'Đang lưu cài đặt...' : '💾 Lưu Cấu Hình'}
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="alert-box alert-success" style={{ marginBottom: 0 }}>
          <span>✅</span>
          <div>Đã lưu thành công các tham số cấu hình hệ thống! Các thiết lập đã có hiệu lực ngay.</div>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
        {/* Section 1: Cấu hình chung */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🌐</span>
            <h3 style={{ fontSize: '1.2rem' }}>Cấu Hình Chung & Nhãn Thương Hiệu</h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.2rem',
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tên Nền Tảng</label>
              <input
                type="text"
                className="form-input"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mã Đơn Vị Điểm Thưởng</label>
              <input
                type="text"
                className="form-input"
                value={pointSymbol}
                onChange={(e) => setPointSymbol(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Cho Phép Người Dùng Đăng Ký Mới</label>
              <select
                className="form-input"
                value={allowRegistration ? 'true' : 'false'}
                onChange={(e) => setAllowRegistration(e.target.value === 'true')}
              >
                <option value="true">Bật (Mở đăng ký tự do)</option>
                <option value="false">Tắt (Chỉ cho phép quản trị viên cấp)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Chính sách bảo mật & mật khẩu */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            <h3 style={{ fontSize: '1.2rem' }}>Chính Sách Bảo Mật & Xác Thực</h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.2rem',
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Độ Dài Mật Khẩu Tối Thiểu</label>
              <input
                type="number"
                min={8}
                max={64}
                className="form-input"
                value={minPasswordLength}
                onChange={(e) => setMinPasswordLength(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Thời Hạn Phiên Đăng Nhập (Giờ)</label>
              <input
                type="number"
                min={1}
                max={720}
                className="form-input"
                value={sessionTimeoutHours}
                onChange={(e) => setSessionTimeoutHours(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Số Lần Thử Mật Khẩu Sai Tối Đa</label>
              <input
                type="number"
                min={3}
                max={15}
                className="form-input"
                value={maxLoginAttempts}
                onChange={(e) => setMaxLoginAttempts(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Giới hạn tốc độ Rate Limit & Cooldown */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⏱️</span>
            <h3 style={{ fontSize: '1.2rem' }}>Kiểm Soát Lạm Dụng & Rate Limiting</h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.2rem',
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Thời Gian Chờ Giữa 2 Lần Gửi Lại Mã (Giây)</label>
              <input
                type="number"
                min={10}
                max={600}
                className="form-input"
                value={resendCooldownSeconds}
                onChange={(e) => setResendCooldownSeconds(Number(e.target.value))}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Thời gian cooldown để tránh spam email token (Mặc định: 60s)
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Yêu Cầu Xác Minh Email Trước Khi Đăng Nhập</label>
              <select
                className="form-input"
                value={requireEmailVerification ? 'true' : 'false'}
                onChange={(e) => setRequireEmailVerification(e.target.value === 'true')}
              >
                <option value="true">Bắt buộc (Tài khoản phải kích hoạt qua email)</option>
                <option value="false">Không bắt buộc</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Cấu hình Transactional Outbox Worker */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <h3 style={{ fontSize: '1.2rem' }}>Transactional Outbox & Email Worker</h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.2rem',
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Chu Kỳ Quét Outbox Hàng Đợi (ms)</label>
              <input
                type="number"
                min={500}
                max={30000}
                step={500}
                className="form-input"
                value={workerPollingIntervalMs}
                onChange={(e) => setWorkerPollingIntervalMs(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Số Lần Thử Lại Tối Đa (Max Retries)</label>
              <input
                type="number"
                min={1}
                max={20}
                className="form-input"
                value={maxOutboxRetries}
                onChange={(e) => setMaxOutboxRetries(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Địa Chỉ Email Gửi Tin (Sender Email)</label>
              <input
                type="email"
                className="form-input"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem' }}>
          <button
            type="submit"
            disabled={saving}
            className="nav-btn"
            style={{ padding: '12px 32px', fontSize: '1rem', cursor: 'pointer', border: 'none' }}
          >
            {saving ? 'Đang lưu cấu hình...' : 'Lưu Tất Cả Cấu Hình Hệ Thống'}
          </button>
        </div>
      </form>
    </div>
  );
}
