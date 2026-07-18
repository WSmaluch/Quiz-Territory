import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { ServerValue } from 'firebase-admin/database';
console.log(FieldValue.serverTimestamp(), Timestamp.now(), ServerValue.TIMESTAMP);
