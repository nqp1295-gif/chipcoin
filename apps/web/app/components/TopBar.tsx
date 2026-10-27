'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

// Bảng tiêu đề trang phân tách riêng biệt
const SYSTEM_PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/system': {
    title: 'Quản Lý Tài Khoản 4 Cấp',
    subtitle: 'Phân quyền & phân bổ vai trò: Admin, Trợ lý, Chuyên viên, Người dùng',
  },
  '/system/wallet': {
    title: 'Sổ Cái Kép Master Treasury',
    subtitle: 'Quản trị kho quỹ tổng thể 500,000,000 CHIP & điều phối các Pool',
  },
  '/system/tracking': {
    title: 'Giám Sát Tiến Trình Outbox',
    subtitle: 'Theo dõi hàng đợi sự kiện Transactional Outbox thời gian thực',
  },
  '/system/reports': {
    title: 'Thống Kê Báo Cáo Toàn Diện',
    subtitle: 'Phân tích tăng trưởng, đối soát số dư & xuất file kiểm toán CSV',
  },
  '/system/settings': {
    title: 'Cấu Hình Toàn Bộ Hệ Thống',
    subtitle: 'Thiết lập tham số an toàn, rate limits, session timeout & Outbox worker',
  },
  '/system/login': {
    title: 'Cổng Xác Thực Nhân Sự Quản Trị',
    subtitle: 'Đăng nhập bảo mật dành cho nhân sự điều hành (Admin, Assistant, Specialist)',
  },
};

const USER_PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Tổng Quan Điểm Thưởng',
    subtitle: 'Theo dõi số dư CHIP cá nhân, chuỗi điểm danh & các nhiệm vụ nhận thưởng',
  },
  '/wallet': {
    title: 'Ví Cá Nhân & Lịch Sử Tích Luỹ',
    subtitle: 'Xem số dư điểm thưởng nội bộ và nhật ký cộng điểm của bạn',
  },
  '/resend-verification': {
    title: 'Kích Hoạt Tài Khoản Email',
    subtitle: 'Yêu cầu gửi lại thư kích hoạt bảo mật để nhận thưởng khởi tạo',
  },
  '/login': {
    title: 'Đăng Nhập Thành Viên',
    subtitle: 'Đăng nhập vào tài khoản điểm thưởng hội viên CHIPCOIN',
  },
  '/register': {
    title: 'Mở Tài Khoản Thành Viên',
    subtitle: 'Đăng ký tài khoản mới và nhận ngay gói quà chào mừng +5,000 CHIP',
  },
  '/verify-email': {
    title: 'Xác Thực Email Thành Viên',
    subtitle: 'Hoàn tất bước xác nhận email để kích hoạt toàn diện ví điểm',
  },
};

export default function TopBar({ onOpenMobileMenu }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isSystemRoute = pathname.startsWith('/system');

  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('chipcoin_system_session');
      if (raw) setSession(JSON.parse(raw));
      else setSession(null);
    } catch (e) {
      setSession(null);
    }
  }, [pathname]);

  const handleSystemLogout = () => {
    try {
      localStorage.removeItem('chipcoin_system_session');
    } catch (e) {}
    setSession(null);
    router.push('/system/login');
  };

  const currentPage = isSystemRoute
    ? SYSTEM_PAGE_TITLES[pathname] || {
        title: 'Bảng Điều Hành Hệ Thống',
        subtitle: 'Khu vực quản trị và cấu hình vận hành CHIPCOIN',
      }
    : USER_PAGE_TITLES[pathname] || {
        title: 'Cổng Hội Viên CHIPCOIN',
        subtitle: 'Nền tảng tích luỹ điểm thưởng nội bộ',
      };

  return (
    <header className={`app-topbar ${isSystemRoute ? 'topbar-system' : 'topbar-user'}`}>
      <div className="topbar-inner">
        {/* Left: Mobile hamburger + Page Breadcrumbs */}
        <div className="topbar-left">
          <button
            type="button"
            className="topbar-mobile-toggle"
            onClick={onOpenMobileMenu}
            aria-label="Mở menu"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" x2="21" y1="6" y2="6" />
              <line x1="3" x2="21" y1="12" y2="12" />
              <line x1="3" x2="21" y1="18" y2="18" />
            </svg>
          </button>

          <div className="topbar-breadcrumbs">
            <span
              className="crumb-root"
              style={{
                color: isSystemRoute ? 'var(--accent-bronze)' : 'var(--text-secondary)',
                fontWeight: isSystemRoute ? 700 : 500,
              }}
            >
              {isSystemRoute ? 'CHIPCOIN SYSTEM' : 'CHIPCOIN'}
            </span>
            <span className="crumb-divider">/</span>
            <span className="crumb-current">{currentPage.title}</span>
          </div>
        </div>

        {/* Right: Badges & Profile Options */}
        <div className="topbar-right">
          {isSystemRoute ? (
            /* System Mode Badges & Staff Actions */
            <>
              <div className="topbar-status-badge">
                <span className="status-dot-pulse" />
                <span className="status-label">Outbox: 100% Live</span>
              </div>

              <div className="topbar-status-badge hide-mobile">
                <span style={{ color: 'var(--accent-bronze)' }}>🛡️</span>
                <span className="status-label">Master Vault: 500M</span>
              </div>

              {session ? (
                <div className="topbar-user-pill">
                  <div
                    className="user-avatar-circle"
                    style={{ background: 'var(--gradient-bronze)', color: '#0b0c0e' }}
                  >
                    {session.email?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div className="user-info-text hide-mobile">
                    <span className="user-email">{session.email}</span>
                    <span className="user-role" style={{ color: '#f5d77f' }}>
                      {session.roles?.join(', ') || 'STAFF'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="topbar-logout-btn"
                    onClick={handleSystemLogout}
                    title="Đăng xuất khỏi cổng quản trị"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <Link href="/system/login" className="topbar-btn-gold">
                  Đăng Nhập Quản Trị
                </Link>
              )}
            </>
          ) : (
            /* User Mode Badges & Member Actions (Không có bất kỳ link sang hệ thống) */
            <>
              <div className="topbar-status-badge">
                <span style={{ color: '#fbbf24' }}>🪙</span>
                <span className="status-label">1,250,000 CHIP</span>
              </div>

              <div className="topbar-status-badge hide-mobile">
                <span style={{ color: '#34d399' }}>✨</span>
                <span className="status-label">Hạng VIP 3</span>
              </div>

              <div className="topbar-auth-links">
                <Link href="/login" className="topbar-link">
                  Đăng nhập
                </Link>
                <Link href="/register" className="topbar-btn-gold">
                  Đăng ký
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
