const badWords = [
	'faggot',
	'nigger',
	'rape',
];

export function containsBadWords(tags: string[]): boolean {
	for (const tag of tags) {
		for (const badWord of badWords) {
			if (tag.toLowerCase().includes(badWord)) {
				return true;
			}
		}
	}
	return false;
}
