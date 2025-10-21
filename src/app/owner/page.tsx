
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Song, Student } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ListMusic, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function OwnerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [studentFilter, setStudentFilter] = React.useState('');
  const [songFilter, setSongFilter] = React.useState('');

  const isOwner = user?.email === 'owner@karaoke.app';

  React.useEffect(() => {
    if (!isUserLoading && !isOwner) {
      router.push('/');
    }
  }, [user, isUserLoading, router, isOwner]);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !isOwner) return null;
    return collection(firestore, 'students');
  }, [firestore, isOwner]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !isOwner) return null;
    return collection(firestore, 'song_requests');
  }, [firestore, isOwner]);

  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  const { data: songs, isLoading: songsLoading } = useCollection<Song>(songsQuery);

  const filteredStudents = React.useMemo(() => {
    if (!students) return [];
    return students.filter(student =>
      student.name.toLowerCase().includes(studentFilter.toLowerCase())
    );
  }, [students, studentFilter]);

  const sortedSongs = React.useMemo(() => {
    if (!songs) return [];
    return [...songs].sort((a, b) => {
        const dateA = (a.submissionDate as any)?.toDate ? (a.submissionDate as any).toDate() : new Date(0);
        const dateB = (b.submissionDate as any)?.toDate ? (b.submissionDate as any).toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
  }, [songs]);

  const filteredSongs = React.useMemo(() => {
    if (!sortedSongs) return [];
    return sortedSongs.filter(song =>
      song.title.toLowerCase().includes(songFilter.toLowerCase()) ||
      song.studentName.toLowerCase().includes(songFilter.toLowerCase())
    );
  }, [sortedSongs, songFilter]);

  if (isUserLoading || !isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Sistem Sahibi Erişimi Yükleniyor ve Doğrulanıyor...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <h1 className="text-4xl font-headline tracking-wider">Sistem Sahibi Paneli</h1>
        
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* All Students Card */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Users /> Tüm Öğrenciler</CardTitle>
                    <CardDescription>Sisteme kayıtlı tüm öğrencilerin listesi.</CardDescription>
                     <div className="pt-4">
                        <Input
                            placeholder="Öğrenci ara..."
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
                                    <TableHead>Kullanıcı ID</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentsLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredStudents.length > 0 ? (
                                    filteredStudents.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{student.id}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">Öğrenci bulunamadı.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* All Songs Card */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><ListMusic /> Tüm Şarkı İstekleri</CardTitle>
                    <CardDescription>Sistemdeki tüm şarkı isteklerinin geçmişi.</CardDescription>
                     <div className="pt-4">
                        <Input
                            placeholder="Şarkı veya öğrenci ara..."
                            value={songFilter}
                            onChange={(e) => setSongFilter(e.target.value)}
                            className="w-full"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="rounded-md border h-96 overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card">
                                <TableRow>
                                    <TableHead>Şarkı Başlığı</TableHead>
                                    <TableHead>İsteyen</TableHead>
                                    <TableHead>Tarih</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {songsLoading ? (
                                     Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredSongs.length > 0 ? (
                                    filteredSongs.map(song => (
                                        <TableRow key={song.id}>
                                            <TableCell className="font-medium">{song.title}</TableCell>
                                            <TableCell>{song.studentName}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">
                                                {(song.submissionDate as any)?.toDate 
                                                    ? format((song.submissionDate as any).toDate(), 'dd/MM/yyyy HH:mm') 
                                                    : 'Bilinmeyen'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">Şarkı isteği bulunamadı.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
