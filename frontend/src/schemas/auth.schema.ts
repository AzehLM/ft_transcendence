import { z } from "zod";

const SPECIAL_CHARS_REGEX = /[^a-zA-Z0-9]/;
const SPECIAL_CHARS_EXAMPLES = `!@#$%^&*+-_=?.,;:'"/\\()[]{}|~\``;

// reused when changing password in settings page
const passwordSchema = z
	.string()
	.min(8, { message: "Password must be at least 8 characters" })
	.max(128, { message: "Password must be less than 128 characters" })
	.refine((password) => /[A-Z]/.test(password), {
		message: "Password must contain at least one uppercase letter",
	})
	.refine((password) => /[a-z]/.test(password), {
		message: "Password must contain at least one lowercase letter",
	})
	.refine((password) => /[0-9]/.test(password), { message: "Password must contain at least one number" })
	.refine((password) => SPECIAL_CHARS_REGEX.test(password), {
		message: `Password must contain at least one special character (e.g. ${SPECIAL_CHARS_EXAMPLES})`,
});

export const registerSchema = z
	.object({
		email: z.email("Please enter a valid email"),
		password: passwordSchema,
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export const loginSchema = z.object({
	email: z.email("Please enter a valid email"),
	password: z.string().min(1, { message: "Password is required" }),
});

export const changePasswordSchema = z
	.object({
		current: z.string().min(1, "Current password is required"),
		newPassword: passwordSchema,
		confirmPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})
	.refine((data) => data.current !== data.newPassword, {
		message: "New password must be different from your current password",
		path: ["newPassword"]
});


// need to infer schemas to be source of true
// infering means zod deducts the type of the data from the schema
export type RegisterFormData = z.infer<typeof registerSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
