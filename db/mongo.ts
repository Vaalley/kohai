import { Collection, Db, Document, MongoClient } from "mongodb";
import { getEnv } from "@config/config.ts";
import { logger } from "@utils/logger.ts";

let client: MongoClient;

/**
 * Connects to the MongoDB instance specified by the MONGODB_URI environment
 * variable. This function should be called once at application startup to
 * initialize the connection.
 *
 * @returns A promise that resolves when the connection is established.
 */
export async function connectMongo(): Promise<void> {
	const startTime = Date.now();
	logger.info(`🔄 Attempting MongoDB connection... 🗃️`);
	const uri = getEnv("MONGODB_URI");

	client = await MongoClient.connect(uri, {
		connectTimeoutMS: 10000,
		timeoutMS: 10000,
	});

	// Verify connection
	await isConnected();
	logger.info("✅ Successfully connected to MongoDB! 🔗");
	logger.info(`⏲️ MongoDB connection time: ${Date.now() - startTime}ms`);
}

/**
 * Retrieves a MongoDB collection by its name.
 *
 * @template T - The type of documents contained in the collection.
 * @param collectionName - The name of the collection to retrieve.
 * @returns The MongoDB collection of type T.
 * Logs an error if the collection cannot be retrieved.
 */
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

/**
 * Checks if the MongoDB connection is established.
 *
 * @returns A boolean indicating whether the connection is established.
 */
export async function isConnected(): Promise<boolean> {
	try {
		await client.db().admin().ping();
		return true;
	} catch (err) {
		logger.error("❌ MongoDB connection verification failed:", err);
		throw err;
	}
}
