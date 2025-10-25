/**
 * Cultural Cache
 * SQLite caching for cultural analysis results
 */

import { CulturalAnalysisResult, CulturalCacheEntry } from '../shared/types/CulturalTypes';
import { SQLiteService } from './SQLiteService';

class CulturalCache {
  async initialize(): Promise<void> {
    // Use existing SQLiteService instead of creating new database
    await this.createTable();
  }

  private async createTable(): Promise<void> {
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

    await SQLiteService.executeSql(createTableQuery);
  }

  async addEntry(entry: CulturalCacheEntry): Promise<void> {
    try {
      const insertQuery = `
        INSERT OR REPLACE INTO cultural_cache 
        (phrase, language, analysis, cached_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `;

      await SQLiteService.executeSql(insertQuery, [
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
    try {
      const selectQuery = `
        SELECT analysis, expires_at 
        FROM cultural_cache 
        WHERE phrase = ? AND language = ?
      `;

      const results = await SQLiteService.executeSql<{ analysis: string; expires_at: number }>(selectQuery, [phrase.toLowerCase(), language]);
      
      if (results.length === 0) {
        return null;
      }

      const row = results[0];
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
    try {
      const deleteQuery = `
        DELETE FROM cultural_cache 
        WHERE phrase = ? AND language = ?
      `;

      await SQLiteService.executeSql(deleteQuery, [phrase.toLowerCase(), language]);
    } catch (error) {
      console.error('Failed to remove cache entry:', error);
    }
  }

  async clearExpiredEntries(): Promise<void> {
    try {
      const deleteQuery = `
        DELETE FROM cultural_cache 
        WHERE expires_at < ?
      `;

      await SQLiteService.executeSql(deleteQuery, [Date.now()]);
    } catch (error) {
      console.error('Failed to clear expired entries:', error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      const deleteQuery = 'DELETE FROM cultural_cache';
      await SQLiteService.executeSql(deleteQuery);
    } catch (error) {
      console.error('Failed to clear all entries:', error);
    }
  }

  async getCacheStats(): Promise<{ totalEntries: number; expiredEntries: number }> {
    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM cultural_cache';
      const expiredQuery = 'SELECT COUNT(*) as expired FROM cultural_cache WHERE expires_at < ?';

      const totalResults = await SQLiteService.executeSql<{ total: number }>(totalQuery);
      const expiredResults = await SQLiteService.executeSql<{ expired: number }>(expiredQuery, [Date.now()]);

      return {
        totalEntries: totalResults[0].total,
        expiredEntries: expiredResults[0].expired,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { totalEntries: 0, expiredEntries: 0 };
    }
  }

  async close(): Promise<void> {
    // No need to close - SQLiteService handles this
  }
}

export const culturalCache = new CulturalCache();
export default culturalCache;
