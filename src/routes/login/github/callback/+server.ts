import { github } from '$lib/server/oauth';
import { ObjectParser } from '@pilcrowjs/object-parser';
import { createUser, getUserFromGitHubId } from '$lib/server/user';
import { createSession, generateSessionToken, setSessionTokenCookie } from '$lib/server/session';

import type { OAuth2Tokens } from 'arctic';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent): Promise<Response> {
	const storedState = event.cookies.get('github_oauth_state') ?? null;
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');

	console.log('start');

	if (storedState === null || code === null || state === null) {
		return new Response('Please restart the process.', {
			status: 400
		});
	}
	if (storedState !== state) {
		return new Response('Please restart the process.', {
			status: 400
		});
	}

	console.log('here 1')

	let tokens: OAuth2Tokens;
	try {
		tokens = await github.validateAuthorizationCode(code);
	} catch (e) {
		return new Response('Please restart the process.', {
			status: 400
		});
	}

	console.log('here 2');

	const githubAccessToken = tokens.accessToken();

	console.log('here 2.1');

	const userRequest = new Request('https://api.github.com/user');
	userRequest.headers.set('Authorization', `Bearer ${githubAccessToken}`);
	userRequest.headers.set('User-Agent', 'lettucebowler-lucia-auth-test-app');
	const userResponse = await fetch(userRequest);
	console.log('here 2.2');
	const text = await userResponse.text();
	console.log(text);
	const userResult: unknown = JSON.parse(text);;
	const userParser = new ObjectParser(userResult);

	console.log('here 3')

	const githubUserId = userParser.getNumber('id');
	const username = userParser.getString('login');

	const existingUser = await getUserFromGitHubId(event, githubUserId);
	if (existingUser !== null) {
		const sessionToken = generateSessionToken();
		const session = await createSession(event, sessionToken, existingUser.id);
		setSessionTokenCookie(event, sessionToken, session.expiresAt);
		return new Response(null, {
			status: 302,
			headers: {
				Location: '/'
			}
		});
	}

	console.log('here 4');

	const emailListRequest = new Request('https://api.github.com/user/emails');
	emailListRequest.headers.set('Authorization', `Bearer ${githubAccessToken}`);
	const emailListResponse = await fetch(emailListRequest);
	const emailListResult: unknown = await emailListResponse.json();
	if (!Array.isArray(emailListResult) || emailListResult.length < 1) {
		return new Response('Please restart the process.', {
			status: 400
		});
	}
	let email: string | null = null;
	for (const emailRecord of emailListResult) {
		const emailParser = new ObjectParser(emailRecord);
		const primaryEmail = emailParser.getBoolean('primary');
		const verifiedEmail = emailParser.getBoolean('verified');
		if (primaryEmail && verifiedEmail) {
			email = emailParser.getString('email');
		}
	}
	if (email === null) {
		return new Response('Please verify your GitHub email address.', {
			status: 400
		});
	}

	console.log('here 5');

	const user = await createUser(event, githubUserId, email, username);
	const sessionToken = generateSessionToken();
	const session = await createSession(event, sessionToken, user.id);
	setSessionTokenCookie(event, sessionToken, session.expiresAt);

	console.log('here 6');
	return new Response(null, {
		status: 302,
		headers: {
			Location: '/'
		}
	});
}
