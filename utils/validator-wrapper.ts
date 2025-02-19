import { ZodSchema } from "zod";
import type { ValidationTargets } from "hono";
import { zValidator as zv } from "@hono/zod-validator";

/**
 * A wrapper around `@hono/zod-validator` that returns a 400 JSON response
 * with a `success` property set to `false` and a `cause` property set to the
 * Zod error when the validation fails.
 *
 * @param target The target of the validation (e.g. "json", "form", etc.)
 * @param schema The Zod schema to validate against
 * @returns A Hono middleware that validates the request against the schema
 */
export const zValidator = <
	T extends ZodSchema,
	Target extends keyof ValidationTargets,
>(
	target: Target,
	schema: T,
) => zv(target, schema, (result, c) => {
	if (!result.success) {
		return c.json({ success: false, cause: result.error });
	}
});
