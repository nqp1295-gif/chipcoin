'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '../lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'expired' | 'used' | 'invalid' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const executeVerify = async (tokenToVerify: string) => {
    const cleanToken = tokenToVerify.trim();
    if (!cleanToken) {
      setStatus('invalid');
      setErrorMessage('Vui lòng cung cấp mã xác minh (64 ký tự).');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const res = await apiRequest('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: cleanToken }),
      });

      if (res.success) {
        setStatus('success');
      } else {
        switch (res.error) {
          case 'verification_token_expired':
            setStatus('expired');
            setErrorMessage('Liên kết xác minh này đã hết hạn (quá 15 phút). Vui lòng yêu cầu mã mới.');
            break;
          case 'verification_token_used':
            setStatus('used');
            setErrorMessage('Mã xác minh này đã được sử dụng trước đó.');
            break;
          case 'invalid_verification_token':
            setStatus('invalid');
            setErrorMessage('Mã xác minh không hợp lệ hoặc không đúng định dạng.');
            break;
          case 'account_not_pending':
            setStatus('used');
            setErrorMessage('Tài khoản liên kết với mã này đã được kích hoạt.');
            break;
          default:
            setStatus('error');
            setErrorMessage(res.message || 'Xác minh thất bại. Vui lòng thử lại sau.');
        }
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenFromUrl && tokenFromUrl.length === 64) {
      executeVerify(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '0.5rem' }}>Xác minh địa chỉ Email</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Kích hoạt tài khoản để bắt đầu nhận điểm thưởng CHIP
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 1.2rem auto' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Đang kiểm tra và xác thực token bảo mật...</p>
          </div>
        )}

        {!loading && status === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div className="alert-box alert-success" style={{ display: 'block', textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>
                ✅ Xác minh thành công!
              </div>
              <p style={{ fontSize: '0.92rem' }}>
                Tài khoản của bạn đã được kích hoạt thành công (trạng thái ACTIVE). Bây giờ bạn có thể đăng nhập.
              </p>
            </div>

            <Link href="/login" className="btn-primary" style={{ marginTop: '1.8rem', display: 'inline-flex' }}>
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {!loading && status === 'expired' && (
          <div style={{ textAlign: 'center' }}>
            <div className="alert-box alert-warning" style={{ display: 'block', textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                ⏳ Mã xác minh đã hết hạn
              </div>
              <p style={{ fontSize: '0.92rem' }}>{errorMessage}</p>
            </div>

            <Link href="/resend-verification" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
              Yêu cầu gửi lại email xác minh
            </Link>
          </div>
        )}

        {!loading && (status === 'invalid' || status === 'error') && (
          <div>
            <div className="alert-box alert-error">
              <span>❌</span>
              <div>{errorMessage}</div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeVerify(token);
              }}
              style={{ marginTop: '1.5rem' }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="manual-token">
                  Nhập mã token xác minh (64 ký tự hex)
                </label>
                <input
                  id="manual-token"
                  type="text"
                  className="form-input"
                  placeholder="64 ký tự hex từ đường dẫn email..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}
                />
              </div>

              <button type="submit" className="btn-primary">
                Kiểm tra lại mã
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link href="/resend-verification" style={{ color: 'var(--accent-bronze)', fontSize: '0.9rem' }}>
                Hoặc yêu cầu gửi lại email mới
              </Link>
            </div>
          </div>
        )}

        {!loading && status === 'used' && (
          <div style={{ textAlign: 'center' }}>
            <div className="alert-box alert-warning" style={{ display: 'block', textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                ℹ️ Mã đã sử dụng
              </div>
              <p style={{ fontSize: '0.92rem' }}>{errorMessage}</p>
            </div>

            <Link href="/login" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
              Đi đến trang Đăng nhập
            </Link>
          </div>
        )}

        {!loading && status === 'idle' && !tokenFromUrl && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeVerify(token);
            }}
          >
            <div className="form-group">
              <label className="form-label" htmlFor="token-input">
                Mã xác minh (Token)
              </label>
              <input
                id="token-input"
                type="text"
                className="form-input"
                placeholder="Dán mã 64 ký tự hex..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}
                required
              />
            </div>

            <button type="submit" className="btn-primary">
              Xác thực tài khoản
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
