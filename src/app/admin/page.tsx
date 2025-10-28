
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import type { Song } from '@/types';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { buildSongRequestsQuery, Roles } from '@/lib/firestore-guards';
import { EditSongDialog } from '@/components/edit-song-dialog';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [editingSong, setEditingSong] = React.useState<Song | null>(null);

  const roles: Roles | null = React.useMemo(() => {
    if (!user?.email) return null;
    const email = user.email.toLowerCase();
    return {
      isOwner: /@karaoke\.owner\.app$/.test(email),
      isAdmin: /@karaoke\.admin\.app$/.test(email),
      isParticipant: /@karaoke\.app$/.test(email),
    };
  }, [user]);

  React.useEffect(() => {
    if (isUserLoading) return;
    if (!user || !roles || (!roles.isAdmin && !roles.isOwner)) {
      router.replace('/');
    }
  }, [user, isUserLoading, router, roles]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !roles || (!roles.isAdmin && !roles.isOwner)) return null;
    try {
      return buildSongRequestsQuery(firestore, user, roles);
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [firestore, user, roles]);

  const { data: songs, isLoading: songsLoading } = useCollection<Song>(songsQuery);

  if (isUserLoading || !roles) {
    return <div className="flex min-h-screen items-center justify-center"><p>Yönlendiriliyor...</p></div>;
  }
  
  if (!roles.isAdmin && !roles.isOwner) {
    return <div className="flex min-h-screen items-center justify-center"><p>Yönlendiriliyor...</p></div>;
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <h1 className="text-4xl font-headline tracking-wider">Yönetici Paneli</h1>
        <SongQueue
          role="admin"
          songs={songs || []}
          isLoading={songsLoading}
          currentUserId={user?.uid}
          onEditSong={setEditingSong} // Admins can't edit, but prop is required
        />
      </main>
      {editingSong && (
        <EditSongDialog
          song={editingSong}
          isOpen={!!editingSong}
          onOpenChange={(isOpen) => !isOpen && setEditingSong(null)}
          onSongUpdate={() => {}} // Admin is read-only, so this does nothing
        />
      )}
    </div>
  );
}
