import { Context } from 'hono';
import { getCollection } from '@db/mongo.ts';
import { UserContribution } from '@models/userContribution.ts';
import { User } from '@models/user.ts';

/**
 * Returns aggregate statistics about the application usage.
 * Includes totals and distinct counts across contributions and users.
 */
export async function getAppStats(c: Context) {
	try {
		const contributionsCol = getCollection<UserContribution>('userContributions');
		const usersCol = getCollection<User>('users');

		// Totals
		const [totalContributions, totalUsers, adminsCount] = await Promise.all([
			contributionsCol.countDocuments({}),
			usersCol.estimatedDocumentCount(),
			usersCol.countDocuments({ isadmin: true }),
		]);

		// Distinct counts
		const [distinctMediaSlugs, distinctTags] = await Promise.all([
			contributionsCol.distinct('mediaSlug'),
			contributionsCol.distinct('tag'),
		]);

		// First and last contribution timestamps
		const [firstDoc] = await contributionsCol
			.find({}, { projection: { timestamp: 1 } })
			.sort({ timestamp: 1 })
			.limit(1)
			.toArray();
		const [lastDoc] = await contributionsCol
			.find({}, { projection: { timestamp: 1 } })
			.sort({ timestamp: -1 })
			.limit(1)
			.toArray();

		const firstContributionDate = firstDoc?.timestamp ?? null;
		const lastContributionDate = lastDoc?.timestamp ?? null;

		return c.json({
			success: true,
			data: {
				totalContributions,
				uniqueTaggedMediaTotal: distinctMediaSlugs.length,
				uniqueTagsTotal: distinctTags.length,
				totalUsers,
				adminsCount,
				firstContributionDate,
				lastContributionDate,
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Internal server error.';
		return c.json({ success: false, message }, 500);
	}
}
