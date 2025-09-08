import { Hono } from 'hono';
import { getEnv, isProduction } from '@config/config.ts';
import { connectMongo } from '@db/mongo.ts';
import { createIndexes, validateCollections } from '@db/indexes.ts';
import { setupRoutes } from '@api/routes.ts';
import { basicRateLimiter } from '@api/middleware/rateLimiter.ts';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { connectIgdb } from '@utils/igdb.ts';
import { closeApp, setupSignalHandlers, startServer } from '@utils/server.ts';
import { logger } from '@utils/logger.ts';

// Main entry point
async function main() {
	const startTime = Date.now();

	// Connect to MongoDB and IGDB simultaneously
	try {
		await Promise.all([
			connectMongo().catch((error) => {
				logger.error(
					'❌ Error connecting to MongoDB:',
					error,
				);
				throw new Error('MongoDB connection failed');
			}),
			connectIgdb().catch((error) => {
				logger.error(
					'❌ Error connecting to IGDB:',
					error,
				);
				throw new Error('IGDB connection failed');
			}),
		]);

		// Create database indexes and validate collections
		await createIndexes();
		await validateCollections();
	} catch (error) {
		logger.error(
			'❌ Error connecting to services, shutting down server:',
			error,
		);
		closeApp(1);
	}

	// Create a new Hono app
	const app = new Hono();

	// Get port and hostname from environment
	const PORT = getEnv('PORT', '2501');
	const HOSTNAME = getEnv('HOSTNAME', '0.0.0.0');

	// Apply global rate limiting
	app.use('*', basicRateLimiter);

	// CORS configuration
	const corsOrigin = getEnv('CORS_ORIGIN') || (isProduction() ? '' : '*');
	app.use(cors({
		origin: corsOrigin || '*',
		credentials: true,
	}));

	// Enable secure headers
	app.use(secureHeaders());

	// Register routes
	setupRoutes(app);

	// Setup signal handlers for graceful shutdown
	setupSignalHandlers();

	// Start the server
	try {
		startServer(app, PORT, HOSTNAME, startTime);
	} catch (error) {
		logger.error('❌ Error starting server:', error);
		await closeApp(1);
	}
}

main();
