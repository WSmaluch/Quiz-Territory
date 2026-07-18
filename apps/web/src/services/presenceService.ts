import { rtdb } from '../firebase';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';

export const setupPresence = (sessionId: string, playerId: string, onError?: (error: Error) => void) => {
  const connectedRef = ref(rtdb, '.info/connected');
  const presenceRef = ref(rtdb, `liveSessions/${sessionId}/presence/${playerId}`);

  const unsubscribe = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // When we disconnect, update the status to offline
      onDisconnect(presenceRef).set({
        state: 'OFFLINE',
        lastChanged: serverTimestamp(),
      }).then(() => {
        // Set online status
        return set(presenceRef, {
          state: 'ONLINE',
          lastChanged: serverTimestamp(),
        });
      }).catch((error) => onError?.(error));
    }
  }, (error) => onError?.(error));

  return () => {
    unsubscribe();
    // Cleanup on unmount/leave
    void set(presenceRef, {
      state: 'OFFLINE',
      lastChanged: serverTimestamp(),
    }).catch((error) => onError?.(error));
  };
};
