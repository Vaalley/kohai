import { Context } from "hono";
import { getEnv } from "@config/config.ts";
import { formatBytes, formatUptime } from "@utils/format.ts";

// Track when the server started
const startTime = new Date();

/**
 * Enhanced health check handler that provides detailed system information
 * @param c - Hono Context
 * @returns JSON response with health status and system information
 */
export function health(c: Context) {
	const uptime = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

	// Get environment using the getEnv function
	const environment = getEnv("ENV", "development");

	// Get memory usage from Deno
	const memoryUsage = Deno.memoryUsage();

	return c.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		uptime: {
			seconds: uptime,
			formatted: formatUptime(uptime),
		},
		environment,
		system: {
			memory: {
				rss: formatBytes(memoryUsage.rss),
				heapTotal: formatBytes(memoryUsage.heapTotal),
				heapUsed: formatBytes(memoryUsage.heapUsed),
				external: formatBytes(memoryUsage.external),
			},
			runtime: {
				name: "Deno",
				version: Deno.version.deno,
				v8: Deno.version.v8,
				typescript: Deno.version.typescript,
			},
			os: {
				platform: Deno.build.os,
				arch: Deno.build.arch,
			},
		},
	});
}
