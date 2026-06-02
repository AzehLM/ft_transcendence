import { z } from "zod";

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GiB

const FILE_NAME_REGEX = /^[^/\\<>:"|?*\x00-\x1F]+$/;

// No mime.types validation here as it is done somewhere else
export const fileSchema = z.object({
	file: z
		.instanceof(File)
		.refine((file) => file.size > 0, "File cannot be empty")
		.refine((file) => file.size <= MAX_FILE_SIZE, "File cannot exceed 2 GB")
		.refine((file) => file.name.length >= 1, "File name cannot be empty")
		.refine((file) => file.name.length <= 100, "File name must be less than 100 characters")
		.refine((file) => FILE_NAME_REGEX.test(file.name), "File name contains invalid characters")
		.refine((file) => file.name !== "." && file.name !== "..", "Invalid file name")
});

export type FileFormData = z.infer<typeof fileSchema>
