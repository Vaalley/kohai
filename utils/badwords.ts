const badWords = [
	'nigger',
	'faggot',
	'kike',
	'chink',
	'spic',
	'gook',
	'rape',
	'rapist',
];

const leetMap: Record<string, string> = {
	'0': 'o',
	'1': 'i',
	'3': 'e',
	'4': 'a',
	'5': 's',
	'7': 't',
	'@': 'a',
	'$': 's',
	'!': 'i',
	'|': 'i',
};

// Normalize a tag: lowercase, remove spaces/punctuation, convert leetspeak
function normalizeTag(tag: string): string {
	let normalized = tag.toLowerCase();
	normalized = normalized.replace(/[^a-z0-9@!$|]/g, ''); // remove spaces & symbols
	normalized = normalized.split('')
		.map((char) => leetMap[char] || char)
		.join('');
	return normalized;
}

export function containsBadWords(tags: string[]): boolean {
	for (const tag of tags) {
		const normalized = normalizeTag(tag);
		for (const badWord of badWords) {
			if (normalized.includes(badWord)) {
				return true;
			}
		}
	}
	return false;
}
