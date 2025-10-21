
'use client';

import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export function PageHeader({ onEditProfile }: { onEditProfile?: () => void }) {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
    router.push('/');
  };

  const isAdmin = user?.email === 'admin@karaoke.app';

  return (
    <header className="sticky top-4 z-10 mb-8 flex items-center justify-between rounded-lg border bg-card/80 p-4 shadow-md backdrop-blur-sm">
      <Link href="/">
        <Logo />
      </Link>
      <div className="flex items-center gap-2">
        {onEditProfile && !isAdmin && (
           <Button variant="ghost" onClick={onEditProfile}>
             <User className="mr-2 h-4 w-4" />
             Profili Düzenle
           </Button>
        )}
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Çıkış Yap
        </Button>
      </div>
    </header>
  );
}
