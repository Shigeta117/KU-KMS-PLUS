import type { Metadata, Viewport } from 'next';
import './globals.css';
import InstallPrompt from '@/components/InstallPrompt';
import ServiceWorkerInit from '@/components/ServiceWorkerInit';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'KU-LMS+ 課題管理',
  description: '関西大学 WebClass の課題を一元管理',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LMS+',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#004a8f' },
    { media: '(prefers-color-scheme: dark)',  color: '#004a8f' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: next-themes が html.class を書き換えるため必要
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-slate-50 dark:bg-slate-900 min-h-dvh antialiased">
        <Providers>
          {/* iOS ステータスバー領域をヘッダーの青に統一 */}
          <div
            aria-hidden
            className="fixed top-0 left-0 right-0 pointer-events-none z-[999]"
            style={{ height: 'env(safe-area-inset-top)', background: 'linear-gradient(135deg, #004a8f, #0066cc)' }}
          />
          <ServiceWorkerInit />
          {children}
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
