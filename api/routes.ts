import { Context, Hono } from "hono";
import { vValidator } from "@hono/valibot-validator";
import { LoginSchema, RegisterSchema } from "../models/auth.ts";
import { apiKeyAuth } from "./middleware/apiKeyAuth.ts";
import { igdbAuth } from "./middleware/igdbAuth.ts";
import { jwtAuth } from "./middleware/jwtAuth.ts";
import { handleTokenRefresh as refreshToken, login, logout, me, register } from "../handlers/auth.ts";
import { search } from "../handlers/igdb.ts";
import { health } from "../handlers/healthcheck.ts";
import { logger } from "../utils/logger.ts";

// Register routes
export function setupRoutes(app: Hono) {
	logger.info("🔄 Registering routes... 🛣️");

	//  ----------------
	// |  Health check  |
	//  ----------------
	app.get("/health", health);

	//  ---------------
	// |  Auth routes  |
	//  ---------------
	const auth = app.basePath("/auth");

	auth.post("/register", vValidator("json", RegisterSchema), register);
	auth.post("/login", vValidator("json", LoginSchema), login);
	auth.post("/refresh", refreshToken);
	auth.post("/logout", logout);
	auth.get("/me", me);

	//  ---------------
	// |  IGDB routes  |
	//  ---------------
	const igdb = app.basePath("/igdb").use(igdbAuth());

	igdb.post("/games/search", search);

	//  ------------------------
	// |  Protected API routes  |
	//  ------------------------
	const api = app.basePath("/api").use(apiKeyAuth());

	api.get("/", (c: Context) => c.json({ message: "Hello, World!" }));

	logger.info("✅ Routes registered successfully 🪄");

	//  ------------------
	// |  Test JWT route  |
	//  ------------------
	const jwt = app.basePath("/jwt").use(jwtAuth());

	jwt.get("/", (c: Context) => {
		return c.json({ message: "You are authorized!" });
	});
}
