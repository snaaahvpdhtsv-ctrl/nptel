# Sign-in page: learner sign in, sign up and Google, with admin sign-in behind an Admin button (preview)

## Summary

Replace the current `/admin` "Open demo dashboard" page with a real-looking sign-in experience:

- **Learners** get one page at `/signin` with **Sign in**, **Sign up** and **Continue with Google**.
- **Admins** click an **Admin** button on that page. Only then does the page swap to an **admin-only sign-in form**.
- The navbar's "Admin" pill becomes **Sign in**, or an **account menu** once someone is signed in.
- `/admin/dashboard` becomes reachable only after admin sign-in.

Everything stays **front-end preview** like the rest of the app. There is no backend. Accounts and the session are stored in this browser (`localStorage`), Google sign-in is simulated, and the admin uses visible demo credentials.

## Confirmed decisions

| Topic | Decision |
| --- | --- |
| Auth type | Preview only. Accounts and sessions live in this browser; "Continue with Google" is simulated; no backend. |
| Admin entry | An Admin button **on the sign-in page** swaps in the admin-only form. The navbar "Admin" pill is replaced by "Sign in". |
| Learner access | Sign-in is **optional**. Every learner page stays public. |
| Admin credentials | Fixed demo account `admin@nptelquiz.app` / `admin123`, shown on the admin form with a **Use demo credentials** button. |

## User experience

### Routes

| Path | Behavior |
| --- | --- |
| `/signin` | New `SignInPage`. The view comes from `?view=`: omitted or `signin` gives sign in, `signup` gives sign up, `admin` gives admin sign-in. Unknown values fall back to sign in. |
| `/admin` | `<Navigate to="/signin?view=admin" replace />`, so old links still work. `AdminEntryPage` is deleted. |
| `/admin/dashboard` | Wrapped in `RequireAdmin`. Without an admin session it redirects to `/signin?view=admin` with `replace` and `state={{ from: location }}`. |

- Switching views on the page uses `setSearchParams(..., { replace: true, state: location.state })`. View switches add no history entries, and the return target (`from`) survives the switch.
- **Where sign-in returns you** (all with `replace: true`, so Back skips the form):
  - Learner sign in, sign up or Google goes to `state.from` (pathname + search + hash). If `from` is missing or points at `/signin` or `/admin…`, it goes to `/`.
  - Admin sign-in goes to `state.from` if it starts with `/admin/dashboard` (this keeps `?course=&section=`), otherwise to `/admin/dashboard`.

### Sign-in page layout (`src/pages/SignInPage.tsx`)

- A centered column (`mx-auto max-w-md px-4 py-12 sm:py-16`) holds one `card p-6 sm:p-8`. It uses the same entrance motion as the old admin entry card (`opacity 0→1`, `y 12→0`).
- Built only from existing primitives: `card`, `btn-primary`, `btn-outline`, `btn-ghost`, `input`, `label`, lucide icons, and the `useApp().toast` notifications.
- **Learner views** (`signin` / `signup`):
  1. **Header:**
     - A gradient brand tile (`from-primary-600 via-primary-500 to-accent-500`, `Sparkles` icon, matching the navbar logo).
     - Title: "Welcome back" for sign in, "Create your account" for sign up.
     - Subtitle: "Sign in to continue to NPTEL Quiz." for sign in, "Join NPTEL Quiz to practise every course." for sign up.
  2. **Segmented control** "Sign in | Sign up":
     - `role="group"` with `aria-label="Account"`, and buttons with `aria-pressed`.
     - Same visual pattern as the Requests status filter (`rounded-xl bg-gray-100 p-1 dark:bg-white/5`).
  3. **Continue with Google:**
     - Full-width `btn-outline py-3` with an inline multicolor Google "G" SVG (a small local `GoogleIcon` component; brand colors are the one allowed raw-hex exception).
     - While pending it shows "Connecting to Google…" and is disabled.
     - The label is the same in both views.
  4. **Divider:** a centered "or" between two hairlines.
  5. **Sign-in form:**
     - Email: `type="email"`, `autoComplete="email"`.
     - Password: `autoComplete="current-password"`, with an Eye/EyeOff show/hide button inside the field (`aria-label` "Show password" / "Hide password").
     - Submit button "Sign in", or "Signing in…" while pending.
     - Footer line: "New to NPTEL Quiz? **Create an account**". This switches the view and keeps the typed email.
  6. **Sign-up form:**
     - Full name: `autoComplete="name"`, `maxLength=60`.
     - Email.
     - Password: `autoComplete="new-password"`, helper text "At least 8 characters".
     - Confirm password.
     - Submit button "Create account", or "Creating account…" while pending.
     - Footer line: "Already have an account? **Sign in**".
  7. **Preview note** (muted text with an `Info` icon): "Preview: accounts are saved only in this browser. Don't use a password you use elsewhere."
  8. **Card footer:**
     - Separated by a top border.
     - A centered `btn-ghost` button with a `ShieldCheck` icon labeled **Admin** (`title` "Sign in as an admin").
     - It switches to `?view=admin`.
     - No admin fields exist in the learner views.
