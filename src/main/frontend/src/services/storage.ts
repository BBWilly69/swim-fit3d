/**
 * IndexedDB Storage Service
 *
 * Provides persistent storage for import history (ETA calculations)
 * and user preferences using the `idb` library.
 *
 * @module services/storage
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ImportHistoryEntry } from '../types';

/** Database schema definition */
interface SwimMergeDB extends DBSchema {
  importHistory: {
    key: number;
    value: ImportHistoryEntry;
    indexes: { 'by-timestamp': number };
  };
  preferences: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'swimmerge-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SwimMergeDB>> | null = null;

/**
 * Gets or creates the database connection.
 *
 * @returns Database instance
 */
async function getDb(): Promise<IDBPDatabase<SwimMergeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SwimMergeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Import history store
        const importStore = db.createObjectStore('importHistory', {
          keyPath: 'timestamp',
        });
        importStore.createIndex('by-timestamp', 'timestamp');

        // Preferences store
        db.createObjectStore('preferences');
      },
    });
  }
  return dbPromise;
}

// ============================================================================
// Import History (for ETA calculations)
// ============================================================================

/**
 * Saves an import history entry for future ETA calculations.
 *
 * @param entry - Import history entry
 */
export async function saveImportHistory(entry: ImportHistoryEntry): Promise<void> {
  const db = await getDb();
  await db.put('importHistory', entry);

  // Keep only the last 50 entries
  const allKeys = await db.getAllKeys('importHistory');
  if (allKeys.length > 50) {
    const keysToDelete = allKeys.slice(0, allKeys.length - 50);
    const tx = db.transaction('importHistory', 'readwrite');
    await Promise.all([
      ...keysToDelete.map((key) => tx.store.delete(key)),
      tx.done,
    ]);
  }
}

/**
 * Gets recent import history entries.
 *
 * @param limit - Maximum number of entries
 * @returns Array of import history entries
 */
export async function getImportHistory(limit = 20): Promise<ImportHistoryEntry[]> {
  const db = await getDb();
  const entries = await db.getAllFromIndex('importHistory', 'by-timestamp');
  return entries.slice(-limit).reverse();
}

/**
 * Calculates estimated time for import based on history.
 *
 * @param fileCount - Number of files to import
 * @returns Estimated time in milliseconds, or null if no history
 */
export async function calculateEta(fileCount: number): Promise<number | null> {
  const history = await getImportHistory(10);

  if (history.length === 0) {
    return null;
  }

  // Calculate weighted average (more recent = more weight)
  let totalWeight = 0;
  let weightedSum = 0;

  history.forEach((entry, index) => {
    const weight = index + 1; // More recent entries have higher index
    weightedSum += entry.avgFileProcessingMs * weight;
    totalWeight += weight;
  });

  const avgMs = weightedSum / totalWeight;
  return Math.round(avgMs * fileCount);
}

// ============================================================================
// Preferences Storage
// ============================================================================

/**
 * Saves a preference value.
 *
 * @param key - Preference key
 * @param value - Preference value
 */
export async function setPreference<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.put('preferences', value, key);
}

/**
 * Gets a preference value.
 *
 * @param key - Preference key
 * @param defaultValue - Default value if not found
 * @returns Preference value or default
 */
export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDb();
  const value = await db.get('preferences', key);
  return (value as T) ?? defaultValue;
}

/**
 * Deletes a preference.
 *
 * @param key - Preference key
 */
export async function deletePreference(key: string): Promise<void> {
  const db = await getDb();
  await db.delete('preferences', key);
}

/**
 * Clears all preferences.
 */
export async function clearPreferences(): Promise<void> {
  const db = await getDb();
  await db.clear('preferences');
}

/**
 * Clears all data from the database.
 */
export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.clear('importHistory'),
    db.clear('preferences'),
  ]);
}
