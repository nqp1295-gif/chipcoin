'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '../../lib/i18n';
import { CHIP_PER_USDT, StoredUser } from '../../lib/store';

interface WalletNavTabsProps {
  currentUser?: StoredUser | null;
}

export default function WalletNavTabs({ currentUser }: WalletNavTabsProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const tabs = [
    {
      id: 'overview',
      name: t('tab_overview'),
      href: '/wallet',
      icon: '📊',
      active: pathname === '/wallet',
    },
    {
      id: 'convert',
      name: t('tab_convert'),
      href: '/wallet/convert',
      icon: '🔄',
      badge: '1:5M',
      active: pathname === '/wallet/convert',
    },
    {
      id: 'deposit',
      name: t('tab_deposit'),
      href: '/wallet/deposit',
      icon: '📥',
      badge: 'TON',
      active: pathname === '/wallet/deposit',
    },
    {
      id: 'withdraw',
      name: t('tab_withdraw'),
      href: '/wallet/withdraw',
      icon: '📤',
      badge: 'VIP',
      active: pathname === '/wallet/withdraw',
    },
    {
      id: 'connect',
      name: t('tab_connect'),
      href: '/ton-wallet',
      icon: '💎',
      active: pathname === '/ton-wallet',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
      {/* Official Exchange Rate Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(0, 152, 234, 0.1) 100%)',
          border: '1px solid var(--border-bronze)',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(212, 175, 55, 0.2)',
              border: '1px solid var(--accent-bronze)',
              color: '#f5d77f',
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
            }}
          >
            ⚖️ {t('rate_badge')}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'Outfit, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              1 USDT = 5,000,000 CHIP
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ({t('rate_sub')})
            </span>
          </div>
        </div>

        {currentUser && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '0.82rem',
              background: 'rgba(0,0,0,0.4)',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-medium)',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>CHIP:</span>
              <span style={{ fontWeight: 700, color: '#f5d77f' }}>
                {(currentUser.chipsBalance || 0).toLocaleString()}
              </span>
            </div>
            <div style={{ color: 'var(--border-medium)' }}>|</div>
            <div>
              <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>USDT:</span>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                {(currentUser.usdtBalance || 0).toFixed(4)} USDT
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Row */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          borderBottom: '1px solid var(--border-medium)',
        }}
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px 10px 0 0',
              fontSize: '0.88rem',
              fontWeight: tab.active ? 700 : 500,
              color: tab.active ? '#ffffff' : 'var(--text-secondary)',
              background: tab.active
                ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.16) 0%, rgba(212, 175, 55, 0.04) 100%)'
                : 'transparent',
              borderBottom: tab.active ? '2.5px solid var(--accent-bronze)' : '2.5px solid transparent',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
            {tab.badge && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  borderRadius: '999px',
                  fontWeight: 800,
                  background: tab.active ? 'var(--accent-bronze)' : 'rgba(255,255,255,0.1)',
                  color: tab.active ? '#0b0c0e' : 'var(--text-muted)',
                }}
              >
                {tab.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
