
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { AdminDashboard } from '@/components/admin-dashboard';
import type { Roles } from '@/lib/firestore-guards';

/**
 * AdminPage acts as a secure gateway. It ensures that only users with
 * 'admin' roles can access the main dashboard content.
 *
 * It performs NO data fetching itself. It only determines the user's role and
 * conditionally renders the <AdminDashboard /> component, which is responsible
 * for its own data fetching. This prevents any unauthorized Firestore queries
 * from being initiated by non-admin users.
 */
export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const roles: Roles | null = React.useMemo(() => {
    if (!user?.email) return null;
    const email = user.email.toLowerCase();
    return {
        isAdmin: /@karaoke\.admin\.app$/.test(email),
        isParticipant: /@karaoke\.app$/.test(email),
    };
  }, [user]);

  React.useEffect(() => {
    // Do not run redirection logic until the user's auth state is fully loaded.
    if (isUserLoading) {
      return;
    }

    // If the user is not authenticated or not an admin, redirect them.
    if (!user || !roles?.isAdmin) {
      router.replace('/');
    }
  }, [user, isUserLoading, roles, router]);

  // Display a loading message while auth state and roles are being determined.
  if (isUserLoading || !roles) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Yönlendiriliyor...</p>
      </div>
    );
  }

  // Only render the AdminDashboard if the user is a confirmed admin.
  // The dashboard itself will handle all data fetching and display.
  return roles.isAdmin ? <AdminDashboard /> : null;
}
