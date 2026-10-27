'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export interface MenuItem {
  name: string;
  href: string;
  badge?: string;
  badgeType?: 'gold' | 'pulse' | 'outline' | 'neutral' | 'red';
  description?: string;
  exact?: boolean;
  icon: (props: { active: boolean }) => React.ReactNode;
}

export interface MenuGroup {
  id: string;
  title: string;
  items: MenuItem[];
}

// ==========================================
// 1. MENU CHUYÊN BIỆT CHO NGƯỜI DÙNG (MEMBER PORTAL)
// Tuyệt đối không có quyền cấu hình & không có link sang hệ thống
// ==========================================
export const USER_MENU_GROUPS: MenuGroup[] = [
  {
    id: 'user_core',
    title: 'TRUNG TÂM HỘI VIÊN',
    items: [
      {
        name: 'Tổng Quan Cá Nhân',
        href: '/',
        exact: true,
        description: 'Bảng chỉ số tích luỹ điểm thưởng & nhiệm vụ',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#f5d77f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="7" height="9" x="3" y="3" rx="1.5" />
            <rect width="7" height="5" x="14" y="3" rx="1.5" />
            <rect width="7" height="9" x="14" y="12" rx="1.5" />
            <rect width="7" height="5" x="3" y="16" rx="1.5" />
          </svg>
        ),
      },
      {
        name: 'Ví Điểm Thưởng CHIP',
        href: '/wallet',
        badge: 'CHIP',
        badgeType: 'gold',
        description: 'Số dư cá nhân & lịch sử nhận thưởng',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#f5d77f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            <circle cx="16" cy="12" r="1.5" fill={active ? '#f5d77f' : 'currentColor'} />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'user_auth',
    title: 'TÀI KHOẢN & BẢO MẬT',
    items: [
      {
        name: 'Kích Hoạt / Gửi Lại Email',
        href: '/resend-verification',
        badge: 'Token',
        badgeType: 'neutral',
        description: 'Xác thực địa chỉ email nhận thưởng',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#f5d77f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" />
            <polyline points="22,6 12,13 2,6" />
            <path d="m22 20-3-3" />
            <path d="M19 17v4" />
          </svg>
        ),
      },
      {
        name: 'Đăng Nhập Thành Viên',
        href: '/login',
        description: 'Đăng nhập vào tài khoản tích luỹ',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#f5d77f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        ),
      },
      {
        name: 'Đăng Ký Tài Khoản',
        href: '/register',
        badge: 'Mới',
        badgeType: 'gold',
        description: 'Tạo tài khoản hội viên nhận +5,000 CHIP',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#f5d77f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        ),
      },
    ],
  },
];

