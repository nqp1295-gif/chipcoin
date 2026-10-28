'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import { ChipStore } from '../lib/store';
import { useI18n } from '../lib/i18n';

// ============================================================================
// ENVIRONMENT GATE: Auto-fill demo credentials only in local dev mode
// In production, input fields start completely blank.
// ============================================================================
const IS_LOCAL_DEV =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_USE_SEED_DATA === 'true';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState(IS_LOCAL_DEV ? 'sophia.chain@example.com' : '');
  const [password, setPassword] = useState(IS_LOCAL_DEV ? 'Member@Chiprin2026!' : '');

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
      const cleanEmail = email.trim().toLowerCase();
      const res = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      if (!res.success) {
        if (res.error === 'account_unavailable') {
          setError(
            'Tài khoản của bạn chưa kích hoạt hoặc chưa xác thực email. Vui lòng kiểm tra email kích hoạt từ jinofc.ytb@gmail.com (bao gồm cả thư rác / spam).'
          );
          setUnverified(true);
          return;
        }
        if (res.error === 'invalid_credentials') {
          setError('Địa chỉ email hoặc mật khẩu không chính xác.');
          return;
        }
        setError(res.message || res.error || 'Đăng nhập không thành công. Vui lòng thử lại.');
        return;
      }

      // Synchronize session with central store
      let matchedUser = ChipStore.getUserByEmail(cleanEmail);
      if (!matchedUser) {
        matchedUser = {
          id: res.data?.user?.id || `usr-${Date.now()}`,
          username: res.data?.user?.username || cleanEmail.split('@')[0],
          email: cleanEmail,
          roles: ['USER'],
          status: 'ACTIVE',
          email_verified_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          tier: 'CHIP MEMBER',
          referralCode: `CHIP-${cleanEmail.split('@')[0].toUpperCase().slice(0, 4)}-7721`,
          chipsBalance: 5000,
          usdtBalance: 0.001,
          streakDays: 1,
        };
      } else {
        matchedUser.status = 'ACTIVE';
        matchedUser.email_verified_at = matchedUser.email_verified_at || new Date().toISOString();
      }

      ChipStore.upsertUser(matchedUser);
      ChipStore.setMemberSession(matchedUser);
      setLoggedInUser(matchedUser);

      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch (err: any) {
      setError('Lỗi kết nối máy chủ xác thực. Vui lòng kiểm tra lại mạng hoặc thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '0 auto', width: '100%' }}>
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🪙</div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '0.5rem' }}>{t('login_title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            {t('login_desc')}
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
                    👉 {t('login_resend_link')}
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
                Đang chuyển hướng vào Bảng Tổng Quan Cá Nhân...
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
              <Link href="/" className="btn-primary" style={{ textAlign: 'center' }}>
                Về bảng điều khiển ngay →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                {t('login_email_label')}
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
                {t('login_pass_label')}
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
                  {t('login_submitting')}
                </>
              ) : (
                t('btn_login')
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {t('login_no_acc')}{' '}
              <Link href="/register" style={{ color: 'var(--accent-bronze)', fontWeight: 600 }}>
                {t('login_register_link')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
