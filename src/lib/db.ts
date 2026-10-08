import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  QueryConstraint
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanUndefined } from '../firebase';

/**
 * Creates or overwrites a document with a specified ID in a target collection.
 * This guarantees the document will reside at the exact ID requested.
 * Cleans undefined fields automatically.
 *
 * @param collectionName Name of the Firestore collection
 * @param docId The ID of the document to set
 * @param data The document payload
 */
export async function setDocument<T extends object>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const cleaned = cleanUndefined(data);
    await setDoc(doc(db, collectionName, docId), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Creates a new document with an auto-generated ID in a target collection.
 * Cleans undefined fields automatically.
 *
 * @param collectionName Name of the Firestore collection
 * @param data The document payload
 * @returns The auto-generated document ID string
 */
export async function createDocument<T extends object>(
  collectionName: string,
  data: T
): Promise<string> {
  try {
    const cleaned = cleanUndefined(data);
    const docRef = await addDoc(collection(db, collectionName), cleaned);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionName);
  }
}

/**
 * Fetches a single document from a target collection by its ID.
 *
 * @param collectionName Name of the Firestore collection
 * @param docId The ID of the document to get
 * @returns The document with the `id` field merged, or null if not found
 */
export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const path = `${collectionName}/${docId}`;
  try {
    const docSnap = await getDoc(doc(db, collectionName, docId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Updates properties of an existing document in a target collection.
 * Cleans undefined fields automatically.
 *
 * @param collectionName Name of the Firestore collection
 * @param docId The ID of the document to update
 * @param updates Partial fields to update
 */
export async function updateDocument<T extends object>(
  collectionName: string,
  docId: string,
  updates: Partial<T>
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const cleaned = cleanUndefined(updates);
    await updateDoc(doc(db, collectionName, docId) as any, cleaned as any);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Deletes a document from a target collection by its ID.
 *
 * @param collectionName Name of the Firestore collection
 * @param docId The ID of the document to delete
 */
export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Queries a collection and retrieves matching documents under optional query constraints
 * (e.g., where(), limit(), orderBy()).
 *
 * @param collectionName Name of the Firestore collection
 * @param constraints Optional Firestore query constraint parameters
 * @returns An array of matching documents with their ID fields merged
 */
export async function getDocuments<T>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
    const querySnapshot = await getDocs(q);
    const results: T[] = [];
    querySnapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() } as T);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}
