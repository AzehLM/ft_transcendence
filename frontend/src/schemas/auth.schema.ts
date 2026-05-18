import { z } from "zod";

// reused when changing password in settings page
const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters");

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
	password: passwordSchema,
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
		message: "New password must be different from current password",
		path: ["newPassword"]
	});


// need to infer schemas to be source of true
// infering means zod deducts the type of the data from the schema
export type RegisterFormData = z.infer<typeof registerSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
