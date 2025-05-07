import * as v from '@valibot/valibot';
import { ObjectId } from 'mongodb';
import { MediaType } from './mediaTag.ts';

export const UserContributionSchema = v.object({
	_id: v.optional(v.instance(ObjectId)),
	userId: v.instance(ObjectId),
	mediaSlug: v.string(),
	mediaType: v.enum(MediaType),
	tag: v.string(),
	timestamp: v.date(),
	updated_at: v.date(),
});

export type UserContribution = v.InferOutput<typeof UserContributionSchema>;
