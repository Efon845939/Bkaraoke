
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'Karaoke Sırası',
  description: 'Karaoke geceniz için şarkı istekleri gönderin ve yönetin.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Roboto:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link 
          href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Archivo:wght@400;600&display=swap" 
          rel="stylesheet"
        />
      </head>
      <body>
        <FirebaseClientProvider>{children}</FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
