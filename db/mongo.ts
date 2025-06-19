import { Collection, Db, DeleteResult, Document, MongoClient, MongoClientOptions, ObjectId } from 'mongodb';
import { getEnv } from '@config/config.ts';
import { logger } from '@utils/logger.ts';
import { User } from '@models/user.ts';

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
	const uri = getEnv('MONGODB_URI');

	client = await MongoClient.connect(uri, {
		connectTimeoutMS: 10000,
		timeoutMS: 10000,
	} as MongoClientOptions);

	// Verify connection
	await isConnected();

	// Determine if it's a local or remote connection for logging
	let connectionType = 'remote';
	const lowerCaseUri = uri.toLowerCase();
	if (lowerCaseUri.includes('localhost') || lowerCaseUri.includes('127.0.0.1') || lowerCaseUri.includes('mongo:')) {
		connectionType = 'local Docker';
	}

	logger.info(`✅ Successfully connected to ${connectionType} MongoDB! 🔗`);
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
	const dbName = getEnv('DB_NAME');

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
		logger.error('❌ MongoDB connection verification failed:', err);
		throw err;
	}
}

/**
 * Retrieves a user document from the 'users' collection by its ID.
 *
 * @param id - The string representation of the user's ObjectId.
 * @returns A promise that resolves to the User document if found, or null if no user is found with the given ID.
 */
export async function getUserById(id: string): Promise<User> {
	if (!ObjectId.isValid(id)) {
		throw new Error(`Invalid user ID format: ${id}`);
	}

	const collection = getCollection<User>('users');

	const user = await collection.findOne({ _id: new ObjectId(id) });
	if (!user) {
		throw new Error(`User with ID ${id} not found.`);
	}
	return user;
}

/**
 * Deletes a user document from the 'users' collection by its ID.
 *
 * @param id - The string representation of the user's ObjectId.
 * @returns A promise that resolves to the result of the deletion operation.
 * @throws {Error} If the user ID is invalid or if the user is not found.
 */
export async function deleteUserById(id: string): Promise<DeleteResult> {
	if (!ObjectId.isValid(id)) {
		throw new Error(`Invalid user ID format: ${id}`);
	}

	const collection = getCollection<User>('users');

	const user = await collection.deleteOne({ _id: new ObjectId(id) });
	if (!user) {
		throw new Error(`User with ID ${id} not found.`);
	}
	return user;
}
