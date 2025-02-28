import { getEnv, setEnv } from "../config/config.ts";
import { logger } from "../main.ts";

/**
 * Establishes a connection to the IGDB API.
 *
 * Retrieves an access token from the IGDB server using the client ID and
 * client secret environment variables. The access token is then stored in
 * the environment variable `IGDB_ACCESS_TOKEN`.
 */
export async function connectIgdb() {
	try {
		logger.info("🔄 Attempting IGDB connection... 🎮");
		await fetch(
			`https://id.twitch.tv/oauth2/token?client_id=${
				getEnv("IGDB_CLIENT_ID")
			}&client_secret=${
				getEnv("IGDB_CLIENT_SECRET")
			}&grant_type=client_credentials`,
			{
				method: "POST",
				headers: {
					"User-Agent":
						"Kohai (https://github.com/Vaalley/kohai)",
					"Accept": "application/json",
					"Content-Type": "application/json",
				},
			},
		)
			.then((res) => res.json())
			.then((data) => {
				setEnv("IGDB_ACCESS_TOKEN", data.access_token);

				setEnv("IGDB_EXPIRES_IN", data.expires_in);

				logger.info("✅ Connected to IGDB 🔗");
			});
	} catch (error) {
		logger.error("❌ Error connecting to IGDB:", error);
	}
}
