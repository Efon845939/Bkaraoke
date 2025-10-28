
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
  user: User,
  roles: Roles
): Query<DocumentData> {
  if (!db || !user) {
    throw new Error('Firestore DB or User not available for query construction.');
  }

  const col = collection(
    db,
    'song_requests'
  ) as CollectionReference<DocumentData>;

  if (roles.isAdmin) {
    // Admin can see the full list, ordered by the manual 'order' field.
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

  // If no role matches, throw an error to prevent any data leakage.
  throw new Error('Unknown user role; cannot build song request query.');
}
