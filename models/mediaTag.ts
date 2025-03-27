import { z } from "zod";
import { ObjectId } from "mongodb";

export const MediaTagSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),
	mediaId: z.string(), // IGDB ID
	mediaType: z.enum(["video-game", "movie"]),
	tags: z.array(z.object({
		tag: z.string(),
		count: z.number(),
		users: z.array(z.instanceof(ObjectId)),
	})).max(3),
	updated_at: z.date(),
});

export type MediaTag = z.infer<typeof MediaTagSchema>;
