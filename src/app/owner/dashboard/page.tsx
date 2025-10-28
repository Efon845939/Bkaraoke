
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, writeBatch, runTransaction, query, where, getDocs, serverTimestamp, orderBy, addDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Song, Participant, AuditLog } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ListMusic, Users, History, UserX, UserCheck, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import { EditSongDialog } from '@/components/edit-song-dialog';
import { EditProfileDialog } from '@/components/edit-profile-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { buildSongRequestsQuery, Roles } from '@/lib/firestore-guards';

const roleTranslations: Record<string, string> = {
  student: 'Katılımcı',
  admin: 'Yönetici',
  owner: 'Sahip',
};

export default function OwnerDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [participantFilter, setParticipantFilter] = React.useState('');
  const [editingSong, setEditingSong] = React.useState<Song | null>(null);
  const [editingParticipant, setEditingParticipant] = React.useState<Participant | null>(null);
  const [songList, setSongList] = React.useState<Song[]>([]);
  const [participantToToggle, setParticipantToToggle] = React.useState<Participant | null>(null);
  const [isToggling, setIsToggling] = React.useState(false);

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
    if (!user || !roles || !roles.isOwner) { // Only allow owners
      router.replace('/');
    }
  }, [user, isUserLoading, router, roles]);

  // --- Firestore Queries ---
  const participantsQuery = useMemoFirebase(() => {
    if (!firestore || !roles?.isOwner) return null;
    return collection(firestore, 'students');
  }, [firestore, roles]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !roles) return null;
    try {
        return buildSongRequestsQuery(firestore, user, roles);
    } catch(e) {
        return null; // Don't query if roles/user aren't ready
    }
  }, [firestore, user, roles]);
  
  const auditLogsQuery = useMemoFirebase(() => {
      if (!firestore || !roles?.isOwner) return null;
      return query(collection(firestore, 'audit_logs'), orderBy('timestamp', 'desc'));
  }, [firestore, roles]);

  const { data: participants, isLoading: participantsLoading } = useCollection<Participant>(participantsQuery);
  const { data: songsFromHook, isLoading: songsLoading } = useCollection<Song>(songsQuery);
  const { data: auditLogs, isLoading: auditLogsLoading } = useCollection<AuditLog>(auditLogsQuery);
  
  // --- Effects ---
  React.useEffect(() => {
    if (songsFromHook) {
      const sorted = [...songsFromHook].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
      setSongList(sorted);
    }
  }, [songsFromHook]);
  
  // --- Helper Functions ---
  const createAuditLog = (action: string, details: string) => {
    if (!firestore || !user) return;
    const logData = {
      timestamp: serverTimestamp(),
      actorId: user.uid,
      actorName: user.displayName || user.email || 'Bilinmeyen Sahip',
      action,
      details
    };
    addDoc(collection(firestore, 'audit_logs'), logData).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'audit_logs',
            operation: 'create',
            requestResourceData: logData,
        }));
    });
  };

  // --- Handlers ---
   const handleSongAdd = (newSong: { title: string; url: string; firstName?: string; lastName?: string }) => {
    if (!firestore || !user) return;
  
    const requesterName = newSong.firstName && newSong.lastName 
      ? `${newSong.firstName} ${newSong.lastName}`
      : 'Sahip';
    
    const studentId = user.uid;
  
    const newSongRef = doc(collection(firestore, 'song_requests'));

    const songData = {
      id: newSongRef.id,
      title: newSong.title,
      karaokeUrl: newSong.url,
      studentId: studentId,
      participantName: requesterName,
      submissionDate: serverTimestamp(),
      order: songList?.length ?? 0,
    };
  
    setDoc(newSongRef, songData).then(() => {
        createAuditLog('SONG_ADDED_BY_OWNER', `Şarkı: "${newSong.title}", Ekleyen: ${requesterName}`);
    }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `song_requests/${newSongRef.id}`,
            operation: 'create',
            requestResourceData: songData
        }));
    });
  };
  
  const handleSongUpdate = (songId: string, updatedData: { title: string; url: string }) => {
    if (!firestore) return;
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

  const handleReorder = (reorderedSongs: Song[]) => {
    if (!firestore) return;
    const originalSongs = [...songList];
    setSongList(reorderedSongs);

    const batch = writeBatch(firestore);
    reorderedSongs.forEach((song, index) => {
      const songRef = doc(firestore, 'song_requests', song.id);
      batch.update(songRef, { order: index });
    });

    batch.commit().then(() => {
        createAuditLog('QUEUE_REORDERED', `Şarkı sırası yeniden düzenlendi.`);
    }).catch(e => {
        setSongList(originalSongs);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'song_requests',
            operation: 'write',
            requestResourceData: { info: 'Batch update for reordering songs.' }
        }));
    });
  };

  const handleProfileUpdate = async (values: { firstName: string, lastName: string }) => {
    if (!firestore || !editingParticipant) return;
    const studentId = editingParticipant.id;
    const oldName = editingParticipant.name;
    const newDisplayName = `${values.firstName} ${values.lastName}`;
    
    runTransaction(firestore, async (transaction) => {
        const participantDocRef = doc(firestore, 'students', studentId);
        transaction.update(participantDocRef, { name: newDisplayName });

        const songRequestsQuery = query(collection(firestore, 'song_requests'), where('studentId', '==', studentId));
        const songRequestsSnapshot = await getDocs(songRequestsQuery);
        songRequestsSnapshot.forEach((songDoc) => {
            transaction.update(songDoc.ref, { participantName: newDisplayName });
        });
    }).then(() => {
        createAuditLog('USER_RENAMED', `Kullanıcı: "${oldName}" -> "${newDisplayName}" (ID: ${studentId})`);
        toast({ title: 'Profil Güncellendi', description: 'Kullanıcının adı başarıyla güncellendi.' });
    }).catch((error) => {
        toast({ variant: 'destructive', title: 'Hata', description: 'Kullanıcı profili güncellenirken bir sorun oluştu.' });
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `students/${studentId} and related song_requests`,
            operation: 'write',
            requestResourceData: { info: `Updating user name to ${newDisplayName}` }
        }));
    });
    setEditingParticipant(null);
};

