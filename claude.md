# Claude Development Instructions

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
