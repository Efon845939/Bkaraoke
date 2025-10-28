
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

// Metadata cannot be exported from a client component.
// We can move it to a server component or handle it differently if needed.
// For now, we keep it here but acknowledge it won't work in a 'use client' file.
// export const metadata: Metadata = {
//   title: 'Karaoke Sırası',
//   description: 'Karaoke geceniz için şarkı istekleri gönderin ve yönetin.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <title>Karaoke Sırası</title>
        <meta name="description" content="Karaoke geceniz için şarkı istekleri gönderin ve yönetin." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Roboto:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
