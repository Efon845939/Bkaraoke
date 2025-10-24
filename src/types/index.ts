
export type Song = {
  id: string;
  title: string;
  karaokeUrl: string;
  participantName: string; // Denormalized for display
  participantId: string;
  submissionDate: Date;
  order: number;
};

export type Participant = {
  id: string;
  name: string;
  role: 'student' | 'admin' | 'owner';
  disabled?: boolean;
};

export type AuditLog = {
    id: string;
    timestamp: Date;
    actorId: string;
    actorName: string;
    action: string; // e.g., 'SONG_ADDED', 'USER_DELETED'
    details: string; // e.g., 'Song "Bohemian Rhapsody" was added by John Doe'
}
