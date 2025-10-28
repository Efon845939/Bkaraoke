
'use client';

import {
  CollectionReference,
  DocumentData,
  Firestore,
  Query,
  collection,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

export type Roles = {
  isAdmin: boolean;
  isParticipant: boolean;
};

/**
 * Builds a Firestore query for the 'song_requests' collection based on user roles.
 * This is the single entry point for querying song requests to enforce security rules.
 *
 * @param db The Firestore instance.
 * @param user The authenticated Firebase user.
 * @param roles The roles object for the user.
 * @returns A Firestore Query object.
 * @throws An error if roles are unknown or user/db is not provided.
 */
export function buildSongRequestsQuery(
  db: Firestore,
  user: User | null,
  roles: Roles | null
): Query<DocumentData> {
  const col = collection(
    db,
    'song_requests'
  ) as CollectionReference<DocumentData>;

  // Public query or admin query
  if (!user || !roles || roles.isAdmin) {
    return query(col, orderBy('order', 'asc'));
  }

  if (roles.isParticipant) {
    // Participant can only see their own requests, ordered by submission date.
    return query(
      col,
      where('studentId', '==', user.uid),
      orderBy('submissionDate', 'desc')
    );
  }

  // Default to a safe, likely empty query if roles are indeterminate
  return query(col, where('studentId', '==', 'null-sentinel-value'));
}
