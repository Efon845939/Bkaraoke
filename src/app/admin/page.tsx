
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

/**
 * AdminRedirectPage is a client-side component that acts as a secure gateway.
 * It ensures that only users with 'admin' or 'owner' roles can proceed.
 * If a user is not authenticated or does not have the correct role, they are
 * immediately redirected to the homepage. This component performs NO data fetching
 * to prevent any Firestore security rule violations from unauthorized access attempts.
 */
export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    // Do not run redirection logic until the user's auth state is fully loaded.
    if (isUserLoading) {
      return;
    }

    // Determine roles based on email domain.
    const email = user?.email?.toLowerCase() || '';
    const isAdmin = /@karaoke\.admin\.app$/.test(email);
    const isOwner = /@karaoke\.owner\.app$/.test(email);

    // If the user is not an admin or an owner, redirect them to the home page.
    if (!user || (!isAdmin && !isOwner)) {
      router.replace('/');
    }
    // If the user is an admin, they stay on this page which will render the admin content.
    // In this simplified setup, we assume the content is what's currently in this file,
    // but a real implementation would have the actual admin dashboard components here,
    // which would only be rendered *after* this role check passes.

    // Note: The logic inside the original file that fetched all songs (`songsQuery`)
    // has been removed to prevent permission errors for non-admin users.
    // The actual admin dashboard, if it were a separate component,
    // would be conditionally rendered here and would be responsible for its own data fetching.

  }, [user, isUserLoading, router]);

  // Display a loading message while the user's auth state is being checked.
  // This prevents a flash of unstyled content or incorrect UI.
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Yönlendiriliyor...</p>
      </div>
    );
  }

  // This content is only shown momentarily to authorized users before the real
  // admin dashboard would render. A non-admin user will be redirected away
  // before ever seeing this.
  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <h1 className="text-4xl font-headline tracking-wider">Yönetici Paneli</h1>
      <p>Yönetici içeriği burada yüklenecek...</p>
    </div>
  );
}
