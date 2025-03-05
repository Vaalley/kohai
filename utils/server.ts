import { Hono } from "hono";
import { logger } from "./logger.ts";

/**
 * Starts a Hono server with the given app, port, hostname, and AbortController.
 *
 * @param ac - The AbortController to use for shutting down the server.
 * @param app - The Hono app to use for the server.
 * @param port - The port number to listen on.
 * @param hostname - The hostname to listen on.
 * @param startTime - The time the server started, for logging purposes.
 */
export function startServer(
	ac: AbortController,
	app: Hono,
	port: string,
	hostname: string,
	startTime: number,
) {
	logger.info("🔄 Starting server... 🎛️");

	const server = Deno.serve({
		port: Number(port),
		hostname: hostname,
		signal: ac.signal,
		onListen({ port, hostname }) {
			logger.info(
				`✅ Server started at http://${hostname}:${port} 🚀`,
			);
			logger.info(
				`⏲️ Server startup took ${
					Date.now() - startTime
				} ms ⏰`,
			);
		},
	}, app.fetch);

	server.finished.then(() => logger.info("Server closed ⚡️"));
}

/**
 * Closes the server by aborting the given AbortController.
 *
 * @param ac - The AbortController to abort, which will shut down the server.
 * @param exitCode - Optional exit code to terminate the process after closing the server.
 */
export function closeServer(ac: AbortController, exitCode: number = 0) {
	logger.info(`🚨 Closing server with exit code ${exitCode}...`);
	ac.abort();
	Deno.exit(exitCode);
}
