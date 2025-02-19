import "jsr:@std/dotenv/load";
import { Logger } from "@zilla/logger";

const logger = new Logger();

/**
 * Retrieves the value of an environment variable.
 *
 * @param key - The name of the environment variable to retrieve.
 * @param defaultValue - A default value to return if the environment variable is not set.
 * @returns The value of the environment variable, or the default value if not set.
 * Logs a warning if the environment variable is not set and the default is used.
 */
export function getEnv(key: string, defaultValue: string = ""): string {
	const value = Deno.env.get(key) ?? defaultValue;

	if (value == "") {
		logger.warn(
			`⚠️ Warning: Environment variable \`${key}\` is not set`,
		);
	}

	return value;
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
	return getEnv("ENV") == "production";
}
