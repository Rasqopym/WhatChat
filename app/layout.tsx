import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'WhatChat — Multi-Business WhatsApp Team Inbox',
  description: 'AI-Powered Multi-Agent & Multi-Business WhatsApp Inbox supporting 10+ simultaneous team members',
  manifest: '/manifest.json',
  icons: {
    icon: '/api/icon?size=192',
    apple: '/api/icon?size=192',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WhatChat',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#075E54',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__whatchatInstallPrompt=e;});`,
          }}
        />
      </head>
      <body className="h-[100dvh] w-screen overflow-hidden bg-slate-100 antialiased">{children}</body>
    </html>
  );
}
