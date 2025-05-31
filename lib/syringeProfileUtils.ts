import { auth, db } from './firebase'; // Assuming firebase setup is in this path
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface SyringeProfile {
  id?: string; // Firestore document ID
  userId: string;
  profileName: string;
  syringeType: 'Insulin' | 'Standard'; // Base type
  volume: string; // e.g., "1 mL", "100 units"
  markings: string; // Comma-separated string of numerical markings, e.g., "0.1,0.2,0.3"
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Type for data passed to create/update functions, omitting auto-generated fields
export type SyringeProfileData = Omit<SyringeProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

const SYRINGE_PROFILES_COLLECTION = 'syringeProfiles';

/**
 * Saves a new custom syringe profile to Firestore for the current user.
 * @param profileData The syringe profile data to save.
 * @returns The ID of the newly created profile, or null if an error occurs.
 */
export async function saveSyringeProfile(profileData: SyringeProfileData): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    console.error("No authenticated user found. Cannot save syringe profile.");
    return null;
  }
  if (!db) {
    console.error("Firestore database instance is not available.");
    return null;
  }

  try {
    const docRef = await addDoc(collection(db, SYRINGE_PROFILES_COLLECTION), {
      ...profileData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("Syringe profile saved with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving syringe profile: ", error);
    return null;
  }
}

/**
 * Fetches all custom syringe profiles for the current user.
 * @returns A promise that resolves to an array of SyringeProfile objects.
 */
export async function getSyringeProfiles(): Promise<SyringeProfile[]> {
  const user = auth.currentUser;
  if (!user) {
    console.log("No authenticated user. Cannot fetch syringe profiles.");
    return [];
  }
  if (!db) {
    console.error("Firestore database instance is not available.");
    return [];
  }

  const profiles: SyringeProfile[] = [];
  try {
    const q = query(
      collection(db, SYRINGE_PROFILES_COLLECTION),
      where('userId', '==', user.uid),
      orderBy('profileName', 'asc') // Optional: order by name or createdAt
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      profiles.push({ id: docSnap.id, ...docSnap.data() } as SyringeProfile);
    });
    console.log(`Fetched ${profiles.length} syringe profiles for user ${user.uid}`);
    return profiles;
  } catch (error) {
    console.error("Error fetching syringe profiles: ", error);
    return [];
  }
}

/**
 * Updates an existing custom syringe profile in Firestore.
 * @param profileId The ID of the syringe profile to update.
 * @param updatedData The new data for the syringe profile.
 * @returns True if successful, false otherwise.
 */
export async function updateSyringeProfile(profileId: string, updatedData: Partial<SyringeProfileData>): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    console.error("No authenticated user. Cannot update syringe profile.");
    return false;
  }
   if (!db) {
    console.error("Firestore database instance is not available.");
    return false;
  }

  try {
    const profileRef = doc(db, SYRINGE_PROFILES_COLLECTION, profileId);
    // TODO: Add a check to ensure the profile belongs to the current user before updating,
    // though Firestore rules should also enforce this.
    await updateDoc(profileRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
    });
    console.log("Syringe profile updated successfully: ", profileId);
    return true;
  } catch (error) {
    console.error("Error updating syringe profile: ", error);
    return false;
  }
}

/**
 * Deletes a custom syringe profile from Firestore.
 * @param profileId The ID of the syringe profile to delete.
 * @returns True if successful, false otherwise.
 */
export async function deleteSyringeProfile(profileId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    console.error("No authenticated user. Cannot delete syringe profile.");
    return false;
  }
  if (!db) {
    console.error("Firestore database instance is not available.");
    return false;
  }

  try {
    const profileRef = doc(db, SYRINGE_PROFILES_COLLECTION, profileId);
    // TODO: Add a check to ensure the profile belongs to the current user.
    await deleteDoc(profileRef);
    console.log("Syringe profile deleted successfully: ", profileId);
    return true;
  } catch (error) {
    console.error("Error deleting syringe profile: ", error);
    return false;
  }
}
