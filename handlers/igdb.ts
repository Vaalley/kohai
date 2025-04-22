import { Context } from "hono";
import { getEnv } from "../config/config.ts";
import { logger } from "../utils/logger.ts";

const BASE_URL = "https://api.igdb.com/v4";

export async function search(c: Context) {
	const { query } = await c.req.query();

	logger.info("🔍 IGDB search query: " + query);

	const response = await fetch(`${BASE_URL}/games`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Client-ID": getEnv("IGDB_CLIENT_ID"),
			"Authorization": `Bearer ${getEnv("IGDB_ACCESS_TOKEN")}`,
		},
		body: JSON.stringify({
			search,
		}),
	});

	if (!response.ok) {
		return c.json({
			success: false,
			message: "Failed to search",
		});
	}

	const data = await response.json();

	return c.json({
		success: true,
		message: "search results",
		data,
	});
}
