import { Context } from 'hono';
import { getEnv } from '@config/config.ts';
import { logger } from '@utils/logger.ts';

const BASE_URL = 'https://api.igdb.com/v4';
const DEFAULT_FIELDS = 'fields name,summary,genres.name,platforms.name,first_release_date,slug';

// LRU-style cache for search results
const searchCache = new Map<string, { data: unknown; time: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache lifetime
const MAX_SEARCH_CACHE_SIZE = 30;

/**
 * Handles IGDB search requests.
 *
 * Accepts a JSON body containing an IGDB query string. The query does not have to include
 * the "fields" parameter, as it is added automatically if not provided with default fields.
 * The query is then sent to the IGDB API and the response is cached for 5 minutes.
 *
 * @param c - The Hono context object.
 * @returns A JSON response with search results or error message.
 */
export async function search(c: Context) {
	// Get and process query
	let bodyQuery = '';
	try {
		bodyQuery = await c.req.text();
	} catch (e) {
		logger.warn('Failed to read request body', e);
	}

	// Return early if no query
	if (!bodyQuery.trim()) {
		return c.json({ success: false, message: 'No query provided' });
	}

	// Add default fields if needed and create cache key
	const igdbQuery = !bodyQuery.includes('fields') ? `${DEFAULT_FIELDS}; ${bodyQuery}` : bodyQuery;
	const cacheKey = igdbQuery.trim();

	// Check cache
	const cached = searchCache.get(cacheKey);
	if (cached && (Date.now() - cached.time < CACHE_TTL)) {
		return c.json({ success: true, data: cached.data });
	}

	// Make request to IGDB API
	try {
		const response = await fetch(`${BASE_URL}/games`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Client-ID': getEnv('IGDB_CLIENT_ID'),
				'Authorization': `Bearer ${getEnv('IGDB_ACCESS_TOKEN')}`,
			},
			body: igdbQuery,
		});

		// Handle API errors
		if (!response.ok) {
			const errorText = await response.text();
			logger.error(`IGDB API error: ${response.status} ${errorText}`);
			return c.json({ success: false, message: 'Failed to search', error: errorText });
		}

		// Process successful response
		const data = await response.json();

		// Manage cache (remove oldest entry if at capacity)
		if (searchCache.size >= MAX_SEARCH_CACHE_SIZE) {
			searchCache.delete([...searchCache.keys()][0]);
		}
		searchCache.set(cacheKey, { data, time: Date.now() });

		return c.json({ success: true, data });
	} catch (e) {
		logger.error('IGDB request failed', e);
		return c.json({ success: false, message: 'Failed to search' });
	}
}
