/**
 * StorageService Tests
 * 
 * Tests image upload, compression, and thumbnail generation
 */

import { StorageService } from '@/services/firebase/StorageService';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { getDownloadURL, uploadBytes } from 'firebase/storage';

jest.mock('expo-image-manipulator');
jest.mock('expo-file-system/legacy');

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('compressImage', () => {
    it('should compress image to 85% quality', async () => {
      const mockCompressed = {
        uri: 'file://compressed.jpg',
        width: 800,
        height: 600
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockCompressed);

      const result = await StorageService.compressImage('file://original.jpg');

      expect(result).toBe('file://compressed.jpg');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original.jpg',
        [],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
    });

    it('should throw error if compression fails', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValue(
        new Error('Compression failed')
      );

      await expect(
        StorageService.compressImage('file://invalid.jpg')
      ).rejects.toThrow('Compression failed');
    });
  });

  describe('generateThumbnail', () => {
    it('should generate 200x200 thumbnail', async () => {
      const mockThumbnail = {
        uri: 'file://thumbnail.jpg',
        width: 200,
        height: 200
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockThumbnail);

      const result = await StorageService.generateThumbnail('file://image.jpg');

      expect(result).toBe('file://thumbnail.jpg');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://image.jpg',
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
    });

    it('should handle thumbnail generation errors', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValue(
        new Error('Thumbnail generation failed')
      );

      await expect(
        StorageService.generateThumbnail('file://invalid.jpg')
      ).rejects.toThrow();
    });
  });

  describe('checkImageSize', () => {
    it('should return true for images under 10MB', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        size: 5 * 1024 * 1024, // 5MB
        exists: true
      });

      const result = await StorageService.checkImageSize('file://image.jpg');

      expect(result).toBe(true);
    });

    it('should return false for images over 10MB', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        size: 15 * 1024 * 1024, // 15MB
        exists: true
      });

      const result = await StorageService.checkImageSize('file://large.jpg');

      expect(result).toBe(false);
    });

    it('should throw error if file does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false
      });

      await expect(
        StorageService.checkImageSize('file://missing.jpg')
      ).rejects.toThrow('File not found or size unavailable');
    });
  });

  describe('uploadMessageImage', () => {
    it('should upload both full image and thumbnail', async () => {
      // Mock file size check
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        size: 5 * 1024 * 1024, // 5MB
        exists: true
      });

      // Mock compression and thumbnail
      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce({ uri: 'file://compressed.jpg' }) // Compress
        .mockResolvedValueOnce({ uri: 'file://thumbnail.jpg' }); // Thumbnail

      // Mock file reading
      (FileSystem.readAsStringAsync as jest.Mock)
        .mockResolvedValueOnce('compressed-base64')
        .mockResolvedValueOnce('thumbnail-base64');

      // Mock Firebase upload
      (uploadBytes as jest.Mock).mockResolvedValue({});
      (getDownloadURL as jest.Mock)
        .mockResolvedValueOnce('https://storage/image.jpg')
        .mockResolvedValueOnce('https://storage/thumbnail.jpg');

      const result = await StorageService.uploadMessageImage(
        'chat-123',
        'message-456',
        'file://original.jpg'
      );

      expect(result.imageUrl).toBe('https://storage/image.jpg');
      expect(result.thumbnailUrl).toBe('https://storage/thumbnail.jpg');
      expect(uploadBytes).toHaveBeenCalledTimes(2);
    });

    it('should throw error if image is too large', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        size: 15 * 1024 * 1024,
        exists: true
      });

      await expect(
        StorageService.uploadMessageImage('chat-123', 'message-456', 'file://large.jpg')
      ).rejects.toThrow();
    });
  });

  describe('getFileSizeMB', () => {
    it('should return file size in megabytes', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        size: 2.5 * 1024 * 1024, // 2.5MB
        exists: true
      });

      const size = await StorageService.getFileSizeMB('file://test.jpg');

      expect(size).toBeCloseTo(2.5, 2);
    });

    it('should return 0 for non-existent file', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false
      });

      const size = await StorageService.getFileSizeMB('file://missing.jpg');

      expect(size).toBe(0);
    });
  });
});

