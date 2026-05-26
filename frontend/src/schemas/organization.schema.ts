import { z } from "zod";

export const organizationSchema = z.object({
	name: z
		.string().trim()
		.min(1, "Organization name cannot be empty")
		.max(100, "Organization name is too long")
		.regex(/^[^<>]+$/, "Name contains invalid characters"),
})

export const organizationDescriptionSchema = z.object({
	description: z
		.string()
		.trim()
		.max(255, "Description is limited to 255 characters"),
});

export type OrganizationFormSchema = z.infer<typeof organizationSchema>;
export type OrganizationDescriptionFormSchema = z.infer<typeof organizationDescriptionSchema>
