import { createDb } from './db';
import { encodeBase32, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import { userTable, sessionTable } from './db-schema';

import type { User } from './user';
import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function validateSessionToken(
	event: RequestEvent,
	token: string
): Promise<SessionValidationResult> {
	const db = createDb(event);
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [row] = await db
		.select({
			sessionId: sessionTable.id,
			expiresAt: sessionTable.expiresAt,
			userId: userTable.id,
			githubId: userTable.githubId,
			email: userTable.email,
			username: userTable.username
		})
		.from(userTable)
		.innerJoin(sessionTable, eq(sessionTable.userId, userTable.id))
		.where(eq(sessionTable.id, sessionId));

	if (!row) {
		return { session: null, user: null };
	}
	const session: Session = {
		id: row.sessionId,
		userId: row.userId,
		expiresAt: new Date(row.expiresAt * 1000)
	};
	const user: User = {
		id: row.userId,
		githubId: row.githubId,
		email: row.email,
		username: row.username
	};
	if (Date.now() >= session.expiresAt.getTime()) {
		db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
		return { session: null, user: null };
	}
	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		db.update(sessionTable)
			.set({ expiresAt: Math.floor(session.expiresAt.getTime() / 1000) })
			.where(eq(sessionTable.id, session.id));
	}
	return { session, user };
}

export async function invalidateSession(event: RequestEvent, sessionId: string): Promise<void> {
	const db = createDb(event);
	await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
}

export async function invalidateUserSessions(event: RequestEvent, userId: number): Promise<void> {
	const db = createDb(event);
	await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set('session', token, {
		httpOnly: true,
		path: '/',
		secure: import.meta.env.PROD,
		sameSite: 'lax',
		expires: expiresAt
	});
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.set('session', '', {
		httpOnly: true,
		path: '/',
		secure: import.meta.env.PROD,
		sameSite: 'lax',
		maxAge: 0
	});
}

export function generateSessionToken(): string {
	const tokenBytes = new Uint8Array(20);
	crypto.getRandomValues(tokenBytes);
	const token = encodeBase32(tokenBytes).toLowerCase();
	return token;
}

export async function createSession(
	event: RequestEvent,
	token: string,
	userId: number
): Promise<Session> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
	};
	const db = createDb(event);
	await db.insert(sessionTable).values({
		id: session.id,
		userId: session.userId,
		expiresAt: Math.floor(session.expiresAt.getTime() / 1000)
	});
	return session;
}

export interface Session {
	id: string;
	expiresAt: Date;
	userId: number;
}

type SessionValidationResult = { session: Session; user: User } | { session: null; user: null };
