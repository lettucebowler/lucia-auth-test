import type { RequestEvent } from '@sveltejs/kit';
import { createDb } from './db';
import { userTable } from './db-schema';
import { eq } from 'drizzle-orm';

export async function createUser(
	event: RequestEvent,
	githubId: number,
	email: string,
	username: string
): Promise<User> {
	const db = createDb(event);
	const [row] = await db
		.insert(userTable)
		.values({
			githubId,
			email,
			username
		})
		.returning({ userId: userTable.id });
	if (!row) {
		throw new Error('Unexpected error');
	}
	const user: User = {
		id: row.userId,
		githubId,
		email,
		username
	};
	return user;
}

export async function getUserFromGitHubId(
	event: RequestEvent,
	githubId: number
): Promise<User | null> {
	const db = createDb(event);
	const [row] = await db
		.select({
			id: userTable.id,
			githubId: userTable.githubId,
			email: userTable.email,
			username: userTable.username
		})
		.from(userTable)
		.where(eq(userTable.githubId, githubId));
	if (!row) {
		return null;
	}
	return row satisfies User;
}

export interface User {
	id: number;
	email: string;
	githubId: number;
	username: string;
}
