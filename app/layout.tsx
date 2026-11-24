import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WhatsApp Business Team Inbox (Multi-Agent)',
  description: 'AI-Powered WhatsApp Multi-Agent Business Inbox supporting 10+ simultaneous team members',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen w-screen overflow-hidden bg-slate-100">{children}</body>
    </html>
  );
}
