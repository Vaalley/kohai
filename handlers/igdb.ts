import { Context } from 'hono';
import { getEnv } from '@config/config.ts';
import { logger } from '@utils/logger.ts';

const BASE_URL = 'https://api.igdb.com/v4';
const DEFAULT_FIELDS = 'fields name,summary,genres.name,platforms.name,first_release_date,slug';

const searchCache = new Map<string, { data: unknown; time: number }>();
const CACHE_TTL = 15 * 60 * 1000;
const MAX_SEARCH_CACHE_SIZE = 50;
const gameCache = new Map<string, { data: unknown; time: number }>();
const MAX_GAME_CACHE_SIZE = 50;

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
	let bodyQuery = '';
	try {
		bodyQuery = await c.req.text();
	} catch (error) {
		logger.warn('Failed to read request body', error);
	}

	if (!bodyQuery.trim()) {
		return c.json({ success: false, message: 'No query provided' }, 400);
	}

	const igdbQuery = !bodyQuery.includes('fields') ? `${DEFAULT_FIELDS}; ${bodyQuery}` : bodyQuery;
	const cacheKey = igdbQuery.trim();

	const cached = searchCache.get(cacheKey);
	if (cached && (Date.now() - cached.time < CACHE_TTL)) {
		return c.json({ success: true, data: cached.data });
	}
	try {
		const response = await fetch(`${BASE_URL}/games`, {
			method: 'POST',
			headers: {
				'Content-Type': 'text/plain',
				'Client-ID': getEnv('IGDB_CLIENT_ID'),
				'Authorization': `Bearer ${getEnv('IGDB_ACCESS_TOKEN')}`,
			},
			body: igdbQuery,
		});

		if (!response.ok) {
			const errorText = await response.text();
			logger.error(`IGDB API error: ${response.status} ${errorText}`);
			return c.json({ success: false, message: 'Failed to search', error: errorText }, 502);
		}

		const data = await response.json();

		if (searchCache.size >= MAX_SEARCH_CACHE_SIZE) {
			searchCache.delete([...searchCache.keys()][0]);
		}
		searchCache.set(cacheKey, { data, time: Date.now() });

		return c.json({ success: true, data });
	} catch (error) {
		logger.error('IGDB request failed', error);
		return c.json({ success: false, message: 'Failed to search' }, 502);
	}
}

/**
 * Fetches 8 random games from the top 100 games on IGDB.
 *
 * This function queries the IGDB API for the top 100 games sorted by total_rating_count
 * and returns 8 randomly selected games with their basic information including
 * name, id and cover image.
 *
 * @param c - The Hono context object containing the request and response.
 *
 * @returns A JSON response with 8 random games from the top 100, or an error
 * message if the request fails.
 */
export async function getRandomTopGames(c: Context) {
	try {
		const response = await fetch(`${BASE_URL}/games`, {
			method: 'POST',
			headers: {
				'Content-Type': 'text/plain',
				'Client-ID': getEnv('IGDB_CLIENT_ID'),
				'Authorization': `Bearer ${getEnv('IGDB_ACCESS_TOKEN')}`,
			},
			body:
				`fields id,name,cover.image_id; where total_rating_count != null & total_rating_count > 100; sort total_rating_count desc; limit 100;`,
		});

		if (!response.ok) {
			const errorText = await response.text();
			logger.error(`IGDB API error: ${response.status} ${errorText}`);
			return c.json({ success: false, message: 'Failed to get top games', error: errorText }, 502);
		}

		const topGames = await response.json();

		const shuffled = [...topGames].sort(() => 0.5 - Math.random());
		const randomGames = shuffled.slice(0, 8);

		return c.json({ success: true, data: randomGames });
	} catch (error) {
		logger.error('IGDB request failed', error);
		return c.json({ success: false, message: 'Failed to get top games' }, 502);
	}
}

/**
 * Fetches game details from the IGDB API using the provided slug.
 *
 * This function first checks the cache for the game data associated
 * with the slug. If cached data is found and is still valid, it returns
 * the cached data. Otherwise, it makes a request to the IGDB API to
 * fetch the game details.
 *
 * The fetched data is cached for future requests. If the cache reaches
 * its maximum size, the oldest entry is removed. In case of an error
 * during the API request, an error message is logged and returned.
 *
 * @param c - The Hono context object containing the request and response.
 *
 * @returns A JSON response with the game data if successful, or an error
 * message if the request fails.
 */
export async function getGame(c: Context) {
	const id = Number(c.req.param('id'));

	const cached = gameCache.get(String(id));
	if (cached && (Date.now() - cached.time < CACHE_TTL)) {
		return c.json({ success: true, data: cached.data });
	}

	try {
		const response = await fetch(`${BASE_URL}/games`, {
			method: 'POST',
			headers: {
				'Content-Type': 'text/plain',
				'Client-ID': getEnv('IGDB_CLIENT_ID'),
				'Authorization': `Bearer ${getEnv('IGDB_ACCESS_TOKEN')}`,
			},
			body: `fields name,summary,cover.image_id; where id = ${id};`,
		});

		if (!response.ok) {
			const errorText = await response.text();
			logger.error(`IGDB API error: ${response.status} ${errorText}`);
			return c.json({ success: false, message: 'Failed to get game', error: errorText }, 502);
		}

		const data = await response.json();

		if (gameCache.size >= MAX_GAME_CACHE_SIZE) {
			gameCache.delete([...gameCache.keys()][0]);
		}
		gameCache.set(String(id), { data, time: Date.now() });

		return c.json({ success: true, data });
	} catch (error) {
		logger.error('IGDB request failed', error);
		return c.json({ success: false, message: 'Failed to get game' }, 502);
	}
}
