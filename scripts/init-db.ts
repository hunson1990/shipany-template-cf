import { db } from '@/core/db';
import { user, credit } from '@/config/db/schema';
import { nanoid } from 'nanoid';

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...');

    // Create a test user
    const testUserId = nanoid();
    const testUser = {
      id: testUserId,
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
      image: null,
      utmSource: 'direct',
      ip: '127.0.0.1',
      locale: 'en',
    };

    await db().insert(user).values(testUser);
    console.log('✅ Test user created:', testUser.email);

    // Create initial credits for the test user
    const creditId = nanoid();
    const initialCredit = {
      id: creditId,
      userId: testUserId,
      credits: 100,
      remainingCredits: 100,
      description: 'Initial credits for testing',
      status: 'active',
      transactionNo: nanoid(),
      transactionType: 'grant',
    };

    await db().insert(credit).values(initialCredit);
    console.log('✅ Initial credits created: 100 credits');

    console.log('✨ Database initialization completed successfully!');
    console.log('\n📝 Test Account:');
    console.log('   Email: test@example.com');
    console.log('   Credits: 100');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
