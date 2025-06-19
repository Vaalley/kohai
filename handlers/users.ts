import { Context } from 'hono';
import { deleteUserById, getUserById } from '@db/mongo.ts';

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
