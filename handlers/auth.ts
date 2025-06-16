import { Context } from 'hono';
import { sign, verify as verifyJwt } from 'hono/jwt';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { hash, verify as verifyArgon2 } from '@bronti/argon2';
import { getCollection } from '@db/mongo.ts';
import { User } from '@models/user.ts';
import { getEnv, isProduction } from '@config/config.ts';

interface JwtPayload {
	id: string;
	email: string;
	username: string;
	isadmin: boolean;
	created_at: string;
	updated_at: string;
	last_login?: string;
	exp: number;
}

const ACCESS_TOKEN_MAX_AGE = 60 * 15; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Registers a new user and returns a JSON response with the user's
 * data if successful, or an error message if the email or username
 * already exists.
 *
 * This function takes the user's email, password, and username from
 * the request, checks if the email or username already exists in the
 * database, and hashes the password using Argon2. If the email or
 * username does not exist, it creates a new user in the database
 * with the provided information and returns a success message with
 * the user's ID, email, and username. If the email or username
 * already exists, it returns an error message.
 *
 * @param c - The Hono context object.
 *
 * @returns A JSON response with the user's data if successful, or
 * an error message if the email or username already exists.
 */
export async function register(c: Context) {
	const { email, password, username } = await c.req.json();

	// Check if email or username already exists
	const existingUser = await getCollection('users').findOne({
		$or: [
			{ email },
			{ username },
		],
	});

	if (existingUser) {
		return c.json({
			success: false,
			error: 'Email or username already exists',
		});
	}

	// Hash the password
	const hashedPassword = await hash(password);

	// Create the user
	const newUser: User = {
		username,
		email,
		password: hashedPassword,
		isadmin: false,
		created_at: new Date(),
		updated_at: new Date(),
	};

	// Insert the user
	const result = await getCollection('users').insertOne(newUser);

	return c.json({
		success: true,
		message: `User '${username}' created successfully`,
		id: result.insertedId,
		email,
		username,
	});
}

/**
 * Logs in a user by verifying their email and password, then generating and
 * setting access and refresh tokens in cookies.
 *
 * This function takes the user's email and password from the request, checks
 * the database for a matching user, and verifies the password using Argon2.
 * If the user is found and the password is valid, it generates JWT access and
 * refresh tokens and sets them as HTTP-only cookies. It also updates the user's
 * last login date in the database.
 *
 * @param c - The Hono context object.
 *
 * @returns A JSON response with the user's data and tokens if successful, or
 * an error message if the user is not found or the password is invalid.
 */
export async function login(c: Context) {
	const { email, password } = await c.req.json();

	// Find user by email
	const collection = getCollection('users');
	const user = await collection.findOne({ email });

	if (!user) {
		return c.json({ success: false, error: 'User not found' });
	}

	// Verify password
	const isPasswordValid = await verifyArgon2(password, user.password);
	if (!isPasswordValid) {
		return c.json({ success: false, error: 'Invalid password' });
	}

	const userData = {
		id: user._id.toString(),
		email: user.email,
		username: user.username,
		isadmin: user.isadmin || false,
		created_at: user.created_at.toISOString(),
		updated_at: user.updated_at.toISOString(),
		last_login: user.last_login?.toISOString(),
	};

	const accessTokenPayload = {
		...userData,
		exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_MAX_AGE,
	};

	const refreshTokenPayload = {
		...userData,
		exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_MAX_AGE,
	};

	const secret = getEnv('JWT_SECRET');

	// Generate a session token
	const accessToken = await sign(accessTokenPayload, secret);

	// Generate a refresh token
	const refreshToken = await sign(refreshTokenPayload, secret);

	// Store the tokens in the user's cookies
	setCookie(c, 'access_token', accessToken, {
		httpOnly: true,
		secure: isProduction(),
		path: '/',
		sameSite: 'Lax',
		maxAge: ACCESS_TOKEN_MAX_AGE,
	});

	setCookie(c, 'refresh_token', refreshToken, {
		httpOnly: true,
		secure: isProduction(),
		path: '/',
		sameSite: 'Lax',
		maxAge: REFRESH_TOKEN_MAX_AGE,
	});

	// Update the user's last login date
	const result = await collection.updateOne(
		{ email },
		{ $set: { last_login: new Date() } },
	);

	if (result.modifiedCount === 0) {
		return c.json({ success: false });
	}

	return c.json({
		success: true,
		user: {
			email: user.email,
			username: user.username,
			id: user._id,
			access_token: accessToken,
			refresh_token: refreshToken,
		},
	});
}

/**
 * Logs out the current user by clearing the session cookie.
 *
 * First, it checks if an access token and/or refresh token is present. If
 * either is missing, it returns an error.
 *
 * Then, it deletes both tokens from the user's cookies and returns a success
 * message.
 *
 * @param c - The Hono context object.
 *
 * @returns A JSON response with a success message if the logout was successful,
 * or an error message if the user is not logged in.
 */
export function logout(c: Context) {
	// Clear session cookie
	const accessToken = getCookie(c, 'access_token');
	const refreshToken = getCookie(c, 'refresh_token');
	if (!accessToken && !refreshToken) {
		return c.json({
			success: false,
			error: 'No access/refresh token',
		});
	}

	// Delete the token from the user's cookies
	deleteCookie(c, 'access_token');
	deleteCookie(c, 'refresh_token');

	return c.json({ success: true, message: 'Logged out' });
}

