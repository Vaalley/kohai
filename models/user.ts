import * as v from '@valibot/valibot';
import { ObjectId } from 'mongodb';

export const UserSchema = v.object({
	_id: v.optional(v.instance(ObjectId)),
	username: v.pipe(v.string(), v.minLength(3), v.maxLength(32)),
	email: v.pipe(v.string(), v.email()),
	password: v.pipe(v.string(), v.minLength(8)),
	isadmin: v.optional(v.boolean(), false),
	created_at: v.date(),
	updated_at: v.date(),
	last_login: v.optional(v.date()),
});

export type User = v.InferOutput<typeof UserSchema>;
