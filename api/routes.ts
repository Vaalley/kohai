import { Hono } from 'hono';
import { vValidator } from '@hono/valibot-validator';

import { LoginSchema, RegisterSchema } from '@models/auth.ts';

import { apiKeyAuth } from '@api/middleware/apiKeyAuth.ts';
import { igdbAuth } from '@api/middleware/igdbAuth.ts';
import { jwtAuth } from '@/api/middleware/jwtAuth.ts';
import { authRateLimiter, basicRateLimiter } from '@api/middleware/rateLimiter.ts';

import { handleTokenRefresh as refreshToken, login, logout, me, register } from '@handlers/auth.ts';
import { deleteUser, getUser, getUserStats } from '@handlers/users.ts';
import { createTags, getGame, getTags, search } from '@handlers/igdb.ts';
import { health } from '@handlers/healthcheck.ts';

import { logger } from '@utils/logger.ts';

// Register routes
export function setupRoutes(app: Hono) {
	logger.info('🔄 Registering routes... 🛣️');

	const api = app.basePath('/api').use(basicRateLimiter).use(apiKeyAuth());

	//  ----------------
	// |  Health check  |
	//  ----------------

	app.all('/health', health);

	//  ---------------
	// |  Auth routes  |
	//  ---------------
	const auth = app.basePath('/auth');

	auth.post('/register', authRateLimiter, vValidator('json', RegisterSchema), register);
	auth.post('/login', authRateLimiter, vValidator('json', LoginSchema), login);
	auth.post('/refresh', refreshToken);
	auth.post('/logout', logout);
	auth.get('/me', me);

	//  ---------------
	// |  Games routes |
	//  ---------------
	const games = app.basePath('/games').use(igdbAuth());

	games.post('/search', basicRateLimiter, search);
	games.get('/gameInfo/:id', getGame);

	//  ---------------
	// |  Tags routes |
	//  ---------------
	const tags = app.basePath('/tags').use(igdbAuth());

	tags.get('/:id', basicRateLimiter, getTags);
	tags.put('/:id', jwtAuth(), createTags);

	//  ---------------
	// |  Users routes |
	//  ---------------
	const users = api.basePath('/users');

	users.get('/:id', getUser);
	users.get('/:id/stats', getUserStats);
	users.delete('/:id', jwtAuth(), deleteUser);

	logger.info('✅ Routes registered successfully 🪄');
}
