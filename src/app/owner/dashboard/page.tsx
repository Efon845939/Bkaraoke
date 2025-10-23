
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, writeBatch, runTransaction, query, where, getDocs, serverTimestamp, orderBy, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Song, Student, AuditLog } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ListMusic, Users, History, Trash2, Pencil } from 'lucide-react';
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

  const [studentFilter, setStudentFilter] = React.useState('');
  const [editingSong, setEditingSong] = React.useState<Song | null>(null);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);
  const [songList, setSongList] = React.useState<Song[]>([]);
  const [studentToDelete, setStudentToDelete] = React.useState<Student | null>(null);

  const isOwner = React.useMemo(() => {
    if (!user?.email) return false;
    return /@karaoke\.owner\.app$/i.test(user.email);
  }, [user]);

  React.useEffect(() => {
    if (!isUserLoading && !isOwner) {
      router.replace('/');
    }
  }, [user, isUserLoading, router, isOwner]);

  // --- Firestore Queries ---
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !isOwner) return null;
    return collection(firestore, 'students');
  }, [firestore, isOwner]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !isOwner) return null;
    return query(collection(firestore, 'song_requests'), orderBy('order'));
  }, [firestore, isOwner]);
  
  const auditLogsQuery = useMemoFirebase(() => {
      if (!firestore || !isOwner) return null;
      return query(collection(firestore, 'audit_logs'), orderBy('timestamp', 'desc'));
  }, [firestore, isOwner]);

  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
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
    const studentId = 'owner-added';
  
    const songData = {
      title: newSong.title,
      karaokeUrl: newSong.url,
      studentId: studentId,
      studentName: requesterName,
      submissionDate: serverTimestamp(),
      order: songList?.length ?? 0,
    };
  
    addDoc(collection(firestore, 'song_requests'), songData).then(docRef => {
        createAuditLog('SONG_ADDED_BY_OWNER', `Şarkı: "${newSong.title}", Ekleyen: ${requesterName}`);
    }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'song_requests',
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
    const originalSongs = [...songList]; // Keep a copy to revert on failure
    setSongList(reorderedSongs);

    const batch = writeBatch(firestore);
    reorderedSongs.forEach((song, index) => {
      const songRef = doc(firestore, 'song_requests', song.id);
      batch.update(songRef, { order: index });
    });

    batch.commit().then(() => {
        createAuditLog('QUEUE_REORDERED', `Şarkı sırası yeniden düzenlendi.`);
    }).catch(e => {
        setSongList(originalSongs); // Revert UI on error
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'song_requests',
            operation: 'write', // Batch writes are generic 'write'
            requestResourceData: { info: 'Batch update for reordering songs.' }
        }));
    });
  };

  const handleProfileUpdate = async (values: { firstName: string, lastName: string }) => {
    if (!firestore || !editingStudent) return;
    const studentId = editingStudent.id;
    const oldName = editingStudent.name;
    const newDisplayName = `${values.firstName} ${values.lastName}`;
    
    runTransaction(firestore, async (transaction) => {
        const studentDocRef = doc(firestore, 'students', studentId);
        transaction.update(studentDocRef, { name: newDisplayName });

        const songRequestsQuery = query(collection(firestore, 'song_requests'), where('studentId', '==', studentId));
        const songRequestsSnapshot = await getDocs(songRequestsQuery);
        songRequestsSnapshot.forEach((songDoc) => {
            transaction.update(songDoc.ref, { studentName: newDisplayName });
        });
    }).then(() => {
        createAuditLog('USER_RENAMED', `Kullanıcı: "${oldName}" -> "${newDisplayName}" (ID: ${studentId})`);
        toast({ title: 'Profil Güncellendi', description: 'Kullanıcının adı başarıyla güncellendi.' });
    }).catch((error) => {
        toast({ variant: 'destructive', title: 'Hata', description: 'Kullanıcı profili güncellenirken bir sorun oluştu.' });
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `students/${studentId} and related song_requests`,
            operation: 'write', // Transaction is a generic 'write'
            requestResourceData: { info: `Updating user name to ${newDisplayName}` }
        }));
    });
    setEditingStudent(null);
};

