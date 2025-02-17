import { getEnv } from "../config/config.ts";
import { Collection, Db, Document, MongoClient } from "mongodb";

let client: MongoClient;

// Connect to MongoDB
export async function connectMongo(): Promise<void> {
	const uri = getEnv("MONGODB_URI");
	console.log(`🔄 Attempting MongoDB connection... 🗃️`);

	try {
		client = await MongoClient.connect(uri, {
			serverSelectionTimeoutMS: 10000,
		});

		// Verify connection
		await client.db().admin().ping();
		console.log("✅ Successfully connected to MongoDB!");
	} catch (err) {
		console.error("❌ MongoDB connection failed:", err);
	}
}

// Gets a collection by name
export function getCollection<T extends Document>(
	collectionName: string,
): Collection<T> {
	const dbName = getEnv("DB_NAME");
	console.log(
		`🔄 Accessing collection: ${collectionName} in database: ${dbName} 📑`,
	);

	const db: Db = client.db(dbName);
	const collection = db.collection<T>(collectionName);

	if (!collection) {
		console.error(`❌ Failed to get collection: ${collectionName}`);
	}
	return collection;
}
