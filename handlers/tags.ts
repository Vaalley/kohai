import { Context } from 'hono';
import { Collection, ObjectId } from 'mongodb';
import { getCollection } from '@db/mongo.ts';
import { MediaTag, MediaType } from '@models/mediaTag.ts';
import { UserContribution } from '@models/userContribution.ts';
import { containsBadWords } from '@utils/badwords.ts';
import { logger } from '@utils/logger.ts';

/**
 * Gets the tags for a specific game.
 *
 * This function retrieves the tags for a specific game from the database and
 * returns them in a JSON response. The tags are returned with their respective
 * counts, which represent the number of users that have contributed to that tag.
 *
 * @param context - The Hono context object containing the request and response.
 *
 * @returns A JSON response with the tags and their counts.
 */
export async function getTags(context: Context) {
	const slug = context.req.param('slug');
	const countParam = context.req.query('count');
	const parsed = countParam ? Number(countParam) : NaN;
	const limit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;

	const mediaTagsCollection = getCollection<MediaTag>('mediaTags');
	const mediaTag = await mediaTagsCollection.findOne({ mediaSlug: slug, mediaType: MediaType.VIDEO_GAME });

	if (!mediaTag) {
		return context.json({ success: false, message: 'No tags found for this game' }, 404);
	}

	const userContributionsCollection = getCollection<UserContribution>('userContributions');

	const pipeline: Record<string, unknown>[] = [
		{ $match: { mediaSlug: slug, mediaType: MediaType.VIDEO_GAME, tag: { $in: mediaTag.tags } } },
		{ $group: { _id: '$tag', count: { $sum: 1 } } },
		{ $sort: { count: -1 } },
	];
	if (limit && limit > 0) {
		pipeline.push({ $limit: limit });
	}
	pipeline.push({ $project: { _id: 0, tag: '$_id', count: 1 } });

	const tagCounts = await userContributionsCollection.aggregate<{ tag: string; count: number }>(pipeline).toArray();

	return context.json({ success: true, data: tagCounts });
}

/**
 * Creates tags for a game.
 *
 * This function creates tags for a game based on the provided tags.
 * It first checks if the user has already created 3 tags for this game.
 * If the user has created 3 tags, it returns an error.
 * If the user has not created 3 tags, it creates the tags and returns the tags.
 *
 * @param context - The Hono context object containing the request and response.
 *
 * @returns A JSON response with the tags if successful, or an error
 * message if the request fails.
 */
