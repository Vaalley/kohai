import { Context } from 'hono';
import { deleteUserByUsername, getCollection, getUserByUsername, promoteUserToAdmin } from '@db/mongo.ts';
import { UserContribution } from '@models/userContribution.ts';
import { logger } from '@utils/logger.ts';
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
	const username = c.req.param('username');

	try {
		const user = await getUserByUsername(username);
		// Sanitize user object to avoid exposing sensitive fields
		const safeUser = {
			id: user._id?.toString(),
			username: user.username,
			created_at: user.created_at,
			last_login: user.last_login ?? null,
		};
		return c.json({ success: true, data: safeUser });
	} catch (error) {
		if (error instanceof Error) {
			return c.json({ success: false, message: error.message }, 404);
		}
		return c.json({ success: false, message: 'Internal server error.' }, 500);
	}
}

/**
 * Promotes a user to admin. Only admins can perform this action and the target must not already be an admin.
 *
 * @param c - The Hono context object containing the request and response.
 * @returns A JSON response indicating success or failure.
 */
export async function promoteUser(c: Context) {
	const username = c.req.param('username');

	try {
		// Must be authenticated and an admin
		const jwtPayload = c.get('jwtPayload') as { sub: string; username: string; isadmin: boolean };
		if (!jwtPayload?.isadmin) {
			return c.json({ success: false, message: 'Only admins can promote users.' }, 403);
		}

		// Ensure target user exists and is not already admin
		const user = await getUserByUsername(username);
		if (user.isadmin) {
			return c.json({ success: false, message: 'User is already an admin.' }, 400);
		}

		const result = await promoteUserToAdmin(username);
		return c.json({
			success: true,
			message: 'User promoted to admin successfully',
			data: { matched: result.matchedCount, modified: result.modifiedCount },
		});
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
	// get the user username from the request that needs to be deleted
	const username = c.req.param('username');

	try {
		// Get the JWT payload from the context (set by jwtAuth middleware)
		const jwtPayload = c.get('jwtPayload') as { sub: string; username: string; isadmin: boolean };

		// Check if the authenticated user is trying to delete their own account
		if (jwtPayload.username !== username && !jwtPayload.isadmin) {
			return c.json({ success: false, message: 'You are not authorized to delete this user.' }, 403);
		}

		const result = await deleteUserByUsername(username);
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
	const username = c.req.param('username');

	try {
		// Verify user exists
		const user = await getUserByUsername(username);
		if (!user) {
			return c.json({ success: false, message: 'User not found' }, 404);
		}

		// Try to get JWT payload for authenticated requests (optional)
		let _jwtPayload: { sub: string; username: string; isadmin: boolean } | null = null;
		try {
			_jwtPayload = c.get('jwtPayload') as { sub: string; username: string; isadmin: boolean };
		} catch (_e) {
			// JWT payload not available, which is fine for public requests
		}

		const userContributionsCollection = getCollection<UserContribution>('userContributions');

		// Get all user contributions using the user's _id
		const allContributions = await userContributionsCollection
			.find({ userId: user._id as ObjectId })
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
			logger.info(`❌ Error getting user stats for user with username: ${username} error: ${error.message}`);
			return c.json({ success: false, message: error.message }, 404);
		}
		return c.json({ success: false, message: 'Internal server error.' }, 500);
	}
}
