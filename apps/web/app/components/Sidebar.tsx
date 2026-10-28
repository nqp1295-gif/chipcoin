'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useI18n } from '../lib/i18n';
import { ChipStore, StoredUser, TIER_CONFIGS } from '../lib/store';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export interface MenuItem {
  nameKey: string;
  defaultName: string;
  href: string;
  badge?: string;
  badgeType?: 'gold' | 'pulse' | 'outline' | 'neutral' | 'red';
  descKey?: string;
  defaultDesc?: string;
  exact?: boolean;
  icon: (props: { active: boolean }) => React.ReactNode;
}

export interface MenuGroup {
  id: string;
  titleKey: string;
  defaultTitle: string;
  items: MenuItem[];
}

export const USER_MENU_GROUPS: MenuGroup[] = [
  {
    id: 'user_core',
    titleKey: 'group_member_center',
    defaultTitle: 'TRUNG TÂM HỘI VIÊN',
    items: [
      {
        nameKey: 'nav_overview',
        defaultName: 'Tổng Quan Cá Nhân',
        href: '/',
        exact: true,
        descKey: 'nav_overview_desc',
        defaultDesc: 'Bảng chỉ số tích luỹ điểm thưởng & nhiệm vụ',
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
        nameKey: 'nav_activities',
        defaultName: 'Hoạt Động Tích Lũy',
        href: '/activities',
        badge: 'Hot',
        badgeType: 'pulse',
        descKey: 'nav_activities_desc',
        defaultDesc: 'Điểm danh hàng ngày, nhiệm vụ nhận điểm CHIP',
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
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ),
      },
      {
        nameKey: 'nav_rank',
        defaultName: 'Thăng Hạng Hội Viên',
        href: '/rank',
        badge: 'VIP',
        badgeType: 'gold',
        descKey: 'nav_rank_desc',
        defaultDesc: 'Điều kiện thăng cấp & tiến trình nâng hạng',
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
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        ),
      },
      {
        nameKey: 'nav_referrals',
        defaultName: 'Hệ Thống Giới Thiệu',
        href: '/referrals',
        badge: 'Bonus',
        badgeType: 'gold',
        descKey: 'nav_referrals_desc',
        defaultDesc: 'Quản lý nhánh F1 & hoa hồng chia sẻ',
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
        nameKey: 'nav_wallet',
        defaultName: 'Ví Điểm Thưởng CHIP',
        href: '/wallet',
        badge: 'CHIP',
        badgeType: 'gold',
        descKey: 'nav_wallet_desc',
        defaultDesc: 'Số dư cá nhân & lịch sử nhận thưởng',
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
      {
        nameKey: 'tab_convert',
        defaultName: 'Quy Đổi CHIP ↔ USDT',
        href: '/wallet/convert',
        badge: '1:5M',
        badgeType: 'gold',
        descKey: 'convert_desc',
        defaultDesc: 'Tỷ giá cố định 1 USDT = 5,000,000 CHIP',
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
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        ),
      },
      {
        nameKey: 'nav_ton_wallet',
        defaultName: 'Liên Kết Ví TON',
        href: '/ton-wallet',
        badge: 'TON',
        badgeType: 'pulse',
        descKey: 'nav_ton_wallet_desc',
        defaultDesc: 'Kết nối ví The Open Network & bảo mật OTP',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#38bdf8' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 2 9 12 22 22 9 12 2" />
            <polyline points="2 9 12 14 22 9" />
            <line x1="12" y1="2" x2="12" y2="14" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'user_auth',
    titleKey: 'group_account_security',
    defaultTitle: 'TÀI KHOẢN & BẢO MẬT',
    items: [
      {
        nameKey: 'nav_profile',
        defaultName: 'Hồ Sơ Cá Nhân',
        href: '/profile',
        badge: 'VIP',
        badgeType: 'gold',
        descKey: 'nav_profile_desc',
        defaultDesc: 'Xem thông tin, đổi tên hiển thị, mật khẩu & avatar',
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
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
      {
        nameKey: 'nav_resend',
        defaultName: 'Kích Hoạt / Gửi Lại Email',
        href: '/resend-verification',
        badge: 'Token',
        badgeType: 'neutral',
        descKey: 'nav_resend_desc',
        defaultDesc: 'Xác thực địa chỉ email nhận thưởng',
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
        nameKey: 'nav_login',
        defaultName: 'Đăng Nhập Thành Viên',
        href: '/login',
        descKey: 'nav_login_desc',
        defaultDesc: 'Đăng nhập vào tài khoản tích luỹ',
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
        nameKey: 'nav_register',
        defaultName: 'Đăng Ký Tài Khoản',
        href: '/register',
        badge: '+5,000',
        badgeType: 'gold',
        descKey: 'nav_register_desc',
        defaultDesc: 'Tạo tài khoản hội viên nhận +5,000 CHIP',
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

export const SYSTEM_MENU_GROUPS: MenuGroup[] = [
  {
    id: 'system_core',
    titleKey: 'group_sys_ops',
    defaultTitle: 'ĐIỀU HÀNH & KHO QUỸ',
    items: [
      {
        nameKey: 'nav_sys_accounts',
        defaultName: 'Quản Lý Tài Khoản',
        href: '/system',
        exact: true,
        badge: 'Active',
        badgeType: 'gold',
        descKey: 'nav_sys_accounts_desc',
        defaultDesc: 'Admin, Trợ lý, Chuyên viên, Người dùng',
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
        nameKey: 'nav_sys_treasury',
        defaultName: 'Ví Quản Trị Hệ Thống',
        href: '/system/wallet',
        badge: 'TON Fee',
        badgeType: 'gold',
        descKey: 'nav_sys_treasury_desc',
        defaultDesc: 'Ví TON Quản Trị & Quỹ thu phí 1% USDT',
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
    titleKey: 'group_sys_monitoring',
    defaultTitle: 'GIÁM SÁT & VẬN HÀNH',
    items: [
      {
        nameKey: 'nav_sys_tracking',
        defaultName: 'Giám Sát Outbox Worker',
        href: '/system/tracking',
        badge: 'Live',
        badgeType: 'pulse',
        descKey: 'nav_sys_tracking_desc',
        defaultDesc: 'Hàng đợi sự kiện Transactional Outbox thời gian thực',
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
        nameKey: 'nav_sys_email',
        defaultName: 'Giám Sát Gmail SMTP & Outbox',
        href: '/system/email',
        badge: 'SMTP',
        badgeType: 'pulse',
        descKey: 'nav_sys_email_desc',
        defaultDesc: 'jinofc.ytb@gmail.com, hàng đợi outbox & gửi thử nghiệm',
        icon: ({ active }) => (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#38bdf8' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        ),
      },
      {
        nameKey: 'nav_sys_reports',
        defaultName: 'Thống Kê Báo Cáo Hệ Thống',
        href: '/system/reports',
        badge: 'Audit',
        badgeType: 'neutral',
        descKey: 'nav_sys_reports_desc',
        defaultDesc: 'Báo cáo tăng trưởng, phân bổ điểm & xuất CSV',
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
    titleKey: 'group_sys_config',
    defaultTitle: 'CẤU HÌNH TOÀN HỆ THỐNG',
    items: [
      {
        nameKey: 'nav_sys_settings',
        defaultName: 'Cài Đặt Cấu Hình',
        href: '/system/settings',
        badge: 'Config',
        badgeType: 'gold',
        descKey: 'nav_sys_settings_desc',
        defaultDesc: 'Cấu hình tham số, rate limits, session & SMTP',
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
        nameKey: 'nav_sys_login',
        defaultName: 'Cổng Đăng Nhập Quản Trị',
        href: '/system/login',
        badge: 'Auth',
        badgeType: 'outline',
        descKey: 'nav_sys_login_desc',
        defaultDesc: 'Xác thực nhân sự quản trị hệ thống',
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
  const { t } = useI18n();
  const isSystemRoute = pathname.startsWith('/system');

  const [staffSession, setStaffSession] = useState<{ email?: string; roles?: string[] } | null>(null);
  const [memberUser, setMemberUser] = useState<StoredUser | null>(null);

  const loadData = () => {
    try {
      const sys = ChipStore.getCurrentSystemStaff();
      setStaffSession(sys);

      const mem = ChipStore.getCurrentMember();
      setMemberUser(mem);
    } catch (e) {}
  };

  useEffect(() => {
    loadData();

    const handleChange = () => loadData();
    window.addEventListener('chipcoin_session_changed', handleChange);
    window.addEventListener('chipcoin_store_updated', handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      window.removeEventListener('chipcoin_session_changed', handleChange);
      window.removeEventListener('chipcoin_store_updated', handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, [pathname]);

  const activeMenuGroups = isSystemRoute ? SYSTEM_MENU_GROUPS : USER_MENU_GROUPS;

  const isItemActive = (item: MenuItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const IS_LOCAL_DEV =
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_USE_SEED_DATA === 'true';

  const defaultTier = IS_LOCAL_DEV ? 'CHIP GOLD' : 'CHIP MEMBER';
  const defaultBalance = IS_LOCAL_DEV ? 1250000 : 0;

  const memberTierMeta = memberUser?.tier
    ? TIER_CONFIGS[memberUser.tier]
    : TIER_CONFIGS[defaultTier];

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
                <span className="sidebar-brand-title">CHIPCOIN</span>
                <span
                  className="sidebar-brand-sub"
                  style={{
                    color: isSystemRoute ? 'var(--accent-bronze)' : 'var(--text-secondary)',
                    fontWeight: isSystemRoute ? 700 : 500,
                  }}
                >
                  {isSystemRoute ? t('brand_system_title') : t('brand_member_title')}
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

        {/* Glance Widget */}
        {!isCollapsed ? (
          isSystemRoute ? (
            /* System Staff Glance Widget */
            <div className="sidebar-glance-card" style={{ borderColor: 'rgba(212, 175, 55, 0.4)' }}>
              <div className="glance-header">
                <span className="glance-label">{t('role_staff')}</span>
                <span
                  className="glance-tier-badge"
                  style={{
                    background: 'rgba(212, 175, 55, 0.2)',
                    color: '#f5d77f',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                  }}
                >
                  {staffSession?.roles?.[0] ? staffSession.roles[0].toUpperCase() : 'STAFF'}
                </span>
              </div>
              <div className="glance-balance-row">
                <span className="glance-amount" style={{ fontSize: '1.25rem', color: '#ffffff' }}>
                  {staffSession?.email ? staffSession.email.split('@')[0] : (IS_LOCAL_DEV ? 'admin_sec' : t('not_logged_in', 'Chưa đăng nhập'))}
                </span>
              </div>
              <div className="glance-subtext">
                <span>{IS_LOCAL_DEV ? 'Kho Quỹ: 500M CHIP Vault' : t('sys_wallet_title', 'Kho Quỹ Toàn Hệ Thống')}</span>
                <Link href="/system/wallet" className="glance-link" onClick={onCloseMobile}>
                  {t('nav_sys_treasury', 'Kho quỹ')} →
                </Link>
              </div>
            </div>
          ) : (
            /* User Member Glance Widget with live data */
            memberUser ? (
              <div className="sidebar-glance-card">
                <div className="glance-header">
                  <span className="glance-label">{t('balance_label')}</span>
                  <Link href="/rank" style={{ textDecoration: 'none' }} onClick={onCloseMobile}>
                    <span
                      className="glance-tier-badge"
                      style={{
                        color: memberTierMeta.badgeColor,
                        borderColor: memberTierMeta.badgeColor,
                        background: 'rgba(0,0,0,0.3)',
                      }}
                    >
                      {memberUser.tier}
                    </span>
                  </Link>
                </div>
                <div className="glance-balance-row">
                  <span className="glance-amount">
                    {memberUser.chipsBalance.toLocaleString()}
                  </span>
                  <span className="glance-unit">CHIP</span>
                </div>
                <div className="glance-subtext">
                  <span>≈ ${(memberUser.chipsBalance / 10000).toFixed(2)} USD</span>
                  <Link href="/wallet" className="glance-link" onClick={onCloseMobile}>
                    {t('nav_wallet', 'Ví của tôi')} →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="sidebar-glance-card" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <div className="glance-header">
                  <span className="glance-label" style={{ color: '#94a3b8' }}>{t('guest_visitor', 'KHÁCH TRUY CẬP')}</span>
                  <span
                    className="glance-tier-badge"
                    style={{
                      color: '#94a3b8',
                      borderColor: '#475569',
                      background: 'rgba(0,0,0,0.3)',
                    }}
                  >
                    {t('not_logged_in', 'CHƯA ĐĂNG NHẬP')}
                  </span>
                </div>
                <div className="glance-balance-row">
                  <span className="glance-amount" style={{ color: '#94a3b8' }}>0</span>
                  <span className="glance-unit">CHIP</span>
                </div>
                <div className="glance-subtext">
                  <span style={{ color: 'var(--text-muted)' }}>{t('welcome_gift', 'Quà chào mừng +5,000')}</span>
                  <Link href="/login" className="glance-link" onClick={onCloseMobile}>
                    {t('login_now', 'Đăng nhập ngay →')}
                  </Link>
                </div>
              </div>
            )
          )
        ) : (
          <div
            className="sidebar-collapsed-glance"
            title={
              isSystemRoute
                ? `Nhân sự quản trị: ${staffSession?.email || 'Admin Staff'}`
                : `Số dư cá nhân: ${(memberUser?.chipsBalance ?? defaultBalance).toLocaleString()} CHIP (${memberUser?.tier || defaultTier})`
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
          {activeMenuGroups.map((group) => {
            const groupTitle = t(group.titleKey, group.defaultTitle);
            return (
              <div key={group.id} className="sidebar-group-block">
                {!isCollapsed ? (
                  <div className="sidebar-section-title" title={groupTitle}>
                    {groupTitle}
                  </div>
                ) : (
                  <div className="sidebar-collapsed-divider" />
                )}
                <ul className="sidebar-menu-list">
                  {group.items.map((item) => {
                    const active = isItemActive(item);
                    const itemName = t(item.nameKey, item.defaultName);
                    const itemDesc = item.descKey ? t(item.descKey, item.defaultDesc) : item.defaultDesc;

                    return (
                      <li key={item.href} className="sidebar-menu-item">
                        <Link
                          href={item.href}
                          className={`sidebar-nav-link ${active ? 'active' : ''}`}
                          onClick={onCloseMobile}
                          title={itemName}
                        >
                          <span className="sidebar-item-icon">
                            {item.icon({ active })}
                          </span>
                          {!isCollapsed && (
                            <span className="sidebar-item-name">{itemName}</span>
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
                                <span className="tooltip-title">{itemName}</span>
                                {item.badge && (
                                  <span className={`tooltip-badge badge-${item.badgeType || 'neutral'}`}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {itemDesc && (
                                <span className="tooltip-desc">{itemDesc}</span>
                              )}
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="sidebar-footer">
          {isSystemRoute ? (
            !isCollapsed ? (
              <Link href="/system/tracking" className="sidebar-system-card" onClick={onCloseMobile}>
                <div className="system-status-indicator">
                  <span className="status-dot-pulse" />
                  <span className="system-status-text">Outbox: 100% Hoạt Động</span>
                  <span className="system-live-chip">LIVE</span>
                </div>
                <div className="system-meta-text">PostgreSQL Worker &amp; Quản Trị Hệ Thống</div>
                <div className="system-meta-sub">Chu kỳ quét 2s • 0 bản ghi tồn</div>
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
                    Ví Điểm Hội Viên Active
                  </span>
                </div>
                <div className="system-meta-text">Tích lũy điểm CHIP nội bộ</div>
                <div className="system-meta-sub">An toàn • Minh bạch • Khép kín</div>
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
