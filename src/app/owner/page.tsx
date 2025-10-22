
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export default function OwnerRedirectPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const isOwner = React.useMemo(() => {
    if (!user?.email) return false;
    return /@karaoke\.owner\.app$/i.test(user.email);
  }, [user]);

  React.useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user status is resolved
    }
    if (isOwner) {
      router.replace('/owner/dashboard');
    } else {
      router.replace('/');
    }
  }, [user, isUserLoading, router, isOwner]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Yönlendiriliyor...</p>
    </div>
  );
}
