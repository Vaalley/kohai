import { getCollection } from './mongo.ts';
import { logger } from '@utils/logger.ts';

/**
 * Creates database indexes and constraints for optimal performance and data integrity.
 * This should be run on application startup.
 */
export async function createIndexes(): Promise<void> {
	try {
		logger.info('🧩 Creating database indexes...');

		// Users collection indexes
		const usersCollection = getCollection('users');
		await usersCollection.createIndex({ email: 1 }, { unique: true });
		await usersCollection.createIndex({ username: 1 }, { unique: true });
		await usersCollection.createIndex({ created_at: -1 });
		await usersCollection.createIndex({ last_login: -1 });
		logger.info('📇 Users collection indexes created');

		// MediaTags collection indexes
		const mediaTagsCollection = getCollection('mediaTags');
		await mediaTagsCollection.createIndex({ mediaSlug: 1, mediaType: 1 }, { unique: true });
		await mediaTagsCollection.createIndex({ mediaType: 1 });
		await mediaTagsCollection.createIndex({ created_at: -1 });
		logger.info('🏷️ MediaTags collection indexes created');

		// UserContributions collection indexes
		const userContributionsCollection = getCollection('userContributions');
		await userContributionsCollection.createIndex({ userId: 1, mediaSlug: 1, mediaType: 1, tag: 1 }, {
			unique: true,
		});
		await userContributionsCollection.createIndex({ userId: 1 });
		await userContributionsCollection.createIndex({ mediaSlug: 1, mediaType: 1 });
		await userContributionsCollection.createIndex({ tag: 1 });
		await userContributionsCollection.createIndex({ timestamp: -1 });
		logger.info('🧾 UserContributions collection indexes created');

		logger.info('✅ All database indexes created successfully');
	} catch (error) {
		logger.error('❌ Error creating database indexes:', error);
		throw error;
	}
}

/**
 * Validates that required collections exist and have proper structure.
 * This should be run on application startup after indexes are created.
 */
export async function validateCollections(): Promise<void> {
	try {
		logger.info('🧪 Validating database collections...');

		// Check users collection
		const usersCollection = getCollection('users');
		const usersCount = await usersCollection.countDocuments({});
		logger.info(`📇 Users collection validated, ${usersCount} documents found`);

		// Check mediaTags collection
		const mediaTagsCollection = getCollection('mediaTags');
		const mediaTagsCount = await mediaTagsCollection.countDocuments({});
		logger.info(`🏷️ MediaTags collection validated, ${mediaTagsCount} documents found`);

		// Check userContributions collection
		const userContributionsCollection = getCollection('userContributions');
		const contributionsCount = await userContributionsCollection.countDocuments({});
		logger.info(`🧾 UserContributions collection validated, ${contributionsCount} documents found`);

		logger.info('✅ All database collections validated successfully');
	} catch (error) {
		logger.error('❌ Error validating database collections:', error);
		throw error;
	}
}
