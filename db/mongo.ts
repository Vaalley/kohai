import { getEnv } from "../config/config.ts";
import { Collection, Db, Document, MongoClient } from "mongodb";
import { Logger } from "@zilla/logger";

let client: MongoClient;

const logger = new Logger();

// Connect to MongoDB
export async function connectMongo(): Promise<void> {
	const uri = getEnv("MONGODB_URI");
	logger.info(`🔄 Attempting MongoDB connection... 🗃️`);

	try {
		client = await MongoClient.connect(uri, {
			serverSelectionTimeoutMS: 10000,
		});

		// Verify connection
		await client.db().admin().ping();
		logger.info("✅ Successfully connected to MongoDB! 🔗");
	} catch (err) {
		logger.error("❌ MongoDB connection failed:", err);
	}
}

// Gets a collection by name
export function getCollection<T extends Document>(
	collectionName: string,
): Collection<T> {
	const dbName = getEnv("DB_NAME");

	const db: Db = client.db(dbName);
	const collection = db.collection<T>(collectionName);

	if (!collection) {
		logger.error(`❌ Failed to get collection: ${collectionName}`);
	}
	return collection;
}
