/**
 * Format uptime in a human-readable format
 * @param seconds - Uptime in seconds
 * @returns Formatted uptime string
 */
export function formatUptime(seconds: number): string {
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
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