const handleToggleSuspend = async () => {
    if (!firestore || !participantToToggle) return;

    setIsToggling(true);
    const { id: studentId, name, disabled } = participantToToggle;
    const newDisabledState = !disabled;
    const action = newDisabledState ? 'USER_SUSPENDED' : 'USER_ENABLED';
    const actionPastTense = newDisabledState ? 'askıya alındı' : 'tekrar etkinleştirildi';
    const details = `Kullanıcı: "${name}" (ID: ${studentId})`;

    const participantRef = doc(firestore, 'students', studentId);
    
    updateDoc(participantRef, { disabled: newDisabledState }).then(() => {
        createAuditLog(action, details);
        toast({
            title: `Kullanıcı ${actionPastTense}.`,
            description: `${name} adlı kullanıcının hesabı başarıyla ${actionPastTense}.`
        });
    }).catch(error => {
        toast({ variant: 'destructive', title: 'Hata', description: `Kullanıcı durumu güncellenirken bir sorun oluştu.` });
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: participantRef.path,
            operation: 'update',
            requestResourceData: { disabled: newDisabledState }
        }));
    }).finally(() => {
        setIsToggling(false);
        setParticipantToToggle(null);
    });
};


  // --- Memoized Filters ---
  const filteredParticipants = React.useMemo(() => {
    if (!participants) return [];
    return participants.filter(participant =>
      participant.name.toLowerCase().includes(participantFilter.toLowerCase())
    );
  }, [participants, participantFilter]);

  if (isUserLoading || !user || !roles?.isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading and Verifying System Owner Access...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <PageHeader />
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-headline tracking-wider">System Owner Panel</h1>
      </div>
      
      <SongSubmissionForm
        onSongAdd={handleSongAdd}
        participantName="Sahip"
        showNameInput={true}
       />

      <SongQueue
        role="owner"
        songs={songList}
        isLoading={songsLoading}
        onEditSong={setEditingSong}
        onReorder={handleReorder}
       />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Users /> All Users</CardTitle>
                    <CardDescription>All participants and admins registered in the system.</CardDescription>
                     <div className="pt-4">
                        <Input
                            placeholder="Search users..."
                            value={participantFilter}
                            onChange={(e) => setParticipantFilter(e.target.value)}
                            className="w-full"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border h-96 overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card">
                                <TableRow>
                                    <TableHead>İsim</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead className="text-right">Eylemler</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {participantsLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-1/4" /></TableCell>
                                            <TableCell className="flex justify-end gap-2">
                                                <Skeleton className="h-8 w-8" />
                                                <Skeleton className="h-8 w-8" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredParticipants.length > 0 ? (
                                    filteredParticipants.map(participant => (
                                        <TableRow key={participant.id} className={participant.disabled ? 'bg-muted/50' : ''}>
                                            <TableCell className={`font-medium ${participant.disabled ? 'text-muted-foreground line-through' : ''}`}>{participant.name}</TableCell>
                                            <TableCell>
                                              <Badge variant={participant.disabled ? 'outline' : participant.role === 'owner' ? 'default' : participant.role === 'admin' ? 'secondary' : 'outline'}>
                                                {participant.disabled ? 'Askıda' : roleTranslations[participant.role] || participant.role}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => setEditingParticipant(participant)} disabled={participant.disabled}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className={participant.disabled ? 'text-green-600 hover:text-green-700' : 'text-destructive hover:text-destructive'}
                                                            onClick={() => setParticipantToToggle(participant)}
                                                            disabled={participant.id === user.uid}
                                                        >
                                                            {participant.disabled ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    {participantToToggle && participantToToggle.id === participant.id && (
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                             {participant.disabled 
                                                                ? `Bu eylem, "${participant.name}" adlı kullanıcının hesabını yeniden etkinleştirecektir.`
                                                                : `Bu eylem, "${participant.name}" adlı kullanıcının hesabını askıya alacaktır. Kullanıcı artık giriş yapabilir ancak verilere erişemez.`
                                                             }
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel onClick={() => setParticipantToToggle(null)}>İptal</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={handleToggleSuspend}
                                                            className={participant.disabled ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}
                                                            disabled={isToggling}
                                                        >
                                                            {isToggling ? 'İşleniyor...' : (participant.disabled ? 'Evet, Etkinleştir' : 'Evet, Askıya Al')}
                                                        </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                    )}
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">Kullanıcı bulunamadı.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><History /> Audit Logs</CardTitle>
                    <CardDescription>A record of significant actions performed in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="rounded-md border h-96 overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card">
                                <TableRow>
                                    <TableHead>Tarih</TableHead>
                                    <TableHead>Aktör</TableHead>
                                    <TableHead>Eylem</TableHead>
                                    <TableHead>Detay</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {auditLogsLoading ? (
                                     Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-1/3" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : auditLogs && auditLogs.length > 0 ? (
                                    auditLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                                {(log.timestamp as any)?.toDate 
                                                    ? format((log.timestamp as any).toDate(), 'dd/MM/yy HH:mm:ss') 
                                                    : 'Bilinmeyen'}
                                            </TableCell>
                                            <TableCell className="font-medium">{log.actorName}</TableCell>
                                            <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                                            <TableCell className="text-sm">{log.details}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">Denetim kaydı bulunamadı.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>

        {editingSong && (
            <EditSongDialog
            song={editingSong}
            isOpen={!!editingSong}
            onOpenChange={(isOpen) => !isOpen && setEditingSong(null)}
            onSongUpdate={handleSongUpdate}
            />
        )}
        {editingParticipant && (
            <EditProfileDialog
                user={{ displayName: editingParticipant.name } as any} // Simplified for dialog
                isOpen={!!editingParticipant}
                onOpenChange={(isOpen) => !isOpen && setEditingParticipant(null)}
                onProfileUpdate={handleProfileUpdate}
                dialogTitle="Kullanıcı Adını Düzenle"
                dialogDescription="Kullanıcının görünen adını güncelleyin."
            />
        )}
    </div>
  );
}
