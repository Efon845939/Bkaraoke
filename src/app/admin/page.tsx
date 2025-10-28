
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export default function AdminRedirectPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user status is resolved
    }

    if (!user) {
        router.replace('/');
        return;
    }
    
    const email = user.email?.toLowerCase() ?? "";
    const isAdmin = /@karaoke\.admin\.app$/i.test(email);
    const isOwner = /@karaoke\.owner\.app$/i.test(email);

    if (isOwner) {
      router.replace('/owner/dashboard');
    } else if (isAdmin) {
      // The user is an admin, but we are removing the song list from this page
      // to prevent security issues. For now, we can redirect them to the owner
      // dashboard as well, or a future dedicated admin view.
      // For simplicity and security, we direct them away from this page.
      // A proper admin dashboard would be built here.
      router.replace('/owner/dashboard');
    } else {
      router.replace('/participant');
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Yönlendiriliyor...</p>
    </div>
  );
}
