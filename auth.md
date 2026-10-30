# MARK YOUR DAY — SUPABASE GOOGLE AUTH & PRIVATE CLOUD DATABASE INTEGRATION

Act as a senior full-stack engineer specializing in Supabase, React, Capacitor, OAuth and Cloudflare Workers.

Implement Supabase authentication and cloud task synchronization in my EXISTING Mark Your Day application. Do not rebuild the project or redesign the existing UI.

## 1. EXISTING PROJECT

Preserve:
- React + Vite + TypeScript.
- Capacitor Android application.
- Existing premium mobile-first UI and dark mode.
- Hono backend deployed on Cloudflare Workers.
- Groq Whisper and GPT-OSS 20B.
- Existing SQLite Android and localStorage web storage.
- Existing voice recording, task parsing, reminders, streaks and Focus Mode.

My Supabase MCP is already configured and connected to project:

`gngoelfmkxiqcluojefl`

Use the connected, project-scoped Supabase MCP to inspect the actual project configuration, Auth settings, database schema, policies and migrations.

Do not create another Supabase project.

## 2. ENVIRONMENT VARIABLES

My existing `.env` already contains:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_JWKS_URL`

Inspect the variables without printing their values.

Use the URL and publishable key in the frontend. Vite normally requires `VITE_`-prefixed variables, so configure safe public aliases if necessary:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Keep `SUPABASE_SECRET_KEY` exclusively server-side. Never expose it in React, Vite, browser bundles or APKs. Do not use it for ordinary user task operations because those must respect RLS.

Use `SUPABASE_JWKS_URL` for appropriate backend JWT verification if compatible with the project's signing configuration.

Preserve all existing Groq configuration. Do not overwrite or remove existing secrets.

Check `.gitignore` and ensure all secret environment files are excluded from Git.

## 3. GOOGLE AUTHENTICATION

Implement Google sign-in using `@supabase/supabase-js`.

WEB:
- Create a polished Google sign-in screen consistent with Mark Your Day.
- Implement Google OAuth and the `/auth/callback` route.
- Restore sessions automatically after page refresh.
- Handle expired sessions and authentication errors.
- Provide a clean sign-out action.

ANDROID:
- Use Capacitor Browser and App deep linking.
- Open Google authentication through the system browser.
- Configure a proper custom callback scheme based on the existing Capacitor application ID.
- Handle the `appUrlOpen` callback.
- Exchange the authorization code for a Supabase session using PKCE.
- Restore the session after reopening the APK.
- Prevent duplicate callback listeners and authentication loops.

Never use embedded Google login inside the Android WebView.

Inspect the actual Supabase Google provider configuration through MCP. If Google Client ID and Client Secret are missing, do not fabricate them. Report exactly which Google Cloud and Supabase Dashboard fields I need to configure.

Remember that Supabase project API keys are not Google OAuth credentials.

## 4. PRIVATE TASK DATABASE

Use the connected MCP to inspect existing tables before modifying the database.

Create a migration for a `public.tasks` table based on the actual existing Task TypeScript interface.

Preserve all existing task fields, including:

- id
- user_id
- title
- notes
- is_completed
- scheduled_date
- scheduled_time
- duration_minutes
- due_date
- due_time
- reminder_date
- reminder_time
- time_zone
- sort_order
- created_at
- updated_at
- completed_at

Adapt the schema where the existing application requires additional fields. Preserve task ID compatibility where practical.

Requirements:
- Every task belongs to exactly one authenticated user.
- Enable RLS.
- Create separate SELECT, INSERT, UPDATE and DELETE policies.
- Ensure each policy checks that `auth.uid() = user_id`.
- Explicitly restrict anonymous database access and grant only necessary authenticated permissions.
- Add suitable indexes for user and scheduled-date queries.
- Do not introduce shared household access, team memberships or unnecessary profile tables.

Use Supabase migrations and the existing MCP to inspect and apply the required schema changes safely.

Never drop, reset or destroy existing production data.

## 5. CONNECT THE EXISTING TASK REPOSITORY

Keep the current TaskRepository abstraction.

Implement a Supabase-backed repository for authenticated users.

Connect:
- Task creation.
- Task editing.
- Completion and reopening.
- Deletion.
- Retrieval.
- Ordering.
- Completion history.

Ensure all operations use the current authenticated user's identity.

Use the Supabase client with the publishable key and the user's authenticated session. Let RLS enforce ownership.

Do not use the secret key or service-role privileges for normal task CRUD.

Use Supabase as the cloud source of truth for authenticated accounts. Retain SQLite and localStorage as per-user local caches where appropriate.

Keep synchronization simple:
- Fetch tasks after successful authentication.
- Refresh when the app resumes.
- Update local cache after successful cloud operations.
- Ensure changes become visible on another device after refresh.
- Do not implement a complicated offline synchronization engine.

If offline, display available cached tasks and communicate when a cloud write cannot be completed. Never claim an unsynchronized change was saved remotely.

## 6. SAFE EXISTING-TASK MIGRATION

When a user signs in for the first time:

1. Detect existing local SQLite or localStorage tasks.
2. Display a simple import preview.
3. Show the number of tasks to be imported.
4. Let the user confirm.
5. Import them into that user's account.
6. Preserve task IDs, completion dates, reminders and scheduling fields.
7. Verify that the imported records match the local data.
8. Mark migration complete only after successful verification.

Use idempotent imports to prevent duplication on retries.

Never delete existing local tasks before verification.

Never silently import one household member's local tasks into another account.

## 7. H O N O AND GROQ INTEGRATION

Preserve the existing Hono backend.

Require a valid authenticated Supabase session for protected AI task-parsing endpoints.

Verify bearer tokens properly using the project's JWT signing configuration and JWKS, or a compatible official Supabase server-authentication integration.

Never just decode an unverified JWT.

Continue using:
- Groq Whisper for audio transcription.
- Groq `openai/gpt-oss-20b` for task extraction.
- Existing task-preview and confirmation logic.

Do not send the user's entire task database to Groq.

Do not introduce another LLM provider or cloud database layer.

## 8. AUTHENTICATION UI

Create a premium, minimal sign-in experience.

Include:
- Mark Your Day branding.
- A beautiful Google sign-in button.
- Subtle loading feedback.
- Authentication error handling.
- A clean account/profile area after login.
- Profile avatar and Google account name.
- Sign-out functionality.

Preserve the existing application design and avoid adding unnecessary onboarding screens.

On logout or account switching:
- Clear the previous user's in-memory task data.
- Prevent old tasks from appearing under another account.
- Keep local caches correctly partitioned by user ID.
- Never expose another user's records.

## 9. DEPLOYMENT CONFIGURATION

Inspect the existing Cloudflare deployment setup.

Ensure the frontend has its two public Supabase build variables and the backend has the required server-side configuration.

Keep all secret keys server-side.

Prepare the correct production OAuth redirect URLs for the actual deployed website and Android callback scheme.

Do not deploy until authentication and database tests pass.

## 10. FOCUSED TESTING

Perform these tests:

1. Sign in with Google on the website.
2. Restore the session after refreshing.
3. Create a task and retrieve it from Supabase.
4. Verify that a different Google account cannot access the first account's tasks.
5. Import existing local tasks without duplicates.
6. Sign out and verify old tasks are not visible.
7. Authenticate the Groq task-parsing endpoint.
8. Verify the Android OAuth deep-link implementation as far as available tooling permits.

Run TypeScript checks, existing tests and the production web build.

Do not claim Android authentication works unless it has been tested on an Android device or emulator.

## STRICT RULES

- Inspect the actual repository and Supabase project before editing.
- Use the already-connected Supabase MCP.
- Preserve existing working code.
- Never expose API secrets.
- Never disable RLS.
- Never delete local tasks during migration.
- Never give one user access to another user's tasks.
- Do not build an APK or run Gradle.
- Do not introduce unnecessary infrastructure.

Implement the actual changes, test them, and provide a clear report of files changed, database migrations, OAuth configuration requirements, test results and remaining manual steps.