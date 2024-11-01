import { fail, redirect } from '@sveltejs/kit';
import {
	deleteSessionTokenCookie,
	invalidateSession,
	validateSessionToken
} from '$lib/server/session';

import type { Actions, RequestEvent } from './$types';

export async function load(event: RequestEvent) {
	const token = event.cookies.get('session') ?? null;
	if (token === null || event.locals.session === null || event.locals.user === null) {
		return redirect(302, '/login');
	}

	const { session, user } = await validateSessionToken(event, token);
	return {
		user: event.locals.user
	};
}

export const actions: Actions = {
	default: action
};

async function action(event: RequestEvent) {
	if (event.locals.session === null) {
		return fail(401);
	}
	invalidateSession(event, event.locals.session.id);
	deleteSessionTokenCookie(event);
	return redirect(302, '/login');
}
