// Magic numbers (file signatures)
const MAGIC_NUMBERS: { [key: string]: Uint8Array | null } = {
    // Images
    'image/jpeg': new Uint8Array([0xFF, 0xD8, 0xFF]),
    'image/png': new Uint8Array([0x89, 0x50, 0x4E, 0x47]),
    'image/gif': new Uint8Array([0x47, 0x49, 0x46]),
    'image/webp': new Uint8Array([0x52, 0x49, 0x46, 0x46]),
    'image/bmp': new Uint8Array([0x42, 0x4D]),

    // Videos
    'video/mp4': new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
    'video/webm': new Uint8Array([0x1A, 0x45, 0xDF, 0xA3]),
    'video/mpeg': new Uint8Array([0x00, 0x00, 0x01, 0xB3]),
    'video/quicktime': new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),

    // Archives
    'application/zip': new Uint8Array([0x50, 0x4B, 0x03, 0x04]),
    'application/x-rar-compressed': new Uint8Array([0x52, 0x61, 0x72, 0x21]),
    'application/x-7z-compressed': new Uint8Array([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]),

    // Documents
    'application/pdf': new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    'text/plain': null, // No specific magic number
    'text/csv': null, // No specific magic number

    // Microsoft Office
    'application/msword': new Uint8Array([0xD0, 0xCF, 0x11, 0xE0]),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': new Uint8Array([0x50, 0x4B, 0x03, 0x04]),
    'application/vnd.ms-excel': new Uint8Array([0xD0, 0xCF, 0x11, 0xE0]),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': new Uint8Array([0x50, 0x4B, 0x03, 0x04]),
    'application/vnd.ms-powerpoint': new Uint8Array([0xD0, 0xCF, 0x11, 0xE0]),
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': new Uint8Array([0x50, 0x4B, 0x03, 0x04]),

    // JSON
    'application/json': null, // No specific magic number
};

export interface FileValidationResult {
    valid: boolean;
    error?: string;
}

export class FileValidationService {
    static async validateMagicNumber(file: File): Promise<FileValidationResult> {
        const mimeType = file.type;

        if (!mimeType) {
            return {
                valid: false,
                error: 'Type MIME du fichier non détecté. Impossible de valider le fichier.'
            };
        }

        const magicNumber = MAGIC_NUMBERS[mimeType];

        if (magicNumber === undefined) {
            return {
                valid: false,
                error: `Type de fichier non autorisé: ${mimeType}`
            };
        }

        if (magicNumber === null) {
            return { valid: true };
        }

        const buffer = await file.slice(0, magicNumber.length).arrayBuffer();
        const fileSignature = new Uint8Array(buffer);

        const isValid = fileSignature.every((byte, index) => byte === magicNumber[index]);

        if (!isValid) {
            return {
                valid: false,
                error: `Signature du fichier invalide. Le fichier peut être corrompu ou du mauvais type.`
            };
        }

        return { valid: true };
    }

    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    static getFileTypeLabel(mimeType: string): string {
        const typeMap: { [key: string]: string } = {
            'image/jpeg': 'Image JPEG',
            'image/png': 'Image PNG',
            'image/gif': 'Image GIF',
            'image/webp': 'Image WebP',
            'image/bmp': 'Image BMP',
            'video/mp4': 'Vidéo MP4',
            'video/webm': 'Vidéo WebM',
            'video/mpeg': 'Vidéo MPEG',
            'video/quicktime': 'Vidéo QuickTime',
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

        return typeMap[mimeType] || mimeType;
    }
}