/**
 * Returns the current user if the user is logged in, or an error if the user
 * is not logged in or the token is invalid.
 *
 * First, it checks if the access token is present and valid. If it is, it
 * returns the user data from the access token payload.
 *
 * If the access token is missing or invalid, it tries to refresh the token
 * using the refresh token. If the refresh token is invalid or the refresh
 * fails, it clears both cookies and returns a 401 Unauthorized response.
 *
 * @param c - The Hono context object.
 *
 * @returns A JSON response with a success message and the current user's
 * data if the user is logged in, or a JSON response with an error message
 * if the user is not logged in or the token is invalid. The response will
 * have a 401 status code if the token is invalid or expired.
 */
export async function me(c: Context) {
	// Check if refresh token is present
	const refreshToken = getCookie(c, 'refresh_token');
	if (!refreshToken) {
		deleteCookie(c, 'access_token'); // Cleanup any stale access token
		return c.json(
			{
				success: false,
				error: 'Session expired, please login again',
			},
			401,
		);
	}

	// Try to get user info from access token first
	const accessToken = getCookie(c, 'access_token');
	if (accessToken) {
		try {
			const payload = await verifyJwt(accessToken, getEnv('JWT_SECRET'));
			const userData = payload as unknown as JwtPayload;

			// Remove the exp field from the response
			const { exp: _exp, ...user } = userData;

			return c.json({ success: true, user });
		} catch (err) {
			// If token is invalid, try to refresh it
			console.error('Access token validation failed:', err);
		}
	}

	// Access token missing or invalid, try to refresh using refresh token
	try {
		const { accessToken: newAccessToken } = await refreshTokens(c);
		const payload = await verifyJwt(newAccessToken, getEnv('JWT_SECRET'));
		const userData = payload as unknown as JwtPayload;

		// Remove the exp field from the response
		const { exp: _exp, ...user } = userData;

		return c.json({ success: true, user });
	} catch (err) {
		// Refresh token invalid or refresh failed
		deleteCookie(c, 'access_token');
		deleteCookie(c, 'refresh_token');
		const error = err as Error;
		return c.json(
			{
				success: false,
				error: 'Session expired, please login again',
				message: error.message,
			},
			401,
		);
	}
}

/**
 * Handles token refresh by calling `refreshTokens` and returning a JSON
 * response indicating success or failure. If the refresh token is invalid or
 * expired, both cookies are cleared and a 401 Unauthorized response is returned.
 *
 * @param c - The Hono context object.
 *
 * @returns A JSON response with a success message and no data if the token is
 * refreshed successfully, or a JSON response with an error message and a 401
 * status code if the refresh token is invalid or expired.
 */
export async function handleTokenRefresh(c: Context) {
	try {
		await refreshTokens(c);
		return c.json({ success: true, message: 'Tokens refreshed' });
	} catch (err) {
		// If refresh token is expired/invalid, clear both cookies
		deleteCookie(c, 'access_token');
		deleteCookie(c, 'refresh_token');
		const error = err as Error;
		return c.json({
			success: false,
			error: 'Invalid or expired refresh token',
			message: error.message,
		}, 401);
	}
}

/**
 * Refreshes the access and refresh tokens for the current user.
 *
 * This function verifies the refresh token present in the request, and if it
 * is valid, generates new access and refresh tokens with the same payload as
 * the old tokens. It then sets the new tokens as cookies in the response.
 *
 * If the refresh token is invalid or expired, an error is thrown.
 *
 * @param c - The Hono context object.
 *
 * @returns An object containing the new access and refresh tokens, or throws
 * an error if the refresh token is invalid or expired.
 */
export async function refreshTokens(c: Context) {
	// Verify the refresh token
	const refreshToken = getCookie(c, 'refresh_token');
	if (!refreshToken) {
		throw new Error('No refresh token');
	}

	const payload = await verifyJwt(refreshToken, getEnv('JWT_SECRET'));
	if (!payload) {
		throw new Error('Invalid refresh token');
	}

	// Cast the payload to our JwtPayload type
	const userPayload = payload as unknown as JwtPayload;

	// Extract user data from the refresh token payload
	const { exp: _, ...userData } = userPayload;

	// Generate new tokens with all user data
	const accessTokenPayload = {
		...userData,
		exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_MAX_AGE,
	};

	const refreshTokenPayload = {
		...userData,
		exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_MAX_AGE,
	};

	const newAccessToken = await sign(
		accessTokenPayload,
		getEnv('JWT_SECRET'),
	);
	const newRefreshToken = await sign(
		refreshTokenPayload,
		getEnv('JWT_SECRET'),
	);

	// Set new cookies
	setCookie(c, 'access_token', newAccessToken, {
		httpOnly: true,
		secure: isProduction(),
		path: '/',
		sameSite: 'Lax',
		maxAge: ACCESS_TOKEN_MAX_AGE,
	});

	setCookie(c, 'refresh_token', newRefreshToken, {
		httpOnly: true,
		secure: isProduction(),
		path: '/',
		sameSite: 'Lax',
		maxAge: REFRESH_TOKEN_MAX_AGE,
	});

	// Return the tokens for verification
	return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
