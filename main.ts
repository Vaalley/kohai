import { Hono } from "hono";
import { getEnv, isProduction } from "./config/config.ts";
import { connectMongo } from "./db/mongo.ts";
import { setupRoutes } from "./api/routes.ts";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { Logger, LogLevel } from "@zilla/logger";
import { connectIgdb } from "./utils/igdb.ts";
import { closeServer, startServer } from "./utils/server.ts";

export const logger = new Logger();

// Main entry point
async function main() {
	const startTime = Date.now();

	// Set up logger
	Logger.level = isProduction() ? LogLevel.INFO : LogLevel.DEBUG;

	// Create a new AbortController for the server
	const ac = new AbortController();

	// Connect to MongoDB
	try {
		await connectMongo();
	} catch (error) {
		logger.error("❌ Error connecting to MongoDB:", error);
		closeServer(ac);
	}

	// Connect to IGDB
	try {
		await connectIgdb();
	} catch (error) {
		logger.error("❌ Error connecting to IGDB:", error);
		closeServer(ac);
	}

	// Create a new Hono app
	const app = new Hono();

	// Enable CORS
	app.use(cors({
		credentials: true,
		origin: getEnv("CORS_ORIGIN"),
	}));

	// Enable secure headers
	app.use(secureHeaders());

	// Register routes
	setupRoutes(app);

	// Get port and hostname from environment and if not set, default to 3333 and 127.0.0.1 respectively
	const PORT = getEnv("PORT", "3333");
	const HOSTNAME = getEnv("HOSTNAME", "127.0.0.1");

	// Start the server
	startServer(ac, app, PORT, HOSTNAME, startTime);
}

main();
