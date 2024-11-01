import { drizzle } from 'drizzle-orm/d1';
// import { createClient } from '@libsql/client';
// import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';
// if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
// const client = createClient({ url: env.DATABASE_URL });
// export const db = drizzle(client);

export function createDb(event: RequestEvent) {
	if (!event.platform) {
		throw new Error('Oh shit');
	}
	return drizzle(event.platform.env.DB);
}
