
'use client';

import * as React from 'react';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  addDoc,
  updateDoc,
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
import { buildSongRequestsQuery } from '@/lib/firestore-guards';
import type { Song, Participant } from '@/types';
import type { Roles } from '@/lib/firestore-guards';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { UserX, UserCheck, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from './ui/table';
import { Skeleton } from './ui/skeleton';

export function AdminDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [editingSong, setEditingSong] = React.useState<Song | null>(null);
  const [participantToSuspend, setParticipantToSuspend] = React.useState<Participant | null>(null);

  const roles: Roles | null = React.useMemo(() => {
    if (!user?.email) return null;
    const email = user.email.toLowerCase();
    return {
        isAdmin: /@karaoke\.admin\.app$/.test(email),
        isParticipant: /@karaoke\.app$/.test(email),
    };
  }, [user]);

  // Securely build the query for all songs (since this is the admin dashboard)
  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !roles) return null;
    return buildSongRequestsQuery(firestore, user, roles);
  }, [firestore, user, roles]);

  const participantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'students');
  }, [firestore]);

  const { data: songs, isLoading: songsLoading } = useCollection<Song>(songsQuery);
  const { data: participants, isLoading: participantsLoading } = useCollection<Participant>(participantsQuery);

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
  
  const handleToggleSuspend = () => {
    if (!firestore || !participantToSuspend) return;

    const participantRef = doc(firestore, 'students', participantToSuspend.id);
    const newDisabledState = !participantToSuspend.disabled;

    updateDoc(participantRef, { disabled: newDisabledState })
      .then(() => {
        const action = newDisabledState ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED';
        createAuditLog(action, `Katılımcı: ${participantToSuspend.name} (ID: ${participantToSuspend.id})`);
        toast({
          title: `Katılımcı ${newDisabledState ? 'askıya alındı' : 'tekrar etkinleştirildi'}!`,
        });
      })
      .catch((e) => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: participantRef.path,
            operation: 'update',
            requestResourceData: { disabled: newDisabledState },
          })
        );
        toast({
          variant: 'destructive',
          title: 'İşlem Başarısız',
          description: 'Kullanıcı durumu güncellenemedi.',
        });
      })
      .finally(() => {
        setParticipantToSuspend(null);
      });
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
        <Card>
            <CardHeader>
                <CardTitle>Katılımcı Yönetimi</CardTitle>
            </CardHeader>
            <CardContent>
                 {participantsLoading ? (
                     <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                 ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>İsim</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">Eylemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {participants?.filter(p => p.role === 'student').map((participant) => (
                             <TableRow key={participant.id} className={participant.disabled ? 'text-muted-foreground line-through' : ''}>
                                <TableCell>{participant.name}</TableCell>
                                <TableCell>{participant.disabled ? 'Askıya Alındı' : 'Aktif'}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setParticipantToSuspend(participant)}
                                    >
                                        {participant.disabled ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 )}
            </CardContent>
        </Card>
      </main>
      
      {editingSong && (
        <EditSongDialog
          song={editingSong}
          isOpen={!!editingSong}
          onOpenChange={(isOpen) => !isOpen && setEditingSong(null)}
          onSongUpdate={handleSongUpdate}
        />
      )}

      {participantToSuspend && (
        <AlertDialog open={!!participantToSuspend} onOpenChange={() => setParticipantToSuspend(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {`'${participantToSuspend.name}' isimli katılımcıyı ${participantToSuspend.disabled ? 'tekrar etkinleştirmek' : 'askıya almak'} istediğinizden emin misiniz?`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleToggleSuspend}>
                        {participantToSuspend.disabled ? 'Etkinleştir' : 'Askıya Al'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
