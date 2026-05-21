// Constantes pour l'upload E2EE
export const UPLOAD_CONFIG = {
    CHUNK_SIZE: 32 * 1024 * 1024, // 32 MB plaintext per chunk (multipart)
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2 GB
    MULTIPART_THRESHOLD: 96 * 1024 * 1024, // files below 96 MB will be managed as a single chunk (first implementation, no chunking)
    MAX_PART_COUNT: 100, // maximum number of chunks accepted, even if it's above 2 GB
    PARALLEL_UPLOADS: 4,
};

export const UPLOAD_MESSAGES = {
    INITIALIZING: (filename: string) => `Initialisation du chiffrement de "${filename}"...`,
    REQUESTING_AUTH: 'Demande d\'autorisation de serveur...',
    ENCRYPTING: 'Chiffrement et envoi des chunks...',
    UPLOADING: 'Envoi du fichier chiffré...',
    FINALIZING: 'Sauvegarde des métadonnées...',
    SUCCESS: (filename: string) => `${filename} a été chiffré et uploadé avec succès.`,

    ERROR_VALIDATION_SIZE: (max: string, current: string) =>
        `Fichier trop volumineux. Taille max: ${max}, votre fichier: ${current}`,
    ERROR_PUBLIC_KEY: 'Clé publique introuvable. Assurez-vous d\'être connecté.',
    ERROR_SERVER_AUTH: 'Impossible de préparer l\'upload sur le serveur.',
    ERROR_STORAGE_REJECTED: 'Le fichier chiffré a été rejeté par le stockage.',
    ERROR_FINALIZE_FAILED: 'Le serveur n\'a pas pu finaliser l\'upload.',
    ERROR_PART_FAILED: 'Une partie de l\'upload a échoué.',
};
