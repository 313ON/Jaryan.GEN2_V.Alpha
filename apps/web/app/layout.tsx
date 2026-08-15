import type { Metadata, Viewport } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jaryan Engineering Portal',
  description: 'A transparent, browser-based engineering concept estimator.',
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#171815',
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
