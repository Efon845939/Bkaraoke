
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import type { Song } from '@/types';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
  useAuth,
} from '@/firebase';
import {
  collection,
  serverTimestamp,
  doc,
  writeBatch,
  query,
  where,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { EditSongDialog } from '@/components/edit-song-dialog';
import { EditProfileDialog } from '@/components/edit-profile-dialog';

export default function StudentPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [editingSong, setEditingSong] = React.useState<Song | null>(null);
  const [isEditProfileOpen, setEditProfileOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'song_requests'),
      where('studentId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

  const handleSongAdd = async (newSong: { title: string; url: string, name?: string }) => {
    if (!firestore || !user?.displayName) return;

    const studentId = user.uid;
    const studentName = newSong.name || user.displayName;
    const studentDocRef = doc(firestore, 'students', studentId);

    const songRequestDocRef = doc(collection(firestore, 'song_requests'));

    const totalSongsSnapshot = await getDocs(collection(firestore, 'song_requests'));
    const totalSongs = totalSongsSnapshot.size;

    const batch = writeBatch(firestore);

    // Set student document with their name.
    batch.set(studentDocRef, { id: studentId, name: studentName }, { merge: true });

    // Create the new song request
    batch.set(songRequestDocRef, {
      title: newSong.title,
      karaokeUrl: newSong.url,
      id: songRequestDocRef.id,
      studentId: studentId,
      studentName: studentName, // Denormalized name for easier display
      submissionDate: serverTimestamp(),
      status: 'queued',
      order: totalSongs,
    });

    try {
      await batch.commit();
    } catch (e) {
      console.error("Şarkı eklenirken hata oluştu:", e);
    }
  };

  const handleSongUpdate = (songId: string, updatedData: { title: string; url: string }) => {
    if (!firestore) return;
    const songDocRef = doc(firestore, 'song_requests', songId);
    updateDocumentNonBlocking(songDocRef, {
      title: updatedData.title,
      karaokeUrl: updatedData.url,
    });
    setEditingSong(null);
  };

   const handleProfileUpdate = async (values: { firstName: string, lastName: string }) => {
    if (!auth?.currentUser || !firestore) return;

    const newDisplayName = `${values.firstName} ${values.lastName}`;
    const studentId = auth.currentUser.uid;

    try {
      await runTransaction(firestore, async (transaction) => {
        // 1. Update Firebase Auth display name
        if (auth.currentUser) {
            await updateProfile(auth.currentUser, { displayName: newDisplayName });
        }

        // 2. Update student document
        const studentDocRef = doc(firestore, 'students', studentId);
        transaction.update(studentDocRef, { name: newDisplayName });

        // 3. Update denormalized names in song requests
        const songRequestsQuery = query(
          collection(firestore, 'song_requests'),
          where('studentId', '==', studentId)
        );
        const songRequestsSnapshot = await getDocs(songRequestsQuery);
        songRequestsSnapshot.forEach((songDoc) => {
          transaction.update(songDoc.ref, { studentName: newDisplayName });
        });
      });

      toast({
        title: 'Profil Güncellendi',
        description: 'Adınız başarıyla güncellendi.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Profil güncellenirken hata oluştu:', error);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Profiliniz güncellenirken bir sorun oluştu.',
        duration: 3000,
      });
    }
    setEditProfileOpen(false);
  };

  const sortedSongs = React.useMemo(() => {
    if (!songs) return [];
    // Convert Firestore Timestamps to JS Dates
    const songsWithDates = songs.map(song => ({
        ...song,
        submissionDate: (song.submissionDate as any)?.toDate ? (song.submissionDate as any).toDate() : new Date(),
    }));

    // Sort the songs based on status and submission date
    return songsWithDates.sort((a, b) => {
        if (a.status === 'playing') return -1;
        if (b.status === 'playing') return 1;
        if (a.status === 'played' && b.status !== 'played') return 1;
        if (b.status === 'played' && a.status !== 'played') return -1;

        if (a.order !== b.order) {
            return (a.order ?? 999) - (b.order ?? 999);
        }

        // For songs with the same status, sort by submission date (oldest first)
        return a.submissionDate.getTime() - b.submissionDate.getTime();
    });
  }, [songs]);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader onEditProfile={() => setEditProfileOpen(true)} />
      <main className="space-y-8">
        <SongSubmissionForm onSongAdd={handleSongAdd} studentName={user.displayName || ''} showNameInput={!user.displayName} />
        <SongQueue
          role="student"
          songs={sortedSongs}
          isLoading={isLoading || isUserLoading}
          currentUserId={user?.uid}
          onEditSong={setEditingSong}
        />
      </main>
      {editingSong && (
        <EditSongDialog
          song={editingSong}
          isOpen={!!editingSong}
          onOpenChange={(isOpen) => !isOpen && setEditingSong(null)}
          onSongUpdate={handleSongUpdate}
        />
      )}
       {isEditProfileOpen && user && (
        <EditProfileDialog
          user={user}
          isOpen={isEditProfileOpen}
          onOpenChange={setEditProfileOpen}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
}
