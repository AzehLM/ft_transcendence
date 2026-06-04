import { fileTypeFromBuffer } from 'file-type';
import { UPLOAD_CONFIG } from '../config/uploadConfig';
import MIME_TYPES_RAW from '../config/mime.types?raw';


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


export const validateFile = async (file: File): Promise<ValidationResult> => {
    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
        return {
            isValid: false,
            error:`ERROR_VALIDATION_SIZE`
        };
    }

    try {
        const buffer = await file.slice(0, 4100).arrayBuffer();
        const typeInfo = await fileTypeFromBuffer(new Uint8Array(buffer));

        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        let detectedMime = typeInfo?.mime || file.type;

        if (!typeInfo) {
            if (['txt', 'md', 'go', 'css', 'tsx', 'ts', 'js', 'html', 'sh', 'yaml', 'yml', 'cpp', 'c', 'h'].includes(extension)) {
                detectedMime = 'text/plain';
            } else if (extension === 'rtf') {
                detectedMime = 'application/rtf';
            } else if (extension === 'json') {
                detectedMime = 'application/json';
            }
        }

        if (!detectedMime || !Object.keys(ALLOWED_MIME_TYPES).includes(detectedMime)) {
            return {
                isValid: false,
                error: `Unauthorized or corrupted file type: ${detectedMime || 'Unknown'}`
            };
        }

        const validExtensions = ALLOWED_MIME_TYPES[detectedMime] || [];

        if (extension && !validExtensions.includes(extension)) {
             return {
                isValid: false,
                error: `The .${extension} extension does not match the file content (${detectedMime}).`
            };
        }

    } catch (err) {
        return {
            isValid: false,
            error: "Error while analyzing the file content."
        };
    }

    return { isValid: true };
};

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileTypeLabel = (mimeType: string): string => {
    const typeMap: Record<string, string> = {
        'image/jpeg': ' JPEG Image',
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
        'text/csv': 'CSV File',
        'application/msword': 'Word Document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
        'application/vnd.ms-excel': 'Excel Folder',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Folder',
        'application/vnd.ms-powerpoint': 'PowerPoint Presentation',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation',
        'application/zip': 'ZIP Archive',
        'application/x-rar-compressed': 'RAR Archive',
        'application/x-7z-compressed': '7z Archive',
        'application/json': 'JSON File',
    };

    return typeMap[mimeType] || mimeType || 'File';
};

export const getAcceptAttribute = (): string => {
    return Object.values(ALLOWED_MIME_TYPES).flat().map(ext => `.${ext}`).join(',');
};
