/**
 * Cultural Cache
 * SQLite caching for cultural analysis results
 */

import SQLite from 'react-native-sqlite-storage';
import { CulturalAnalysisResult, CulturalCacheEntry } from '../shared/types/CulturalTypes';

class CulturalCache {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'CulturalCache.db',
        location: 'default',
      });

      await this.createTable();
    } catch (error) {
      console.error('Failed to initialize Cultural Cache:', error);
    }
  }

  private async createTable(): Promise<void> {
    if (!this.db) return;

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS cultural_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phrase TEXT NOT NULL,
        language TEXT NOT NULL,
        analysis TEXT NOT NULL,
        cached_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        UNIQUE(phrase, language)
      )
    `;

    await this.db.executeSql(createTableQuery);
  }

  async addEntry(entry: CulturalCacheEntry): Promise<void> {
    if (!this.db) return;

    try {
      const insertQuery = `
        INSERT OR REPLACE INTO cultural_cache 
        (phrase, language, analysis, cached_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `;

      await this.db.executeSql(insertQuery, [
        entry.phrase,
        entry.language,
        JSON.stringify(entry.analysis),
        entry.cachedAt,
        entry.expiresAt,
      ]);
    } catch (error) {
      console.error('Failed to add cache entry:', error);
    }
  }

  async getEntry(phrase: string, language: string): Promise<CulturalAnalysisResult | null> {
    if (!this.db) return null;

    try {
      const selectQuery = `
        SELECT analysis, expires_at 
        FROM cultural_cache 
        WHERE phrase = ? AND language = ?
      `;

      const [results] = await this.db.executeSql(selectQuery, [phrase.toLowerCase(), language]);
      
      if (results.rows.length === 0) {
        return null;
      }

      const row = results.rows.item(0);
      const expiresAt = row.expires_at;

      // Check if entry is expired
      if (Date.now() > expiresAt) {
        await this.removeEntry(phrase, language);
        return null;
      }

      return JSON.parse(row.analysis);
    } catch (error) {
      console.error('Failed to get cache entry:', error);
      return null;
    }
  }

  async removeEntry(phrase: string, language: string): Promise<void> {
    if (!this.db) return;

    try {
      const deleteQuery = `
        DELETE FROM cultural_cache 
        WHERE phrase = ? AND language = ?
      `;

      await this.db.executeSql(deleteQuery, [phrase.toLowerCase(), language]);
    } catch (error) {
      console.error('Failed to remove cache entry:', error);
    }
  }

  async clearExpiredEntries(): Promise<void> {
    if (!this.db) return;

    try {
      const deleteQuery = `
        DELETE FROM cultural_cache 
        WHERE expires_at < ?
      `;

      await this.db.executeSql(deleteQuery, [Date.now()]);
    } catch (error) {
      console.error('Failed to clear expired entries:', error);
    }
  }

  async clearAll(): Promise<void> {
    if (!this.db) return;

    try {
      const deleteQuery = 'DELETE FROM cultural_cache';
      await this.db.executeSql(deleteQuery);
    } catch (error) {
      console.error('Failed to clear all entries:', error);
    }
  }

  async getCacheStats(): Promise<{ totalEntries: number; expiredEntries: number }> {
    if (!this.db) return { totalEntries: 0, expiredEntries: 0 };

    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM cultural_cache';
      const expiredQuery = 'SELECT COUNT(*) as expired FROM cultural_cache WHERE expires_at < ?';

      const [totalResults] = await this.db.executeSql(totalQuery);
      const [expiredResults] = await this.db.executeSql(expiredQuery, [Date.now()]);

      return {
        totalEntries: totalResults.rows.item(0).total,
        expiredEntries: expiredResults.rows.item(0).expired,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { totalEntries: 0, expiredEntries: 0 };
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export const culturalCache = new CulturalCache();
export default culturalCache;
