import { auth, db } from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

// Define the structure of a log entry - co-locating type for now
export interface MedicationLogEntry {
  id?: string; // Firestore document ID, auto-generated
  userId: string;
  timestamp: any; // Firestore Timestamp (will be serverTimestamp())
  medicationName: string;
  doseParams: {
    doseValue: number | null;
    unit: 'mg' | 'mcg' | 'units' | 'mL';
    concentration?: number | null;
    concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml';
    totalAmount?: number | null;
    manualSyringe: { type: 'Insulin' | 'Standard'; volume: string } | null;
    solutionVolume?: string | null;
    // Consider adding original concentrationAmount (string) if needed for display
  };
  doseResult: {
    calculatedVolume: number | null;
    recommendedMarking: string | null;
    calculatedConcentration?: number | null;
  };
  // Optional: Store any calculation warnings if they don't prevent administration
  calculationWarning?: string | null;
}

// Type for the data passed to the save function, before userId and timestamp are added
export type MedicationLogData = Omit<MedicationLogEntry, 'id' | 'timestamp' | 'userId'>;

/**
 * Saves a medication log entry to Firestore.
 * @param logData The medication log data to save.
 */
export async function saveMedicationLog(logData: MedicationLogData): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    console.error("No authenticated user found. Cannot save medication log.");
    // Optionally, throw an error or return a specific status
    return null;
  }

  if (!db) {
    console.error("Firestore database instance is not available.");
    return null;
  }

  try {
    const docRef = await addDoc(collection(db, 'medicationLogs'), {
      ...logData,
      userId: user.uid,
      timestamp: serverTimestamp(), // Use server-side timestamp
    });
    console.log("Medication log saved with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving medication log: ", error);
    // Optionally, re-throw the error or handle it as needed
    return null;
  }
}

import { query, where, getDocs, orderBy } from 'firebase/firestore';

/**
 * Fetches medication logs for the current user, ordered by timestamp.
 */
export async function getMedicationLogs(): Promise<MedicationLogEntry[]> {
  const user = auth.currentUser;
  if (!user) {
    console.log("No authenticated user found. Cannot fetch medication logs.");
    return []; // Or throw an error
  }

  if (!db) {
    console.error("Firestore database instance is not available.");
    return []; // Or throw an error
  }

  const logs: MedicationLogEntry[] = [];
  try {
    // Create a query against the collection.
    // Filter by userId and order by timestamp in descending order.
    const q = query(
      collection(db, 'medicationLogs'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      // doc.data() is never undefined for query doc snapshots
      logs.push({ id: doc.id, ...doc.data() } as MedicationLogEntry);
    });
    console.log(`Fetched ${logs.length} medication logs for user ${user.uid}`);
    return logs;
  } catch (error) {
    console.error("Error fetching medication logs: ", error);
    // Optionally, re-throw the error or handle it as needed
    return []; // Return empty array on error for now
  }
}
