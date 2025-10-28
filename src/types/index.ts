
export type Song = {
  id: string;
  title: string;
  karaokeUrl: string;
  requesterName: string; // Denormalized for display
  studentId: string; // Legacy field, might be 'anonymous'
  submissionDate: Date;
  order: number;
};

export type RequesterProfile = {
  id: string;
  name: string;
  role: 'admin';
};

export type AuditLog = {
    id: string;
    timestamp: Date;
    actorId: string;
    actorName: string;
    action: string; // e.g., 'SONG_ADDED', 'USER_DELETED'
    details: string; // e.g., 'Song "Bohemian Rhapsody" was added by John Doe'
}
