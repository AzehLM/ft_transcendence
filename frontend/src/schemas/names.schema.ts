import { z } from "zod";

export const firstNameSchema = z.object({
	firstName: z
		.string()
		.trim()
		.max(255, "First name is limited to 255 characters")
		.regex(/^[^<>&"{}|\\^`]+$/, "First name contains invalid characters"),
})

export const familyNameSchema = z.object({
	familyName: z
		.string()
		.trim()
		.max(255, "Family name is limited to 255 characters")
		.regex(/^[^<>&"{}|\\^`]+$/, "Family name contains invalid characters"),
});

export type FirstNameFormSchema = z.infer<typeof firstNameSchema>;
export type FamilyNameFormSchema = z.infer<typeof familyNameSchema>;
