import { Hono } from "hono";
import { getEnv } from "./config/config.ts";
import { connectMongo } from "./db/mongo.ts";
import { setupRoutes } from "./api/routes.ts";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { connectIgdb } from "./utils/igdb.ts";
import { closeServer, startServer } from "./utils/server.ts";
import { logger } from "./utils/logger.ts";

// Main entry point
async function main() {
	const startTime = Date.now();

	// Create a new AbortController for the server
	const abortController = new AbortController();

	// Connect to MongoDB
	try {
		await connectMongo();
	} catch (error) {
		logger.error(
			"❌ Error connecting to MongoDB, shutting down server:",
			error,
		);
		closeServer(abortController, 1);
		return;
	}

	// Connect to IGDB
	try {
		await connectIgdb();
	} catch (error) {
		logger.error(
			"❌ Error connecting to IGDB, shutting down server:",
			error,
		);
		closeServer(abortController, 1);
		return;
	}

	// Create a new Hono app
	const app = new Hono();

	// Get port and hostname from environment
	const PORT = getEnv("PORT", "3333");
	const HOSTNAME = getEnv("HOSTNAME", "0.0.0.0");

	// Enable CORS
	app.use(cors({
		credentials: true,
		origin: getEnv("CORS_ORIGIN"),
	}));

	// Enable secure headers
	app.use(secureHeaders());

	// Register routes
	setupRoutes(app);

	// Start the server
	try {
		startServer(abortController, app, PORT, HOSTNAME, startTime);
	} catch (error) {
		logger.error("❌ Error starting server:", error);
		closeServer(abortController, 1);
	}
}

main();
