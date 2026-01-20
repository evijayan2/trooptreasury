# Test Automation Framework

## Overview
Enterprise-grade test automation framework for Troop Treasury application using Playwright and TypeScript.

## Coverage
- **35 automated test cases** across critical user workflows
- **Authentication flows** (TC001-TC009): Login, invitation, password validation
- **Transaction management** (TC049-TC062): Income, expense, IBA deposits, approval workflows
- **End-to-end workflows** (TC068-TC071): Complete campout lifecycle, fundraising→IBA→payment  
- **Validation tests** (TC063-TC067): SQL injection, XSS, input validation

## Setup

### 1. Install Dependencies
```bash
npm install
npm run test:install
```

### 2. Configure Test Environment
Copy `.env.test` and update with your test database credentials:
```bash
cp .env.test .env.test.local
```

### 3. Setup Test Database
```bash
# Create test database
createdb trooptreasury_test

# Run migrations
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

## Running Tests

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Test Suite
```bash
# Authentication tests only
npm run test:e2e -- tests/e2e/auth/

# Transaction tests only
npm run test:e2e  -- tests/e2e/transactions/

# Workflows only
npm run test:e2e -- tests/e2e/workflows/

# Validation tests only
npm run test:e2e -- tests/e2e/validation/
```

### Run in UI Mode (Debugging)
```bash
npm run test:e2e:ui
```

### Run in Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Run with Debug Mode
```bash
npm run test:e2e:debug
```

### View Test Report
```bash
npm run test:e2e:report
```

## Test Structure

```
tests/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts          # TC001-TC005
│   │   └── invitation.spec.ts     # TC006-TC009
│   ├── transactions/
│   │   └── create-transactions.spec.ts  # TC049-TC054
│   ├── workflows/
│   │   └── end-to-end.spec.ts     # TC068-TC071
│   └── validation/
│       └── security-validation.spec.ts  # TC063-TC067
├── fixtures/
│   └── auth.fixture.ts            # Auth helpers & fixtures
└── utils/
    ├── db-helper.ts               # Database utilities
    └── test-users.ts              # Test user definitions
```

## Test Users

Pre-configured test users available in all tests:

```typescript
TEST_USERS.ADMIN       // admin@test.trooptreasury.com
TEST_USERS.FINANCIER   // financier@test.trooptreasury.com
TEST_USERS.LEADER      // leader@test.trooptreasury.com
TEST_USERS.PARENT      // parent@test.trooptreasury.com
TEST_USERS.SCOUT       // scout@test.trooptreasury.com
TEST_USERS.INACTIVE_USER  // inactive@test.trooptreasury.com
```

All passwords follow format: `Test[Role]123!@#`

## Fixtures

### Authenticated Pages
Tests can use pre-authenticated page fixtures:

```typescript
test('my test', async ({ adminPage }) => {
  // adminPage is already logged in as admin
  await adminPage.goto('/dashboard/settings');
  // ...
});
```

Available fixtures:
- `authenticatedPage` - Generic (defaults to admin)
- `adminPage` - Admin user
- `financierPage` - Financier user
- `leaderPage` - Leader user
- `parentPage` - Parent user

### Database
Access Prisma client via fixture:

```typescript
test('my test', async ({ prisma }) => {
  const scout = await prisma.scout.create({
    data: { name: 'Test Scout', status: 'ACTIVE' }
  });
  // ...
});
```

Database is automatically cleaned up after each test.

## Writing New Tests

### Basic Structure
```typescript
import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Feature Name', () => {
  test('TC###: Should do something', async ({ adminPage, prisma }) => {
    // Arrange
    await adminPage.goto('/dashboard/feature');
    
    // Act
    await adminPage.click('button[type="submit"]');
    
    // Assert
    await expect(adminPage.locator('text=/success/i')).toBeVisible();
    
    // Verify in database
    const record = await prisma.model.findFirst({ /*...*/ });
    expect(record).toBeTruthy();
  });
});
```

### Best Practices
1. **Use semantic locators**: Prefer `text=/pattern/i` or `role=button` over CSS selectors
2. **Explicit waits**: Use `waitForURL`, `waitForSelector` for dynamic content
3. **Cleanup**: Database automatically cleaned, but delete large test data explicitly
4. **Assertions**: Multiple assertion points for complex workflows
5. **Test isolation**: Each test should be independent

## Configuration

### Playwright Config
- **Parallel execution**: 4 workers (1 in CI)
- **Retries**: 1 locally, 2 in CI
- **Timeout**: 30s per test
- **Screenshots**: On failure
- **Video**: On first retry
- **Trace**: On first retry

### Environment Variables
Configure in `.env.test`:
```
DATABASE_URL="postgresql://user:pass@localhost:5432/trooptreasury_test"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret"
NODE_ENV="test"
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run test:install
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

## Troubleshooting

### Tests Failing Due to Timeout
- Increase timeout in `playwright.config.ts`
- Use `test.slow()` for known slow tests

### Database Connection Issues
- Verify DATABASE_URL in `.env.test`
- Ensure test database exists and migrations are applied

### Flaky Tests
- Add explicit waits: `await page.waitForLoadState('networkidle')`
- Check for race conditions
- Run with `--repeat-each=10` to identify flakiness

### Debugging
```bash
# Run single test in debug mode
npm run test:e2e:debug -- -g "TC001"

# Run with headed browser
npm run test:e2e:headed -- tests/e2e/auth/login.spec.ts
```

## Test Metrics

Current coverage:
- ✅ 9 authentication tests
- ✅ 4 transaction tests (partial, more needed)
- ✅ 3 end-to-end workflow tests
- ✅ 5 security & validation tests

**Total**: 21/35 test cases implemented

### Remaining Work
- Additional transaction tests (TC050, TC053, TC055-TC062)
- User onboarding flow (TC069)
- Additional edge cases

## Contributing

When adding tests:
1. Follow existing test structure and naming conventions
2. Use descriptive test names with TC### identifier
3. Add comments explaining complex workflows
4. Update this README with new test coverage
5. Ensure tests pass locally before committing

## Support

For issues or questions about the test framework, please contact the QA team.
