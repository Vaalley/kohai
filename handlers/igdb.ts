import { Context } from "hono";

export function search(c: Context) {
	return c.json({
		success: true,
		message: "search results",
	});
}
