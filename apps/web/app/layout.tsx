import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppShell from './components/AppShell';

export const metadata: Metadata = {
  title: 'CHIPCOIN — Nền tảng tích luỹ điểm thưởng nội bộ & Quản trị hệ thống',
  description: 'Hệ thống tích luỹ điểm thưởng nội bộ CHIPCOIN, sổ cái kép Double-entry Ledger và Transactional Outbox bảo mật.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

import { I18nProvider } from './lib/i18n';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <I18nProvider>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
