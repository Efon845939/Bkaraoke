
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import type { Song } from '@/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { buildSongRequestsQuery, type Roles } from '@/lib/firestore-guards';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [roles, setRoles] = React.useState<Roles | null>(null);

  React.useEffect(() => {
    if (isUserLoading) {
      return; // Wait for user to be loaded
    }
    if (!user) {
      router.replace('/');
      return;
    }
    
    const email = user.email?.toLowerCase() ?? "";
    const userRoles: Roles = {
        isOwner: /@karaoke\.owner\.app$/.test(email),
        isAdmin: /@karaoke\.admin\.app$/.test(email),
        isParticipant: /@karaoke\.app$/.test(email),
    };
    setRoles(userRoles);

    if (!userRoles.isAdmin && !userRoles.isOwner) {
      router.replace('/participant'); // Redirect non-admins/owners
    }

  }, [user, isUserLoading, router]);

  const songsQuery = useMemoFirebase(() => {
    // The query is only constructed if the user is an admin or owner.
    // This prevents unauthorized queries from ever being built.
    if (!firestore || !user || !roles || (!roles.isAdmin && !roles.isOwner)) {
      return null;
    }
    // The centralized guard function is called here.
    return buildSongRequestsQuery(firestore, user, roles);
  }, [firestore, user, roles]);

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

  // Do not render anything until auth status and roles are confirmed.
  if (isUserLoading || !roles || (!roles.isAdmin && !roles.isOwner)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Yönetici Erişimi Doğrulanıyor...</p>
      </div>
    );
  }

  // At this point, it is confirmed that the user is an admin or owner.
  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <h2 className="mb-4 text-3xl font-headline tracking-wider">Yönetici Paneli - Şarkı Sırası</h2>
        <SongQueue
          role="admin"
          songs={songs || []}
          isLoading={isLoading}
          onEditSong={() => {}} // Admins can't edit
        />
      </main>
    </div>
  );
}
