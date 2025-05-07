import 'jsr:@std/dotenv/load';
import { logger } from '@utils/logger.ts';

/**
 * Retrieves the value of an environment variable.
 *
 * @param key - The name of the environment variable to retrieve.
 * @param defaultValue - A default value to return if the environment variable is not set.
 * @returns The value of the environment variable, or the default value if not set.
 * Logs a warning if the environment variable is not set and the default is used.
 */
export function getEnv(key: string, defaultValue: string = ''): string {
	const value = Deno.env.get(key) ?? defaultValue;

	if (value == '') {
		logger.warn(
			`⚠️ Warning: Environment variable \`${key}\` is not set`,
		);
	}

	return value;
}

/**
 * Sets the value of an environment variable.
 *
 * @param key - The name of the environment variable to set.
 * @param value - The value to assign to the environment variable.
 */
export function setEnv(key: string, value: string) {
	if (!key.trim()) {
		logger.warn(
			`⚠️ Warning: Attempting to set env variable with empty key`,
		);
		return;
	}

	if (value.trim() == '') {
		logger.warn(
			`⚠️ Warning: Attempting to set env variable \`${key}\` with empty value`,
		);
		return;
	}

	Deno.env.set(key, value);
}

/**
 * Returns true if the app is running in production mode.
 *
 * This function checks the value of the "ENV" environment variable. If it is
 * set to "production", this function returns true. Otherwise, it returns false.
 *
 * @returns True if the app is running in production mode, false otherwise.
 */
export function isProduction(): boolean {
	return getEnv('ENV') == 'production';
}
