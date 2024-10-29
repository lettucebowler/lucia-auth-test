import * as auth from '$lib/server/auth.js';

export async function load(event) {
	const sessionId = event.cookies.get(auth.sessionCookieName);
	if (sessionId) {
		const { session, user } = await auth.validateSession(event, sessionId);
		return { user };
	} else {
		return {
			user: null
		};
	}
}
