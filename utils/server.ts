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
 *
 * @returns The server object.
 */
export function startServer(
	app: Hono,
	port: string,
	hostname: string,
	startTime: number,
): Deno.HttpServer {
	logger.info("🔄 Starting server... 🎛️");

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
 * Closes the server/app by exiting the process with the given exit code.
 *
 * @param exitCode - Optional exit code to terminate the process. Defaults to 0.
 * @returns void
 */
export function closeApp(exitCode: number = 0) {
	logger.info(`🚨 Closing server with exit code ${exitCode}`);
	Deno.exit(exitCode);
}
