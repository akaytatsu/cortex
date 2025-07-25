import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { createServiceLogger } from "../lib/logger";

export class ImageServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "ImageServiceError";
  }
}

interface TempImageFile {
  originalName: string;
  tempPath: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

const logger = createServiceLogger("ImageService");

export class ImageService {
  private tempFiles = new Map<string, TempImageFile>();
  private readonly SUPPORTED_TYPES = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml'
  ];
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly TEMP_DIR = path.join(os.tmpdir(), 'claude-code-images');

  constructor() {
    this.ensureTempDir();
    this.startCleanupTimer();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
      logger.info("Temp directory ensured", { tempDir: this.TEMP_DIR });
    } catch (error) {
      logger.error("Failed to create temp directory", error as Error);
      throw new ImageServiceError(
        "Failed to create temporary directory",
        "TEMP_DIR_CREATION_FAILED"
      );
    }
  }

  private startCleanupTimer(): void {
    // Clean up files older than 1 hour every 30 minutes
    setInterval(() => {
      this.cleanupOldFiles();
    }, 30 * 60 * 1000);
  }

  validateImageType(mimeType: string): boolean {
    return this.SUPPORTED_TYPES.includes(mimeType);
  }

  validateImageSize(size: number): boolean {
    return size > 0 && size <= this.MAX_FILE_SIZE;
  }

  async saveTemporaryImage(
    imageData: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<string> {
    const sessionLogger = logger.withContext({
      originalName,
      mimeType,
      size: imageData.length
    });

    try {
      // Validate image type
      if (!this.validateImageType(mimeType)) {
        throw new ImageServiceError(
          `Unsupported image type: ${mimeType}`,
          "UNSUPPORTED_IMAGE_TYPE"
        );
      }

      // Validate image size
      if (!this.validateImageSize(imageData.length)) {
        throw new ImageServiceError(
          `Image size ${imageData.length} bytes exceeds maximum ${this.MAX_FILE_SIZE} bytes`,
          "IMAGE_TOO_LARGE"
        );
      }

      // Generate unique filename
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const extension = this.getExtensionFromMimeType(mimeType);
      const fileName = `${fileId}${extension}`;
      const tempPath = path.join(this.TEMP_DIR, fileName);

      // Save file
      await fs.writeFile(tempPath, imageData);

      // Store metadata
      const tempFile: TempImageFile = {
        originalName,
        tempPath,
        mimeType,
        size: imageData.length,
        createdAt: new Date()
      };

      this.tempFiles.set(fileId, tempFile);

      sessionLogger.info("Temporary image saved", {
        fileId,
        tempPath
      });

      return fileId;
    } catch (error) {
      sessionLogger.error("Failed to save temporary image", error as Error);
      throw error;
    }
  }

  getTempImagePath(fileId: string): string | null {
    const tempFile = this.tempFiles.get(fileId);
    return tempFile?.tempPath || null;
  }

  async cleanupImage(fileId: string): Promise<void> {
    const tempFile = this.tempFiles.get(fileId);
    if (!tempFile) {
      return;
    }

    try {
      await fs.unlink(tempFile.tempPath);
      this.tempFiles.delete(fileId);
      logger.info("Temporary image cleaned up", {
        fileId,
        tempPath: tempFile.tempPath
      });
    } catch (error) {
      logger.warn("Failed to cleanup temporary image", {
        fileId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async cleanupOldFiles(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const filesToCleanup: string[] = [];

    for (const [fileId, tempFile] of this.tempFiles.entries()) {
      if (tempFile.createdAt < oneHourAgo) {
        filesToCleanup.push(fileId);
      }
    }

    logger.info("Starting cleanup of old temporary files", {
      filesToCleanup: filesToCleanup.length
    });

    for (const fileId of filesToCleanup) {
      await this.cleanupImage(fileId);
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/svg+xml': '.svg'
    };
    return extensions[mimeType] || '.bin';
  }

  getSupportedTypes(): string[] {
    return [...this.SUPPORTED_TYPES];
  }

  getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }
}

export const imageService = new ImageService();