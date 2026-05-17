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
            error: `Fichier trop volumineux (${formatFileSize(file.size)}). Maximum autorisé: ${formatFileSize(UPLOAD_CONFIG.MAX_FILE_SIZE)}`
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

export const getAcceptAttribute = (): string => {
    return Object.values(ALLOWED_MIME_TYPES).flat().map(ext => `.${ext}`).join(',');
};
