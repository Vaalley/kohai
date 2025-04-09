import { z } from "zod";
import { ObjectId } from "mongodb";

export const MediaTagSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),
	mediaId: z.string(), // IGDB ID
	mediaType: z.enum(["video-game", "movie"]),
	tags: z.array(z.string()),
	updated_at: z.date(),
});

export type MediaTag = z.infer<typeof MediaTagSchema>;
