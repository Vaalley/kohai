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

async function main() {
	const startTime = Date.now();

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

		await createIndexes();
		await validateCollections();
	} catch (error) {
		logger.error(
			'❌ Error connecting to services, shutting down server:',
			error,
		);
		closeApp(1);
	}

	const app = new Hono();

	const PORT = getEnv('PORT', '2501');
	const HOSTNAME = getEnv('HOSTNAME', '0.0.0.0');

	const corsOrigin = getEnv('CORS_ORIGIN') || (isProduction() ? '' : '*');
	logger.info(`🌐 CORS origin set to: ${corsOrigin}`);
	
	app.use(cors({
		origin: corsOrigin,
		allowHeaders: ['Content-Type', 'x-api-key', 'Cache-Control', 'Pragma', 'Authorization'],
		allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		credentials: true,
	}));

	app.use('*', basicRateLimiter);

	app.use(secureHeaders());

	setupRoutes(app);

	setupSignalHandlers();

	try {
		startServer(app, PORT, HOSTNAME, startTime);
	} catch (error) {
		logger.error('❌ Error starting server:', error);
		await closeApp(1);
	}
}

main();
