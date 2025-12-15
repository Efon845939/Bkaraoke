'use client';

import Image from 'next/image';
import Link from 'next/link';

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="Ana sayfaya dön"
      className="inline-flex items-center gap-2 cursor-pointer select-none"
    >
      <Image
        src="/logos/bkara90ke.png"
        alt="BKara90ke"
        width={140}
        height={32}
        priority
      />
    </Link>
  );
}
