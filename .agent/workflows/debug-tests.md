---
description: Workflow for debugging and fixing failing tests
---

Follow this workflow when tests are failing or when you want to ensure coverage:

1. **Run All Tests**
   ```bash
   npm run test
   ```

2. **Identify Failing Tests**
   Review the output to find the specific files and test cases that are failing.

3. **Run Specific Tests**
   Use Jest's filtering to run only the relevant test file:
   ```bash
   npx jest path/to/failing.test.ts
   ```

4. **Analyze Failures**
   - Check if the failure is due to a recent change in implementation logic.
   - Verify if mocks need updating (common if API routes or external dependencies changed).
   - Use `console.log` within tests or implementation to trace execution.

5. **Fix & Re-run**
   Apply fixes and re-run the specific test until it passes.

6. **Check Coverage**
   ```bash
   npm run test -- --coverage
   ```
   Ensure that the changes haven't introduced regressions in coverage for critical files.
