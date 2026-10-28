'use client';

import { useState, useEffect, type FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '../lib/api';
import { useI18n } from '../lib/i18n';

function ResendVerificationContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // Countdown timer for 429 Rate Limit
  useEffect(() => {
    if (retryAfter === null || retryAfter <= 0) return;

    const interval = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [retryAfter]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (retryAfter !== null && retryAfter > 0) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await apiRequest('/api/v1/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail }),
      });

      if (res.retryAfterSeconds) {
        setRetryAfter(res.retryAfterSeconds);
        setError(`Bạn đã yêu cầu quá nhiều lần. Vui lòng chờ ${res.retryAfterSeconds} giây trước khi gửi lại.`);
        return;
      }

      if (!res.success) {
        setError(res.message || 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.');
        return;
      }

      // Always show generic message to prevent account enumeration
      setMessage(
        res.message || 'Nếu tài khoản hợp lệ và chưa kích hoạt, một email xác minh sẽ được đưa vào hàng đợi gửi đi.'
      );
    } catch (err: any) {
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '0.5rem' }}>{t('resend_title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            {t('resend_desc')}
          </p>
        </div>

        {error && (
          <div className="alert-box alert-error">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {message && (
          <div className="alert-box alert-success" style={{ display: 'block' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>
              {t('resend_noted', '📩 Đã ghi nhận yêu cầu!')}
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{message}</p>
          </div>
        )}

        {retryAfter !== null && retryAfter > 0 && (
          <div className="alert-box alert-warning">
            <span>⏳</span>
            <div>
              {t('resend_rate_limit_desc', 'Hệ thống đang áp dụng giới hạn tốc độ yêu cầu (Rate Limit).')}
              <br />
              {t('resend_please_wait', 'Vui lòng chờ:')} <strong>{retryAfter}s</strong>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="resend-email">
              {t('resend_email_label')}
            </label>
            <input
              id="resend-email"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || (retryAfter !== null && retryAfter > 0)}
              autoComplete="email"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || (retryAfter !== null && retryAfter > 0)}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <>
                <div className="spinner" />
                {t('resend_submitting')}
              </>
            ) : retryAfter !== null && retryAfter > 0 ? (
              t('resend_btn_wait', 'Thử lại sau ({0}s)').replace('{0}', String(retryAfter))
            ) : (
              t('resend_btn_submit')
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.5rem',
            padding: '12px 14px',
            borderRadius: '8px',
            background: 'rgba(245, 215, 127, 0.06)',
            border: '1px solid rgba(245, 215, 127, 0.2)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: '#f5d77f', fontWeight: 700, marginBottom: '4px' }}>
            {t('resend_notes_title', 'ℹ️ Lưu ý khi nhận email:')}
          </div>
          <div>{t('resend_notes_from', '• Thư được gửi chính thức từ địa chỉ: jinofc.ytb@gmail.com')}</div>
          <div>{t('resend_notes_spam', '• Hãy kiểm tra kỹ hộp thư đến (Inbox) và mục Thư rác (Spam / Junk).')}</div>
          <div>{t('resend_notes_ttl', '• Mã xác minh có hiệu lực trong 15 phút. Giới hạn yêu cầu gửi lại 60 giây/lần (tối đa 3 lần/giờ).')}</div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          {t('resend_have_code', 'Đã nhận được mã xác nhận?')}{' '}
          <Link href="/verify-email" style={{ color: 'var(--accent-bronze)', fontWeight: 600 }}>
            {t('resend_enter_here', 'Nhập mã tại đây')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResendVerificationPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      }
    >
      <ResendVerificationContent />
    </Suspense>
  );
}
