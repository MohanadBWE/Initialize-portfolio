import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mohanad Mala — Data Engineer',
  description:
    'Portfolio of Mohanad Mala, a Data Engineer specializing in data pipelines, automation, and systems engineering. Based in Duhok, Iraq.',
  keywords: [
    'Mohanad Mala',
    'Data Engineer',
    'Portfolio',
    'Python',
    'SQL',
    'AWS',
    'Data Pipeline',
  ],
  authors: [{ name: 'Mohanad Mala', url: 'https://mohanad-mala.online' }],
  openGraph: {
    title: 'Mohanad Mala — Data Engineer',
    description:
      'Data Engineer portfolio — automation, pipelines, and systems engineering.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#030512',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — Inter + JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
