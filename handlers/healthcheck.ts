import { Context } from 'hono';
import { format as formatBytes } from '@std/fmt/bytes';
import { format as formatTime } from '@std/fmt/duration';
import { getEnv } from '@config/config.ts';

// Track when the server started
const startTime = new Date();

/**
 * Enhanced health check handler that provides detailed system information
 * @param c - Hono Context
 * @returns JSON response with health status and system information
 */
export function health(c: Context) {
	const uptime = Math.floor(new Date().getTime() - startTime.getTime());

	const environment = getEnv('ENV');

	const memoryUsage = Deno.memoryUsage();

	return c.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		uptime: {
			ms: uptime,
			formatted: formatTime(uptime, { ignoreZero: true }),
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
				name: 'Deno',
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
