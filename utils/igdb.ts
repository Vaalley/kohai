import { getEnv, setEnv } from '@config/config.ts';
import { logger } from '@utils/logger.ts';

const IGDB_TOKEN_FILE_PATH = './.igdb_token.json'; // Assumes app runs from project root

interface IgdbTokenData {
	accessToken: string;
	expiresAt: number; // Timestamp in milliseconds
}

/**
 * Loads the IGDB token from the local file specified by `IGDB_TOKEN_FILE_PATH`.
 * The file is expected to contain a JSON object with `accessToken` and `expiresAt` properties.
 * If the file does not exist, or if the token data structure is invalid, the function returns `null`.
 * @returns The loaded token data or `null` if none could be loaded.
 */
async function loadIgdbToken(): Promise<IgdbTokenData | null> {
	try {
		const fileContent = await Deno.readTextFile(IGDB_TOKEN_FILE_PATH);
		const tokenData = JSON.parse(fileContent) as IgdbTokenData;
		// Basic validation of token structure
		if (tokenData && typeof tokenData.accessToken === 'string' && typeof tokenData.expiresAt === 'number') {
			return tokenData;
		}
		logger.warn('Invalid token data structure in IGDB token file.');
		return null;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			logger.debug(`IGDB token file not found at ${IGDB_TOKEN_FILE_PATH}. A new token will be fetched.`);
		} else {
			logger.warn(`Error reading IGDB token file at ${IGDB_TOKEN_FILE_PATH}:`, error);
		}
		return null;
	}
}

/**
 * Saves the given IGDB access token and expiration time to the file specified by `IGDB_TOKEN_FILE_PATH`.
 * The file is written in JSON format with `accessToken` and `expiresAt` properties.
 * If the file cannot be written, an error is logged.
 * @param accessToken The IGDB access token to save.
 * @param expiresIn The time in seconds until the token expires.
 */
async function saveIgdbToken(accessToken: string, expiresIn: number): Promise<void> {
	const expiresAt = Date.now() + (expiresIn * 1000); // expiresIn is in seconds
	const tokenData: IgdbTokenData = { accessToken, expiresAt };
	try {
		await Deno.writeTextFile(IGDB_TOKEN_FILE_PATH, JSON.stringify(tokenData, null, 2));
		logger.debug(`IGDB token saved to file: ${IGDB_TOKEN_FILE_PATH}`);
	} catch (error) {
		logger.error(`Error writing IGDB token file at ${IGDB_TOKEN_FILE_PATH}:`, error);
	}
}

/**
 * Establishes a connection to the IGDB API by fetching a new access token.
 * If a valid, cached token exists, it is used instead.
 * This function is called automatically on startup.
 */
export async function connectIgdb() {
	const startTime = Date.now();
	logger.info('🔌 Connecting to IGDB...');

	const existingTokenData = await loadIgdbToken();
	// Check if token exists and is valid for at least another minute (buffer)
	if (existingTokenData && existingTokenData.expiresAt > Date.now() + (60 * 1000)) {
		setEnv('IGDB_ACCESS_TOKEN', existingTokenData.accessToken);
		setEnv('IGDB_EXPIRES_AT', existingTokenData.expiresAt.toString());
		logger.info('✅ Using cached IGDB access token from file.');
		logger.info(`⏲️ IGDB connection time (cached): ${Date.now() - startTime}ms`);
		return;
	}

	logger.info('🔄 Fetching new IGDB access token...');
	const response = await fetch(
		`https://id.twitch.tv/oauth2/token`,
		{
			method: 'POST',
			headers: {
				'User-Agent': 'Kohai (https://github.com/Vaalley/kohai)',
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				client_id: getEnv('IGDB_CLIENT_ID'),
				client_secret: getEnv('IGDB_CLIENT_SECRET'),
				grant_type: 'client_credentials',
			}),
		},
	);

	if (!response.ok) {
        let errorBody = 'Could not read error body.';
        try {
            errorBody = await response.text();
        } catch (e) {
            logger.error('Failed to read error body from IGDB token request:', e);
        }
		logger.error(`HTTP error fetching IGDB token! Status: ${response.status}. Body: ${errorBody}`);
		throw new Error(`Failed to fetch IGDB token. Status: ${response.status}`);
	}

	const data = await response.json();

	if (!data.access_token || typeof data.expires_in !== 'number') {
		logger.error('Failed to get access_token or expires_in from IGDB response:', data);
		throw new Error('Invalid token data from IGDB');
	}

	setEnv('IGDB_ACCESS_TOKEN', data.access_token);
	const newExpiresAt = Date.now() + (data.expires_in * 1000);
	setEnv('IGDB_EXPIRES_AT', newExpiresAt.toString());

	await saveIgdbToken(data.access_token, data.expires_in);

	logger.debug('🔑 New IGDB access token obtained.');
	logger.info('✅ Connected to IGDB 🔗');
	logger.info(`⏲️ IGDB connection time (new token): ${Date.now() - startTime}ms`);
}

/**
 * Returns the expiration date of the IGDB token as a Date object.
 * If no expiration date is set or parsable, returns null.
 */
export function getIgdbExpiration(): Date | null {
	const expiresAtStr = getEnv('IGDB_EXPIRES_AT');
	if (!expiresAtStr) {
        logger.debug('IGDB_EXPIRES_AT not found in environment.');
        return null;
    }
	const expiresAt = parseInt(expiresAtStr, 10);
	if (isNaN(expiresAt)) {
        logger.warn(`IGDB_EXPIRES_AT ('${expiresAtStr}') is not a valid number.`);
		return null;
    }
	return new Date(expiresAt);
}

// Token refresh mutex to prevent concurrent token refreshes
let tokenRefreshPromise: Promise<void> | null = null;

/**
 * Checks if the current IGDB token is valid (exists and not expired).
 * Returns true if the token is valid, false otherwise.
 *
 * A token is considered valid if it exists and its expiration date is at
 * least 5 minutes in the future.
 */
export function isIgdbTokenValid(): boolean {
	const token = getEnv('IGDB_ACCESS_TOKEN');
	if (!token) return false;

	const expiration = getIgdbExpiration();
	if (!expiration) return false;

	// Check if token is expired (with 1-minute buffer, as connectIgdb uses this)
	const ONE_MINUTE_MS = 1 * 60 * 1000;
	const now = Date.now();
	return expiration.getTime() > now + ONE_MINUTE_MS;
}

/**
 * Ensures a valid IGDB token is available for API calls.
 *
 * If the token is missing or expired, it will reconnect to IGDB.
 *
 * Uses a mutex pattern to prevent concurrent token refreshes when
 * multiple requests detect an expired token simultaneously.
 *
 * Returns true if a valid token is available, false otherwise.
 */
export async function ensureValidIgdbToken(): Promise<boolean> {
	if (isIgdbTokenValid()) {
		return true;
	}

	if (tokenRefreshPromise) {
		try {
			await tokenRefreshPromise;
			// Re-check after waiting for an ongoing refresh
			if (isIgdbTokenValid()) {
				return true;
			}
		} catch (error) {
			logger.warn(
				'Previous IGDB token refresh attempt failed, current call will try again.',
				error,
			);
		}
	}

	tokenRefreshPromise = (async () => {
		try {
			logger.info(
				'ensureValidIgdbToken: Token invalid or missing, attempting to connect/refresh via connectIgdb.',
			);
			await connectIgdb(); // connectIgdb now handles caching and fetching
		} finally {
			tokenRefreshPromise = null; // Release mutex
		}
	})();

	await tokenRefreshPromise;

	return isIgdbTokenValid();
}
