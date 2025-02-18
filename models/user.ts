import { z } from "zod";
import { ObjectId } from "mongodb";

export const UserSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),
	username: z.string().min(3).max(32),
	email: z.string().email(),
	password: z.string().min(8),
	created_at: z.date(),
	updated_at: z.date(),
	last_login: z.date().optional(),
});

export type User = z.infer<typeof UserSchema>;
