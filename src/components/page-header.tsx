
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

export function PageHeader() {
  return (
    <header className="mb-8 flex items-center justify-between rounded-lg border bg-card/80 backdrop-blur-sm p-4 shadow-md sticky top-4 z-10">
      <Link href="/">
        <Logo />
      </Link>
      <Link href="/" passHref>
        <Button variant="ghost">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </Link>
    </header>
  );
}
