import { Context, Next } from "hono";
import { getEnv } from "../../config/config.ts";

// API key auth middleware
export function apiKeyAuth() {
	return async (c: Context, next: Next) => {
		const apiKey = c.req.header("x-api-key");

		if (apiKey !== getEnv("API_KEY")) {
			return c.json({ error: "Invalid API key" }, 401);
		}

		await next();
	};
}
