import { fileTypeFromBlob } from 'file-type';


export interface FileValidationResult {
    valid: boolean;
    error?: string;
}


interface MimeInfo {
    mime: string;
    extensions: string[];
    label: string;
}


const ALLOWED_MIMES_CONFIG: MimeInfo[] = [
    // Images
    { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], label: 'Image JPEG' },
    { mime: 'image/png', extensions: ['png'], label: 'Image PNG' },
    { mime: 'image/gif', extensions: ['gif'], label: 'Image GIF' },
    { mime: 'image/webp', extensions: ['webp'], label: 'Image WebP' },
    { mime: 'image/bmp', extensions: ['bmp'], label: 'Image BMP' },
    { mime: 'image/svg+xml', extensions: ['svg'], label: 'Image SVG' },

    // Vidéos
    { mime: 'video/mp4', extensions: ['mp4'], label: 'Vidéo MP4' },
    { mime: 'video/webm', extensions: ['webm'], label: 'Vidéo WebM' },
    { mime: 'video/mpeg', extensions: ['mpeg', 'mpg'], label: 'Vidéo MPEG' },
    { mime: 'video/quicktime', extensions: ['mov'], label: 'Vidéo QuickTime' },
    { mime: 'video/x-msvideo', extensions: ['avi'], label: 'Vidéo AVI' },

    // Documents
    { mime: 'application/pdf', extensions: ['pdf'], label: 'Document PDF' },
    { mime: 'text/plain', extensions: ['txt'], label: 'Fichier texte' },
    { mime: 'text/csv', extensions: ['csv'], label: 'Fichier CSV' },
    { mime: 'application/json', extensions: ['json'], label: 'Fichier JSON' },

    // MS Office
    { mime: 'application/msword', extensions: ['doc'], label: 'Document Word' },
    { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['docx'], label: 'Document Word' },
    { mime: 'application/vnd.ms-excel', extensions: ['xls'], label: 'Classeur Excel' },
    { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extensions: ['xlsx'], label: 'Classeur Excel' },
    { mime: 'application/vnd.ms-powerpoint', extensions: ['ppt'], label: 'Présentation PowerPoint' },
    { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extensions: ['pptx'], label: 'Présentation PowerPoint' },

    // Archives
    { mime: 'application/zip', extensions: ['zip'], label: 'Archive ZIP' },
    { mime: 'application/x-rar-compressed', extensions: ['rar'], label: 'Archive RAR' },
    { mime: 'application/x-7z-compressed', extensions: ['7z'], label: 'Archive 7z' },
];


export class FileValidationService {
    private static mimeInfoMap = new Map<string, MimeInfo>(
        ALLOWED_MIMES_CONFIG.map(info => [info.mime, info])
    );


    static async validateFile(file: File): Promise<FileValidationResult> {
        const declaredMime = file.type;
        const filename = file.name.toLowerCase();
        const extension = filename.split('.').pop() || '';

        const allowedInfo = this.mimeInfoMap.get(declaredMime);
        if (!allowedInfo) {
            return {
                valid: false,
                error: `Type de fichier non autorisé : ${declaredMime || 'inconnu'}`
            };
        }

        if (!allowedInfo.extensions.includes(extension)) {
            return {
                valid: false,
                error: `L'extension .${extension} ne correspond pas au type de fichier déclaré (${declaredMime}).`
            };
        }

        const skipMagicNumbers = ['text/plain', 'text/csv', 'application/json', 'image/svg+xml'];
        if (!skipMagicNumbers.includes(declaredMime)) {
            try {
                const realType = await fileTypeFromBlob(file);

                if (!realType) {

                    return { valid: true };
                }

                if (realType.mime !== declaredMime) {
                    return {
                        valid: false,
                        error: `Sécurité : Le contenu réel du fichier (${realType.mime}) ne correspond pas à ce qui est annoncé (${declaredMime}).`
                    };
                }
            } catch (err) {
                return { valid: false, error: "Impossible d'analyser la signature technique du fichier." };
            }
        }

        return { valid: true };
    }

    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getFileTypeLabel(mimeType: string): string {
        return this.mimeInfoMap.get(mimeType)?.label || mimeType;
    }

    static getAllowedMimeTypes(): string[] {
        return Array.from(this.mimeInfoMap.keys());
    }
}
