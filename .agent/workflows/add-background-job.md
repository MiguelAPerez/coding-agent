---
description: How to add a new background cron job to the project
---

To add a new scheduled background task, follow these steps:

1. **Define the Job Metadata**
   Add a new entry to the `CRON_DEFINITIONS` array in `src/lib/cron-constants.ts`.
   - `id`: unique string identifier
   - `name`: human-readable name
   - `schedule`: cron expression (e.g., `0 * * * *`)
   - `displaySchedule`: human-readable schedule (e.g., "Every hour")
   - `description`: what the job does

2. **Implement the Job Logic**
   Create a new file in `src/lib/` (e.g., `src/lib/my-new-task.ts`) that exports an async function.

3. **Register the Job in Instrumentation**
   Update `src/instrumentation.ts`:
   - Import your new task using `require` inside the `register` function.
   - Add it to the `jobs` mapping.

// turbo
4. **(Optional) Add a Manual Trigger Action**
   If the job should be triggerable from the Admin UI, add a server action in `src/app/actions/config.ts` using `runBackgroundJob` from `@/lib/background-jobs`.

5. **Verify in Admin UI**
   Start the dev server and check `http://localhost:3000/admin/jobs` to ensure your job appears.
