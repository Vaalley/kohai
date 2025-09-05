import { Context } from 'hono';
import { sign, verify as verifyJwt } from 'hono/jwt';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { hash, verify as verifyArgon2 } from '@bronti/argon2';
import { getCollection } from '@db/mongo.ts';
import { User } from '@models/user.ts';
import { getEnv, isProduction } from '@config/config.ts';
import { LoginSchema, RegisterSchema } from '@models/auth.ts';
import * as v from '@valibot/valibot';
import { logger } from '@utils/logger.ts';

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
	const body = await c.req.json();
	const parsed = v.safeParse(RegisterSchema, body);
	if (!parsed.success) {
		return c.json({ success: false, message: 'Invalid input' }, 400);
	}
	const username = parsed.output.username.trim();
	const email = parsed.output.email.trim().toLowerCase();
	const password = parsed.output.password;

	// Check if email or username already exists
	const existingUser = await getCollection('users').findOne({
		$or: [
			{ email },
			{ username },
		],
	});

	if (existingUser) {
		return c.json({ success: false, message: 'Email or username already exists' }, 409);
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
		id: result.insertedId.toString(),
		email,
		username,
	}, 201);
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
	const body = await c.req.json();
	const parsed = v.safeParse(LoginSchema, body);
	if (!parsed.success) {
		return c.json({ success: false, message: 'Invalid email or password' }, 401);
	}
	const email = parsed.output.email.trim().toLowerCase();
	const password = parsed.output.password;

	// Find user by email
	const collection = getCollection('users');
	const user = await collection.findOne({ email });

	if (!user) {
		// Avoid user enumeration
		return c.json({ success: false, message: 'Invalid email or password' }, 401);
	}

	// Verify password
	const isPasswordValid = await verifyArgon2(password, user.password);
	if (!isPasswordValid) {
		return c.json({ success: false, message: 'Invalid email or password' }, 401);
	}

	// Minimize JWT payload - only essential claims
	const tokenPayload = {
		sub: user._id.toString(),
		username: user.username,
		isadmin: user.isadmin || false,
	};

	const refreshTokenPayload = {
		sub: user._id.toString(),
		username: user.username,
	};

	// Generate an access token
	const secret = getEnv('JWT_SECRET');
	const accessToken = await sign(tokenPayload, secret);

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
	await collection.updateOne(
		{ email },
		{ $set: { last_login: new Date() } },
	);

	return c.json({
		success: true,
		user: {
			id: user._id.toString(),
			email: user.email,
			username: user.username,
			isadmin: user.isadmin || false,
			created_at: user.created_at?.toISOString?.() ?? undefined,
			updated_at: user.updated_at?.toISOString?.() ?? undefined,
			last_login: (user.last_login ?? new Date())?.toISOString?.(),
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
	// Clear session cookies

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
	// Try access token first
	const accessToken = getCookie(c, 'access_token');
	if (accessToken) {
		try {
			const payload = await verifyJwt(accessToken, getEnv('JWT_SECRET'));
			const userData = payload as unknown as JwtPayload;
			const { exp: _exp, ...user } = userData;
			return c.json({ success: true, user });
		} catch (err) {
			logger.error('Access token validation failed', err);
		}
	}

	// If access token missing/invalid, attempt refresh flow
	try {
		const refreshToken = getCookie(c, 'refresh_token');
		if (!refreshToken) {
			throw new Error('No refresh token');
		}
		const { accessToken: newAccessToken } = await refreshTokens(c);
		const payload = await verifyJwt(newAccessToken, getEnv('JWT_SECRET'));
		const userData = payload as unknown as JwtPayload;
		const { exp: _exp, ...user } = userData;
		return c.json({ success: true, user });
	} catch (error) {
		// Cleanup on failure
		deleteCookie(c, 'access_token');
		deleteCookie(c, 'refresh_token');
		const err = error as Error;
		return c.json({ success: false, error: 'Session expired, please login again', message: err.message }, 401);
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
	} catch (error) {
		// If refresh token is expired/invalid, clear both cookies
		deleteCookie(c, 'access_token');
		deleteCookie(c, 'refresh_token');
		const err = error as Error;
		return c.json({
			success: false,
			error: 'Invalid or expired refresh token',
			message: err.message,
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
	const refreshPayload = payload as unknown as { sub: string; username: string };

	// Get fresh user data for isadmin status
	const { ObjectId } = await import('mongodb');
	const user = await getCollection('users').findOne({ _id: new ObjectId(refreshPayload.sub) });
	if (!user) {
		deleteCookie(c, 'access_token');
		deleteCookie(c, 'refresh_token');
		throw new Error('User not found');
	}

	// Generate new tokens with minimal payload
	const accessTokenPayload = {
		sub: refreshPayload.sub,
		username: refreshPayload.username,
		isadmin: user.isadmin || false,
	};

	const refreshTokenPayload = {
		sub: refreshPayload.sub,
		username: refreshPayload.username,
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
