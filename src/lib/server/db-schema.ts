import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const userTable = sqliteTable(
	'user',
	{
		id: integer('id').notNull().primaryKey(),
		githubId: integer('github_id').notNull().unique(),
		email: text('email').notNull().unique(),
		username: text('username').notNull()
	},
	(table) => {
		return {
			githubIdIndex: index('github_id_index').on(table.githubId)
		};
	}
);

export const sessionTable = sqliteTable('session', {
	id: text('id').notNull().primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => userTable.id),
	expiresAt: integer('expires_at').notNull()
});
