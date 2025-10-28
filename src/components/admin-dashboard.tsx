
'use client';

import * as React from 'react';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  addDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  useUser,
  errorEmitter,
  FirestorePermissionError,
  useMemoFirebase,
} from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { EditSongDialog } from '@/components/edit-song-dialog';
import type { Song, Participant } from '@/types';
import { useToast } from '@/hooks/use-toast';


export function AdminDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [editingSong, setEditingSong] = React.useState<Song | null>(null);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'song_requests'), orderBy('order', 'asc'));
  }, [firestore]);


  const { data: songs, isLoading: songsLoading } = useCollection<Song>(songsQuery);
 
  const createAuditLog = (action: string, details: string) => {
    if (!firestore || !user) return;
    const logData = {
      timestamp: serverTimestamp(),
      actorId: user.uid,
      actorName: user.displayName || user.email,
      action,
      details,
    };
    addDoc(collection(firestore, 'audit_logs'), logData).catch((e) => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: 'audit_logs',
          operation: 'create',
          requestResourceData: logData,
        })
      );
    });
  };

  const handleReorder = (reorderedSongs: Song[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    reorderedSongs.forEach((song, index) => {
      const docRef = doc(firestore, 'song_requests', song.id);
      batch.update(docRef, { order: index });
    });
    batch.commit().then(() => {
      createAuditLog('SONG_REORDERED', 'Şarkı sırası güncellendi.');
    }).catch((e) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'song_requests',
        operation: 'write',
        requestResourceData: { info: "Batch update for song reordering." }
      }));
    });
  };
  
  const handleSongUpdate = (songId: string, updatedData: { title: string; url: string; }) => {
    if (!firestore) return;
    const songRef = doc(firestore, 'song_requests', songId);
    const songData = {
        title: updatedData.title,
        karaokeUrl: updatedData.url
    };
    updateDoc(songRef, songData).then(() => {
        createAuditLog('SONG_UPDATED', `Şarkı ID: ${songId}`);
    }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: songRef.path,
            operation: 'update',
            requestResourceData: songData
        }));
    });
    setEditingSong(null);
  };
  

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <SongQueue
          role="admin"
          songs={songs || []}
          isLoading={songsLoading}
          onEditSong={setEditingSong}
          onReorder={handleReorder}
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
