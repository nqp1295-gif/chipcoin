'use client';

import { useState, useEffect, type FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '../lib/api';
import { ChipStore } from '../lib/store';

function RegisterForm() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam.trim());
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().replace(/^@+/, '');
    if (!cleanUsername || !email.trim() || !password) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (cleanUsername.length < 2 || cleanUsername.length > 50) {
      setError('Tên người dùng phải có độ dài từ 2 đến 50 ký tự.');
      return;
    }

    if (password.length < 12) {
      setError('Mật khẩu phải có độ dài tối thiểu 12 ký tự.');
      return;
    }

    setLoading(true);

    try {
      // 1. Call Backend API
      const res = await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: cleanUsername,
          email: email.trim().toLowerCase(),
          password,
          referral_code: referralCode.trim() || undefined,
        }),
      });

      if (!res.success) {
        if (res.error === 'account_already_exists') {
          setError('Tên đăng nhập hoặc địa chỉ email này đã được sử dụng.');
        } else if (res.error === 'invalid_username' || res.error === 'invalid username') {
          setError(
            res.message ||
              'Tên người dùng không hợp lệ. Vui lòng nhập từ 2 - 50 ký tự (chữ cái tiếng Việt/Anh, chữ số, khoảng trắng, gạch dưới _, gạch ngang - hoặc dấu .).'
          );
        } else if (res.error === 'invalid_email' || res.error === 'invalid email') {
          setError('Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại định dạng email.');
        } else if (
          res.error === 'password does not meet security requirements' ||
          res.error === 'weak_password'
        ) {
          setError('Mật khẩu chưa đủ an toàn (yêu cầu tối thiểu 12 ký tự).');
        } else {
          setError(res.message || (res as any).detail || res.error || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
        }
        return;
      }

      // 2. Register & Sync to Central Data Store (Bridges Member & Admin Portals)
      const storedUser = ChipStore.registerUser(
        cleanUsername,
        email.trim().toLowerCase(),
        referralCode.trim() || undefined
      );

      // Auto login newly registered member session
      ChipStore.setMemberSession(storedUser);

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('Không thể kết nối đến hệ thống máy chủ đăng ký. Vui lòng kiểm tra lại đường truyền mạng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🪙</div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '0.5rem' }}>Tạo tài khoản CHIPCOIN</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Tham gia hệ thống tích luỹ điểm thưởng nội bộ nhận ngay <strong>+5,000 CHIP</strong>
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
              <p style={{ fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '8px' }}>
                Chào mừng bạn đến với CHIPCOIN. Bạn đã được tặng <strong>+5,000 CHIP</strong> chào mừng
                và phân hạng <strong>CHIP MEMBER</strong>.
              </p>
              {referralCode && (
                <div style={{ fontSize: '0.82rem', color: '#f5d77f', marginBottom: '8px' }}>
                  ✓ Đã gắn vào nhánh bảo trợ của mã: <strong>{referralCode}</strong>
                </div>
              )}
              <div
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '0.82rem',
                  lineHeight: 1.45,
                }}
              >
                <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '4px' }}>
                  ✉️ Vui lòng xác thực email của bạn:
                </div>
                <div>
                  Một email xác nhận đã được gửi từ <strong>jinofc.ytb@gmail.com</strong> tới hòm thư của bạn. Vui lòng mở hộp thư (kiểm tra cả mục Spam / Thư rác) và bấm liên kết xác nhận trong vòng <strong>15 phút</strong> để kích hoạt tài khoản.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1.8rem' }}>
              <Link href="/verify-email" className="btn-primary" style={{ textAlign: 'center' }}>
                Nhập Mã / Xác Thực Email Ngay →
              </Link>
              <Link href="/" className="btn-secondary" style={{ textAlign: 'center' }}>
                Vào Bảng Điều Khiển Của Tôi
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
                placeholder="vd: satoshi_vn, Nguyen Van A, alex.99"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                required
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Từ 2 đến 50 ký tự (hỗ trợ chữ cái tiếng Việt/Anh, chữ số, khoảng trắng, gạch dưới _, gạch ngang - và dấu .)
              </span>
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
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="referralCode">
                  Mã Người Giới Thiệu (Tùy chọn)
                </label>
                {referralCode && (
                  <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                    ✓ Đã áp dụng mã
                  </span>
                )}
              </div>
              <input
                id="referralCode"
                type="text"
                className="form-input"
                placeholder="vd: CHIP-ALEX-99"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                disabled={loading}
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  borderColor: referralCode ? 'var(--accent-bronze)' : undefined,
                }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.8rem' }}>
              {loading ? (
                <>
                  <div className="spinner" />
                  Đang xử lý...
                </>
              ) : (
                'Hoàn tất đăng ký (+5,000 CHIP)'
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: '3rem auto' }} />}>
      <RegisterForm />
    </Suspense>
  );
}
