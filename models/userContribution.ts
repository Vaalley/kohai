import { z } from "zod";
import { ObjectId } from "mongodb";

export const UserContributionSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),
	userId: z.instanceof(ObjectId),
	mediaSlug: z.string(),
	mediaType: z.enum(["video-game", "movie"]),
	tag: z.string(),
	timestamp: z.date(),
	updated_at: z.date(),
});

export type UserContribution = z.infer<typeof UserContributionSchema>;
