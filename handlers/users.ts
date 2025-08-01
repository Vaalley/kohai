import { Context } from 'hono';
import { deleteUserById, getCollection, getUserById } from '@db/mongo.ts';
import { UserContribution } from '@models/userContribution.ts';
import { ObjectId } from 'mongodb';

/**
 * Retrieves a user by their ID from the request parameters and returns a JSON response
 * with the user's data.
 *
 * This function extracts the user ID from the request parameters, fetches the user
 * document from the database using the ID, and returns a JSON response containing
 * the user data.
 *
 * @param c - The Hono context object containing the request and response.
 *
 * @returns A JSON response with a success message and the user's data.
 */
export async function getUser(c: Context) {
	const id = c.req.param('id');

	try {
		const user = await getUserById(id);
		return c.json({ success: true, data: user });
	} catch (error) {
		if (error instanceof Error) {
			return c.json({ success: false, message: error.message }, 404);
		}
		return c.json({ success: false, message: 'Internal server error.' }, 500);
	}
}

/**
 * Deletes a user by their ID from the request parameters and returns a JSON response
 * with the result of the deletion.
 *
 * This function extracts the user ID from the request parameters, checks if the
 * authenticated user is trying to delete their own account, and if so, calls the
 * `deleteUserById` function to delete the user document from the database.
 *
 * @param c - The Hono context object containing the request and response.
 *
 * @returns A JSON response with a success message and the result of the deletion.
 */
export async function deleteUser(c: Context) {
	// get the user id from the request that needs to be deleted
	const id = c.req.param('id');

	try {
		// Get the JWT payload from the context (set by jwtAuth middleware)
		const jwtPayload = c.get('jwtPayload') as { id: string; email: string; username: string; isadmin: boolean };

		// Check if the authenticated user is trying to delete their own account
		if (jwtPayload.id !== id) {
			return c.json({ success: false, message: 'You are not authorized to delete this user.' }, 403);
		}

		const result = await deleteUserById(id);
		return c.json({ success: true, message: 'User deleted successfully', data: result });
	} catch (error) {
		if (error instanceof Error) {
			return c.json({ success: false, message: error.message }, 404);
		}
		return c.json({ success: false, message: 'Internal server error.' }, 500);
	}
}

/**
 * Retrieves user statistics from the database and returns a JSON response with the data.
 *
 * The statistics include:
 * - Top 10 most used tags
 * - Last 10 tags (most recent contributions)
 * - Total number of contributions
 * - Number of unique games tagged
 * - Date of the first contribution
 * - Date of the last contribution
 * - Tag diversity (number of unique tags used)
 *
 * @param c - The Hono context object containing the request and response.
 *
 * @returns A JSON response with the user statistics.
 */
export async function getUserStats(c: Context) {
	const id = c.req.param('id');
	const jwtPayload = c.get('jwtPayload') as { id: string; email: string; username: string; isadmin: boolean };

	try {
		// Verify user exists
		const user = await getUserById(id);
		if (!user) {
			return c.json({ success: false, message: 'User not found' }, 404);
		}

		// Check if the requesting user is admin or is requesting their own stats
		if (!jwtPayload.isadmin && jwtPayload.id !== id) {
			return c.json({ success: false, message: 'Unauthorized access to user stats' }, 403);
		}

		const userContributionsCollection = getCollection<UserContribution>('userContributions');
		const userId = new ObjectId(id);

		// Get all user contributions
		const allContributions = await userContributionsCollection
			.find({ userId })
			.sort({ timestamp: -1 })
			.toArray();

		if (allContributions.length === 0) {
			return c.json({
				success: true,
				data: {
					topTags: [],
					recentTags: [],
					totalContributions: 0,
					uniqueGamesTagged: 0,
					firstContributionDate: null,
					lastContributionDate: null,
					tagDiversity: 0,
				},
			});
		}

		// Calculate tag frequency for top tags
		const tagFrequency = new Map<string, number>();
		const uniqueGames = new Set<string>();

		for (const contribution of allContributions) {
			tagFrequency.set(contribution.tag, (tagFrequency.get(contribution.tag) || 0) + 1);
			uniqueGames.add(contribution.mediaSlug);
		}

		// Get top 10 most used tags
		const topTags = Array.from(tagFrequency.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([tag, count]) => ({ tag, count }));

		// Get last 10 tags (most recent contributions)
		const recentTags = allContributions
			.slice(0, 10)
			.map((contribution) => ({
				tag: contribution.tag,
				mediaSlug: contribution.mediaSlug,
				mediaType: contribution.mediaType,
				timestamp: contribution.timestamp,
			}));

		// Calculate statistics
		const totalContributions = allContributions.length;
		const uniqueGamesTagged = uniqueGames.size;
		const firstContributionDate = allContributions[allContributions.length - 1].timestamp;
		const lastContributionDate = allContributions[0].timestamp;
		const tagDiversity = tagFrequency.size;

		return c.json({
			success: true,
			data: {
				topTags,
				recentTags,
				totalContributions,
				uniqueGamesTagged,
				firstContributionDate,
				lastContributionDate,
				tagDiversity,
			},
		});
	} catch (error) {
		if (error instanceof Error) {
			return c.json({ success: false, message: error.message }, 404);
		}
		return c.json({ success: false, message: 'Internal server error.' }, 500);
	}
}
