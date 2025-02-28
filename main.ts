import { Hono } from "hono";
import { getEnv, isProduction } from "./config/config.ts";
import { connectMongo } from "./db/mongo.ts";
import { setupRoutes } from "./api/routes.ts";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { Logger, LogLevel } from "@zilla/logger";
import { connectIgdb } from "./utils/igdb.ts";

const logger = new Logger();

// Main entry point
async function main() {
	const startTime = Date.now();

	// Set up logger
	Logger.level = isProduction() ? LogLevel.INFO : LogLevel.DEBUG;

	// Connect to MongoDB
	await connectMongo();

	// Create a new Hono app
	const app = new Hono();

	// Enable CORS
	app.use(cors({
		credentials: true,
		origin: getEnv("CORS_ORIGIN"),
	}));

	// Enable secure headers
	app.use(secureHeaders());

	// Get port and hostname from environment and if not set, default to 3333 and 127.0.0.1 respectively
	const PORT = getEnv("PORT", "3333");
	const HOSTNAME = getEnv("HOSTNAME", "127.0.0.1");

	// Connect to IGDB
	await connectIgdb();

	// Register routes
	setupRoutes(app);

	// Start the server
	try {
		Deno.serve({
			port: Number(PORT),
			hostname: HOSTNAME,
			onListen({ port, hostname }) {
				const startupTime = Date.now() - startTime;
				logger.info(
					`✅ Server started at http://${hostname}:${port}`,
				);
				logger.info(
					`startup took ${startupTime} ms ⏰`,
				);
			},
		}, app.fetch);
	} catch (error) {
		logger.error("❌ Error starting server:", error);
	}
}

main();
