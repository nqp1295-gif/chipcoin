import type { ReactNode } from 'react';
import './globals.css';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'CHIPCOIN — Hệ thống phần thưởng nội bộ & Xác minh tài khoản',
  description: 'Hệ thống tích luỹ điểm thưởng nội bộ CHIPCOIN, xác minh danh tính và luồng outbox bảo mật.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <header className="navbar">
          <div className="container nav-inner">
            <Link href="/" className="logo-badge">
              <Image
                src="/logo.png"
                alt="CHIPCOIN Logo"
                width={42}
                height={42}
                className="logo-img"
                priority
              />
              <span>CHIPCOIN</span>
            </Link>

            <nav className="nav-links">
              <Link href="/" className="nav-link">
                Tổng quan
              </Link>
              <Link href="/resend-verification" className="nav-link">
                Gửi lại mã
              </Link>
              <Link href="/login" className="nav-link">
                Đăng nhập
              </Link>
              <Link href="/register" className="nav-btn">
                Đăng ký
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ flex: 1, padding: '3rem 0' }}>
          <div className="container">{children}</div>
        </main>

        <footer className="footer">
          <div className="container">
            <p style={{ marginBottom: '6px' }}>
              CHIPCOIN là hệ thống phần thưởng nội bộ (internal points) — Không blockchain — Chưa hỗ trợ rút tiền.
            </p>
            <p style={{ opacity: 0.6 }}>
              © 2026 CHIPCOIN Platform. Bảo mật giao dịch & kiểm soát lạm dụng với PostgreSQL Transactional Outbox.
            </p>
            <p style={{ marginTop: '12px' }}>
              <Link
                href="/system/login"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                🔒 Cổng Quản Trị Hệ Thống (Accounts-System)
              </Link>
            </p>
          </div>
        </footer>

      </body>
    </html>
  );
}
