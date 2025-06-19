import { Context } from 'hono';
import { getUserById } from '@db/mongo.ts';

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
