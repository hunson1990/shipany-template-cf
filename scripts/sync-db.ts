import 'dotenv/config';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/libsql';
import postgres from 'postgres';
import { createClient } from '@libsql/client';
import * as schema from '@/config/db/schema';

async function syncDatabase() {
  try {
    console.log('🔄 Starting database sync from PostgreSQL to SQLite...');

    // Connect to PostgreSQL
    const pgUrl = process.env.DATABASE_URL;
    if (!pgUrl) {
      throw new Error('DATABASE_URL not set');
    }

    const pgClient = postgres(pgUrl);
    const pgDb = drizzlePostgres(pgClient, { schema });

    // Connect to SQLite
    const sqliteClient = createClient({
      url: 'file:./dev.db',
    });
    const sqliteDb = drizzleSqlite(sqliteClient, { schema });

    // Fetch all users from PostgreSQL
    console.log('📥 Fetching users from PostgreSQL...');
    const users = await pgDb.query.user.findMany();
    console.log(`✅ Found ${users.length} users`);

    if (users.length > 0) {
      console.log('📤 Inserting users into SQLite...');
      await sqliteDb.insert(schema.user).values(users);
      console.log(`✅ Inserted ${users.length} users`);
    }

    // Fetch all credits from PostgreSQL
    console.log('📥 Fetching credits from PostgreSQL...');
    const credits = await pgDb.query.credit.findMany();
    console.log(`✅ Found ${credits.length} credit records`);

    if (credits.length > 0) {
      console.log('📤 Inserting credits into SQLite...');
      await sqliteDb.insert(schema.credit).values(credits);
      console.log(`✅ Inserted ${credits.length} credit records`);
    }

    console.log('✨ Database sync completed successfully!');
    await pgClient.end();
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

syncDatabase();
