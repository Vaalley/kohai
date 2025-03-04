import { Context, Hono } from "hono";
import { LoginSchema, RegisterSchema } from "../models/auth.ts";
import {
	handleTokenRefresh as refreshToken,
	login,
	logout,
	me,
	register,
} from "../handlers/auth.ts";
import { apiKeyAuth } from "./middleware/apiKeyAuth.ts";
import { zValidator } from "../utils/validator-wrapper.ts";
import { jwtAuth } from "./middleware/jwtAuth.ts";
import { logger } from "../utils/logger.ts";
import { igdbAuth } from "./middleware/igdbAuth.ts";

// Register routes
export function setupRoutes(app: Hono) {
	logger.info("🔄 Registering routes... 🛣️");

	//  -----------------
	// |  Health checks  |
	//  -----------------
	app.get("/livez", (c: Context) => c.json({ status: "ok" }));
	app.get("/readyz", (c: Context) => c.json({ status: "ok" }));
	app.get("/startupz", (c: Context) => c.json({ status: "ok" }));

	//  ---------------
	// |  Auth routes  |
	//  ---------------
	const auth = app.basePath("/auth");

	auth.post("/register", zValidator("json", RegisterSchema), register);
	auth.post("/login", zValidator("json", LoginSchema), login);
	auth.post("/refresh", refreshToken);
	auth.post("/logout", logout);
	auth.get("/me", me);

	//  ------------------
	// |  Test JWT route  |
	//  ------------------
	const jwt = app.basePath("/jwt").use(jwtAuth());
	jwt.get("/", (c: Context) => {
		return c.json({ message: "You are authorized!" });
	});

	app.get("/igdb", igdbAuth(), (c: Context) => {
		return c.json({ message: "Hello, World!" });
	});

	//  ------------------------
	// |  Protected API routes  |
	//  ------------------------
	const api = app.basePath("/api")
		.use(apiKeyAuth());

	api.get("/", (c: Context) => c.json({ message: "Hello, World!" }));

	logger.info("✅ Routes registered successfully 🪄");
}
