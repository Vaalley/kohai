import { Context } from 'hono';
import { getEnv } from '@config/config.ts';
import { logger } from '@utils/logger.ts';
import { Collection, ObjectId } from 'mongodb';
import { getCollection } from '../db/mongo.ts';
import { MediaTag, MediaType } from '../models/mediaTag.ts';
import { UserContribution } from '../models/userContribution.ts';
import { containsBadWords } from '../utils/badwords.ts';

//  ----------------
// |  GAME HANDLERS |
//  ----------------

const BASE_URL = 'https://api.igdb.com/v4';
const DEFAULT_FIELDS = 'fields name,summary,genres.name,platforms.name,first_release_date,slug';

// LRU-style cache for search results
const searchCache = new Map<string, { data: unknown; time: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache lifetime
const MAX_SEARCH_CACHE_SIZE = 50;

// LRU-style cache for game info
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

	// Check cache
	const cached = gameCache.get(String(id));
	if (cached && (Date.now() - cached.time < CACHE_TTL)) {
		return c.json({ success: true, data: cached.data });
	}

	try {
		const response = await fetch(`${BASE_URL}/games`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Client-ID': getEnv('IGDB_CLIENT_ID'),
				'Authorization': `Bearer ${getEnv('IGDB_ACCESS_TOKEN')}`,
			},
			body: `fields name,summary,cover.image_id; where id = ${id};`,
		});

		if (!response.ok) {
			const errorText = await response.text();
			logger.error(`IGDB API error: ${response.status} ${errorText}`);
			return c.json({ success: false, message: 'Failed to get game', error: errorText });
		}

		const data = await response.json();

		// Manage cache (remove oldest entry if at capacity)
		if (gameCache.size >= MAX_GAME_CACHE_SIZE) {
			gameCache.delete([...gameCache.keys()][0]);
		}
		gameCache.set(String(id), { data, time: Date.now() });

		return c.json({ success: true, data });
	} catch (e) {
		logger.error('IGDB request failed', e);
		return c.json({ success: false, message: 'Failed to get game' });
	}
}

//  ----------------
// |  TAGS HANDLERS |
//  ----------------

/**
 * Gets the tags for a specific game.
 *
 * This function retrieves the tags for a specific game from the database and
 * returns them in a JSON response. The tags are returned with their respective
 * counts, which represent the number of users that have contributed to that tag.
 *
 * @param c - The Hono context object containing the request and response.
 *
 * @returns A JSON response with the tags and their counts.
 */
export async function getTags(c: Context) {
	const id = Number(c.req.param('id'));
	// get the tags from the database
	// of a specific game

	const mediaTagsCollection = getCollection<MediaTag>('mediaTags');
	const mediaTag = await mediaTagsCollection.findOne({ mediaSlug: String(id), mediaType: MediaType.VIDEO_GAME });

	if (!mediaTag) {
		return c.json({ success: false, message: 'No tags found for this game' }, 404);
	}

	const userContributionsCollection = getCollection<UserContribution>('userContributions');

	const tagCounts: { tag: string; count: number }[] = [];

	for (const tag of mediaTag.tags) {
		const count = await userContributionsCollection.countDocuments({
			mediaSlug: String(id),
			mediaType: MediaType.VIDEO_GAME,
			tag: tag,
		});
		tagCounts.push({ tag, count });
	}

	return c.json({ success: true, data: tagCounts });
}

/**
 * Creates tags for a game.
 *
 * This function creates tags for a game based on the provided tags.
 * It first checks if the user has already created 3 tags for this game.
 * If the user has created 3 tags, it returns an error.
 * If the user has not created 3 tags, it creates the tags and returns the tags.
 *
 * @param c - The Hono context object containing the request and response.
 *
 * @returns A JSON response with the tags if successful, or an error
 * message if the request fails.
 */