- **Admin view** (`?view=admin`). It shows only the admin sign-in:
  - Header: a `ShieldCheck` tile (`from-primary-500 to-fuchsia-500`), title "Admin sign in", subtitle "Manage courses, weeks and questions."
  - No segmented control, no Google button, no sign-up.
  - Fields: Admin email and Password (with show/hide). Submit button "Sign in to dashboard", or "Signing in…" while pending.
  - A demo-credentials box (muted rounded panel):
    - Text: "Preview admin: admin@nptelquiz.app · admin123".
    - A small **Use demo credentials** button that fills both fields.
  - If a learner is currently signed in, show the note "You're signed in as {name}. Signing in as admin switches accounts."
  - Footer: an `ArrowLeft` link-style button "Back to learner sign in" that switches to `?view=signin`.
- **Already signed in:**
  - Admin view with an admin session: `<Navigate to="/admin/dashboard" replace />`.
  - Learner views with any session: replace the forms with a compact card showing:
    - An avatar initial, "You're signed in as {name}", and the email.
    - Buttons **Continue** (to `from` or `/`) and **Sign out** (outline).
    - For an admin session, an extra **Open dashboard** button.
- **Shared form behavior:**
  - Validation runs on submit:
    - Email must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
    - Name is required, at most 60 characters after trimming.
    - Password must be at least 8 characters (sign up). On sign in and admin sign-in it only has to be non-empty.
    - Confirm password must match.
  - Field errors show below the field (`text-xs text-red-600 dark:text-red-400`). The input gets `aria-invalid` and `aria-describedby`. Editing a field clears its error.
  - Credential errors appear in a `role="alert"` box above the submit button.
  - On a failed submit, focus moves to the first invalid field.
  - Submit buttons and the Google button are disabled while any request is pending.
  - Email state is shared between the sign-in and sign-up forms. Passwords clear when switching views. The admin form has its own state.
- **Success toasts:**
  - Sign in: "Welcome back, {first name}".
  - Sign up: "Account created — welcome, {first name}".
  - Google: "Signed in with Google (preview)".
  - Admin: "Signed in as admin".

### Error copy

| Situation | Message | Where |
| --- | --- | --- |
| Wrong email or password (learner) | "Email or password is incorrect." | form alert |
| Learner form used with the admin email | "Admins sign in with the Admin button below." | form alert |
| Sign in to an account created with Google | "This account uses Google sign-in. Continue with Google instead." | form alert |
| Sign up with an existing email | "An account with this email already exists." plus an inline **Sign in instead** button (switches view, keeps the email) | email field |
| Sign up with an email that uses Google | "This email uses Google sign-in. Continue with Google instead." | email field |
| Wrong admin credentials | "Admin email or password is incorrect." | form alert |
| `crypto.subtle` unavailable (insecure http context) | "Sign-in needs a secure (https) connection." | form alert |
| Invalid email / short password / mismatch / missing name | "Enter a valid email address." / "Use at least 8 characters." / "Passwords don't match." / "Enter your name." | field |

### Navbar (`src/components/Navbar.tsx`)

- **Remove** the desktop "Admin" pill and the mobile-menu "Admin" link.
- **Signed out:**
  - Desktop: a `Link to="/signin" state={{ from: location }}` styled `btn-primary px-3.5 py-1.5 text-xs`, with a `LogIn` icon and the text "Sign in".
  - It is shown from `sm` up (where the old pill was) and hidden while already on `/signin`.
- **Signed in:**
  - From `sm` up, an avatar button: an `h-8 w-8 rounded-full` gradient circle with the uppercase initial of the name, `aria-label="Account menu"` and `aria-expanded`.
  - It opens a popover that reuses the accessibility panel's pattern: `absolute right-0 top-full mt-2`, the same card styling, closed by click-outside via a `data-account-menu` attribute, by Escape, and on route change.
  - The popover shows:
    - Name (semibold) and email (truncated).
    - A small badge: "Admin" (`ShieldCheck`) for admins, or "Google" for Google sign-ins.
    - For admins, an **Admin dashboard** link (`LayoutDashboard` icon).
    - **Sign out** (`LogOut` icon).
- **Mobile menu** (below `lg`), at the bottom:
  - Signed out: a "Sign in" link.
  - Signed in: a name/email row, an "Admin dashboard" link for admins, and a "Sign out" button.
- **Sign out** from the navbar:
  - If the current path starts with `/admin`, first `navigate("/", { replace: true })`.
  - Then `signOut()` and toast "Signed out".

