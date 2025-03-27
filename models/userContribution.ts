import { z } from "zod";
import { ObjectId } from "mongodb";

export const UserContributionSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),
	userId: z.instanceof(ObjectId),
	mediaId: z.string(), // IGDB ID
	mediaType: z.enum(["video-game", "movie"]),
	tags: z.array(z.string()).max(3),
	timestamp: z.date(),
	updated_at: z.date(),
});

export type UserContribution = z.infer<typeof UserContributionSchema>;
