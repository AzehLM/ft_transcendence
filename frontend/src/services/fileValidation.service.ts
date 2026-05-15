import { fileTypeFromBlob } from 'file-type';
import { MimeTypesLoader } from '../config/mimeTypesLoader';

export interface FileValidationResult {
    valid: boolean;
    error?: string;
}

export class FileValidationService {
    static async validateMagicNumber(file: File): Promise<FileValidationResult> {
        await MimeTypesLoader.load();
        const mimeType = file.type;

        if (!mimeType) {
            return {
                valid: false,
                error: 'Type MIME du fichier non détecté. Impossible de valider le fichier.'
            };
        }

        const allowedMimes = MimeTypesLoader.getAllowedMimes();
        if (!allowedMimes.includes(mimeType)) {
             return {
                valid: false,
                error: `Type de fichier non autorisé: ${mimeType}`
            };
        }

        if (!MimeTypesLoader.isValid(mimeType, file.name)) {
            return {
                valid: false,
                error: `L'extension du fichier ne correspond pas à son type MIME déclaré (${mimeType}).`
            };
        }

        if (['text/plain', 'text/csv', 'application/json', 'image/svg+xml'].includes(mimeType)) {
            return { valid: true };
        }

        try {
            const typeInfo = await fileTypeFromBlob(file);

            if (!typeInfo) {
                return {
                    valid: false,
                    error: `Signature du fichier non reconnue ou format non supporté.`
                };
            }

            if (typeInfo.mime !== mimeType && !this.isCompatibleMime(mimeType, typeInfo.mime)) {
                 return {
                    valid: false,
                    error: `La signature réelle du fichier (${typeInfo.mime}) ne correspond pas au type déclaré (${mimeType}).`
                };
            }

            return { valid: true };
        } catch (e) {
            return {
                valid: false,
                error: `Erreur lors de la lecture de la signature du fichier.`
            };
        }
    }

    private static isCompatibleMime(expected: string, actual: string): boolean {
        if (expected.includes('vnd.openxmlformats-officedocument') && actual === 'application/zip') return true;
        if (expected === 'application/msword' && actual === 'application/x-cfb') return true;
        if (expected.includes('vnd.ms-excel') && actual === 'application/x-cfb') return true;
        if (expected.includes('vnd.ms-powerpoint') && actual === 'application/x-cfb') return true;
        if (expected === 'video/quicktime' && actual === 'video/mp4') return true;
        return false;
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

        return typeMap[mimeType] || mimeType;
    }
}
