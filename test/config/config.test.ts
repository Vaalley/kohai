import { assertEquals } from 'jsr:@std/assert';
import { getEnv, isProduction, setEnv } from '@config/config.ts';

// tests for getEnv
Deno.test("getEnv should return an empty string if the key couldn't be found and no default value is provided", () => {
	const value = getEnv('NON_EXISTENT_VARIABLE');
	assertEquals(value, '');
});

Deno.test('getEnv should return the default value if the environment variable is not set', () => {
	const value = getEnv('NON_EXISTENT_VARIABLE', 'test');
	assertEquals(value, 'test');
});

// tests for isProduction
Deno.test({
	name: "isProduction should return true if the environment variable is set to 'production'",
	ignore: Deno.env.get('ENV') != 'production',
	fn() {
		assertEquals(isProduction(), true);
	},
});

Deno.test({
	name: "isProduction should return false if the environment variable is set to something else than 'production'",
	ignore: Deno.env.get('ENV') == 'production',
	fn() {
		assertEquals(isProduction(), false);
	},
});

// tests for setEnv
Deno.test('setEnv should set the environment variable', () => {
	setEnv('TEST_VARIABLE', 'test');
	assertEquals(Deno.env.get('TEST_VARIABLE'), 'test');
});
