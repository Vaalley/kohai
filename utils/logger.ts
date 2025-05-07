import { Logger, LogLevel } from '@zilla/logger';
import { isProduction } from '@config/config.ts';

export const logger = new Logger();

// Set the logger level based on the environment
Logger.level = isProduction() ? LogLevel.INFO : LogLevel.DEBUG;
