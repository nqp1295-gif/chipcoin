'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiRequest } from '../lib/api';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !email.trim() || !password) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password.length < 12) {
      setError('Mật khẩu phải có độ dài tối thiểu 12 ký tự.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (!res.success) {
        if (res.error === 'account_already_exists') {
          setError('Tên đăng nhập hoặc địa chỉ email này đã được sử dụng.');
        } else {
          setError(res.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại.');
        }
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '0.5rem' }}>Tạo tài khoản CHIPCOIN</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Tham gia hệ thống tích luỹ điểm thưởng nội bộ
          </p>
        </div>

        {error && (
          <div className="alert-box alert-error">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {success ? (
          <div>
            <div className="alert-box alert-success" style={{ display: 'block' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                🎉 Đăng ký thành công!
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                Tài khoản của bạn đã được khởi tạo ở trạng thái <strong>CHỜ XÁC MINH (PENDING)</strong>.
                Một liên kết xác nhận đã được đưa vào hàng đợi gửi đến <strong>{email}</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1.8rem' }}>
              <Link href="/verify-email" className="btn-primary" style={{ textAlign: 'center' }}>
                Tôi đã có mã xác minh
              </Link>
              <Link href="/resend-verification" className="btn-secondary" style={{ textAlign: 'center' }}>
                Chưa nhận được email? Gửi lại mã
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Tên người dùng
              </label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="vd: satoshi_vn"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                required
              />
            </div>

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
                Mật khẩu (tối thiểu 12 ký tự)
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.8rem' }}>
              {loading ? (
                <>
                  <div className="spinner" />
                  Đang xử lý...
                </>
              ) : (
                'Hoàn tất đăng ký'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Đã có tài khoản?{' '}
              <Link href="/login" style={{ color: 'var(--accent-bronze)', fontWeight: 600 }}>
                Đăng nhập ngay
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
