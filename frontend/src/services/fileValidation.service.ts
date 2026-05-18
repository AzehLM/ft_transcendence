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

        let detectedMime = typeInfo?.mime || file.type;

        if (!typeInfo && file.name.endsWith('.txt')) {
            detectedMime = 'text/plain';
        }

        if (!detectedMime || !Object.keys(ALLOWED_MIME_TYPES).includes(detectedMime)) {
            return {
                isValid: false,
                error: `Type de fichier non autorisé ou corrompu : ${detectedMime || 'Inconnu'}`
            };
        }

        const extension = file.name.split('.').pop()?.toLowerCase();
        const validExtensions = ALLOWED_MIME_TYPES[detectedMime] || [];

        if (extension && !validExtensions.includes(extension)) {
             return {
                isValid: false,
                error: `L'extension .${extension} ne correspond pas au contenu du fichier (${detectedMime}).`
            };
        }

    } catch (err) {
        return {
            isValid: false,
            error: "Erreur lors de l'analyse du contenu du fichier."
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
        'image/jpeg': 'Image JPEG',
        'image/png': 'Image PNG',
        'image/gif': 'Image GIF',
        'image/webp': 'Image WebP',
        'image/bmp': 'Image BMP',
        'image/svg+xml': 'Image SVG',
        'video/mp4': 'Vidéo MP4',
        'video/webm': 'Vidéo WebM',
        'video/mpeg': 'Vidéo MPEG',
        'video/quicktime': 'Vidéo QuickTime',
        'video/x-msvideo': 'Vidéo AVI',
        'application/pdf': 'Document PDF',
        'text/plain': 'Fichier texte',
        'text/csv': 'Fichier CSV',
        'application/msword': 'Document Word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Document Word',
        'application/vnd.ms-excel': 'Classeur Excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Classeur Excel',
        'application/vnd.ms-powerpoint': 'Présentation PowerPoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'Présentation PowerPoint',
        'application/zip': 'Archive ZIP',
        'application/x-rar-compressed': 'Archive RAR',
        'application/x-7z-compressed': 'Archive 7z',
        'application/json': 'Fichier JSON',
    };

    return typeMap[mimeType] || mimeType || 'Fichier';
};

export const getAcceptAttribute = (): string => {
    return Object.values(ALLOWED_MIME_TYPES).flat().map(ext => `.${ext}`).join(',');
};
