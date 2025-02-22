import { getEnv } from "../config/config.ts";
import { Collection, Db, Document, MongoClient } from "mongodb";
import { Logger } from "@zilla/logger";

let client: MongoClient;

const logger = new Logger();

/**
 * Connects to the MongoDB instance specified by the MONGODB_URI environment
 * variable. This function should be called once at application startup to
 * initialize the connection.
 *
 * @returns A promise that resolves when the connection is established.
 */
export async function connectMongo(): Promise<void> {
	const uri = getEnv("MONGODB_URI");
	logger.info(`🔄 Attempting MongoDB connection... 🗃️`);

	try {
		client = await MongoClient.connect(uri, {
			serverSelectionTimeoutMS: 10000,
			timeoutMS: 10000,
		});

		// Verify connection
		await isConnected();
		logger.info("✅ Successfully connected to MongoDB! 🔗");
	} catch (err) {
		logger.error("❌ MongoDB connection failed:", err);
	}
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
		logger.error("❌ MongoDB connection failed:", err);
		return false;
	}
}

/**
 * Closes the connection to the MongoDB client.
 *
 * @returns A promise that resolves when the client connection is closed.
 */
export async function closeMongo(): Promise<void> {
	await client.close();
	logger.info("✅ Closed MongoDB connection. 🗑️");
}
