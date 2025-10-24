'use client';

import {
  CollectionReference,
  DocumentData,
  Query,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

export type Roles = {
  isOwner: boolean;
  isAdmin: boolean;
  isParticipant: boolean;
};

export function buildSongRequestsQuery(
  db: any,
  user: User | null,
  roles: Roles
): Query<DocumentData> | null {
  if (!db || !user) {
    // Auth/db henüz hazır değilse veya kullanıcı yoksa sorgu oluşturma.
    return null;
  }

  const orderField = 'order'; // Admin/Owner için sıralama alanı
  const participantOrderField = 'submissionDate'; // Katılımcı için sıralama alanı
  const orderDir = 'asc';
  const participantOrderDir = 'desc';

  if (roles.isOwner || roles.isAdmin) {
    // Yönetici/owner full liste
    const col = collection(
      db,
      'song_requests'
    ) as CollectionReference<DocumentData>;
    return query(col, orderBy(orderField, orderDir));
  }

  if (roles.isParticipant) {
    // Katılımcı: sadece kendi belgeleri
    const col = collection(
      db,
      'song_requests'
    ) as CollectionReference<DocumentData>;
    const q = query(
      col,
      where('participantId', '==', user.uid),
      orderBy(participantOrderField, participantOrderDir)
    );
    return q;
  }

  // Bilinmeyen bir rol veya yetkisiz bir durum varsa sorgu oluşturma.
  return null;
}
