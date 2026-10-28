'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useI18n } from '../lib/i18n';
import { ChipStore } from '../lib/store';

interface AppShellProps {
  children: React.ReactNode;
}

const AUTH_ROUTES = [
  '/login',
  '/system/login',
  '/register',
  '/verify-email',
  '/resend-verification',
];

const PROTECTED_MEMBER_ROUTES = [
  '/profile',
  '/wallet',
  '/ton-wallet',
  '/referrals',
  '/rank',
  '/activities',
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const isSystemRoute = pathname.startsWith('/system');
  const isSystemLogin = pathname === '/system/login';
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isMemberProtected = PROTECTED_MEMBER_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [hasSystemAccess, setHasSystemAccess] = useState(false);
  const [hasMemberSession, setHasMemberSession] = useState(false);

  // Check sessions
  const checkSessions = () => {
    try {
      const member = ChipStore.getCurrentMember();
      setHasMemberSession(!!member);

      const sys = ChipStore.getCurrentSystemStaff();
      if (sys) {
        const roles: string[] =
          Array.isArray(sys?.roles) && sys.roles.length > 0
            ? sys.roles
            : Array.isArray(sys?.user?.roles) && sys.user.roles.length > 0
            ? sys.user.roles
            : [];
        const email = (sys?.email || sys?.user?.email || '').toLowerCase();
        const isKnownStaff = [
          'admin@chiprin.com',
          'assistant@chiprin.com',
          'specialist@chiprin.com',
        ].includes(email);
        const isStaff =
          isKnownStaff ||
          roles.some((r) =>
            ['ADMIN', 'ASSISTANT', 'SPECIALIST'].includes(r.toUpperCase())
          );
        setHasSystemAccess(isStaff);
      } else {
        setHasSystemAccess(false);
      }
    } catch (e) {
      setHasMemberSession(false);
      setHasSystemAccess(false);
    }
  };

  useEffect(() => {
    checkSessions();

    const handleSessionChange = () => {
      checkSessions();
    };

    window.addEventListener('chipcoin_session_changed', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);
    return () => {
      window.removeEventListener('chipcoin_session_changed', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, []);

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
        const roles: string[] =
          Array.isArray(parsed?.roles) && parsed.roles.length > 0
            ? parsed.roles
            : Array.isArray(parsed?.user?.roles) && parsed.user.roles.length > 0
            ? parsed.user.roles
            : [];
        const email = (parsed?.email || parsed?.user?.email || '').toLowerCase();
        const isKnownStaff = [
          'admin@chiprin.com',
          'assistant@chiprin.com',
          'specialist@chiprin.com',
        ].includes(email);
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
    }
  }, [pathname, isSystemRoute, isSystemLogin, router]);

  // Member Route Guard: Khách hàng chưa đăng ký/chưa đăng nhập không được xem trang cá nhân
  useEffect(() => {
    if (authChecked && isMemberProtected && !hasMemberSession) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [authChecked, isMemberProtected, hasMemberSession, pathname, router]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('chipcoin_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Determine whether Sidebar should be shown
  // Request: Khi logout (hoặc ở màn login/register) thì KHÔNG hiển thị sidebar
  const showSidebar = !isAuthRoute && (isSystemRoute ? hasSystemAccess : true);

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
    <div
      className={`app-shell ${isSystemRoute ? 'shell-system' : 'shell-user'} ${
        !showSidebar ? 'shell-no-sidebar' : ''
      }`}
    >
      {/* Sidebar Navigation: Only rendered when user/staff is authenticated and not on auth pages */}
      {showSidebar && (
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Layout Area */}
      <div
        className={`app-main-wrapper ${
          !showSidebar
            ? 'no-sidebar'
            : isCollapsed
            ? 'sidebar-collapsed'
            : ''
        }`}
      >
        <TopBar onOpenMobileMenu={() => setIsMobileOpen(true)} />

        <main className="app-content-area">
          <div className="pc-standard-container">
            {/* If visiting a protected member route without session, render lock barrier */}
            {isMemberProtected && !hasMemberSession ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3.5rem 1.5rem',
                  maxWidth: '540px',
                  margin: '3rem auto',
                  border: '1px solid var(--border-bronze)',
                }}
                className="glass-card"
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.6rem', color: '#f5d77f' }}>
                  {t('login_title')}
                </h2>
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    marginBottom: '1.6rem',
                    fontSize: '0.92rem',
                    lineHeight: 1.6,
                  }}
                >
                  {t('guest_mode_banner')}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href={`/login?redirect=${encodeURIComponent(pathname)}`}
                    className="nav-btn"
                    style={{ padding: '10px 22px' }}
                  >
                    {t('login_btn_submit')}
                  </Link>
                  <Link
                    href="/register"
                    className="btn-secondary"
                    style={{ padding: '10px 22px' }}
                  >
                    {t('btn_register')}
                  </Link>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
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
                    {t('brand_system_title')}
                  </span>
                </div>
                <div className="footer-copyright">
                  {t('footer_copyright')}
                </div>
                <div className="footer-links">
                  <Link href="/system" className="footer-link">
                    🛡️ {t('nav_sys_accounts')}
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/system/wallet" className="footer-link">
                    🪙 {t('nav_sys_treasury')}
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/system/tracking" className="footer-link">
                    ⚡ {t('nav_sys_tracking')}
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/system/reports" className="footer-link">
                    📊 {t('nav_sys_reports')}
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/system/settings" className="footer-link">
                    ⚙️ {t('nav_sys_settings')}
                  </Link>
                </div>
              </>
            ) : (
              /* Footer Chuyên Biệt Cho Web Người Dùng */
              <>
                <div className="footer-meta">
                  <span className="footer-title">CHIPCOIN Platform</span>
                  <span className="footer-bullet">&bull;</span>
                  <span>
                    {t('overview_hero_badge')}
                  </span>
                </div>
                <div className="footer-copyright">
                  {t('footer_copyright')}
                </div>
                <div className="footer-links">
                  <Link href="/wallet" className="footer-link">
                    🪙 {t('nav_wallet')}
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/activities" className="footer-link">
                    ⭐ {t('nav_activities')}
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/rank" className="footer-link">
                    👑 {t('nav_rank')}
                  </Link>
                  <span className="footer-bullet">&bull;</span>
                  <Link href="/referrals" className="footer-link">
                    🤝 {t('nav_referrals')}
                  </Link>
                </div>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
