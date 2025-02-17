import { Hono } from "hono";
import { getEnv } from "./config/config.ts";
import { connectMongo } from "./db/mongo.ts";
import { setupRoutes } from "./api/routes.ts";
import { cors } from "hono/cors";

// Main entry point
async function main() {
	const startTime = Date.now();

	// Connect to MongoDB
	await connectMongo();

	// Create a new Hono app
	const app = new Hono();

	// Enable CORS
	app.use("*", cors());

	// Get port from environment and if not set, default to 3000
	const PORT = getEnv("PORT") ?? 3000;

	// Register routes
	setupRoutes(app);

	// Calculate startup time and log it along with the port
	const startupTime = Date.now() - startTime;
	console.log(
		`🆙 Server starting on port ${PORT} (startup took ${startupTime} ms)`,
	);

	// Start the server
	try {
		Deno.serve({ port: Number(PORT) }, app.fetch);
	} catch (error) {
		console.error(error);
	}
}

main();