// ==========================================
// 2. MENU CHUYÊN BIỆT CHO QUẢN TRỊ VIÊN (SYSTEM CONSOLE)
// Toàn bộ tính năng điều hành, tài khoản 4 cấp và cấu hình hệ thống
// ==========================================
export const SYSTEM_MENU_GROUPS: MenuGroup[] = [
  {
    id: 'system_core',
    title: 'ĐIỀU HÀNH & KHO QUỸ',
    items: [
      {
        name: 'Quản Lý Tài Khoản 4 Cấp',
        href: '/system',
        exact: true,
        badge: '4 Cấp',
        badgeType: 'gold',
        description: 'Admin, Trợ lý, Chuyên viên, Người dùng',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#f5d77f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        name: 'Sổ Cái Kép Master Treasury',
        href: '/system/wallet',
        badge: 'Treasury',
        badgeType: 'gold',
        description: 'Kho quỹ tổng thể 500M CHIP & điều chuyển pool',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#f5d77f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'system_ops',
    title: 'GIÁM SÁT & VẬN HÀNH',
    items: [
      {
        name: 'Giám Sát Outbox Worker',
        href: '/system/tracking',
        badge: 'Live',
        badgeType: 'pulse',
        description: 'Hàng đợi sự kiện Transactional Outbox thời gian thực',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#f5d77f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
      },
      {
        name: 'Thống Kê Báo Cáo & Đối Soát',
        href: '/system/reports',
        badge: 'Audit',
        badgeType: 'neutral',
        description: 'Báo cáo tăng trưởng, phân bổ điểm & xuất CSV',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#f5d77f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" x2="18" y1="20" y2="10" />
            <line x1="12" x2="12" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="14" />
            <path d="M3 20h18" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'system_config',
    title: 'CẤU HÌNH TOÀN HỆ THỐNG',
    items: [
      {
        name: 'Cài Đặt Cấu Hình',
        href: '/system/settings',
        badge: 'Config',
        badgeType: 'gold',
        description: 'Cấu hình tham số, rate limits, session & SMTP',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#f5d77f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
      {
        name: 'Cổng Đăng Nhập Quản Trị',
        href: '/system/login',
        badge: 'Auth',
        badgeType: 'outline',
        description: 'Xác thực nhân sự quản trị (Admin, Assistant, Specialist)',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#f5d77f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const isSystemRoute = pathname.startsWith('/system');

  const [session, setSession] = useState<{ email?: string; roles?: string[] } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('chipcoin_system_session');
      if (raw) setSession(JSON.parse(raw));
      else setSession(null);
    } catch (e) {
      setSession(null);
    }
  }, [pathname]);

  const activeMenuGroups = isSystemRoute ? SYSTEM_MENU_GROUPS : USER_MENU_GROUPS;

  const isItemActive = (item: MenuItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${
          isMobileOpen ? 'mobile-open' : ''
        } ${isSystemRoute ? 'sidebar-system-mode' : 'sidebar-user-mode'}`}
        aria-label={isSystemRoute ? 'Bảng điều khiển Quản trị Hệ thống' : 'Thanh điều hướng Hội viên'}
      >
        {/* Brand Header */}
        <div className="sidebar-brand">
          <Link
            href={isSystemRoute ? '/system' : '/'}
            className="sidebar-brand-link"
            onClick={onCloseMobile}
            title={isSystemRoute ? 'Về Trang Quản Trị Hệ Thống' : 'CHIPCOIN - Về Trang Chủ'}
          >
            <div className="sidebar-logo-wrap">
              <Image
                src="/logo.png"
                alt="CHIPCOIN Logo"
                width={36}
                height={36}
                className="sidebar-logo-img"
                priority
              />
            </div>
            {!isCollapsed && (
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-title">
                  {isSystemRoute ? 'CHIPCOIN' : 'CHIPCOIN'}
                </span>
                <span
                  className="sidebar-brand-sub"
                  style={{
                    color: isSystemRoute ? 'var(--accent-bronze)' : 'var(--text-secondary)',
                    fontWeight: isSystemRoute ? 700 : 500,
                  }}
                >
                  {isSystemRoute ? 'Quản Trị Hệ Thống' : 'Cổng Hội Viên'}
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            className="sidebar-collapse-btn desktop-only"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isCollapsed ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="sidebar-mobile-close-btn mobile-only"
            onClick={onCloseMobile}
            aria-label="Đóng menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Glance Widget phân tách rõ ràng */}
        {!isCollapsed ? (
          isSystemRoute ? (
            /* System Staff Glance Widget */
            <div className="sidebar-glance-card" style={{ borderColor: 'rgba(212, 175, 55, 0.4)' }}>
              <div className="glance-header">
                <span className="glance-label">NHÂN SỰ QUẢN TRỊ</span>
                <span
                  className="glance-tier-badge"
                  style={{
                    background: 'rgba(212, 175, 55, 0.2)',
                    color: '#f5d77f',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                  }}
                >
                  {session?.roles?.[0] ? session.roles[0].toUpperCase() : 'STAFF'}
                </span>
              </div>
              <div className="glance-balance-row">
                <span className="glance-amount" style={{ fontSize: '1.25rem', color: '#ffffff' }}>
                  {session?.email ? session.email.split('@')[0] : 'admin_sec'}
                </span>
              </div>
              <div className="glance-subtext">
                <span>Kho Quỹ: 500M CHIP Vault</span>
                <Link href="/system/wallet" className="glance-link" onClick={onCloseMobile}>
                  Kho quỹ →
                </Link>
              </div>
            </div>
          ) : (
            /* User Member Glance Widget */
            <div className="sidebar-glance-card">
              <div className="glance-header">
                <span className="glance-label">SỐ DƯ ĐIỂM THƯỞNG</span>
                <span className="glance-tier-badge">VIP 3</span>
              </div>
              <div className="glance-balance-row">
                <span className="glance-amount">1,250,000</span>
                <span className="glance-unit">CHIP</span>
              </div>
              <div className="glance-subtext">
                <span>≈ $125.00 USD (Nội bộ)</span>
                <Link href="/wallet" className="glance-link" onClick={onCloseMobile}>
                  Ví của tôi →
                </Link>
              </div>
            </div>
          )
        ) : (
          <div
            className="sidebar-collapsed-glance"
            title={
              isSystemRoute
                ? `Nhân sự quản trị: ${session?.email || 'Admin Staff'}`
                : 'Số dư cá nhân: 1,250,000 CHIP'
            }
          >
            <Link
              href={isSystemRoute ? '/system/wallet' : '/wallet'}
              className="collapsed-coin-btn"
            >
              <span className="collapsed-coin-icon">{isSystemRoute ? '🛡️' : '🪙'}</span>
              <span className="collapsed-coin-dot" />
            </Link>
          </div>
        )}

        {/* Navigation Menu with Grouped Sections */}
        <nav className="sidebar-nav">
          {activeMenuGroups.map((group) => (
            <div key={group.id} className="sidebar-group-block">
              {!isCollapsed ? (
                <div className="sidebar-section-title">{group.title}</div>
              ) : (
                <div className="sidebar-collapsed-divider" />
              )}
              <ul className="sidebar-menu-list">
                {group.items.map((item) => {
                  const active = isItemActive(item);
                  return (
                    <li key={item.href} className="sidebar-menu-item">
                      <Link
                        href={item.href}
                        className={`sidebar-nav-link ${active ? 'active' : ''}`}
                        onClick={onCloseMobile}
                      >
                        <span className="sidebar-item-icon">
                          {item.icon({ active })}
                        </span>
                        {!isCollapsed && (
                          <span className="sidebar-item-name">{item.name}</span>
                        )}
                        {!isCollapsed && item.badge && (
                          <span
                            className={`sidebar-item-badge ${
                              item.badgeType === 'pulse'
                                ? 'badge-pulse'
                                : item.badgeType === 'gold'
                                ? 'badge-gold'
                                : item.badgeType === 'outline'
                                ? 'badge-outline'
                                : ''
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {/* Floating Tooltip in Collapsed Mode */}
                        {isCollapsed && (
                          <div className="sidebar-floating-tooltip">
                            <div className="tooltip-title-row">
                              <span className="tooltip-title">{item.name}</span>
                              {item.badge && (
                                <span className={`tooltip-badge badge-${item.badgeType || 'neutral'}`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <span className="tooltip-desc">{item.description}</span>
                            )}
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer Sidebar phân tách riêng */}
        <div className="sidebar-footer">
          {isSystemRoute ? (
            /* System Footer: Quản Trị Outbox & Sổ Cái Kép */
            !isCollapsed ? (
              <Link href="/system/tracking" className="sidebar-system-card" onClick={onCloseMobile}>
                <div className="system-status-indicator">
                  <span className="status-dot-pulse" />
                  <span className="system-status-text">Outbox: 100% Hoạt Động</span>
                  <span className="system-live-chip">LIVE</span>
                </div>
                <div className="system-meta-text">
                  PostgreSQL Worker & Sổ Cái Kép
                </div>
                <div className="system-meta-sub">
                  Chu kỳ quét 2s • 0 bản ghi tồn
                </div>
              </Link>
            ) : (
              <Link
                href="/system/tracking"
                className="sidebar-collapsed-indicator"
                title="Hệ thống Quản Trị: Outbox Worker 100% Live"
              >
                <span className="status-dot-pulse" />
              </Link>
            )
          ) : (
            /* User Footer: Khẳng định hệ thống điểm thưởng nội bộ an toàn (KHÔNG có link quản trị) */
            !isCollapsed ? (
              <div
                className="sidebar-system-card"
                style={{
                  cursor: 'default',
                  background: 'rgba(212, 175, 55, 0.04)',
                  borderColor: 'rgba(212, 175, 55, 0.15)',
                }}
              >
                <div className="system-status-indicator">
                  <span style={{ fontSize: '0.9rem' }}>🛡️</span>
                  <span className="system-status-text" style={{ color: '#ffffff' }}>
                    Sổ Cái Hội Viên Active
                  </span>
                </div>
                <div className="system-meta-text">
                  Tích lũy điểm CHIP nội bộ
                </div>
                <div className="system-meta-sub">
                  An toàn • Không phí • Minh bạch
                </div>
              </div>
            ) : (
              <div
                className="sidebar-collapsed-indicator"
                title="Hội viên CHIPCOIN: Hệ thống điểm thưởng an toàn"
              >
                <span>🛡️</span>
              </div>
            )
          )}
        </div>
      </aside>
    </>
  );
}
