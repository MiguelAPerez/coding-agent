---
description: How to add a new Next.js API route
---

To add a new API route in this project:

1. **Create the Route Directory**
   Create a new directory under `src/app/api/` representing your route path (e.g., `src/app/api/my-feature/`).

2. **Implement the Route Handler**
   Create a `route.ts` file in that directory.
   - Export async functions for the HTTP methods you need (`GET`, `POST`, etc.).
   - Use `NextRequest` and `NextResponse` from `next/server`.

3. **Add Error Handling**
   Ensure you wrap your logic in `try/catch` and return appropriate status codes.

4. **Type Safety**
   Define interfaces for request bodies and response data to ensure type safety.

5. **Update Middleware/Auth (if needed)**
   If the route requires authentication, ensure it's handled or checked via `auth.ts` or middleware as per the project's [authentication docs](file:///Users/miguelperez/development/coding-agent/docs/authentication.md).
