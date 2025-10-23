/**
 * Database Migrations
 * 
 * Manages database schema versioning and migrations
 */

import { Migration } from '@/shared/types';
import { CREATE_ALL_TABLES } from './Schema';

/**
 * All migrations in order
 * Each migration has a version number and SQL statements to execute
 */
export const migrations: Migration[] = [
  {
    version: 1,
    name: 'Initial schema',
    up: CREATE_ALL_TABLES,
    down: [
      'DROP TABLE IF EXISTS scroll_positions;',
      'DROP TABLE IF EXISTS friend_requests;',
      'DROP TABLE IF EXISTS messages;',
      'DROP TABLE IF EXISTS chats;',
      'DROP TABLE IF EXISTS users;',
      'DROP TABLE IF EXISTS metadata;',
    ],
  },
  {
    version: 2,
    name: 'Add translations columns to messages',
    up: [
      'ALTER TABLE messages ADD COLUMN translations TEXT;',
      'ALTER TABLE messages ADD COLUMN detectedLanguage TEXT;',
    ],
    down: [
      // SQLite doesn't support DROP COLUMN easily, so we'd need to recreate the table
      // For simplicity, we'll leave these columns if rolling back
      'UPDATE messages SET translations = NULL, detectedLanguage = NULL;',
    ],
  },
];

/**
 * Get migrations that need to be applied
 * @param currentVersion Current database version
 * @returns Array of migrations to apply
 */
export const getPendingMigrations = (currentVersion: number): Migration[] => {
  return migrations.filter(m => m.version > currentVersion);
};

/**
 * Get the target version (latest migration version)
 */
export const getTargetVersion = (): number => {
  if (migrations.length === 0) return 0;
  return Math.max(...migrations.map(m => m.version));
};

/**
 * Validate migrations (ensure no version conflicts)
 */
export const validateMigrations = (): boolean => {
  const versions = migrations.map(m => m.version);
  const uniqueVersions = new Set(versions);
  
  if (versions.length !== uniqueVersions.size) {
    console.error('❌ Duplicate migration versions detected!');
    return false;
  }
  
  // Check if versions are sequential
  const sortedVersions = [...versions].sort((a, b) => a - b);
  for (let i = 0; i < sortedVersions.length; i++) {
    if (sortedVersions[i] !== i + 1) {
      console.error(`❌ Migration versions must be sequential. Missing version ${i + 1}`);
      return false;
    }
  }
  
  return true;
};

/**
 * Get migration by version
 */
export const getMigration = (version: number): Migration | undefined => {
  return migrations.find(m => m.version === version);
};


