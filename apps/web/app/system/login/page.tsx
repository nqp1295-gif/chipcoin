'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../lib/api';

const PRESET_ACCOUNTS = {
  admin: {
    email: 'admin@chiprin.com',
    password: 'Admin@Chiprin2026!',
    role: 'ADMIN',
    title: 'Quản Trị Viên',
  },
  assistant: {
    email: 'assistant@chiprin.com',
    password: 'Admin@Chiprin2026!',
    role: 'ASSISTANT',
    title: 'Trợ Lý',
  },
  specialist: {
    email: 'specialist@chiprin.com',
    password: 'Admin@Chiprin2026!',
    role: 'SPECIALIST',
    title: 'Chuyên Viên',
  },
};

export default function SystemLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@chiprin.com');
  const [password, setPassword] = useState('Admin@Chiprin2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'assistant' | 'specialist'>('admin');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNormalUserError, setIsNormalUserError] = useState(false);
  const [loggedInAccount, setLoggedInAccount] = useState<any>(null);

  // Quick fill handler
  const handleSelectRolePreset = (key: 'admin' | 'assistant' | 'specialist') => {
    setSelectedRole(key);
    const preset = PRESET_ACCOUNTS[key];
    setEmail(preset.email);
    setPassword(preset.password);
    setError(null);
  };

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

      // Trích xuất thông tin người dùng và vai trò chính xác
      const userData = res.data?.user || { email };
      const rawRoles = userData.roles || res.data?.roles || [];
      const roles: string[] =
        Array.isArray(rawRoles) && rawRoles.length > 0
          ? rawRoles
          : selectedRole === 'admin'
          ? ['ADMIN']
          : selectedRole === 'assistant'
          ? ['ASSISTANT']
          : ['SPECIALIST'];

      const sessionData = {
        ...userData,
        email: userData.email || email.trim().toLowerCase(),
        roles,
      };

      setLoggedInAccount(sessionData);

      // Lưu session vào localStorage
      try {
        localStorage.setItem('chipcoin_system_session', JSON.stringify(sessionData));
      } catch (e) {
        // Ignore localStorage error
      }

      // Chuyển hướng ngay lập tức vào bảng quản trị
      setTimeout(() => {
        router.push('/system');
      }, 500);
    } catch (err: any) {
      setError('Không thể kết nối đến máy chủ quản trị hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const roleNameVN = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'Quản Trị Viên';
      case 'ASSISTANT':
        return 'Trợ Lý';
      case 'SPECIALIST':
        return 'Chuyên Viên';
      default:
        return 'Nhân Sự Hệ Thống';
    }
  };

  return (
    <div style={{ maxWidth: '540px', margin: '0 auto', padding: '1rem 0' }}>
      <div
        className="glass-card glow-hover"
        style={{
          borderColor: 'var(--border-bronze)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(212, 175, 55, 0.1)',
          padding: '2.4rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
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

        {/* One-Click Role Selector Presets */}
        <div style={{ marginBottom: '1.4rem' }}>
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Chọn vai trò đăng nhập nhanh (1 chạm):
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}
          >
            <button
              type="button"
              onClick={() => handleSelectRolePreset('admin')}
              style={{
                padding: '12px 8px',
                borderRadius: '10px',
                background:
                  selectedRole === 'admin'
                    ? 'rgba(212, 175, 55, 0.22)'
                    : 'rgba(212, 175, 55, 0.06)',
                border:
                  selectedRole === 'admin'
                    ? '2px solid var(--accent-bronze)'
                    : '1px solid rgba(212, 175, 55, 0.25)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '1.3rem', marginBottom: '3px' }}>👑</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f5d77f' }}>
                Quản Trị Viên
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Toàn quyền</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRolePreset('assistant')}
              style={{
                padding: '12px 8px',
                borderRadius: '10px',
                background:
                  selectedRole === 'assistant'
                    ? 'rgba(129, 140, 248, 0.22)'
                    : 'rgba(129, 140, 248, 0.06)',
                border:
                  selectedRole === 'assistant'
                    ? '2px solid #818cf8'
                    : '1px solid rgba(129, 140, 248, 0.25)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '1.3rem', marginBottom: '3px' }}>💼</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a5b4fc' }}>
                Trợ Lý
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Điều hành</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRolePreset('specialist')}
              style={{
                padding: '12px 8px',
                borderRadius: '10px',
                background:
                  selectedRole === 'specialist'
                    ? 'rgba(56, 189, 248, 0.22)'
                    : 'rgba(56, 189, 248, 0.06)',
                border:
                  selectedRole === 'specialist'
                    ? '2px solid #38bdf8'
                    : '1px solid rgba(56, 189, 248, 0.25)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '1.3rem', marginBottom: '3px' }}>🔍</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7dd3fc' }}>
                Chuyên Viên
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nghiệp vụ</div>
            </button>
          </div>
        </div>

        {/* Preset Info Hint Box */}
        <div
          style={{
            background: 'rgba(212, 175, 55, 0.06)',
            border: '1px dashed var(--border-bronze)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Tài khoản đang chọn: </span>
            <strong style={{ color: '#f5d77f' }}>{email}</strong>
            <br />
            <span style={{ color: 'var(--text-muted)' }}>Mật khẩu mặc định: </span>
            <code style={{ color: '#fff', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
              Admin@Chiprin2026!
            </code>
          </div>
          <button
            type="button"
            onClick={() => handleSelectRolePreset('admin')}
            style={{
              background: 'var(--gradient-bronze)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              color: '#0b0c0e',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ⚡ Điền lại
          </button>
        </div>

        {error && (
          <div className="alert-box alert-error" style={{ marginBottom: '1.2rem' }}>
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
                Xin chào <strong>{loggedInAccount.email}</strong>. Đang chuyển hướng vào Bảng Quản Trị Hệ Thống...
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {loggedInAccount.roles?.map((r: string) => (
                  <span
                    key={r}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: 'rgba(212, 175, 55, 0.2)',
                      color: '#f5d77f',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                    }}
                  >
                    {roleNameVN(r)}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link href="/system" className="btn-primary" style={{ justifyContent: 'center' }}>
                Vào Bảng Quản Trị Hệ Thống ngay →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
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

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" htmlFor="sys-password" style={{ margin: 0 }}>
                  Mật Khẩu Quản Trị
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-bronze)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? '👁️ Ẩn mật khẩu' : '👁️ Hiện mật khẩu'}
                </button>
              </div>
              <input
                id="sys-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Nhập mật khẩu quản trị..."
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
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '1rem',
                justifyContent: 'center',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Đang xác thực hệ thống...' : 'Đăng Nhập Cổng Quản Trị'}
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.2rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}
        >
          <Link
            href="/login"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            ← Cổng đăng nhập người dùng
          </Link>

          <Link
            href="/"
            style={{
              color: 'var(--accent-bronze)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Về trang chủ →
          </Link>
        </div>
      </div>
    </div>
  );
}
