'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../lib/api';

export default function SystemLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNormalUserError, setIsNormalUserError] = useState(false);
  const [loggedInAccount, setLoggedInAccount] = useState<any>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsNormalUserError(false);

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu quản trị.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('/api/v1/system/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (!res.success) {
        if (res.error === 'access_denied_not_system_account') {
          setIsNormalUserError(true);
          setError(
            'Tài khoản này chỉ có quyền Người Dùng (USER) thông thường. Không được phép truy cập Cổng Quản Trị Hệ Thống.'
          );
        } else if (res.error === 'invalid_credentials') {
          setError('Email hoặc mật khẩu quản trị không chính xác.');
        } else if (res.error === 'account_unavailable') {
          setError('Tài khoản quản trị đang bị tạm khóa hoặc chưa được kích hoạt.');
        } else {
          setError(res.message || 'Đăng nhập hệ thống không thành công.');
        }
        return;
      }

      const userData = res.data?.user || { email };
      const roles = res.data?.roles || [];
      const sessionData = { ...userData, roles };

      setLoggedInAccount(sessionData);

      // Save session info to localStorage for instant UI role rendering
      try {
        localStorage.setItem('chipcoin_system_session', JSON.stringify(sessionData));
      } catch (e) {
        // Ignore localStorage error if cookies are used
      }

      // Redirect to system dashboard after 600ms
      setTimeout(() => {
        router.push('/system');
      }, 700);
    } catch (err: any) {
      setError('Không thể kết nối đến máy chủ quản trị hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <div
        className="glass-card glow-hover"
        style={{
          borderColor: 'var(--border-bronze)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(212, 175, 55, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid var(--border-bronze)',
              color: 'var(--accent-bronze)',
              fontSize: '0.82rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '1rem',
            }}
          >
            🛡️ CỔNG QUẢN TRỊ NỘI BỘ
          </div>

          <h1 style={{ fontSize: '1.95rem', marginBottom: '0.6rem' }}>
            Đăng Nhập Quản Trị Hệ Thống
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
            Router riêng cho nhóm Accounts-System:{' '}
            <strong style={{ color: '#fff' }}>Quản Trị Viên, Trợ Lý &amp; Chuyên Viên</strong>.
          </p>
        </div>

        {/* Roles privilege indicators */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              padding: '10px 8px',
              borderRadius: '10px',
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.2rem', marginBottom: '3px' }}>👑</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f5d77f' }}>
              Quản Trị Viên
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Toàn quyền</div>
          </div>

          <div
            style={{
              padding: '10px 8px',
              borderRadius: '10px',
              background: 'rgba(129, 140, 248, 0.08)',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.2rem', marginBottom: '3px' }}>💼</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a5b4fc' }}>
              Trợ Lý
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Điều hành</div>
          </div>

          <div
            style={{
              padding: '10px 8px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.2rem', marginBottom: '3px' }}>🔍</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7dd3fc' }}>
              Chuyên Viên
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nghiệp vụ</div>
          </div>
        </div>

        {error && (
          <div className="alert-box alert-error">
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{error}</div>
              {isNormalUserError && (
                <div style={{ marginTop: '10px' }}>
                  <Link
                    href="/login"
                    style={{
                      display: 'inline-block',
                      padding: '6px 14px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    👉 Chuyển sang Cổng Đăng Nhập Người Dùng
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {loggedInAccount ? (
          <div>
            <div className="alert-box alert-success" style={{ display: 'block' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                🎉 Xác thực tài khoản quản trị thành công!
              </div>
              <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>
                Xin chào <strong>{loggedInAccount.username || loggedAccountEmail(loggedInAccount.email)}</strong>. Đang
                chuyển hướng vào Bảng Quản Trị Hệ Thống...
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {loggedInAccount.roles?.map((r: string) => (
                  <span key={r} className={`badge badge-role-${r.toLowerCase()}`}>
                    {roleNameVN(r)}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link href="/system" className="btn-primary" style={{ justifyContent: 'center' }}>
                Vào Bảng Quản Trị Hệ Thống ngay
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="sys-email">
                Email Quản Trị Hệ Thống
              </label>
              <input
                id="sys-email"
                type="email"
                className="form-input"
                placeholder="admin@chiprin.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sys-password">
                Mật Khẩu Quản Trị
              </label>
              <input
                id="sys-password"
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '1rem', width: '100%' }}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  Đang kiểm tra phân quyền hệ thống...
                </>
              ) : (
                'Đăng Nhập Cổng Quản Trị'
              )}
            </button>

            <div
              style={{
                marginTop: '1.8rem',
                paddingTop: '1.2rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.86rem',
                color: 'var(--text-muted)',
              }}
            >
              <Link href="/login" style={{ color: 'var(--text-secondary)' }}>
                ← Cổng đăng nhập người dùng
              </Link>
              <Link href="/" style={{ color: 'var(--accent-bronze)' }}>
                Về trang chủ →
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function roleNameVN(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '👑 Quản Trị Viên';
    case 'ASSISTANT':
      return '💼 Trợ Lý';
    case 'SPECIALIST':
      return '🔍 Chuyên Viên';
    case 'USER':
      return '👤 Người Dùng';
    default:
      return role;
  }
}

function loggedAccountEmail(email?: string): string {
  return email || 'Quản trị viên';
}
