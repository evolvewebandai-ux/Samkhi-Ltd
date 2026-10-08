import { auth as firebaseAuth } from '../firebase';

// Use the single unified Auth instance across the entire application
export const auth = firebaseAuth;

