import { z } from "zod";

export const UserSchema = z.object({
	_id: z.string().optional(),
	username: z.string().min(3).max(32),
	email: z.string().email(),
	password: z.string().min(8),
	created_at: z.date(),
	updated_at: z.date(),
	last_login: z.date().optional(),
});

export type User = z.infer<typeof UserSchema>;
