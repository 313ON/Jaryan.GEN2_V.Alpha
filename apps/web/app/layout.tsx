import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jaryan Engineering Portal',
  description: 'A transparent, browser-based engineering concept estimator.',
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0d0e',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
