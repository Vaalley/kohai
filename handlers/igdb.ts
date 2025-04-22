import { Context } from "hono";
import { getEnv } from "../config/config.ts";
import { logger } from "../utils/logger.ts";

const BASE_URL = "https://api.igdb.com/v4";
const DEFAULT_FIELDS = "fields name,summary,genres.name,platforms.name,first_release_date,slug";

export async function search(c: Context) {
	// Get query from request body (raw text)
	let bodyQuery = "";
	try {
		bodyQuery = await c.req.text();
	} catch (_error) {
		logger.warn("Failed to read request body");
	}

	// Build the IGDB query
	let igdbQuery = bodyQuery;

	// Ensure we have fields if none specified
	if (igdbQuery && !igdbQuery.includes("fields")) {
		igdbQuery = `${DEFAULT_FIELDS}; ${igdbQuery}`;
	}

	// Default query if nothing provided
	if (!igdbQuery) {
		return c.json({ success: false, message: "No query provided" });
	}

	// Make request to IGDB API
	const response = await fetch(`${BASE_URL}/games`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Client-ID": getEnv("IGDB_CLIENT_ID"),
			"Authorization": `Bearer ${getEnv("IGDB_ACCESS_TOKEN")}`,
		},
		body: igdbQuery,
	});

	// Handle errors
	if (!response.ok) {
		const errorText = await response.text();
		logger.error(`IGDB API error: ${response.status} ${errorText}`);
		return c.json({ success: false, message: "Failed to search", error: errorText });
	}

	// Return results
	const data = await response.json();
	return c.json({ success: true, data });
}