### Admin dashboard (`src/pages/admin/AdminPage.tsx`)

- Only the **Logout** button changes: `navigate("/", { replace: true })`, then `signOut()`, then toast "Signed out of the admin preview".
- Everything else is unchanged.

## Implementation

### 1. Auth context: `src/lib/auth-context.ts` (new)

This mirrors `app-context.ts`. The context lives apart from the provider so hot reload never creates a second context object.

```ts
export type Role = "learner" | "admin"
export type AuthMethod = "password" | "google"
export type AuthField = "name" | "email" | "password" | "confirm"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  method: AuthMethod
}

export interface SignUpInput {
  name: string
  email: string
  password: string
}

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string; field?: AuthField }

export interface AuthState {
  user: SessionUser | null
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (input: SignUpInput) => Promise<AuthResult>
  signInWithGoogle: () => Promise<AuthResult>
  signInAdmin: (email: string, password: string) => Promise<AuthResult>
  signOut: () => void
}

/** Preview-only admin account. It ships in the bundle, so it is public by design. */
export const PREVIEW_ADMIN = { name: "Admin", email: "admin@nptelquiz.app", password: "admin123" }
/** Identity used by the simulated "Continue with Google". */
export const PREVIEW_GOOGLE = { name: "Google Learner", email: "learner@gmail.com" }

export const AuthContext = createContext<AuthState | null>(null)
export function useAuth(): AuthState // throws "useAuth must be used within AuthProvider" outside the provider
```

Use named interfaces, not inline `{ a: x; b: y }` type literals. The repo's oxfmt 0.2 strips `;` separators from inline type literals and breaks the code.

### 2. Auth provider: `src/lib/auth-state.tsx` (new)

- **Storage keys** (named like the existing `nptel-theme`):
  - `nptel-accounts` holds `StoredAccount[]`. Each account has `id`, `name`, `email` (trimmed and lowercased), `method`, `salt?` (hex), `passwordHash?` (hex) and `createdAt` (ISO).
  - `nptel-session` holds the `SessionUser` JSON.
- **Loading:** read synchronously in `useState` initializers so `RequireAdmin` never flashes a redirect on reload.
  - Wrap `JSON.parse` in try/catch and shape-check every record. Invalid data falls back to `[]` or `null`.
  - Drop a learner session whose account id no longer exists.
- **Saving:** write through try/catch helpers. If storage is unavailable or full, keep the state in memory so the tab still works.
- **Cross-tab sync:** a `storage` event listener updates `user` when `nptel-session` changes in another tab.
- **Password hashing (preview-grade):**
  - Each account gets a 16-byte random salt from `crypto.getRandomValues`.
  - The stored hash is SHA-256 of `${salt}:${password}`, computed with `crypto.subtle.digest`.
  - Plaintext passwords are never stored.
  - If `crypto.subtle` is missing, password actions return the "secure connection" error.
- **IDs:** use `crypto.randomUUID()` when available, otherwise `Date.now().toString(36) + random`.
- **Simulated latency:** password and admin actions wait about 500 ms, Google about 700 ms. Use `window.setTimeout` wrapped in a promise, matching the app's other preview actions.
- **Actions:**
  - `signUp`:
    - Normalize the email and look for an existing account.
    - Existing account created with `google`: return the Google field error.
    - Any other existing account: return the duplicate field error.
    - Otherwise create the account with salt and hash, save it, set the session (`role: "learner"`, `method: "password"`) and return ok.
  - `signIn`:
    - The admin email returns the "Admins sign in…" error.
    - An account created with `google` returns the Google error.
    - A missing account or a hash mismatch returns "Email or password is incorrect."
    - Otherwise set the learner session.
  - `signInWithGoogle`:
    - Find the account with `PREVIEW_GOOGLE.email` (any method) or create it with `method: "google"`.
    - Set the session with `method: "google"`.
  - `signInAdmin`:
    - Succeeds only for `PREVIEW_ADMIN.email` (normalized) with the exact password.
    - Sets the session `{ id: "preview-admin", name: "Admin", email, role: "admin", method: "password" }`.
    - Otherwise returns the admin error.
  - `signOut`: clears the state and removes `nptel-session`.
  - There is one session at a time. Signing in as one role replaces the other.
- Memoize the context value with `useMemo` and the actions with `useCallback`, like `AppProvider`.

### 3. `src/App.tsx`

- Wrap the app content in `<AuthProvider>` inside `<AppProvider>`.
- Add `function RequireAdmin({ children })` next to `LegacyRedirect`. It uses `useAuth()` and `useLocation()`. If `user?.role !== "admin"` it returns `<Navigate to="/signin?view=admin" replace state={{ from: location }} />`, otherwise the children.
- Route changes:
  - Add `/signin` with `<SignInPage />`.
  - `/admin` becomes `<Navigate to="/signin?view=admin" replace />`.
  - `/admin/dashboard` becomes `<RequireAdmin><AdminPage /></RequireAdmin>`.
