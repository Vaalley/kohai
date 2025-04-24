import { getEnv, setEnv } from "@config/config.ts";
import { logger } from "@utils/logger.ts";

// Token refresh mutex to prevent concurrent token refreshes
let tokenRefreshPromise: Promise<void> | null = null;

/**
 * Establishes a connection to the IGDB API.
 *
 * Retrieves an access token from the IGDB server using the client ID and
 * client secret environment variables. The access token is then stored in
 * the environment variable `IGDB_ACCESS_TOKEN`.
 */
export async function connectIgdb() {
	const startTime = Date.now();
	logger.info("🔄 Attempting IGDB connection... 🎮");
	const response = await fetch(
		`https://id.twitch.tv/oauth2/token`,
		{
			method: "POST",
			headers: {
				"User-Agent": "Kohai (https://github.com/Vaalley/kohai)",
				"Accept": "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client_id: getEnv("IGDB_CLIENT_ID"),
				client_secret: getEnv("IGDB_CLIENT_SECRET"),
				grant_type: "client_credentials",
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}`);
	}

	const data = await response.json();

	if (!data.access_token) {
		throw new Error("Failed to get access token from IGDB");
	}

	setEnv("IGDB_ACCESS_TOKEN", data.access_token);

	const expiresAt = Date.now() + (data.expires_in * 1000);
	setEnv("IGDB_EXPIRES_AT", expiresAt.toString());

	if (getEnv("ENV") === "development") {
		logger.info("🔑 IGDB access token: " + data.access_token);
	}

	logger.info("✅ Connected to IGDB 🔗");
	logger.info(`⏲️ IGDB connection time: ${Date.now() - startTime}ms`);
}

/**
 * Returns the expiration date of the IGDB token as a Date object.
 * If no expiration date is set, returns null.
 */
export function getIgdbExpiration(): Date | null {
	const expiresAtStr = getEnv("IGDB_EXPIRES_AT");
	if (!expiresAtStr) return null;

	const expiresAtMs = parseInt(expiresAtStr, 10);
	if (isNaN(expiresAtMs)) return null;

	return new Date(expiresAtMs);
}

/**
 * Checks if the current IGDB token is valid (exists and not expired).
 * Returns true if the token is valid, false otherwise.
 */
export function isIgdbTokenValid(): boolean {
	const token = getEnv("IGDB_ACCESS_TOKEN");
	if (!token) return false;

	const expiration = getIgdbExpiration();
	if (!expiration) return false;

	// Check if token is expired (with 5-minute buffer)
	const FIVE_MINUTES_MS = 5 * 60 * 1000;
	const now = Date.now();
	return expiration.getTime() > now + FIVE_MINUTES_MS;
}

/**
 * Ensures a valid IGDB token is available for API calls.
 * If the token is missing or expired, it will reconnect to IGDB.
 *
 * Uses a mutex pattern to prevent concurrent token refreshes when
 * multiple requests detect an expired token simultaneously.
 */
export async function ensureValidIgdbToken(): Promise<boolean> {
	if (isIgdbTokenValid()) {
		return true;
	}

	if (tokenRefreshPromise) {
		try {
			await tokenRefreshPromise;
			if (isIgdbTokenValid()) {
				return true;
			}
		} catch (error) {
			logger.warn(
				"Previous IGDB token refresh failed, attempting again.",
				error,
			);
		}
	}

	tokenRefreshPromise = (async () => {
		try {
			logger.info(
				"IGDB token expired or missing, reconnecting...",
			);
			await connectIgdb();
		} finally {
			tokenRefreshPromise = null;
		}
	})();

	await tokenRefreshPromise;

	return isIgdbTokenValid();
}
