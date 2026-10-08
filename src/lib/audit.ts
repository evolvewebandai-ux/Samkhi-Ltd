import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export async function logActivity(message: string) {
  try {
    const logData = {
      message,
      userEmail: auth.currentUser?.email || 'system@samkhi.com',
      userId: auth.currentUser?.uid || 'system',
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, 'activityLogs'), logData);
    console.log(`[Audit Logged]: ${message}`);
  } catch (error) {
    console.warn("Failed to write to active audit collection logs:", error);
  }
}
