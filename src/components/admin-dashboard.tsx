
'use client';

import * as React from 'react';
import {
  collection,
  doc,
  writeBatch,
  updateDoc,
  query,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  errorEmitter,
  FirestorePermissionError,
  useMemoFirebase,
} from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { EditSongDialog } from '@/components/edit-song-dialog';
import type { Song } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Trash } from 'lucide-react';

export function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [editingSong, setEditingSong] = React.useState<Song | null>(null);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'song_requests'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: songs, isLoading: songsLoading, error } = useCollection<Song>(songsQuery);

  const handleReorder = (reorderedSongs: Song[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    reorderedSongs.forEach((song, index) => {
      const docRef = doc(firestore, 'song_requests', song.id);
      batch.update(docRef, { order: index });
    });
    batch.commit().catch((e) => {
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
    updateDoc(songRef, songData).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: songRef.path,
            operation: 'update',
            requestResourceData: songData
        }));
    });
    setEditingSong(null);
  };
  
  const handleClearQueue = () => {
    if (!firestore || !songs) return;

    const batch = writeBatch(firestore);
    songs.forEach(song => {
        batch.delete(doc(firestore, 'song_requests', song.id));
    });
    batch.commit().then(() => {
        toast({
            title: 'Sıra Temizlendi!',
            description: 'Tüm şarkı istekleri silindi.',
        });
    }).catch(e => {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
           path: 'song_requests',
           operation: 'delete',
           requestResourceData: {info: 'Batch delete all songs'}
       }));
       toast({
           variant: 'destructive',
           title: 'Hata!',
           description: 'Sıra temizlenirken bir hata oluştu.',
       });
    });
  };
  
  const handleSongDelete = (songId: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'song_requests', songId)).catch(e => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `song_requests/${songId}`,
        operation: 'delete',
      }));
    });
  };

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <div className="flex justify-end">
            <Button variant="destructive" onClick={handleClearQueue} disabled={!songs || songs.length === 0}>
                <Trash className="mr-2 h-4 w-4" />
                Sırayı Temizle
            </Button>
        </div>
        <SongQueue
          songs={songs || []}
          isLoading={songsLoading}
          onEditSong={setEditingSong}
          onReorder={handleReorder}
          onDeleteSong={handleSongDelete}
          isAdmin={true}
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
