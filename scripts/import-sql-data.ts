import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

async function importSqlData() {
  try {
    console.log('🔄 Starting SQL data import to SQLite...');

    // Connect to SQLite
    const sqliteClient = createClient({
      url: 'file:./dev.db',
    });
    const db = drizzle(sqliteClient);

    // Disable foreign key constraints temporarily
    console.log('🔓 Disabling foreign key constraints...');
    await sqliteClient.execute('PRAGMA foreign_keys = OFF');

    // Get all SQL files from scripts/sqls directory
    const sqlsDir = path.join(process.cwd(), 'scripts/sqls');
    const sqlFiles = fs.readdirSync(sqlsDir).filter(f => f.endsWith('.sql'));

    // Define import order (dependencies first)
    const importOrder = [
      'user_rows.sql',
      'role_rows.sql',
      'permission_rows.sql',
      'user_role_rows.sql',
      'role_permission_rows.sql',
      'config_rows.sql',
      'account_rows.sql',
      'session_rows.sql',
      'verification_rows.sql',
      'credit_rows.sql',
      'order_rows.sql',
      'subscription_rows.sql',
      'ai_task_rows.sql',
    ];

    console.log(`📁 Found ${sqlFiles.length} SQL files to import`);

    for (const file of importOrder) {
      if (!sqlFiles.includes(file)) continue;

      const filePath = path.join(sqlsDir, file);
      let sqlContent = fs.readFileSync(filePath, 'utf-8');

      // Remove PostgreSQL schema prefix "public"."table" -> table
      sqlContent = sqlContent.replace(/"public"\./g, '');

      // Convert PostgreSQL boolean format to SQLite
      sqlContent = sqlContent.replace(/'true'/g, '1').replace(/'false'/g, '0');

      // Remove columns that don't exist in SQLite schema
      sqlContent = sqlContent.replace(/, "is_public"[^,)]*(?=[,)])/g, '');
      sqlContent = sqlContent.replace(/, "work_score"[^,)]*(?=[,)])/g, '');
      sqlContent = sqlContent.replace(/, "view_count"[^,)]*(?=[,)])/g, '');
      sqlContent = sqlContent.replace(/, "output_url"[^,)]*(?=[,)])/g, '');
      sqlContent = sqlContent.replace(/, "thumbnail_url"[^,)]*(?=[,)])/g, '');

      // Handle NULL values for NOT NULL columns - replace with defaults
      // For user.utm_source, ip, locale, replace NULL with empty string
      if (file === 'user_rows.sql') {
        // Replace the pattern: null, null, null) at the end with '', '', '')
        sqlContent = sqlContent.replace(/null, null, null\)$/gm, "'', '', '')");
      }

      try {
        console.log(`📥 Importing ${file}...`);
        await sqliteClient.execute(sqlContent);
        console.log(`✅ ${file} imported successfully`);
      } catch (error: any) {
        console.error(`❌ Error importing ${file}:`, error.message);
      }
    }

    // Re-enable foreign key constraints
    console.log('🔒 Re-enabling foreign key constraints...');
    await sqliteClient.execute('PRAGMA foreign_keys = ON');

    console.log('✨ SQL data import completed!');
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importSqlData();
