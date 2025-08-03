import { Hono } from 'hono';

const app = new Hono();

const BASE_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/";

function toBase(num: number, base: number, alphabet: string): string {
	if (num === 0) return alphabet[0];
	let result = '';
	while (num > 0) {
		result = alphabet[num % base] + result;
		num = Math.floor(num / base);
	}
	return result;
}

function fromBase(str: string, base: number, alphabet: string): number {
	let num = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str[str.length - 1 - i];
		const pos = alphabet.indexOf(char);
		if (pos === -1) continue; // Skip characters not in the alphabet
		num += pos * Math.pow(base, i);
	}
	return num;
}

function decodeJSStyle(encoded: string, alphabetKey: string, offset: number, base: number) {
	let result = '';
	const regex = new RegExp(`[${alphabetKey.replace(/\\/g, '\\\\').replace(/]/g, '\\]')}]`, 'g');

	let lastIndex = 0;
	const parts = encoded.split(new RegExp(`([${alphabetKey.replace(/\\/g, '\\\\').replace(/]/g, '\\]')}])`));

	let currentChunk = '';
	for (let i = 0; i < parts.length; i++) {
		if (i % 2 === 0) {
			currentChunk += parts[i];
		} else {
			const delimiter = parts[i];
			const s = currentChunk;

			if (s) {
				let replacedS = s;
				for (let j = 0; j < alphabetKey.length; j++) {
					const charToReplace = alphabetKey[j];
					const replacement = j.toString();
					replacedS = replacedS.split(charToReplace).join(replacement);
				}
				
				const alphabetSub = BASE_ALPHABET.substring(0, base);
				const numFromBase = fromBase(replacedS, base, alphabetSub);

				const charCode = numFromBase - offset;
				result += String.fromCharCode(charCode);
			}
			currentChunk = '';
		}
	}

	return result;
}


async function fetchKwikDirect(kwikLink: string, token: string, kwikSession: string) {
	try {
		const response = await fetch(kwikLink, {
			method: 'POST',
			headers: {
				'Referer': kwikLink,
				'Cookie': `kwik_session=${kwikSession}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: `_token=${token}`,
			redirect: 'manual', // Important to handle the 302 redirect manually
		});

		if (response.status === 302) {
			const location = response.headers.get('Location');
			return location;
		} else {
			return null;
		}
	} catch (error) {
		console.error('Error fetching kwik direct link:', error);
		return null;
	}
}


async function fetchKwikDlink(kwikLink: string, retries = 5): Promise<string | null> {
	if (retries <= 0) {
		return null;
	}

	try {
		const response = await fetch(kwikLink);
		if (!response.ok) {
			return null;
		}

		const text = await response.text();
		const cleanText = text.replace(/(\r\n|\r|\n)/g, "");

		const sessionCookie = response.headers.get('set-cookie');
		const kwikSessionMatch = sessionCookie?.match(/kwik_session=([^;]*)/);
		const kwikSession = kwikSessionMatch ? kwikSessionMatch[1] : '';

		const encodeParamsMatch = cleanText.match(/eval\(function\(h,u,n,t,e,r\)\{.*?\("([^"]+)",\d+,"([^"]+)",(\d+),(\d+),\d+\)\)/);

		if (!encodeParamsMatch) {
			return fetchKwikDlink(kwikLink, retries - 1);
		}

		const [_, encodedString, alphabetKey, offsetStr, baseStr] = encodeParamsMatch;
		const offset = parseInt(offsetStr, 10);
		const base = parseInt(baseStr, 10);
		
		const decodedString = decodeJSStyle(encodedString, alphabetKey, offset, base);
		
		const linkMatch = decodedString.match(/action="([^"]+)"/);
		const tokenMatch = decodedString.match(/name="_token" value="([^"]+)"/);

		const link = linkMatch ? linkMatch[1] : null;
		const token = tokenMatch ? tokenMatch[1] : null;
		
		if (!link || !token) {
			return fetchKwikDlink(kwikLink, retries - 1);
		}
		
		return await fetchKwikDirect(link, token, kwikSession);

	} catch (error) {
		console.error('Error in fetchKwikDlink:', error);
		return fetchKwikDlink(kwikLink, retries - 1);
	}
}

app.get('/', (c) => c.json({ message: 'Kwik Decoder Worker is running!' }));

app.get('/api/kwik', async (c) => {
	const url = c.req.query('url');
	if (!url) {
		return c.json({ error: 'URL parameter is required' }, 400);
	}

	try {
		const paheRes = await fetch(url);
		const paheText = await paheRes.text();
		const kwikExec = paheText.match(/(https?:\/\/kwik\.[a-z]+\/f\/[^"]+)/);
		
		if (!kwikExec) {
			return c.json({ error: 'Could not find kwik link on the page.' }, 404);
		}

		const kwikLink = kwikExec[1];
		
		const directLink = await fetchKwikDlink(kwikLink);

		if (directLink) {
			return c.json({ directLink });
		} else {
			return c.json({ error: 'Failed to extract direct download link from Kwik.' }, 500);
		}

	} catch (error) {
		console.error('Error processing kwik link:', error);
		return c.json({ error: 'An unexpected error occurred.' }, 500);
	}
});

export default app;
