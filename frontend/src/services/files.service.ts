import { fetchWithRefresh } from './api.service';

const API_BASE_URL = "/api";

// Types
export interface FileItem {
    id: string;
    name: string;
    file_size: number;
    created_at: string;
    folder_id?: string;
}

export interface FolderItem {
    id: string;
    name: string;
    created_at: string;
    parent_id?: string;
}

export interface FolderContents {
    folders: FolderItem[];
    files: FileItem[];
}

export interface UploadUrlResponse {
    presigned_url: string;
    object_id: string;
}

export interface DownloadResponse {
    presigned_url: string;
    encrypted_dek: string;
    iv: string;
    encrypted_filename: string;
}

export interface FileMetadata {
    object_id: string;
    encrypted_filename: string;
    encrypted_dek: string;
    iv: string;
    org_id?: string;
}

export interface Folder {
    id: string;
    name: string;
}

export type Path = Folder[];

// Helper function to make authenticated requests
async function authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    const response = await fetchWithRefresh(`${API_BASE_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
        let errorMsg = `API Error: ${response.status}`;
        let errorCode = response.status;
        // if (response.status === 400 || response.status === 404)
        //     throw new Error("not found");
        try {
            const error = await response.json();
            errorMsg = error.error || error.message || errorMsg;
        } catch (e) {
        }
        // throw new Error(errorMsg);
        const err = new Error(errorMsg);
        (err as any).status = errorCode; // not a good solution to use any but I don't have another one yet
        throw err;
    }

    if (response.status === 204) {
        return undefined as unknown as T;
    }

    return response.json();
}

// Files Service API
export const FilesService = {
    // Get all files in personal space (root)
    getAllFiles: async (): Promise<FolderContents> => {
        return authenticatedRequest<FolderContents>("/folders");
    },

    // Get files in a specific folder
    getFolderContents: async (folderId: string): Promise<FolderContents> => {
        return authenticatedRequest<FolderContents>(`/folders/${folderId}/contents`);
    },

    // Create a new folder
    createFolder: async (
        name: string,
        parentId?: string,
        orgId?: string
    ): Promise<FolderItem> => {
        const body: any = { name };
        if (parentId) body.parent_id = parentId;
        if (orgId) body.org_id = orgId;

        return authenticatedRequest<FolderItem>("/folders", {
            method: "POST",
            body: JSON.stringify(body),
        });
    },

    // Rename or move a folder
    updateFolder: async (
        folderId: string,
        updates: { name?: string; parent_id?: string | null }
    ): Promise<void> => {
        await authenticatedRequest<void>(`/folders/${folderId}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
        });
    },

    // Delete a folder (must be empty)
    deleteFolder: async (folderId: string): Promise<void> => {
        await authenticatedRequest<void>(`/folders/${folderId}`, {
            method: "DELETE",
        });
    },

    // Request presigned URL for file upload
    getUploadUrl: async (
        fileSize: number,
        folderId?: string,
        orgId?: string
    ): Promise<UploadUrlResponse> => {
        const body: any = { file_size: fileSize };
        if (folderId) body.folder_id = folderId;
        if (orgId) body.org_id = orgId;

        return authenticatedRequest<UploadUrlResponse>("/files/upload-url", {
            method: "POST",
            body: JSON.stringify(body),
        });
    },

    // Finalize file upload (save metadata to DB)
    finalizeUpload: async (metadata: FileMetadata): Promise<FileItem> => {
        return authenticatedRequest<FileItem>("/files/finalize", {
            method: "POST",
            body: JSON.stringify(metadata),
        });
    },

    // Get file download URL and crypto info
    getDownloadUrl: async (fileId: string): Promise<DownloadResponse> => {
        return authenticatedRequest<DownloadResponse>(
            `/files/${fileId}/download`
        );
    },

    // Move file to a different folder
    moveFile: async (fileId: string, folderId: string | null): Promise<void> => {
        await authenticatedRequest<void>(`/files/${fileId}`, {
            method: "PATCH",
            body: JSON.stringify({ folder_id: folderId }),
        });
    },

    // Delete file
    deleteFile: async (fileId: string): Promise<void> => {
        await authenticatedRequest<void>(`/files/${fileId}`, {
            method: "DELETE",
        });
    },

    // Get Folder Path
    getFolderPath: async (folderId: string): Promise<Path> => {
        return authenticatedRequest<Path>(
            `/folders/${folderId}/path`
        );
    },

    // Get Orga Files and Folders
    getOrgaFilesFolders: async (folderId: string, ordId: string): Promise<FolderContents> => {
        return authenticatedRequest<FolderContents>(
            `/storage/${ordId}/folders/${folderId}/contents`
        );
    },
};