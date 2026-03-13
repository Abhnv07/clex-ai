import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Mock logger for tests
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
};

// Test database instance
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/clex_test',
    },
  },
  log: ['warn', 'error'],
});

beforeAll(async () => {
  // Replace logger with mock
  vi.mock('../utils/logger', () => ({
    logger: mockLogger,
  }));

  // Try to connect to test database, but don't fail if it's not available
  try {
    await testPrisma.$connect();
    console.log('Test database connected successfully');
  } catch (error) {
    console.warn('Test database not available, some tests may be skipped:', error);
    // Don't throw error, just continue without database
  }
});

afterAll(async () => {
  // Clean up test database
  try {
    await testPrisma.$disconnect();
  } catch (error) {
    console.warn('Error disconnecting from test database:', error);
  }
});

beforeEach(async () => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(async () => {
  // Clean up database after each test
  await cleanupDatabase();
});

async function cleanupDatabase() {
  try {
    // Delete in order of dependencies
    await testPrisma.usageRecord.deleteMany();
    await testPrisma.requestLog.deleteMany();
    await testPrisma.apiKey.deleteMany();
    await testPrisma.user.deleteMany();
  } catch (error) {
    // Ignore cleanup errors if database is not available
  }
}

// Export mock logger for use in tests
export { mockLogger };
