import { z } from "zod";

export const folderSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Folder name cannot be empty")
		.max(100, "Folder name is too long")
		.regex(/^[^/\\<>:"|?*\x00-\x1F]+$/, "Name contains invalid characters"),
});

export type FolderFormData = z.infer<typeof folderSchema>;
