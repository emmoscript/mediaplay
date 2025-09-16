# Test Organization

This directory contains organized unit and integration tests for the PromoStudio application.

## Structure

```
src/test/
├── __mocks__/           # Mock implementations
│   └── react-easy-crop.ts
├── integration/         # Integration tests
│   └── workflow.test.tsx
├── unit/               # Unit tests
│   └── eventLog.test.ts
├── utils.tsx           # Test utilities and helpers
└── README.md          # This file
```

## Test Categories

### 1. Unit Tests

- **Component Tests**: Individual component behavior
- **Hook Tests**: Custom hook logic
- **Utility Tests**: Helper functions and utilities

### 2. Integration Tests

- **Workflow Tests**: Complete user journeys
- **Feature Tests**: Cross-component interactions
- **API Tests**: External service integrations

### 3. Mock Files

- **Component Mocks**: Complex component replacements
- **API Mocks**: External service mocks
- **Utility Mocks**: Browser API mocks

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test App.test.tsx

# Run tests by pattern
npm run test -- --grep "PhotoEditor"
```

## Test Utilities

### `createMockFile(name, type, content)`

Creates a mock File object for testing file uploads.

### `mockEventLog()`

Creates a mock event logging system for testing.

### `mockFeedback()`

Creates a mock feedback function for testing.

### `cleanupMocks()`

Cleans up all mocks after each test.

## Writing Tests

### Component Tests

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

describe("User Workflow", () => {
  it("completes full workflow", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Test complete user journey
    await user.click(screen.getByText("Button"));
    expect(screen.getByText("Result")).toBeInTheDocument();
  });
});
```

## Mock Guidelines

### When to Mock

- External dependencies (APIs, libraries)
- Complex components that are hard to test
- Browser APIs that don't work in test environment
- Time-dependent functions

### Mock Best Practices

- Keep mocks simple and focused
- Use realistic mock data
- Document mock behavior
- Clean up mocks after tests

## Test Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Common Patterns

### Testing User Interactions

```typescript
const user = userEvent.setup();
await user.click(screen.getByRole("button"));
await user.type(screen.getByRole("textbox"), "text");
```

### Testing Async Operations

```typescript
await waitFor(() => {
  expect(screen.getByText("Async Content")).toBeInTheDocument();
});
```

### Testing Error States

```typescript
expect(screen.getByText("Error Message")).toBeInTheDocument();
expect(screen.getByRole("button")).toBeDisabled();
```

### Testing Form Submissions

```typescript
await user.type(screen.getByLabelText("Email"), "test@example.com");
await user.click(screen.getByRole("button", { name: "Submit" }));
expect(mockSubmit).toHaveBeenCalledWith({ email: "test@example.com" });
```

## Debugging Tests

### Common Issues

1. **Async operations not completing**: Use `waitFor` or `findBy` queries
2. **Elements not found**: Check for proper accessibility attributes
3. **Mock not working**: Verify mock is properly set up and cleaned up
4. **State not updating**: Ensure proper user event simulation

### Debug Tools

```typescript
// Print current DOM
screen.debug();

// Print specific element
screen.debug(screen.getByRole("button"));

// Print all queries
screen.logTestingPlaygroundURL();
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the user sees and does
2. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Keep Tests Independent**: Each test should be able to run in isolation
4. **Use Descriptive Names**: Test names should clearly describe what is being tested
5. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
6. **Mock External Dependencies**: Don't test third-party libraries
7. **Test Error Cases**: Include tests for error states and edge cases
8. **Keep Tests Fast**: Avoid unnecessary async operations and complex setups
