'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '../lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ready_to_confirm' | 'success' | 'expired' | 'used' | 'invalid' | 'error'>(
    tokenFromUrl && tokenFromUrl.length === 64 ? 'ready_to_confirm' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState('');

  const executeVerify = async (tokenToVerify: string) => {
    const cleanToken = tokenToVerify.trim();
    if (!cleanToken || cleanToken.length !== 64) {
      setStatus('invalid');
      setErrorMessage('Vui lòng cung cấp mã xác minh hợp lệ (đúng 64 ký tự hex).');
      return;
    }

    setLoading(true);
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
            setErrorMessage('Mã xác minh không hợp lệ hoặc không đúng định dạng 64 ký tự hex.');
            break;
          case 'account_not_pending':
            setStatus('used');
            setErrorMessage('Tài khoản liên kết với mã này đã được kích hoạt trước đó.');
            break;
          default:
            setStatus('error');
            setErrorMessage(res.message || 'Xác minh thất bại. Vui lòng thử lại sau.');
        }
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage('Không thể kết nối đến máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  const maskedToken = tokenFromUrl && tokenFromUrl.length === 64
    ? `${tokenFromUrl.slice(0, 8)}...${tokenFromUrl.slice(-8)}`
    : '';

  return (
    <div style={{ maxWidth: '540px', margin: '0 auto' }}>
      <div className="glass-card" style={{ border: '1px solid rgba(245, 215, 127, 0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>✉️</div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '0.4rem', color: '#fff' }}>
            Xác Minh Địa Chỉ Email
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Kích hoạt tài khoản CHIPCOIN chính thức phát hành từ <strong>jinofc.ytb@gmail.com</strong>
          </p>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 1.2rem auto' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Đang xác thực mã token mật mã SHA-256 trên cơ sở dữ liệu...
            </p>
          </div>
        )}

        {/* Phase 8: Scanner Protection Interactive Confirmation */}
        {!loading && status === 'ready_to_confirm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                padding: '14px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 700, marginBottom: '6px' }}>
                <span>🛡️ Bảo Vệ Chống Quét Link Tự Động (Link Scanner Defense)</span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                Mã xác thực của bạn đã sẵn sàng (<code>{maskedToken}</code>). Nhấn nút bên dưới để hoàn tất việc kích hoạt tài khoản.
              </p>
            </div>

            <button
              onClick={() => executeVerify(tokenFromUrl)}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px 20px',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              ⚡ Xác Nhận Kích Hoạt Tài Khoản Ngay
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Mã xác minh có hiệu lực trong vòng <strong>15 phút</strong> kể từ khi phát hành.
            </div>
          </div>
        )}

        {/* Success State */}
        {!loading && status === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div className="alert-box alert-success" style={{ display: 'block', textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>
                🎉 Xác Minh Thành Công!
              </div>
              <p style={{ fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '8px' }}>
                Tài khoản của bạn đã được kích hoạt thành công (trạng thái <strong>ACTIVE</strong>). Bạn đã chính thức gia nhập cộng đồng CHIPCOIN với hạng <strong>CHIP MEMBER</strong>.
              </p>
              <div style={{ fontSize: '0.82rem', color: '#4ade80', borderTop: '1px solid rgba(74, 222, 128, 0.2)', paddingTop: '6px' }}>
                ✓ Thư xác nhận thành công (Mẫu B) đã được gửi từ <strong>jinofc.ytb@gmail.com</strong> tới hộp thư của bạn.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.8rem' }}>
              <Link href="/login" className="btn-primary" style={{ textAlign: 'center', padding: '12px 20px' }}>
                Đăng Nhập Ngay →
              </Link>
              <Link href="/" className="btn-secondary" style={{ textAlign: 'center' }}>
                Về Trang Tổng Quan
              </Link>
            </div>
          </div>
        )}

        {/* Expired State */}
        {!loading && status === 'expired' && (
          <div style={{ textAlign: 'center' }}>
            <div className="alert-box alert-warning" style={{ display: 'block', textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                ⏳ Mã Xác Minh Đã Hết Hạn
              </div>
              <p style={{ fontSize: '0.92rem', margin: 0 }}>
                {errorMessage || 'Liên kết xác minh chỉ có hiệu lực 15 phút để đảm bảo an toàn. Vui lòng yêu cầu cấp lại mã mới.'}
              </p>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/resend-verification" className="btn-primary" style={{ textAlign: 'center' }}>
                Yêu Cầu Gửi Lại Email Xác Minh
              </Link>
            </div>
          </div>
        )}

        {/* Invalid / Error State */}
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
                  placeholder="Dán 64 ký tự hex từ email..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Kiểm Tra &amp; Xác Thực Lại Mã
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link href="/resend-verification" style={{ color: 'var(--accent-bronze)', fontSize: '0.9rem' }}>
                Hoặc yêu cầu gửi lại email mới
              </Link>
            </div>
          </div>
        )}

        {/* Used State */}
        {!loading && status === 'used' && (
          <div style={{ textAlign: 'center' }}>
            <div className="alert-box alert-warning" style={{ display: 'block', textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                ℹ️ Mã Đã Được Sử Dụng Hoặc Tài Khoản Đã Kích Hoạt
              </div>
              <p style={{ fontSize: '0.92rem', margin: 0 }}>{errorMessage}</p>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/login" className="btn-primary" style={{ textAlign: 'center' }}>
                Đi Đến Trang Đăng Nhập
              </Link>
            </div>
          </div>
        )}

        {/* Idle without URL token */}
        {!loading && status === 'idle' && (
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
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              Xác Thực Tài Khoản
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
