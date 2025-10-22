/**
 * StorageService - Firebase Storage operations for file uploads
 * 
 * Handles:
 * - Profile picture uploads
 * - Message image uploads
 * - Group icon uploads
 * - Image compression
 * - Thumbnail generation
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import {
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytes,
    uploadBytesResumable
} from 'firebase/storage';
import { storage } from './FirebaseConfig';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const THUMBNAIL_SIZE = 200; // 200x200px
const COMPRESSION_QUALITY = 0.85; // 85% quality

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
}

export class StorageService {
  /**
   * Compress an image to 85% quality
   * Returns URI of compressed image
   */
  static async compressImage(
    imageUri: string,
    quality: number = COMPRESSION_QUALITY
  ): Promise<string> {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [], // No resize/crop, just compress
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnail (200x200px) for an image
   * Returns URI of thumbnail
   */
  static async generateThumbnail(imageUri: string): Promise<string> {
    try {
      const thumbnail = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: THUMBNAIL_SIZE,
              height: THUMBNAIL_SIZE,
            },
          },
        ],
        {
          compress: 0.7, // Lower quality for thumbnails
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return thumbnail.uri;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw error;
    }
  }

  /**
   * Check if image file size is within limit
   */
  static async checkImageSize(imageUri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (!fileInfo.exists || !fileInfo.size) {
        throw new Error('File not found or size unavailable');
      }

      return fileInfo.size <= MAX_IMAGE_SIZE;
    } catch (error) {
      console.error('Error checking image size:', error);
      throw error;
    }
  }

  /**
   * Get file size in megabytes
   */
  static async getFileSizeMB(imageUri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (!fileInfo.exists || !fileInfo.size) {
        return 0;
      }

      return fileInfo.size / (1024 * 1024);
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  /**
   * Upload profile picture for a user
   * Returns download URL
   */
  static async uploadProfilePicture(
    userId: string,
    imageUri: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      // Compress image
      const compressedUri = await this.compressImage(imageUri);

      // Check size after compression
      const isWithinLimit = await this.checkImageSize(compressedUri);
      if (!isWithinLimit) {
        throw new Error('Image size exceeds 10MB even after compression');
      }

      // Read file as blob
      const response = await fetch(compressedUri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const storageRef = ref(storage, `users/${userId}/profile.jpg`);
      
      if (onProgress) {
        // Upload with progress tracking
        const uploadTask = uploadBytesResumable(storageRef, blob);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
              };
              onProgress(progress);
            },
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      } else {
        // Simple upload without progress
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  }

  /**
   * Upload group icon
   * Returns download URL
   */
  static async uploadGroupIcon(
    imageUri: string,
    groupName: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      // Compress image
      const compressedUri = await this.compressImage(imageUri);

      // Check size after compression
      const isWithinLimit = await this.checkImageSize(compressedUri);
      if (!isWithinLimit) {
        throw new Error('Image size exceeds 10MB even after compression');
      }

      // Read file as blob
      const response = await fetch(compressedUri);
      const blob = await response.blob();

      // Generate unique ID for group icon (use timestamp + random)
      const groupId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, `groups/${groupId}/icon.jpg`);
      
      if (onProgress) {
        // Upload with progress tracking
        const uploadTask = uploadBytesResumable(storageRef, blob);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
              };
              onProgress(progress);
            },
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      } else {
        // Simple upload without progress
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
      }
    } catch (error) {
      console.error('Error uploading group icon:', error);
      throw error;
    }
  }

  /**
   * Upload message image with full resolution and thumbnail
   * Returns { imageUrl, thumbnailUrl }
   */
  static async uploadMessageImage(
    chatId: string,
    messageId: string,
    imageUri: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ imageUrl: string; thumbnailUrl: string }> {
    try {
      // Check original size
      const originalSizeMB = await this.getFileSizeMB(imageUri);
      console.log(`Original image size: ${originalSizeMB.toFixed(2)} MB`);

      // Compress full image
      const compressedUri = await this.compressImage(imageUri);
      const compressedSizeMB = await this.getFileSizeMB(compressedUri);
      console.log(`Compressed image size: ${compressedSizeMB.toFixed(2)} MB`);

      // Check if compressed size is within limit
      const isWithinLimit = await this.checkImageSize(compressedUri);
      if (!isWithinLimit) {
        throw new Error(`Image size (${compressedSizeMB.toFixed(2)}MB) exceeds 10MB limit even after compression`);
      }

      // Generate thumbnail
      const thumbnailUri = await this.generateThumbnail(compressedUri);

      // Upload full image
      const fullImageResponse = await fetch(compressedUri);
      const fullImageBlob = await fullImageResponse.blob();
      const fullImageRef = ref(storage, `chats/${chatId}/${messageId}/image.jpg`);

      if (onProgress) {
        // Upload with progress
        const uploadTask = uploadBytesResumable(fullImageRef, fullImageBlob);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
              };
              onProgress(progress);
            },
            (error) => reject(error),
            () => resolve()
          );
        });
      } else {
        await uploadBytes(fullImageRef, fullImageBlob);
      }

      const imageUrl = await getDownloadURL(fullImageRef);

      // Upload thumbnail
      const thumbnailResponse = await fetch(thumbnailUri);
      const thumbnailBlob = await thumbnailResponse.blob();
      const thumbnailRef = ref(storage, `chats/${chatId}/${messageId}/thumbnail.jpg`);
      await uploadBytes(thumbnailRef, thumbnailBlob);
      const thumbnailUrl = await getDownloadURL(thumbnailRef);

      return { imageUrl, thumbnailUrl };
    } catch (error) {
      console.error('Error uploading message image:', error);
      throw error;
    }
  }


  /**
   * Delete an image from Firebase Storage
   */
  static async deleteImage(imagePath: string): Promise<void> {
    try {
      const imageRef = ref(storage, imagePath);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Delete message images (both full and thumbnail)
   */
  static async deleteMessageImages(chatId: string, messageId: string): Promise<void> {
    try {
      // Delete full image
      const fullImageRef = ref(storage, `chats/${chatId}/${messageId}/image.jpg`);
      await deleteObject(fullImageRef).catch((err) => 
        console.warn('Full image not found or already deleted:', err)
      );

      // Delete thumbnail
      const thumbnailRef = ref(storage, `chats/${chatId}/${messageId}/thumbnail.jpg`);
      await deleteObject(thumbnailRef).catch((err) => 
        console.warn('Thumbnail not found or already deleted:', err)
      );
    } catch (error) {
      console.error('Error deleting message images:', error);
      throw error;
    }
  }
}

