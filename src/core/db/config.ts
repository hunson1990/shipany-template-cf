import { defineConfig } from 'drizzle-kit';

import { envConfigs } from '@/config';

// get db credentials
const dbCredentials: { url: string; authToken?: string } = {
  url: envConfigs.database_url ?? '',
};
if (envConfigs.database_auth_token) {
  dbCredentials.authToken = envConfigs.database_auth_token;
}

// define config
export default defineConfig({
  out: envConfigs.db_migrations_out,
  schema: envConfigs.db_schema_file,
  dialect: envConfigs.database_provider as
    | 'sqlite'
    | 'postgresql'
    | 'mysql'
    | 'turso'
    | 'singlestore'
    | 'gel',
  dbCredentials,
  // Migration journal location (used by drizzle-kit migrate)
  migrations:
    envConfigs.database_provider === 'postgresql'
      ? {
          schema: envConfigs.db_migrations_schema,
          table: envConfigs.db_migrations_table,
        }
      : undefined,
});

// -- 批量为 public 下所有表开启 RLS
// DO $$
// DECLARE
//     table_record RECORD;
// BEGIN
//     -- 遍历所有表
//     FOR table_record IN 
//         SELECT tablename 
//         FROM pg_tables 
//         WHERE schemaname = 'public'  -- 只处理 public  schema
//     LOOP
//         -- 开启 RLS
//         EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_record.tablename);
        
//         -- 可选：强制开启 RLS（即使表所有者也必须遵守规则）
//         EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', table_record.tablename);
//     END LOOP;
// END $$;