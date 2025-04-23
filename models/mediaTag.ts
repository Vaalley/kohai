import * as v from "@valibot/valibot";
import { ObjectId } from "mongodb";

export enum MediaType {
	VIDEO_GAME = "video-game",
	MOVIE = "movie",
}

export const MediaTagSchema = v.object({
	_id: v.optional(v.instance(ObjectId)),
	mediaSlug: v.string(),
	mediaType: v.enum(MediaType),
	tags: v.array(v.string()),
	updated_at: v.date(),
});

export type MediaTag = v.InferOutput<typeof MediaTagSchema>;
