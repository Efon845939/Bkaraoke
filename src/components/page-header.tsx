
'use client';

import Link from 'next/link';
import { Logo } from '@/components/logo';

export function PageHeader() {
  return (
    <header className="sticky top-4 z-10 mb-8 flex items-center justify-between rounded-lg border bg-card/80 p-4 shadow-md backdrop-blur-sm">
      <Link href="/">
        <Logo />
      </Link>
    </header>
  );
}
