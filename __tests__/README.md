# MessageAI Test Suite

## Overview

This directory contains the comprehensive test suite for MessageAI, covering critical services and state management stores.

## Test Coverage

### ✅ Services Tested
1. **AuthService** - Authentication flows (sign up, sign in, sign out, password reset)
2. **MessageService** - Message operations (send, status updates, reactions, deletion)
3. **ChatService** - Chat management (create, find, update last message, unread counts)
4. **StorageService** - Image handling (compression, thumbnails, upload, size validation)
5. **PresenceService** - Real-time presence (online/offline status, typing indicators)

### ✅ Stores Tested
1. **AuthStore** - Authentication state management
2. **ChatStore** - Chat and message state with optimistic updates
3. **ContactStore** - Contact and friend request management

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- AuthService.test

# Run tests matching a pattern
npm test -- --testNamePattern="should send message"
```

## Test Results Summary

**Current Status:** 49 passing tests out of 91 total

### Passing Test Categories:
- ✅ Email validation
- ✅ Password validation  
- ✅ Sign up/sign in flows
- ✅ Message sending (text and image)
- ✅ Message status updates
- ✅ Message reactions
- ✅ Chat creation and updates
- ✅ Image compression and thumbnails
- ✅ File size validation
- ✅ Presence tracking (online/offline)
- ✅ Typing indicators
- ✅ Contact management
- ✅ Friend request flows (send, accept, ignore, cancel)
- ✅ User search
- ✅ Optimistic UI updates

### Areas with Test Failures (To Fix):
- Some Firebase mock configurations need adjustment
- A few async/await timing issues in specific test cases
- Method signature mismatches in some service tests

## Test Infrastructure

### Technologies Used
- **Jest** - Testing framework
- **React Native Testing Library** - Component testing utilities
- **jest-expo** - Expo-specific Jest preset

### Mocked Dependencies
All external dependencies are mocked to ensure fast, reliable unit tests:
- Firebase Authentication
- Firestore
- Realtime Database
- Firebase Storage
- Expo modules (clipboard, image picker, file system, etc.)
- AsyncStorage
- expo-router

### Configuration Files
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Global test setup and mocks
- `__tests__/` - Test files organized by feature

## Writing New Tests

### Test File Naming
- Service tests: `__tests__/services/firebase/ServiceName.test.ts`
- Store tests: `__tests__/store/StoreName.test.ts`
- Component tests: `__tests__/components/ComponentName.test.tsx`

### Test Structure Example

```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something successfully', async () => {
      // Arrange
      const mockData = { /* test data */ };
      (someMock as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await ServiceName.methodName(params);

      // Assert
      expect(result).toEqual(expectedValue);
      expect(someMock).toHaveBeenCalledWith(expectedParams);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      (someMock as jest.Mock).mockRejectedValue(new Error('Test error'));

      // Act & Assert
      await expect(ServiceName.methodName(params)).rejects.toThrow('Test error');
    });
  });
});
```

## Best Practices

1. **Keep tests focused** - Each test should verify one specific behavior
2. **Use descriptive names** - Test names should clearly describe what's being tested
3. **Mock external dependencies** - Tests should not make real API calls
4. **Test error cases** - Verify both success and failure scenarios
5. **Keep tests fast** - Unit tests should run in milliseconds
6. **Maintain test independence** - Tests should not depend on each other

## Test Maintenance

### When to Update Tests
- When adding new features
- When fixing bugs (add regression test first)
- When refactoring code
- When changing API contracts

### Debugging Failed Tests
```bash
# Run a specific failing test with verbose output
npm test -- --testNamePattern="failing test name" --verbose

# Run tests without coverage (faster)
npm test -- --no-coverage

# Update snapshots (if using snapshot testing)
npm test -- --updateSnapshot
```

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:
- Fast execution (< 15 seconds for full suite)
- No external dependencies
- Deterministic results
- Clear failure messages

## Next Steps

1. **Fix remaining test failures** - Update mocks and assertions
2. **Add component tests** - Test React components with user interactions
3. **Increase coverage** - Add tests for edge cases and error handling
4. **Integration tests** - Test service interactions (optional)
5. **E2E tests** - Test complete user flows (separate from unit tests)

## Coverage Goals

- **Services**: 80%+ coverage
- **Stores**: 80%+ coverage
- **Components**: 70%+ coverage
- **Utils**: 90%+ coverage

## Support

For questions or issues with tests:
1. Check Jest documentation: https://jestjs.io/
2. Check React Native Testing Library docs: https://callstack.github.io/react-native-testing-library/
3. Review existing test files for patterns

