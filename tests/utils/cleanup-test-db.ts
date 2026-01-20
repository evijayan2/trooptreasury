#!/usr/bin/env tsx
/**
 * Cleanup script for test database
 * Removes all test data after test execution
 */
import { getTestPrismaClient, cleanupDatabase, disconnectPrisma } from './db-helper';

async function main() {
    console.log('🧹 Cleaning up test database...');

    try {
        const prisma = getTestPrismaClient();
        await cleanupDatabase(prisma);
        console.log('✅ Test database cleaned successfully');
    } catch (error) {
        console.error('❌ Error cleaning test database:', error);
        process.exit(1);
    } finally {
        await disconnectPrisma();
    }
}

main();
