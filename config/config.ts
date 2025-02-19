import "jsr:@std/dotenv/load";
import { Logger } from "@zilla/logger";

const logger = new Logger();

// Gets an environment variable by key
export function getEnv(key: string, defaultValue: string = ""): string {
	const value = Deno.env.get(key) ?? defaultValue;

	if (value == "") {
		logger.warn(
			`⚠️ Warning: Environment variable \`${key}\` is not set`,
		);
	}

	return value;
}

// Returns true if the app is running in production mode
export function isProduction(): boolean {
	return getEnv("ENV") == "production";
}
