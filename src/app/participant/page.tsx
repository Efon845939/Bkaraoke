
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
  useAuth,
  errorEmitter,
  FirestorePermissionError
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
  orderBy,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { updateProfile, deleteUser as deleteAuthUser } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { EditSongDialog } from '@/components/edit-song-dialog';
import { EditProfileDialog } from '@/components/edit-profile-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ParticipantPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [editingSong, setEditingSong] = React.useState<Song | null>(null);
  const [isEditProfileOpen, setEditProfileOpen] = React.useState(false);
  const [isDeleteAccountAlertOpen, setDeleteAccountAlertOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'song_requests'),
      where('participantId', '==', user.uid),
      orderBy('submissionDate', 'desc')
    );
  }, [firestore, user]);

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

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

    const participantId = user.uid;
    const participantName = user.displayName || newSong.name || 'Bilinmeyen Katılımcı';
    
    if (!user.displayName && newSong.name && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newSong.name });
    }

    const participantDocRef = doc(firestore, 'students', participantId);
    
    const totalSongsSnapshot = await getDocs(collection(firestore, 'song_requests'));
    const totalSongs = totalSongsSnapshot.size;

    const batch = writeBatch(firestore);

    batch.set(participantDocRef, { id: participantId, name: participantName, role: 'student' }, { merge: true });

    const songRequestDocRef = doc(collection(firestore, 'song_requests'));
    const songData = {
      id: songRequestDocRef.id,
      title: newSong.title,
      karaokeUrl: newSong.url,
      participantId: participantId,
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

   const handleProfileUpdate = async (values: { firstName: string, lastName: string }) => {
    if (!auth?.currentUser || !firestore) return;

    const oldDisplayName = auth.currentUser.displayName;
    const newDisplayName = `${values.firstName} ${values.lastName}`;
    const participantId = auth.currentUser.uid;

    try {
      await updateProfile(auth.currentUser!, { displayName: newDisplayName });
      
      runTransaction(firestore, async (transaction) => {
        const participantDocRef = doc(firestore, 'students', participantId);
        transaction.update(participantDocRef, { name: newDisplayName });

        const songRequestsQuery = query(
          collection(firestore, 'song_requests'),
          where('participantId', '==', participantId)
        );
        const songRequestsSnapshot = await getDocs(songRequestsQuery);
        songRequestsSnapshot.forEach((songDoc) => {
          transaction.update(songDoc.ref, { participantName: newDisplayName });
        });
      }).then(() => {
          createAuditLog('PROFILE_UPDATED', `Kullanıcı: "${oldDisplayName}" -> "${newDisplayName}"`);
          toast({
            title: 'Profil Güncellendi',
            description: 'Adınız başarıyla güncellendi.',
            duration: 3000,
          });
      }).catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `students/${participantId} and related song_requests`,
              operation: 'write',
              requestResourceData: { info: `Updating user name to ${newDisplayName}`}
          }));
          if(oldDisplayName && auth.currentUser) updateProfile(auth.currentUser, { displayName: oldDisplayName });
      });

    } catch (error) {
      console.error('Auth profil güncellenirken hata oluştu:', error);
       toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Profiliniz güncellenirken bir sorun oluştu (Auth).',
        duration: 3000,
      });
    }
    setEditProfileOpen(false);
  };

  const handleDeleteAccount = async () => {
    if (!firestore || !auth.currentUser) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Kullanıcı oturumu bulunamadı.'});
      return;
    }
    
    const userToDelete = auth.currentUser;
    const participantId = userToDelete.uid;
    const participantName = userToDelete.displayName || "Bilinmeyen Kullanıcı";

    try {
        await runTransaction(firestore, async (transaction) => {
            const participantDocRef = doc(firestore, 'students', participantId);
            transaction.delete(participantDocRef);

            const songRequestsQuery = query(collection(firestore, 'song_requests'), where('participantId', '==', participantId));
            const songRequestsSnapshot = await getDocs(songRequestsQuery);
            songRequestsSnapshot.forEach((songDoc) => {
              transaction.delete(songDoc.ref);
            });
        });

        createAuditLog('USER_DELETED_SELF', `Katılımcı kendi hesabını sildi: "${participantName}" (ID: ${participantId})`);
        
        await deleteAuthUser(userToDelete);
        
        toast({ title: 'Hesap Silindi', description: 'Hesabınız ve tüm verileriniz başarıyla silindi. Yönlendiriliyorsunuz.' });
        router.push('/');

    } catch (error: any) {
        console.error("Hesap silinirken hata oluştu:", error);
        toast({
            variant: 'destructive',
            title: 'Hesap Silinemedi',
            description: error.code === 'auth/requires-recent-login'
                ? 'Bu hassas bir işlemdir. Lütfen tekrar giriş yapıp tekrar deneyin.'
                : 'Hesabınızı silerken bir hata oluştu. Lütfen tekrar deneyin.'
        });

        if (error.code !== 'auth/requires-recent-login') {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `students/${participantId} and related song_requests`,
                operation: 'delete',
                requestResourceData: { info: `Self-deleting account for user ${participantName}` }
            }));
        }
    } finally {
        setDeleteAccountAlertOpen(false);
    }
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
      <PageHeader 
        onEditProfile={() => setEditProfileOpen(true)}
        onDeleteAccount={() => setDeleteAccountAlertOpen(true)} 
      />
      <main className="space-y-8">
        <SongSubmissionForm onSongAdd={handleSongAdd} participantName={user.displayName || ''} showNameInput={!user.displayName} />
        <SongQueue
          role="participant"
          songs={songs || []}
          isLoading={isLoading && (!songs || songs.length === 0)}
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
      <AlertDialog open={isDeleteAccountAlertOpen} onOpenChange={setDeleteAccountAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hesabınızı Silmek Üzere misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu eylem geri alınamaz. Profiliniz ve tüm şarkı istekleriniz kalıcı olarak silinecektir. Devam etmek istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive hover:bg-destructive/90"
            >
              Evet, Hesabımı Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
