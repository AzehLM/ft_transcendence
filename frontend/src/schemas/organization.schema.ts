import { z } from "zod";

export const organizationSchema = z.object({
	name: z
		.string().trim()
		.min(1, "Organization name cannot be empty")
		.max(100, "Organization name is too long")
})

export type OrganizationFormSchema = z.infer<typeof organizationSchema>;
