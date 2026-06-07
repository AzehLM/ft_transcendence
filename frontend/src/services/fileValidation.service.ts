import { fileTypeFromBuffer } from 'file-type';
import MIME_TYPES_RAW from '../config/mime.types?raw';
import { fileSchema } from '../schemas/file.schema';
import { UPLOAD_CONFIG } from '../config/uploadConfig';

const parseMimeTypes = (raw: string): Record<string, string[]> => {
    const types: Record<string, string[]> = {};
    const contentMatch = raw.match(/types\s*\{([\s\S]*?)\}/);
    if (!contentMatch) return types;

    const lines = contentMatch[1].split(';');
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            const mime = parts[0];
            const extensions = parts.slice(1);
            types[mime] = extensions;
        }
    });
    return types;
};

export const ALLOWED_MIME_TYPES = parseMimeTypes(MIME_TYPES_RAW);

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}


export async function validateFile(file: File): Promise<ValidationResult>  {

    const result = fileSchema.safeParse({ file });
    if (!result.success) {
        return {
            isValid: false,
            error: result.error.issues[0].message
        };
    }

    try {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';

        let expectedMime: string | null = null;
        for (const [mime, extensions] of Object.entries(ALLOWED_MIME_TYPES)) {
            if (extensions.includes(extension)) {
                expectedMime = mime;
                break;
            }
        }

        if (!expectedMime) {
            return { isValid: true };
        }

        const buffer = await file.slice(0, 4100).arrayBuffer();
        const typeInfo = await fileTypeFromBuffer(new Uint8Array(buffer));
        const detectedMime = typeInfo ? typeInfo.mime : expectedMime;

        if (detectedMime !== expectedMime) {
            return {
                isValid: false,
                error: `The .${extension} extension does not match the file content (${detectedMime}).`
            };
        }

    } catch {
        return {
            isValid: false,
            error: "Error while analyzing the file content."
        };
    }

    return { isValid: true };
}

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getDecryptedSize = (encryptedSize: number): number => {
    if (encryptedSize <= 0) return 0;
    const chunkSize = UPLOAD_CONFIG.CHUNK_SIZE;
    const cipherChunkSize = chunkSize + 16;
    const numChunks = Math.ceil(encryptedSize / cipherChunkSize);
    return encryptedSize - numChunks * 16;
};

export const getFileTypeLabel = (mimeType: string): string => {
    const typeMap: Record<string, string> = {
        'image/jpeg': 'JPEG Image',
        'image/png': 'PNG Image',
        'image/gif': 'GIF Image',
        'image/webp': 'WebP Image',
        'image/bmp': 'BMP Image',
        'image/svg+xml': 'SVG Image',
        'video/mp4': 'MP4 Video',
        'video/webm': 'WebM Video',
        'video/mpeg': 'MPEG Video',
        'video/quicktime': 'QuickTime Video',
        'video/x-msvideo': 'AVI Video',
        'application/pdf': 'PDF Document',
        'application/rtf': 'RTF Document',
        'text/plain': 'Text File',
        'text/html': 'HTML File',
        'text/css': 'CSS File',
        'application/javascript': 'JavaScript File',
        'text/csv': 'CSV File',
        'application/msword': 'Word Document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
        'application/vnd.ms-excel': 'Excel Spreadsheet',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
        'application/vnd.ms-powerpoint': 'PowerPoint Presentation',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation',
        'application/zip': 'ZIP Archive',
        'application/x-rar-compressed': 'RAR Archive',
        'application/x-7z-compressed': '7z Archive',
        'application/json': 'JSON File',
        'audio/mpeg': 'MP3 Audio',
        'audio/ogg': 'OGG Audio',
        'audio/flac': 'FLAC Audio',
        'audio/wav': 'WAV Audio',
    };

    return typeMap[mimeType] || mimeType || 'File';
};

export const getAcceptAttribute = (): string | undefined => {
    return undefined;
};
