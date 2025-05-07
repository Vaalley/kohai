import * as v from '@valibot/valibot';

export const LoginSchema = v.object({
	email: v.pipe(v.string(), v.email()),
	password: v.pipe(v.string(), v.minLength(8)),
});

export const RegisterSchema = v.object({
	username: v.pipe(v.string(), v.minLength(3), v.maxLength(32)),
	email: v.pipe(v.string(), v.email()),
	password: v.pipe(v.string(), v.minLength(8)),
});
