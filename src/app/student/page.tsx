
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
  addDocumentNonBlocking,
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
  updateDoc,
  orderBy
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { EditSongDialog } from '@/components/edit-song-dialog';
import { EditProfileDialog } from '@/components/edit-profile-dialog';

// A non-blocking wrapper for updateDoc
const updateDocumentNonBlocking = (ref: any, data: any) => {
    updateDoc(ref, data).catch(e => console.error("Failed to update document non-blocking", e));
}

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
    // Query is now filtered by the current user's ID
    return query(
      collection(firestore, 'song_requests'),
      where('studentId', '==', user.uid),
      orderBy('order', 'asc') // Keep sorting by order
    );
  }, [firestore, user]);

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

  const createAuditLog = (action: string, details: string) => {
    if (!firestore || !user) return;
    addDocumentNonBlocking(collection(firestore, 'audit_logs'), {
      timestamp: serverTimestamp(),
      actorId: user.uid,
      actorName: user.displayName || user.email,
      action,
      details
    });
  };

  const handleSongAdd = async (newSong: { title: string; url: string, name?: string }) => {
    if (!firestore || !user?.displayName) return;

    const studentId = user.uid;
    const studentName = newSong.name || user.displayName;
    const studentDocRef = doc(firestore, 'students', studentId);
    const songRequestDocRef = doc(collection(firestore, 'song_requests'));

    const totalSongsSnapshot = await getDocs(collection(firestore, 'song_requests'));
    const totalSongs = totalSongsSnapshot.size;

    const batch = writeBatch(firestore);

    batch.set(studentDocRef, { id: studentId, name: studentName, role: 'student' }, { merge: true });

    batch.set(songRequestDocRef, {
      title: newSong.title,
      karaokeUrl: newSong.url,
      id: songRequestDocRef.id,
      studentId: studentId,
      studentName: studentName,
      submissionDate: serverTimestamp(),
      order: totalSongs,
    });

    try {
      await batch.commit();
      createAuditLog('SONG_ADDED', `Şarkı: "${newSong.title}"`);
    } catch (e) {
      console.error("Şarkı eklenirken hata oluştu:", e);
    }
  };

  const handleSongUpdate = (songId: string, updatedData: { title: string; url: string }) => {
    if (!firestore || !user) return;
    const songDocRef = doc(firestore, 'song_requests', songId);
    updateDocumentNonBlocking(songDocRef, {
      title: updatedData.title,
      karaokeUrl: updatedData.url,
    });
    createAuditLog('SONG_UPDATED', `Şarkı ID: ${songId}, Yeni Başlık: "${updatedData.title}"`);
    setEditingSong(null);
  };

   const handleProfileUpdate = async (values: { firstName: string, lastName: string }) => {
    if (!auth?.currentUser || !firestore) return;

    const oldDisplayName = auth.currentUser.displayName;
    const newDisplayName = `${values.firstName} ${values.lastName}`;
    const studentId = auth.currentUser.uid;

    try {
      await runTransaction(firestore, async (transaction) => {
        await updateProfile(auth.currentUser!, { displayName: newDisplayName });

        const studentDocRef = doc(firestore, 'students', studentId);
        transaction.update(studentDocRef, { name: newDisplayName });

        const songRequestsQuery = query(
          collection(firestore, 'song_requests'),
          where('studentId', '==', studentId)
        );
        const songRequestsSnapshot = await getDocs(songRequestsQuery);
        songRequestsSnapshot.forEach((songDoc) => {
          transaction.update(songDoc.ref, { studentName: newDisplayName });
        });
      });

      createAuditLog('PROFILE_UPDATED', `Kullanıcı: "${oldDisplayName}" -> "${newDisplayName}"`);
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
          songs={songs || []}
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
