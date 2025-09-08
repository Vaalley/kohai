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

		// Totals (accurate counts)
		const [totalContributions, totalUsers, adminsCount] = await Promise.all([
			contributionsCol.countDocuments({}),
			usersCol.countDocuments({}),
			usersCol.countDocuments({ isadmin: true }),
		]);

		// Distinct counts and first/last contribution timestamps via aggregations
		const [distinctMediaCountDoc] = await contributionsCol
			.aggregate<{ count: number }>([
				{ $group: { _id: '$mediaSlug' } },
				{ $count: 'count' },
			])
			.toArray();
		const [distinctTagsCountDoc] = await contributionsCol
			.aggregate<{ count: number }>([
				{ $group: { _id: '$tag' } },
				{ $count: 'count' },
			])
			.toArray();

		const [minMaxDoc] = await contributionsCol
			.aggregate<{ first: Date | null; last: Date | null }>([
				{ $group: { _id: null, first: { $min: '$timestamp' }, last: { $max: '$timestamp' } } },
			])
			.toArray();

		const uniqueTaggedMediaTotal = distinctMediaCountDoc?.count ?? 0;
		const uniqueTagsTotal = distinctTagsCountDoc?.count ?? 0;
		const firstContributionDate = minMaxDoc?.first ?? null;
		const lastContributionDate = minMaxDoc?.last ?? null;

		return c.json({
			success: true,
			data: {
				totalContributions,
				uniqueTaggedMediaTotal,
				uniqueTagsTotal,
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