export async function createTags(context: Context) {
	const gameSlug = context.req.param('slug');
	let payload: unknown;
	try {
		payload = await context.req.json();
	} catch (_) {
		return context.json({ success: false, message: 'Invalid JSON body' }, 400);
	}
	const tags = (payload as { tags?: unknown })?.tags;
	if (!Array.isArray(tags)) {
		return context.json({ success: false, message: 'No tags provided' }, 400);
	}
	const normalizedTags = Array.from(
		new Set(
			tags
				.filter((tag): tag is string => typeof tag === 'string')
				.map((tag) => tag.trim())
				.filter((tag) => tag.length > 0),
		),
	);

	const jwtPayload = context.get('jwtPayload') as { sub: string; username: string; isadmin: boolean };

	if (!jwtPayload || !jwtPayload.sub) {
		return context.json({ success: false, message: 'Authentication required' }, 401);
	}

	const userId = new ObjectId(jwtPayload.sub);

	if (normalizedTags.length === 0) {
		return context.json({ success: false, message: 'No tags provided' }, 400);
	}

	if (containsBadWords(normalizedTags)) {
		return context.json({ success: false, message: 'Tags contain inappropriate words' }, 400);
	}

	const userContributionsCollection = getCollection<UserContribution>('userContributions');
	const mediaTagsCollection = getCollection<MediaTag>('mediaTags');

	try {
		await processUserTags(
			userId,
			gameSlug,
			normalizedTags,
			userContributionsCollection,
		);

		const distinctTags = await userContributionsCollection
			.aggregate<{ tag: string }>([
				{ $match: { mediaSlug: gameSlug, mediaType: MediaType.VIDEO_GAME } },
				{ $group: { _id: '$tag' } },
				{ $project: { _id: 0, tag: '$_id' } },
			])
			.toArray();
		const aggregatedTags = distinctTags.map((distinctTag) => distinctTag.tag);

		const now = new Date();
		if (aggregatedTags.length > 0) {
			await mediaTagsCollection.updateOne(
				{ mediaSlug: gameSlug, mediaType: MediaType.VIDEO_GAME },
				{ $set: { tags: aggregatedTags, updated_at: now } },
				{ upsert: true },
			);
		} else {
			await mediaTagsCollection.deleteOne({ mediaSlug: gameSlug, mediaType: MediaType.VIDEO_GAME });
		}

		return context.json({ success: true, message: 'Tags processed successfully' });
	} catch (error) {
		logger.error(`Error processing tags: ${error}`);
		return context.json({ success: false, message: 'Internal server error' }, 500);
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

	const existingContributions = await userContributionsCollection.find({
		userId: userId,
		mediaSlug: gameId,
		mediaType: MediaType.VIDEO_GAME,
	}).toArray();

	const existingTagsMap = new Map<string, UserContribution>();
	existingContributions.forEach((userContribution: UserContribution) =>
		existingTagsMap.set(userContribution.tag, userContribution)
	);

	const tagsToKeep: string[] = [];
	const tagsToInsert: UserContribution[] = [];
	const tagsToUpdate: ObjectId[] = [];

	for (const tag of tags) {
		if (existingTagsMap.has(tag)) {
			const existingUc = existingTagsMap.get(tag)!;
			if (existingUc._id) {
				tagsToUpdate.push(existingUc._id);
			}
			tagsToKeep.push(tag);
			existingTagsMap.delete(tag);
		} else {
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

	const allRelevantContributions = [
		...existingContributions.filter((userContribution: UserContribution) =>
			tagsToKeep.includes(userContribution.tag)
		),
		...tagsToInsert,
	];

	allRelevantContributions.sort((contributionA, contributionB) => {
		const timeA = (contributionA.updated_at ?? contributionA.timestamp).getTime();
		const timeB = (contributionB.updated_at ?? contributionB.timestamp).getTime();
		return timeB - timeA;
	});
	const finalContributions = allRelevantContributions.slice(0, 3);
	const finalTags = finalContributions.map((userContribution: UserContribution) => userContribution.tag);

	const contributionsToDeleteIds = existingContributions
		.filter((userContribution: UserContribution) =>
			!finalTags.includes(userContribution.tag) && userContribution._id !== undefined
		)
		.map((userContribution: UserContribution) => userContribution._id as ObjectId);

	if (contributionsToDeleteIds.length > 0) {
		await userContributionsCollection.deleteMany({ _id: { $in: contributionsToDeleteIds } });
	}

	const contributionsToUpdateIds = existingContributions
		.filter((userContribution: UserContribution) =>
			finalTags.includes(userContribution.tag) && userContribution._id !== undefined &&
			tagsToUpdate.some((id) => id.equals(userContribution._id!))
		)
		.map((userContribution: UserContribution) => userContribution._id as ObjectId);

	if (contributionsToUpdateIds.length > 0) {
		await userContributionsCollection.updateMany(
			{ _id: { $in: contributionsToUpdateIds } },
			{ $set: { updated_at: now } },
		);
	}

	const contributionsToInsertFinal = tagsToInsert.filter((userContribution: UserContribution) =>
		finalTags.includes(userContribution.tag)
	);
	if (contributionsToInsertFinal.length > 0) {
		await userContributionsCollection.insertMany(contributionsToInsertFinal);
	}

	return;
}
