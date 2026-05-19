// Constantes pour l'upload E2EE
export const UPLOAD_CONFIG = {
    CHUNK_SIZE: 5 * 1024 * 1024, // 5 MB
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2 GB
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
};
