import { Context, Hono } from "hono";
import { LoginSchema, RegisterSchema } from "../models/auth.ts";
import { login, logout, me, register } from "../handlers/auth.ts";
import { apiKeyAuth } from "./middleware/apiKeyAuth.ts";
import { Logger } from "@zilla/logger";
import { zValidator } from "../utils/validator-wrapper.ts";
import { jwtAuth } from "./middleware/jwtAuth.ts";

const logger = new Logger();

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
	auth.post("/logout", logout);
	auth.get("/me", me);

	//  ------------------
	// |  Test JWT route  |
	//  ------------------
	app.get("/test-jwt", jwtAuth(), (c: Context) => {
		return c.json({ message: "You are authorized!" });
	});

	//  ------------------------
	// |  Protected API routes  |
	//  ------------------------
	const api = app.basePath("/api")
		.use(apiKeyAuth());

	api.get("/", (c: Context) => c.json({ message: "Hello, World!" }));

	logger.info("✅ Routes registered successfully 🪄");
}
