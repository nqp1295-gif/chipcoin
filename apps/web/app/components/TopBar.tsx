'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n, LANGUAGES, SupportedLanguage } from '../lib/i18n';
import { ChipStore, StoredUser, TIER_CONFIGS } from '../lib/store';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

export default function TopBar({ onOpenMobileMenu }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t, currentLangMeta } = useI18n();
  const isSystemRoute = pathname.startsWith('/system');

  const [systemSession, setSystemSession] = useState<any>(null);
  const [memberUser, setMemberUser] = useState<StoredUser | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const loadSessions = () => {
    try {
      const sys = ChipStore.getCurrentSystemStaff();
      setSystemSession(sys);

      const mem = ChipStore.getCurrentMember();
      setMemberUser(mem);
    } catch (e) {}
  };

  useEffect(() => {
    loadSessions();

    const handleSessionChange = () => loadSessions();
    window.addEventListener('chipcoin_session_changed', handleSessionChange);
    window.addEventListener('chipcoin_store_updated', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);

    return () => {
      window.removeEventListener('chipcoin_session_changed', handleSessionChange);
      window.removeEventListener('chipcoin_store_updated', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, [pathname]);

  // Click outside listener for language dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSystemLogout = () => {
    ChipStore.clearSystemSession();
    setSystemSession(null);
    router.push('/system/login');
  };

  const handleMemberLogout = () => {
    ChipStore.clearMemberSession();
    setMemberUser(null);
    router.push('/login');
  };

  // Dynamic titles with i18n
  const getPageTitle = () => {
    if (pathname === '/') return t('nav_overview');
    if (pathname === '/activities') return t('nav_activities');
    if (pathname === '/rank') return t('nav_rank');
    if (pathname === '/referrals') return t('nav_referrals');
    if (pathname === '/wallet') return t('nav_wallet');
    if (pathname === '/ton-wallet') return t('nav_ton_wallet');
    if (pathname === '/profile') return t('nav_profile');
    if (pathname === '/resend-verification') return t('nav_resend');
    if (pathname === '/login') return t('nav_login');
    if (pathname === '/register') return t('nav_register');
    if (pathname === '/verify-email') return 'Xác Thực Email';

    if (pathname === '/system') return t('nav_sys_accounts');
    if (pathname === '/system/wallet') return t('nav_sys_treasury');
    if (pathname === '/system/tracking') return t('nav_sys_tracking');
    if (pathname === '/system/reports') return t('nav_sys_reports');
    if (pathname === '/system/settings') return t('nav_sys_settings');
    if (pathname === '/system/login') return t('nav_sys_login');

    return isSystemRoute ? t('brand_system_title') : t('brand_member_title');
  };

  const currentTierMeta = memberUser?.tier ? TIER_CONFIGS[memberUser.tier] : TIER_CONFIGS['CHIP MEMBER'];

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
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
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
            <span className="crumb-current">{getPageTitle()}</span>
          </div>
        </div>

        {/* Right: Badges, Language Switcher & Profile Options */}
        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language Switcher Dropdown */}
          <div ref={langMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Chuyển đổi ngôn ngữ / Change Language"
            >
              <span style={{ fontSize: '1rem' }}>{currentLangMeta.flag}</span>
              <span className="hide-mobile" style={{ textTransform: 'uppercase' }}>
                {currentLangMeta.code}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>▼</span>
            </button>

            {langMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  background: 'rgba(15, 17, 21, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--border-bronze)',
                  borderRadius: '10px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.7), 0 0 15px rgba(212,175,55,0.2)',
                  minWidth: '170px',
                  zIndex: 300,
                  overflow: 'hidden',
                  padding: '4px',
                }}
              >
                {LANGUAGES.map((lang) => {
                  const active = lang.code === language;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code as SupportedLanguage);
                        setLangMenuOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: active ? 'rgba(212, 175, 55, 0.18)' : 'transparent',
                        color: active ? '#f5d77f' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.85rem',
                        fontWeight: active ? 700 : 500,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
                      <span style={{ flex: 1 }}>{lang.name}</span>
                      {active && <span style={{ color: '#f5d77f', fontSize: '0.8rem' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {isSystemRoute ? (
            /* System Mode Badges & Staff Actions */
            <>
              <div className="topbar-status-badge hide-mobile">
                <span className="status-dot-pulse" />
                <span className="status-label">Outbox: 100% Live</span>
              </div>

              {systemSession ? (
                <div className="topbar-user-pill">
                  <div
                    className="user-avatar-circle"
                    style={{ background: 'var(--gradient-bronze)', color: '#0b0c0e' }}
                  >
                    {systemSession.email?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div className="user-info-text hide-mobile">
                    <span className="user-email">{systemSession.email}</span>
                    <span className="user-role" style={{ color: '#f5d77f' }}>
                      {systemSession.roles?.join(', ') || 'STAFF'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="topbar-logout-btn"
                    onClick={handleSystemLogout}
                    title="Đăng xuất khỏi cổng quản trị"
                  >
                    {t('btn_logout')}
                  </button>
                </div>
              ) : (
                <Link href="/system/login" className="topbar-btn-gold">
                  {t('btn_system_login')}
                </Link>
              )}
            </>
          ) : (
            /* User Member Mode Badges & Member Actions */
            <>
              {memberUser ? (
                <>
                  <div className="topbar-status-badge">
                    <span style={{ color: '#fbbf24' }}>🪙</span>
                    <span className="status-label">
                      {memberUser.chipsBalance.toLocaleString()} CHIP
                    </span>
                  </div>

                  <Link href="/rank" className="topbar-status-badge hide-mobile" style={{ textDecoration: 'none' }}>
                    <span style={{ color: currentTierMeta.badgeColor }}>👑</span>
                    <span className="status-label" style={{ color: currentTierMeta.badgeColor }}>
                      {memberUser.tier}
                    </span>
                  </Link>

                  {/* Profile Avatar Icon Button */}
                  <Link
                    href="/profile"
                    className="topbar-avatar-btn"
                    title={t('btn_profile')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: memberUser.avatarUrl ? 'transparent' : currentTierMeta.gradient,
                      border: `2px solid ${memberUser.avatarUrl ? '#f5d77f' : currentTierMeta.badgeColor}`,
                      boxShadow: '0 0 12px rgba(212, 175, 55, 0.4)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      flexShrink: 0,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      textDecoration: 'none',
                    }}
                  >
                    {memberUser.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={memberUser.avatarUrl}
                        alt="User Profile"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0b0c0e' }}>
                        {memberUser.username?.charAt(0).toUpperCase() || memberUser.email.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </Link>

                  <div className="topbar-user-pill">
                    <Link
                      href="/profile"
                      className="user-info-text hide-mobile"
                      style={{ textDecoration: 'none', cursor: 'pointer' }}
                      title={t('btn_profile')}
                    >
                      <span className="user-email">{memberUser.username || memberUser.email}</span>
                      <span className="user-role" style={{ color: currentTierMeta.badgeColor }}>
                        {memberUser.tier}
                      </span>
                    </Link>
                    <button
                      type="button"
                      className="topbar-logout-btn"
                      onClick={handleMemberLogout}
                      title="Đăng xuất khỏi tài khoản hội viên"
                    >
                      {t('btn_logout')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="topbar-status-badge hide-mobile">
                    <span style={{ color: 'var(--text-muted)' }}>👤</span>
                    <span className="status-label" style={{ color: 'var(--text-secondary)' }}>
                      Chưa đăng nhập
                    </span>
                  </div>

                  <div className="topbar-auth-links" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link href="/login" className="topbar-link">
                      {t('btn_login')}
                    </Link>
                    <Link href="/register" className="topbar-btn-gold">
                      {t('btn_register')}
                    </Link>

                    {/* Dedicated Avatar Icon Button for Guest -> links to /login */}
                    <Link
                      href="/login"
                      className="topbar-avatar-btn"
                      title="Đăng nhập tài khoản"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'none',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        position: 'relative',
                        flexShrink: 0,
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        textDecoration: 'none',
                      }}
                    >
                      <span style={{ fontSize: '1.15rem' }}>👤</span>
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
