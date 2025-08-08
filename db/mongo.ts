import { Collection, Db, DeleteResult, Document, MongoClient, MongoClientOptions, UpdateResult } from 'mongodb';
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
 * Retrieves a user document from the 'users' collection by its username.
 *
 * @param username - The username of the user to retrieve.
 * @returns A promise that resolves to the User document if found, or null if no user is found with the given username.
 */
export async function getUserByUsername(username: string): Promise<User> {
	const collection = getCollection<User>('users');

	const user = await collection.findOne({ username });
	if (!user) {
		throw new Error(`User with username ${username} not found.`);
	}
	return user;
}

/**
 * Deletes a user document from the 'users' collection by its username.
 *
 * @param username - The username of the user to delete.
 * @returns A promise that resolves to the result of the deletion operation.
 * @throws {Error} If the username is invalid or if the user is not found.
 */
export async function deleteUserByUsername(username: string): Promise<DeleteResult> {
	const collection = getCollection<User>('users');

	const user = await collection.deleteOne({ username });
	if (!user) {
		throw new Error(`User with username ${username} not found.`);
	}
	return user;
}

/**
 * Promotes a user to admin by setting the isadmin flag to true.
 *
 * @param username - The username of the user to promote.
 * @returns The MongoDB UpdateResult of the operation.
 * @throws {Error} If the user is not found.
 */
export async function promoteUserToAdmin(username: string): Promise<UpdateResult<User>> {
  const collection = getCollection<User>('users');

  const result = await collection.updateOne({ username }, { $set: { isadmin: true, updated_at: new Date() } });
  if (result.matchedCount === 0) {
    throw new Error(`User with username ${username} not found.`);
  }
  return result as UpdateResult<User>;
}
