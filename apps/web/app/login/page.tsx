'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiRequest } from '../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnverified(false);

    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (!res.success) {
        if (res.error === 'account_unavailable') {
          setUnverified(true);
          setError('Tài khoản chưa được xác minh email hoặc chưa kích hoạt.');
        } else if (res.error === 'invalid_credentials') {
          setError('Email hoặc mật khẩu không chính xác.');
        } else {
          setError(res.message || 'Đăng nhập không thành công.');
        }
        return;
      }

      setLoggedInUser(res.data?.user || { email });
    } catch (err: any) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '0 auto' }}>
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '0.5rem' }}>Đăng nhập CHIPCOIN</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Truy cập cổng hạch toán và điểm thưởng
          </p>
        </div>

        {error && (
          <div className="alert-box alert-error">
            <span>⚠️</span>
            <div>
              {error}
              {unverified && (
                <div style={{ marginTop: '8px' }}>
                  <Link
                    href={`/resend-verification?email=${encodeURIComponent(email)}`}
                    style={{ textDecoration: 'underline', fontWeight: 600, color: 'var(--accent-bronze)' }}
                  >
                    👉 Bấm vào đây để nhận lại email xác minh
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {loggedInUser ? (
          <div>
            <div className="alert-box alert-success" style={{ display: 'block' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                👋 Chào mừng trở lại, {loggedInUser.username || loggedInUser.email}!
              </div>
              <p style={{ fontSize: '0.9rem' }}>
                Phiên làm việc bảo mật (HTTP-Only Cookie) đã được thiết lập thành công.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
              <Link href="/" className="btn-primary" style={{ textAlign: 'center' }}>
                Về bảng điều khiển tổng quan
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Địa chỉ Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.8rem' }}>
              {loading ? (
                <>
                  <div className="spinner" />
                  Đang xác thực...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Chưa có tài khoản?{' '}
              <Link href="/register" style={{ color: 'var(--accent-bronze)', fontWeight: 600 }}>
                Đăng ký ngay
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
