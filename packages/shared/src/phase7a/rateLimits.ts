export interface RateLimitCheck {
  identifier: string; // e.g. UID or Session ID
  action: 'ROOM_CREATION' | 'PLAYER_JOIN' | 'PIN_ATTEMPT' | 'GEMINI_JOB' | 'IMAGE_SOURCING' | 'UPLOAD_FINALIZATION' | 'MEDIA_URL_ISSUANCE' | 'INCORRECT_REPORT';
  timestamp: number;
}
