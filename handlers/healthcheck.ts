import { Context } from "hono";
import { getEnv } from "../config/config.ts";

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

/**
 * Format uptime in a human-readable format
 * @param seconds - Uptime in seconds
 * @returns Formatted uptime string
 */
function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / (3600 * 24));
	const hours = Math.floor((seconds % (3600 * 24)) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	let result = "";
	if (days > 0) result += `${days}d `;
	if (hours > 0) result += `${hours}h `;
	if (minutes > 0) result += `${minutes}m `;
	result += `${remainingSeconds}s`;

	return result;
}

/**
 * Format bytes to a human-readable format
 * @param bytes - Number of bytes
 * @returns Formatted string with appropriate unit
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
