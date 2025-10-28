
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import type { Song, Participant } from '@/types';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useAuth,
  errorEmitter,
  FirestorePermissionError,
  useDoc
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
  addDoc,
  setDoc,
  orderBy
} from 'firebase/firestore';
import { updateProfile, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { EditSongDialog } from '@/components/edit-song-dialog';
import { buildSongRequestsQuery, Roles } from '@/lib/firestore-guards';


export default function ParticipantPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [editingSong, setEditingSong] = React.useState<Song | null>(null);
  
  const roles: Roles | null = React.useMemo(() => {
    if (!user?.email) return null;
    const email = user.email.toLowerCase();
    return {
        isAdmin: /@karaoke\.admin\.app$/.test(email),
        isParticipant: /@karaoke\.app$/.test(email),
    };
  }, [user]);

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'students', user.uid);
  }, [firestore, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<Participant>(profileRef);

  React.useEffect(() => {
    if (isUserLoading || isProfileLoading) return;

    if (!user) {
      router.replace('/');
      return;
    }
    
    if (roles?.isAdmin) {
      router.replace('/admin');
      return;
    }

  }, [user, isUserLoading, profile, isProfileLoading, router, roles, toast, auth]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !roles) return null;
    try {
        return buildSongRequestsQuery(firestore, user, roles);
    } catch(e) {
        return null;
    }
  }, [firestore, user, roles]);

  const { data: songs, isLoading: songsLoading } = useCollection<Song>(songsQuery);

  const createAuditLog = (action: string, details: string) => {
    if (!firestore || !user) return;
    const logData = {
      timestamp: serverTimestamp(),
      actorId: user.uid,
      actorName: user.displayName || user.email,
      action,
      details
    };
    addDoc(collection(firestore, 'audit_logs'), logData).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'audit_logs',
            operation: 'create',
            requestResourceData: logData
        }));
    });
  };

  const handleSongAdd = async (newSong: { title: string; url: string; name?: string }) => {
    if (!firestore || !user) return;

    const participantName = user.displayName || newSong.name || 'Bilinmeyen Katılımcı';
    
    if (!user.displayName && newSong.name && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newSong.name });
    }

    const participantDocRef = doc(firestore, 'students', user.uid);
    
    const totalSongsSnapshot = await getDocs(collection(firestore, 'song_requests'));
    const totalSongs = totalSongsSnapshot.size;

    const batch = writeBatch(firestore);

    batch.set(participantDocRef, { id: user.uid, name: participantName, role: 'student' }, { merge: true });

    const songRequestDocRef = doc(collection(firestore, 'song_requests'));
    const songData = {
      id: songRequestDocRef.id,
      title: newSong.title,
      karaokeUrl: newSong.url,
      studentId: user.uid,
      participantName: participantName,
      submissionDate: serverTimestamp(),
      order: totalSongs,
    };
    
    batch.set(songRequestDocRef, songData);

    batch.commit().then(() => {
      createAuditLog('SONG_ADDED', `Şarkı: "${newSong.title}"`);
    }).catch(e => {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'song_requests and students', 
            operation: 'write',
            requestResourceData: { info: "Batch write for new song and participant profile update."}
       }));
    });
  };

  const handleSongUpdate = (songId: string, updatedData: { title: string; url: string }) => {
    if (!firestore || !user) return;
    const songDocRef = doc(firestore, 'song_requests', songId);
    
    const songData = {
      title: updatedData.title,
      karaokeUrl: updatedData.url,
    };

    updateDoc(songDocRef, songData).then(() => {
        createAuditLog('SONG_UPDATED', `Şarkı ID: ${songId}, Yeni Başlık: "${updatedData.title}"`);
    }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: songDocRef.path,
            operation: 'update',
            requestResourceData: songData
        }));
    });
    setEditingSong(null);
  };

  if (isUserLoading || isProfileLoading || !user || !roles || !roles.isParticipant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <SongSubmissionForm onSongAdd={handleSongAdd} participantName={user.displayName || ''} showNameInput={!user.displayName} />
        <SongQueue
          role="participant"
          songs={songs || []}
          isLoading={songsLoading}
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
    </div>
  );
}
