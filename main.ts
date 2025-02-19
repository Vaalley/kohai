import { Hono } from "hono";
import { getEnv, isProduction } from "./config/config.ts";
import { connectMongo } from "./db/mongo.ts";
import { setupRoutes } from "./api/routes.ts";
import { cors } from "hono/cors";
import { Logger, LogLevel } from "@zilla/logger";

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
	app.use("*", cors());

	// Get port from environment and if not set, default to 3000
	const PORT = getEnv("PORT", "3333");

	// Register routes
	setupRoutes(app);

	// Calculate startup time and log it along with the port
	const startupTime = Date.now() - startTime;
	logger.info(
		`🔄 Server starting on port ${PORT} (startup took ${startupTime} ms) 🎚️`,
	);

	// Start the server
	try {
		Deno.serve({ port: Number(PORT) }, app.fetch);
		logger.info(
			`✅ Server started on http://localhost:${PORT} 🚀`,
		);
	} catch (error) {
		logger.error("❌ Error starting server:", error);
	}
}

main();
