import { Context } from "hono";
import { getCollection } from "../db/mongo.ts";
import { hash, verify as verifyBcrypt } from "@felix/bcrypt";
import { User } from "../models/user.ts";
import { sign, verify as verifyJwt } from "hono/jwt";
import { getEnv, isProduction } from "../config/config.ts";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

/**
 * Registers a new user and returns a JSON response with the user's
 * data if successful, or an error message if the email or username
 * already exists.
 *
 * @param c - The Hono context object.
 *
 * @returns A JSON response with the user's data if successful, or
 * an error message if the email or username already exists.
 */
export async function register(c: Context) {
	const { email, password, username } = await c.req.valid(
		"json" as never,
	);

	// Check if email or username already exists
	const existingUser = await getCollection("users").findOne({
		$or: [
			{ email },
			{ username },
		],
	});

	if (existingUser) {
		return c.json({
			success: false,
			error: "Email or username already exists",
		});
	}

	// Hash the password
	const hashedPassword = await hash(password);

	// Create the user
	const newUser: User = {
		username,
		email,
		password: hashedPassword,
		created_at: new Date(),
		updated_at: new Date(),
	};

	// Insert the user
	const result = await getCollection("users").insertOne(newUser);

	return c.json({
		success: true,
		message: `User '${username}' created successfully`,
		id: result.insertedId,
		email,
		username,
	});
}

/**
 * Logs in a user.
 *
 * @param c - The Hono context object.
 *
 * @returns A JSON response with the user's data if successful, or an error
 * message if the user is not found or the password is invalid.
 */
export async function login(c: Context) {
	const { email, password } = await c.req.valid("json" as never);

	// Find user by email
	const collection = getCollection("users");
	const user = await collection.findOne({ email });

	if (!user) {
		return c.json({ success: false, error: "User not found" });
	}

	// Verify password
	const isPasswordValid = await verifyBcrypt(password, user.password);
	if (!isPasswordValid) {
		return c.json({ success: false, error: "Invalid password" });
	}

	const payload = {
		email: user.email,
		username: user.username,
		exp: Math.floor(Date.now() / 1000) + 60 * 5, // Token expires in 5 minutes
	};

	const secret = getEnv("JWT_SECRET");

	// Generate a session token
	const token = await sign(payload, secret);

	// Store the token in the user's cookies
	setCookie(c, "session_token", token, {
		httpOnly: true,
		secure: isProduction(),
		sameSite: "lax",
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
			token,
		},
	});
}

/**
 * Logs out the current user by clearing the session cookie.
 *
 * @param c - The Hono context object.
 *
 * @returns A JSON response with a success message if the logout was successful,
 * or an error message if the user is not logged in.
 */
export function logout(c: Context) {
	// Clear session cookie
	const token = getCookie(c, "session_token");
	if (!token) {
		return c.json({ success: false, error: "No token" });
	}

	// Delete the token from the user's cookies
	deleteCookie(c, "session_token");

	return c.json({ success: true, message: "Logged out" });
}

/**
 * Returns the current user, or an error if the user is not logged in.
 *
 * @param c - The Hono context object.
 *
 * @returns A JSON response with a success message and the current user's
 * data if the user is logged in, or an error message if the user is not
 * logged in or the token is invalid.
 */
export async function me(c: Context) {
	const token = getCookie(c, "session_token");
	if (!token) {
		return c.json({ success: false, error: "No token" });
	}

	try {
		const payload = await verifyJwt(token, getEnv("JWT_SECRET"));
		if (!payload) {
			return c.json({
				success: false,
				error: "Invalid token",
			});
		}

		return c.json({ success: true, user: payload });
	} catch (err) {
		const error = err as Error;
		if (error.name == "JwtTokenExpired") {
			return c.json({
				success: false,
				error: "Token expired",
			});
		}

		return c.json({ success: false, error: "Invalid token" });
	}
}
