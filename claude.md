# Claude Development Instructions

## UI Testing Requirements

**IMPORTANT:** Every time you implement a feature or bug fix that changes the UI, you MUST use the Playwright MCP to test the feature.

### Testing Workflow

When making UI changes:

1. Implement the feature or bug fix
2. Use the Playwright MCP tools to write and run automated tests
3. Verify that the tests pass before marking the task as complete
4. Document any test coverage in your commit message

### Playwright MCP Setup

The Playwright MCP server has been configured for this project. It provides tools for:

-   Writing browser automation tests
-   Testing user interactions and flows
-   Verifying UI elements and behavior
-   Taking screenshots for visual verification

### When to Test

You should use Playwright MCP testing when:

-   Adding new UI components or pages
-   Modifying existing UI behavior
-   Fixing UI-related bugs
-   Implementing user interaction flows
-   Making changes to forms, buttons, or interactive elements

### Example Testing Scenarios

-   Form submissions (file upload, batch upload, etc.)
-   Navigation between pages
-   Button clicks and state changes
-   Modal/dialog interactions
-   Responsive design verification
-   Error handling and validation messages

## Code Quality and Formatting Rules

### Linting and Formatting

-   ALWAYS respect and follow project linting rules
-   DO NOT introduce new linting errors
-   Format code according to .prettierrc and eslint.config.mjs
-   Run Prettier on all files after every change

### Formatting Standards

-   DO NOT add or remove empty lines unnecessarily
-   DO NOT change existing spacing or indentation unless required by linting
-   Avoid cosmetic-only changes unless explicitly requested
-   Follow the project's printWidth of 75 characters
-   Use 2 spaces for indentation (tabWidth: 2)
-   Always use arrow parentheses: (x) => x
-   Include trailing commas in all multi-line structures

### Code Changes

-   Only make changes that are functionally necessary
-   Preserve existing code structure and style
-   Test changes do not break linting before committing
