'use client';

import Link from 'next/link';
import { LogOut, User, Trash2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Separator } from './ui/separator';

export function PageHeader({ onEditProfile, onDeleteAccount }: { onEditProfile?: () => void, onDeleteAccount?: () => void }) {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
    router.push('/');
  };

  const isAdmin = user?.email?.endsWith('@karaoke.admin.app');
  const isOwner = user?.email?.endsWith('@karaoke.owner.app');

  return (
    <header className="sticky top-4 z-10 mb-8 flex items-center justify-between rounded-lg border bg-card/80 p-4 shadow-md backdrop-blur-sm">
      <Link href="/">
        <Logo />
      </Link>
      <div className="flex items-center gap-2">
        {onEditProfile && !isAdmin && !isOwner && (
           <Button variant="ghost" onClick={onEditProfile}>
             <User className="mr-2 h-4 w-4" />
             Profili Düzenle
           </Button>
        )}
        {onDeleteAccount && !isAdmin && !isOwner && (
           <>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDeleteAccount}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hesabımı Sil
            </Button>
           </>
        )}
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Çıkış Yap
        </Button>
      </div>
    </header>
  );
}
