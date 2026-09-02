import type { Metadata, Viewport } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jaryan · Engineering Intelligence Workspace',
  description: 'Traceable engineering workspace with explicit evidence, authority, revision, and unknown states.',
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
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
