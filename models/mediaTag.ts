import { z } from "zod";
import { ObjectId } from "mongodb";

export const MediaTagSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),
	mediaId: z.instanceof(ObjectId),
	mediaType: z.enum(["video-game", "movie"]),
	tags: z.array(z.object({
		tag: z.string(),
		count: z.number(),
		users: z.array(z.instanceof(ObjectId)),
	})),
	updated_at: z.date(),
});

export type MediaTag = z.infer<typeof MediaTagSchema>;
