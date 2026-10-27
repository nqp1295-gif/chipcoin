'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isSystemRoute = pathname.startsWith('/system');
  const isSystemLogin = pathname === '/system/login';

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [hasSystemAccess, setHasSystemAccess] = useState(false);

  // Load sidebar collapsed preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chipcoin_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch (e) {}
  }, []);

  // System Route Guard: Chặn người dùng thường hoặc người chưa đăng nhập truy cập /system/*
  useEffect(() => {
    if (isSystemRoute && !isSystemLogin) {
      try {
        const raw = localStorage.getItem('chipcoin_system_session');
        if (!raw) {
          setHasSystemAccess(false);
          setAuthChecked(true);
          router.replace('/system/login');
          return;
        }
        const parsed = JSON.parse(raw);

        // Trích xuất vai trò từ nhiều trường hợp lưu trữ khác nhau
        const roles: string[] =
          Array.isArray(parsed?.roles) && parsed.roles.length > 0
            ? parsed.roles
            : Array.isArray(parsed?.user?.roles) && parsed.user.roles.length > 0
            ? parsed.user.roles
            : [];

        const email = (parsed?.email || parsed?.user?.email || '').toLowerCase();
        const isKnownStaff =
          ['admin@chiprin.com', 'assistant@chiprin.com', 'specialist@chiprin.com'].includes(email);

        const isStaff =
          isKnownStaff ||
          roles.some((r) =>
            ['ADMIN', 'ASSISTANT', 'SPECIALIST'].includes(r.toUpperCase())
          );

        if (!isStaff) {
          setHasSystemAccess(false);
          setAuthChecked(true);
          router.replace('/system/login');
          return;
        }

        setHasSystemAccess(true);
      } catch (e) {
        setHasSystemAccess(false);
        router.replace('/system/login');
      } finally {
        setAuthChecked(true);
      }
    } else {
      setAuthChecked(true);
      setHasSystemAccess(true);
    }
  }, [pathname, isSystemRoute, isSystemLogin, router]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('chipcoin_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Màn hình bảo vệ nếu đang kiểm tra quyền vào hệ thống quản trị
  if (isSystemRoute && !isSystemLogin && !hasSystemAccess && !authChecked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          color: 'var(--text-primary)',
          gap: '1rem',
        }}
      >
        <div className="status-dot-pulse" style={{ width: '16px', height: '16px' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-bronze)' }}>
          Đang xác thực quyền truy cập Hệ Thống Quản Trị...
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Hệ thống bảo vệ phân quyền 4 cấp độ CHIPCOIN
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${isSystemRoute ? 'shell-system' : 'shell-user'}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Layout Area */}
      <div
        className={`app-main-wrapper ${isCollapsed ? 'sidebar-collapsed' : ''}`}
      >
        <TopBar onOpenMobileMenu={() => setIsMobileOpen(true)} />

        <main className="app-content-area">
          <div className="pc-standard-container">{children}</div>
        </main>

        {/* Chân trang phân tách 100% độc lập */}
        <footer className={`app-footer ${isSystemRoute ? 'footer-system' : 'footer-user'}`}>
          <div className="pc-standard-container footer-inner">
            {isSystemRoute ? (
              /* Footer Chuyên Biệt Cho Web Quản Trị Hệ Thống */
              <>
                <div className="footer-meta">
                  <span className="footer-title" style={{ color: 'var(--accent-bronze)' }}>
                    🛡️ CHIPCOIN SYSTEM ADMIN CONSOLE
                  </span>
                  <span className="footer-bullet">&bull;</span>
                  <span>
                    Chỉ dành cho nhân sự được phân quyền (ADMIN, ASSISTANT, SPECIALIST). Mọi thao tác đều được ghi nhận vào sổ cái kép bất biến PostgreSQL.
                  </span>
                </div>
                <div className="footer-copyright">
                  © 2026 CHIPCOIN System Console. Kiến trúc Transactional Outbox Worker & Double-Entry Ledger.
                </div>
                <div className="footer-links">
                  <Link href="/system" className="footer-link">
                    🛡️ Quản Lý 4 Cấp Độ
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/system/wallet" className="footer-link">
                    🪙 Kho Quỹ Master Treasury
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/system/tracking" className="footer-link">
                    ⚡ Giám Sát Outbox
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/system/reports" className="footer-link">
                    📊 Báo Cáo & Đối Soát
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/system/settings" className="footer-link">
                    ⚙️ Cấu Hình Toàn Hệ Thống
                  </Link>
                </div>
              </>
            ) : (
              /* Footer Chuyên Biệt Cho Web Người Dùng (Không có bất kỳ link sang hệ thống) */
              <>
                <div className="footer-meta">
                  <span className="footer-title">CHIPCOIN Platform</span>
                  <span className="footer-bullet">&bull;</span>
                  <span>
                    Hệ thống phần thưởng nội bộ (internal points) — Không blockchain — Chưa hỗ trợ rút tiền
                  </span>
                </div>
                <div className="footer-copyright">
                  © 2026 CHIPCOIN Member Loyalty. Tích luỹ điểm thưởng nội bộ an toàn & minh bạch.
                </div>
                <div className="footer-links">
                  <Link href="/wallet" className="footer-link">
                    🪙 Ví Điểm Thưởng Của Tôi
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/resend-verification" className="footer-link">
                    ✉️ Kích Hoạt / Gửi Lại Email
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <span className="footer-link" style={{ cursor: 'default', color: 'var(--text-muted)' }}>
                    📋 Quy Chế Tích Lũy Điểm Thưởng
                  </span>
                </div>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
