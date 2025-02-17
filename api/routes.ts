import { Hono } from "hono";
import { LoginSchema, RegisterSchema } from "../models/auth.ts";
import { login, logout, me, register } from "../handlers/auth.ts";
import { apiKeyAuth } from "./middleware/apiKeyAuth.ts";
import { zValidator } from "@hono/zod-validator";
import { jwt } from "hono/jwt";
import { getEnv } from "../config/config.ts";

// Register routes
export function setupRoutes(app: Hono) {
	console.log("🔄 Registering routes... 🛣️");

	// Health checks
	app.get("/livez", (c) => c.json({ status: "ok" }));
	app.get("/readyz", (c) => c.json({ status: "ok" }));
	app.get("/startupz", (c) => c.json({ status: "ok" }));
	// app.get("/metrics", (c) => c.json({ metrics: "TODO" }));

	// Auth routes
	const auth = app.basePath("/auth");
	// .use(rateLimit());

	auth.post("/register", zValidator("json", RegisterSchema), register);
	auth.post("/login", zValidator("json", LoginSchema), login);
	auth.post("/logout", logout);
	auth.get("/me", me);

	// Test JWT route
	app.get("/test-jwt", (c, next) => {
		const jwtMiddleware = jwt({
			secret: getEnv("JWT_SECRET"),
			cookie: "session_token",
		});
		return jwtMiddleware(c, next);
	}, (c) => {
		return c.json({ message: "You are authorized!" });
	});

	// Protected API routes
	const api = app.basePath("/api")
		.use(apiKeyAuth());

	api.get("/", (c) => c.json({ message: "Hello, World!" }));

	console.log("✅ Routes registered successfully");
}