const handleDeleteStudent = async () => {
    if (!firestore || !studentToDelete) return;
    const { id: studentId, name: studentName } = studentToDelete;

    runTransaction(firestore, async (transaction) => {
        const studentDocRef = doc(firestore, 'students', studentId);
        transaction.delete(studentDocRef);

        const songRequestsQuery = query(collection(firestore, 'song_requests'), where('studentId', '==', studentId));
        const songRequestsSnapshot = await getDocs(songRequestsQuery);
        songRequestsSnapshot.forEach((songDoc) => {
          transaction.delete(songDoc.ref);
        });
    }).then(() => {
        createAuditLog('USER_DELETED', `Kullanıcı Verileri Silindi: "${studentName}" (ID: ${studentId})`);
        toast({ title: 'Kullanıcı Silindi', description: `${studentName} adlı kullanıcının profili ve şarkı istekleri silindi.` });
    }).catch((error) => {
        toast({ variant: 'destructive', title: 'Hata', description: 'Kullanıcı silinirken bir sorun oluştu.' });
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `students/${studentId} and related song_requests`,
            operation: 'delete',
            requestResourceData: { info: `Deleting user ${studentName}` }
        }));
    });
    setStudentToDelete(null);
  };


  // --- Memoized Filters ---
  const filteredStudents = React.useMemo(() => {
    if (!students) return [];
    return students.filter(student =>
      student.name.toLowerCase().includes(studentFilter.toLowerCase())
    );
  }, [students, studentFilter]);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Sistem Sahibi Erişimi Yükleniyor ve Doğrulanıyor...</p>
      </div>
    );
  }

  // Early return if not owner after loading, to avoid rendering the dashboard
  if (!isOwner) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Erişim reddedildi. Yönlendiriliyor...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <PageHeader />
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-headline tracking-wider">Sistem Sahibi Paneli</h1>
      </div>
      
      <SongSubmissionForm
        onSongAdd={handleSongAdd}
        studentName="Sahip"
        showNameInput={true}
       />

      <SongQueue
        role="owner"
        songs={songList}
        isLoading={songsLoading && songList.length === 0}
        onEditSong={setEditingSong}
        onReorder={handleReorder}
       />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Users /> Tüm Kullanıcılar</CardTitle>
                    <CardDescription>Sisteme kayıtlı tüm katılımcılar ve yöneticiler.</CardDescription>
                     <div className="pt-4">
                        <Input
                            placeholder="Kullanıcı ara..."
                            value={studentFilter}
                            onChange={(e) => setStudentFilter(e.target.value)}
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
                                {studentsLoading ? (
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
                                ) : filteredStudents.length > 0 ? (
                                    filteredStudents.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell>
                                              <Badge variant={student.role === 'owner' ? 'default' : student.role === 'admin' ? 'secondary' : 'outline' }>
                                                {roleTranslations[student.role] || student.role}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => setEditingStudent(student)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="text-destructive hover:text-destructive" 
                                                            onClick={() => setStudentToDelete(student)}
                                                            disabled={student.id === user.uid}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    {studentToDelete && studentToDelete.id === student.id && (
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Bu eylem geri alınamaz. Bu, "{student.name}" adlı kullanıcının profilini ve tüm şarkı isteklerini kalıcı olarak silecektir.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel onClick={() => setStudentToDelete(null)}>İptal</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={handleDeleteStudent}
                                                            className="bg-destructive hover:bg-destructive/90"
                                                        >
                                                            Evet, Sil
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
                    <CardTitle className="flex items-center gap-3"><History /> Denetim Kayıtları</CardTitle>
                    <CardDescription>Sistemde gerçekleştirilen önemli eylemlerin kaydı.</CardDescription>
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
        {editingStudent && (
            <EditProfileDialog
                user={{ displayName: editingStudent.name } as any} // Simplified for dialog
                isOpen={!!editingStudent}
                onOpenChange={(isOpen) => !isOpen && setEditingStudent(null)}
                onProfileUpdate={handleProfileUpdate}
                dialogTitle="Kullanıcı Adını Düzenle"
                dialogDescription="Kullanıcının görünen adını güncelleyin."
            />
        )}
    </div>
  );
}

    