- Remove the `AdminEntryPage` import.

### 4. `src/pages/SignInPage.tsx` (new)

- Default export `SignInPage`. It reads `view` from `useSearchParams`, `from` from `useLocation().state`, and uses `useAuth()` and `useApp().toast`.
- Local components in the same file:
  - `GoogleIcon`.
  - `PasswordInput`: the input plus the show/hide toggle, forwarding `id`, `autoComplete`, `aria-*` and an error message.
  - `FieldError`.
  - `SignedInCard`.
  - `LearnerForms` (the sign-in / sign-up switcher and both forms).
  - `AdminForm`.
- Form submission:
  - Run validation, set `pending`, then await the auth action.
  - On `{ ok: false }`, put the result into either the field error (`field`) or the form alert, and focus the matching field through refs.
  - On success, toast and navigate using the redirect rules above.

### 5. `src/components/Navbar.tsx`

- Add `useAuth` and `useNavigate`.
- Add icons `LogIn`, `LogOut` and `LayoutDashboard` (`ShieldCheck` is still used for the admin badge).
- Add an `accountOpen` state with the same Escape / click-outside effect as `panelOpen` (selector `[data-account-menu]`). Close it on `pathname` change.
- Replace the Admin pill and the mobile Admin link as described above.

### 6. `src/pages/PreviewPages.tsx`

- Delete `AdminEntryPage`.
- Remove the imports that are now unused: `useState`, `useNavigate` and `ShieldCheck`. `ArrowRight` stays because other components use it.

### 7. `src/pages/admin/AdminPage.tsx`

- Logout: `const { signOut } = useAuth()`, then `navigate("/", { replace: true })`, `signOut()`, and the toast.

## Edge cases and failure modes

- **Corrupt or foreign data in storage:** ignored, and the app starts clean with no crash.
- **Storage blocked (private mode or quota):** sign-in still works for the current tab and is not persisted.
- **Insecure context:** password sign-up and sign-in show the https error. Google and admin sign-in still work because they don't hash.
- **Email matching:** emails are trimmed and lowercased. Display names are trimmed.
- **Redirect safety:** `from` is only ever a router location object, never a raw URL param. Loops into `/signin` or `/admin` fall back to the defaults.
- **Deep link:** opening `/admin/dashboard?course=x&section=weeks` while signed out leads to admin sign-in, then back to that exact URL.
- **Signing out while on the dashboard:** via the navbar, the Logout button, or another tab. You land on `/` (navbar or Logout) or on admin sign-in (`RequireAdmin`, other tab). The dashboard is never shown to a non-admin.
- **Double submits:** blocked while a request is pending.
- **Session conflicts:** a learner who signs in as admin, or the reverse, replaces the previous session.

## Verification

1. `pnpm format src/App.tsx src/components/Navbar.tsx src/lib/auth-context.ts src/lib/auth-state.tsx src/pages/SignInPage.tsx src/pages/PreviewPages.tsx src/pages/admin/AdminPage.tsx`, then `pnpm exec oxfmt --check` on the same files.
2. `pnpm exec tsc --noEmit -p tsconfig.json` and `pnpm build` both exit 0.
3. Drive headless Chromium over CDP against the running dev server (`http://localhost:3000`). Pass `--disable-dev-shm-usage`, because the container's 64 MB `/dev/shm` stalls wide-viewport rendering without it. The script checks:
   - The navbar shows "Sign in" and no "Admin" pill.
   - `/signin` shows Google, Sign in and Sign up, with no admin fields until **Admin** is clicked.
   - Sign-up validation: an empty submit shows the field errors and focuses the first one; a short password and a mismatch show their errors.
   - Sign up succeeds and lands on `/`. The avatar menu shows the name and email. Sign out works.
   - Sign in with a wrong password shows the form alert. The correct password succeeds. Signing up again with the same email shows the duplicate error.
   - Continue with Google signs in as "Google Learner".
   - In the admin view, wrong credentials show the alert. **Use demo credentials** then sign-in lands on `/admin/dashboard`.
   - Signed out, `/admin/dashboard?section=weeks` leads to `/signin?view=admin`, and sign-in returns to `/admin/dashboard?section=weeks`.
   - `/admin` redirects to `/signin?view=admin`.
   - A reload keeps the session. Dashboard Logout lands on `/`.
   - No console errors.
4. Screenshots of the sign-in, sign-up and admin views at 1280px and 390px wide, in light and dark themes.

## Out of scope

Real authentication, a backend, or real Google OAuth; password reset or email verification; tying saved questions or progress to accounts; profile editing; multiple admin accounts; gating learner pages.
