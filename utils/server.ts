import { Hono } from 'hono';
import { logger } from '@utils/logger.ts';
import { closeMongo } from '@db/mongo.ts';

/**
 * Starts a Hono server with the given app, port, hostname, and AbortController.
 *
 * @param ac - The AbortController to use for shutting down the server.
 * @param app - The Hono app to use for the server.
 * @param port - The port number to listen on.
 * @param hostname - The hostname to listen on.
 * @param startTime - The time the server started, for logging purposes.
 *
 * @returns The server object.
 */
export function startServer(
	app: Hono,
	port: string,
	hostname: string,
	startTime: number,
): Deno.HttpServer {
	logger.info('🔄 Starting server... 🎛️');

	const server = Deno.serve({
		port: Number(port),
		hostname: hostname,
		onListen({ port, hostname }) {
			logger.info(
				`✅ Server started at http://${hostname}:${port} 🚀`,
			);
			logger.info(
				`⏲️ Server startup took ${Date.now() - startTime} ms ⏰`,
			);
		},
	}, app.fetch);

	return server;
}

/**
 * Gracefully shuts down the application, closing all connections.
 *
 * @param exitCode - Optional exit code to terminate the process. Defaults to 0.
 * @returns void
 */
export async function closeApp(exitCode: number = 0) {
	logger.info(`🚨 Starting graceful shutdown with exit code ${exitCode}`);

	try {
		// Close MongoDB connection
		await closeMongo();
		logger.info('✅ MongoDB connection closed');
	} catch (error) {
		logger.error('❌ Error closing MongoDB connection:', error);
	}

	logger.info('👋 Goodbye!');
	Deno.exit(exitCode);
}

/**
 * Sets up signal handlers for graceful shutdown.
 * Uses platform-appropriate signals for each operating system.
 */
export function setupSignalHandlers() {
	const isWindows = Deno.build.os === 'windows';

	// Handle SIGINT (Ctrl+C) - works on all platforms
	Deno.addSignalListener('SIGINT', async () => {
		logger.info('\n📥 Received SIGINT signal');
		await closeApp(0);
	});

	// Handle SIGTERM - only available on unix
	if (!isWindows) {
		Deno.addSignalListener('SIGTERM', async () => {
			logger.info('\n📥 Received SIGTERM signal');
			await closeApp(0);
		});
	} else {
		// Handle SIGBREAK - only available on windows
		Deno.addSignalListener('SIGBREAK', async () => {
			logger.info('\n📥 Received SIGBREAK signal');
			await closeApp(0);
		});
	}
}
