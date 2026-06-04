export const UPLOAD_CONFIG = {
    CHUNK_SIZE: 32 * 1024 * 1024, // 32 MB plaintext per chunk (multipart)
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2 GB
    MULTIPART_THRESHOLD: 96 * 1024 * 1024, // files below 96 MB will be managed as a single chunk (first implementation, no chunking)
    MAX_PART_COUNT: 100, // maximum number of chunks accepted, even if it's above 2 GB
    PARALLEL_UPLOADS: 4,
};

export const UPLOAD_MESSAGES = {
    INITIALIZING: (filename: string) => `Initializing encryption for "${filename}"...`,
    REQUESTING_AUTH: 'Requesting server authorization...',
    ENCRYPTING: 'Encrypting and uploading chunks...',
    UPLOADING: 'Uploading encrypted file...',
    FINALIZING: 'Saving metadata...',
    SUCCESS: (filename: string) => `${filename} has been successfully encrypted and uploaded.`,

    ERROR_VALIDATION_SIZE: (max: string, current: string) =>
        `File too large. Max size: ${max}, your file: ${current}`,
    ERROR_PUBLIC_KEY: 'Public key not found. Please ensure you are logged in.',
    ERROR_SERVER_AUTH: 'Failed to prepare upload on the server.',
    ERROR_STORAGE_REJECTED: 'The encrypted file was rejected by storage.',
    ERROR_FINALIZE_FAILED: 'The server could not finalize the upload.',
    ERROR_PART_FAILED: 'A part of the upload failed.',
};