export async function createTags(c: Context) {
	// id of the game to create tags for
	const gameId = String(c.req.param('id'));
	// tags to create
	const { tags } = await c.req.json() as { tags: string[] };

	// get the jwt payload (for the user id)
	const jwtPayload = c.get('jwtPayload');

	if (!jwtPayload || !jwtPayload.id) {
		return c.json({ success: false, message: 'Authentication required' }, 401);
	}

	const userId = new ObjectId(jwtPayload.id);

	if (!tags || !Array.isArray(tags) || tags.length === 0) {
		return c.json({ success: false, message: 'No tags provided' }, 400);
	}

	if (containsBadWords(tags)) {
		return c.json({ success: false, message: 'Tags contain inappropriate words' }, 400);
	}

	const userContributionsCollection = getCollection<UserContribution>('userContributions');
	const mediaTagsCollection = getCollection<MediaTag>('mediaTags');

	try {
		await processUserTags(
			userId,
			gameId,
			tags,
			userContributionsCollection,
		);

		// After processing individual user contributions, aggregate all tags for this game
		const allGameContributions = await userContributionsCollection.find({
			mediaSlug: gameId,
			mediaType: MediaType.VIDEO_GAME,
		}).toArray();

		const aggregatedTags = Array.from(new Set(allGameContributions.map((uc) => uc.tag)));

		// Update mediaTags collection with the aggregated set of tags
		const now = new Date();
		if (aggregatedTags.length > 0) {
			await mediaTagsCollection.updateOne(
				{ mediaSlug: gameId, mediaType: MediaType.VIDEO_GAME },
				{ $set: { tags: aggregatedTags, updated_at: now } }, // Replace all tags for this game
				{ upsert: true },
			);
		} else {
			// If no tags remain from any user, remove the mediaTag entry
			await mediaTagsCollection.deleteOne({ mediaSlug: gameId, mediaType: MediaType.VIDEO_GAME });
		}

		return c.json({ success: true, message: 'Tags processed successfully' });
	} catch (error) {
		logger.error(`Error processing tags: ${error}`);
		return c.json({ success: false, message: 'Internal server error' }, 500);
	}
}

/**
 * Processes user tags for a specific game.
 *
 * This function processes user tags for a specific game by first fetching
 * existing contributions for the user and game. It then updates the existing
 * contributions with the new tags.
 *
 * @param userId - The ID of the user.
 * @param gameId - The ID of the game.
 * @param tags - The tags to process.
 * @param userContributionsCollection - The collection of user contributions.
 *
 * @returns A promise that resolves to nothing.
 */
async function processUserTags(
	userId: ObjectId,
	gameId: string,
	tags: string[],
	userContributionsCollection: Collection<UserContribution>,
): Promise<void> {
	const now = new Date();

	// 1. Fetch existing contributions for this user and game
	const existingContributions = await userContributionsCollection.find({
		userId: userId,
		mediaSlug: gameId,
		mediaType: MediaType.VIDEO_GAME,
	}).toArray();

	const existingTagsMap = new Map<string, UserContribution>();
	existingContributions.forEach((uc: UserContribution) => existingTagsMap.set(uc.tag, uc));

	const tagsToKeep: string[] = [];
	const tagsToInsert: UserContribution[] = [];
	const tagsToUpdate: ObjectId[] = [];

	// Process incoming tags
	for (const tag of tags) {
		if (existingTagsMap.has(tag)) {
			// Tag exists, update its timestamp and mark for keeping
			const existingUc = existingTagsMap.get(tag)!;
			if (existingUc._id) {
				tagsToUpdate.push(existingUc._id);
			}
			tagsToKeep.push(tag);
			existingTagsMap.delete(tag); // Mark as processed
		} else {
			// New tag, prepare for insertion
			tagsToInsert.push({
				_id: new ObjectId(),
				userId: userId,
				mediaSlug: gameId,
				mediaType: MediaType.VIDEO_GAME,
				tag: tag,
				timestamp: now,
				updated_at: now,
			});
			tagsToKeep.push(tag);
		}
	}

	// Apply the 3-contribution limit
	// Combine all tags (kept, new, updated) and sort by updated_at/timestamp to get the most recent 3
	const allRelevantContributions = [
		...existingContributions.filter((uc: UserContribution) => tagsToKeep.includes(uc.tag)), // Existing and kept
		...tagsToInsert, // New ones
	];

	// Sort by updated_at (or timestamp for new ones) descending and take top 3
	allRelevantContributions.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
	const finalContributions = allRelevantContributions.slice(0, 3);
	const finalTags = finalContributions.map((uc: UserContribution) => uc.tag);

	// Perform database operations based on finalTags
	// Delete contributions not in finalTags
	const contributionsToDeleteIds = existingContributions
		.filter((uc: UserContribution) => !finalTags.includes(uc.tag) && uc._id !== undefined)
		.map((uc: UserContribution) => uc._id as ObjectId);

	if (contributionsToDeleteIds.length > 0) {
		await userContributionsCollection.deleteMany({ _id: { $in: contributionsToDeleteIds } });
	}

	// Update existing contributions that are in finalTags
	const contributionsToUpdateIds = existingContributions
		.filter((uc: UserContribution) => finalTags.includes(uc.tag) && uc._id !== undefined && tagsToUpdate.some((id) => id.equals(uc._id!)))
		.map((uc: UserContribution) => uc._id as ObjectId);

	if (contributionsToUpdateIds.length > 0) {
		await userContributionsCollection.updateMany(
			{ _id: { $in: contributionsToUpdateIds } },
			{ $set: { updated_at: now } },
		);
	}

	// Insert new contributions that are in finalTags
	const contributionsToInsertFinal = tagsToInsert.filter((uc: UserContribution) => finalTags.includes(uc.tag));
	if (contributionsToInsertFinal.length > 0) {
		await userContributionsCollection.insertMany(contributionsToInsertFinal);
	}

	return;
}
