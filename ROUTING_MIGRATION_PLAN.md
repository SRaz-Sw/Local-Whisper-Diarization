# Routing Migration Plan

## Date: 2025-10-26

## Goal

Unify the routing system so the entire application (including the landing page) uses the **custom hash-based router**, and the app starts at the base URL (`localhost:3000/`) instead of `localhost:3000/web-transc`.

---

## Current State Summary

- **Landing page:** `localhost:3000/` (Next.js routing)
- **App:** `localhost:3000/web-transc` (Custom hash routing)
- **Electron:** Loads directly to `/web-transc`

### Issues
1. Two different routing systems
2. App doesn't start at base URL
3. Sidebar appears on landing page (not needed)
4. Can't deep link to specific views from landing page

---

## Proposed Solution

### New URL Structure

#### Web Application
- **Landing/Home:** `localhost:3000/` → Shows landing page content
- **Upload View:** `localhost:3000/#upload` (or just `localhost:3000/`)
- **Transcribe View:** `localhost:3000/#transcribe`
- **Transcript View:** `localhost:3000/#transcript/{id}`
- **Saved View:** `localhost:3000/#saved`

#### Electron Application
- **Development:** `http://localhost:3000/` → Directly to app (hash routing handles views)
- **Production:** `app://localhost/index.html` → Directly to app

### Strategy

**Treat the landing page as another view** in the custom router:

```
Views:
- landing   → Marketing/landing page content
- upload    → Upload audio files
- transcribe → Transcription in progress
- transcript → View transcript results
- saved     → Browse saved transcripts
```

---

## Migration Steps

### Phase 1: Move Landing Page into Custom Router

#### 1.1: Create LandingView Component
**File:** `nextjs-v1/src/app/web-transc/views/LandingView.tsx`

**Action:** Move content from [nextjs-v1/src/app/page.tsx](nextjs-v1/src/app/page.tsx) into a new view component.

**Changes:**
- Extract the entire landing page UI into `LandingView`
- Keep all existing functionality (platform detection, download buttons, links)
- Update "Use Web Version" buttons to call `navigate('upload')` instead of `<Link href="/web-transc">`

**Lines to change:**
- Current: `<Link href="/web-transc">` ([page.tsx:185](nextjs-v1/src/app/page.tsx#L185), [page.tsx:361](nextjs-v1/src/app/page.tsx#L361))
- New: `<Button onClick={() => navigate('upload')}>` (using router store)

**Estimated changes:** ~30 lines (create new file, update navigation buttons)

---

#### 1.2: Update Router Types
**File:** `nextjs-v1/src/app/web-transc/router/types.ts`

**Action:** Add `landing` view to type definitions.

**Changes:**
```tsx
export type ViewName =
  | 'landing'      // NEW: Landing/marketing page
  | 'upload'
  | 'transcribe'
  | 'transcript'
  | 'saved';

export interface ViewParams {
  landing: void;   // NEW
  upload: void;
  transcribe: void;
  transcript: { id: string };
  saved: void;
}
```

**Estimated changes:** 2 lines

---

#### 1.3: Update View Registry
**File:** `nextjs-v1/src/app/web-transc/router/views.ts`

**Action:** Register the new LandingView.

**Changes:**
```tsx
export const views = {
  landing: lazy(() => import('../views/LandingView')),  // NEW
  upload: lazy(() => import('../views/UploadView')),
  transcribe: lazy(() => import('../views/TranscribeView')),
  transcript: lazy(() => import('../views/TranscriptView')),
  saved: lazy(() => import('../views/SavedView')),
};
```

**Estimated changes:** 1 line

---

#### 1.4: Update Router Store - Initial View Logic
**File:** `nextjs-v1/src/app/web-transc/store/useRouterStore.ts`

**Action:** Change default initial view based on context.

**Changes:**
```tsx
// Initial state
currentView: 'upload', // Current default

// NEW: Check if we should show landing or go straight to upload
currentView: typeof window !== 'undefined' && window.location.pathname === '/web-transc'
  ? 'upload'  // Coming from old link
  : 'landing', // Fresh load at /
```

**Alternative approach (simpler):** Always default to `'landing'`, let Router component handle the logic.

**Estimated changes:** 1 line

---

#### 1.5: Update Router Component - Hash Navigation
**File:** `nextjs-v1/src/app/web-transc/router/Router.tsx`

**Action:** Update hash change handler to support landing view.

**Changes in `handleHashChange` function (line 127-176):**

```tsx
const handleHashChange = () => {
  const hash = window.location.hash.slice(1);

  // No hash = go to landing (CHANGED from 'upload')
  if (!hash) {
    navigate('landing');
    return;
  }

  // Rest remains the same...
};
```

**Estimated changes:** 1 line (change 'upload' to 'landing' on line 134)

---

### Phase 2: Move App to Root URL

#### 2.1: Move Router to Root Page
**File:** `nextjs-v1/src/app/page.tsx`

**Action:** Replace landing page content with Router component.

**Current:**
```tsx
export default function LandingPage() {
  // 396 lines of landing page code
}
```

**New:**
```tsx
"use client";

import { Router } from "./web-transc/router/Router";
import { ErrorBoundary } from "./web-transc/components/ErrorBoundary";

export default function RootPage() {
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
}
```

**Estimated changes:** Replace entire file (~10 lines total)

---

#### 2.2: Update Router Path References
**Files to update:**
- [nextjs-v1/src/components/home-sidebar/MainSection.tsx](nextjs-v1/src/components/home-sidebar/MainSection.tsx)
- [nextjs-v1/src/components/home-sidebar/transcriptsSection.tsx](nextjs-v1/src/components/home-sidebar/transcriptsSection.tsx)

**Action:** Update import paths since Router moved up one level.

**Changes:**
```tsx
// OLD
import { useRouterStore } from "@/app/web-transc/store/useRouterStore";

// NEW
import { useRouterStore } from "@/app/web-transc/store/useRouterStore";
// (Actually stays the same, no change needed)
```

**Estimated changes:** 0 lines (imports remain valid)

---

#### 2.3: Update Sidebar Links
**File:** `nextjs-v1/src/components/home-sidebar/MainSection.tsx`

**Action:** Remove redundant `<Link href="/web-transc">` wrapper.

**Current (line 48):**
```tsx
<SidebarMenuButton
  onClick={() => navigate("upload")}
>
  <Link href={item.url} className="flex items-center gap-4">
    {item.icon}
    <span className="text-sm">{item.title}</span>
  </Link>
</SidebarMenuButton>
```

**New:**
```tsx
<SidebarMenuButton
  onClick={() => navigate("upload")}
>
  <div className="flex items-center gap-4">
    {item.icon}
    <span className="text-sm">{item.title}</span>
  </div>
</SidebarMenuButton>
```

**Estimated changes:** 2 lines (remove Link, replace with div)

---

#### 2.4: Update Electron URLs
**File:** `nextjs-v1/electron/main.js`

**Action:** Update URLs to point to root instead of `/web-transc`.

**Current (line 89, 94):**
```js
// Development
mainWindow.loadURL("http://localhost:3000/web-transc");

// Production
mainWindow.loadURL("app://localhost/web-transc/index.html");
```

**New:**
```js
// Development
mainWindow.loadURL("http://localhost:3000/#upload");

// Production
mainWindow.loadURL("app://localhost/index.html#upload");
```

**Rationale:** Load directly to `#upload` view, skipping landing page in Electron.

**Estimated changes:** 2 lines

---

### Phase 3: Handle Layout Visibility

#### 3.1: Conditional Sidebar Rendering
**File:** `nextjs-v1/src/app/layout.tsx`

**Action:** Hide sidebar when on landing view.

**Current (line 32-39):**
```tsx
<SidebarProvider>
  <div className="relative w-full">
    <HomeNavbar />
    <div className="mx-auto flex h-full max-h-[calc(100svw-4rem)] max-w-svh pt-[4rem]">
      <HomeSidebar />
      <main className="w-full">{children}</main>
      <Toaster position="top-center" />
    </div>
  </div>
</SidebarProvider>
```

**New:**
```tsx
"use client";

import { useRouterStore } from "./web-transc/store/useRouterStore";

export default function RootLayout({ children }) {
  const currentView = useRouterStore((state) => state.currentView);
  const showSidebar = currentView !== 'landing';

  return (
    <html lang="en">
      <body className={inter.className}>
        <ProvidersClientSide>
          <SidebarProvider>
            <div className="relative w-full">
              <HomeNavbar />
              <div className="mx-auto flex h-full max-h-[calc(100svw-4rem)] max-w-svh pt-[4rem]">
                {showSidebar && <HomeSidebar />}
                <main className="w-full">{children}</main>
                <Toaster position="top-center" />
              </div>
            </div>
          </SidebarProvider>
        </ProvidersClientSide>
      </body>
    </html>
  );
}
```

**Issue:** `layout.tsx` is typically a Server Component, but `useRouterStore` requires Client Component.

**Solution:** Move sidebar logic to a client component wrapper.

**Better approach:**
Create `nextjs-v1/src/app/LayoutWrapper.tsx`:
```tsx
"use client";

import { useRouterStore } from "./web-transc/store/useRouterStore";
import { SidebarProvider } from "@/components/ui/sidebar";
import HomeNavbar from "@/components/home-navbar/HomeNavbar";
import HomeSidebar from "@/components/home-sidebar/HomeSidebar";
import { Toaster } from "sonner";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const currentView = useRouterStore((state) => state.currentView);
  const showSidebar = currentView !== 'landing';

  return (
    <SidebarProvider>
      <div className="relative w-full">
        <HomeNavbar />
        <div className="mx-auto flex h-full max-h-[calc(100svw-4rem)] max-w-svh pt-[4rem]">
          {showSidebar && <HomeSidebar />}
          <main className="w-full">{children}</main>
          <Toaster position="top-center" />
        </div>
      </div>
    </SidebarProvider>
  );
}
```

Then update `layout.tsx`:
```tsx
import { LayoutWrapper } from "./LayoutWrapper";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ProvidersClientSide>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ProvidersClientSide>
      </body>
    </html>
  );
}
```

**Estimated changes:** Create new file (15 lines), modify layout.tsx (5 lines)

---

### Phase 4: Clean Up Old Routes

#### 4.1: Deprecate /web-transc Route
**File:** `nextjs-v1/src/app/web-transc/page.tsx`

**Action:** Convert to redirect to root.

**New:**
```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WebTranscRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to root with upload view
    router.replace("/#upload");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecting...</p>
    </div>
  );
}
```

**Alternative:** Keep as-is for backward compatibility, but update to use Router at root level.

**Estimated changes:** 15 lines (if implementing redirect)

---

#### 4.2: Update Build Scripts (if needed)
**File:** `nextjs-v1/scripts/build-electron.js`

**Action:** Check if any build scripts reference `/web-transc` path and update accordingly.

**Estimated changes:** TBD (need to check build script)

---

## Summary of Changes

### Files to Create (1)
1. `nextjs-v1/src/app/web-transc/views/LandingView.tsx` - New view for landing page

### Files to Modify (9)

| File | Lines Changed | Complexity | Critical |
|------|---------------|------------|----------|
| `nextjs-v1/src/app/page.tsx` | ~400 (replace entire file) | Low | ✅ Yes |
| `nextjs-v1/src/app/web-transc/router/types.ts` | 2 | Low | ✅ Yes |
| `nextjs-v1/src/app/web-transc/router/views.ts` | 1 | Low | ✅ Yes |
| `nextjs-v1/src/app/web-transc/store/useRouterStore.ts` | 1 | Low | No |
| `nextjs-v1/src/app/web-transc/router/Router.tsx` | 1 | Low | ✅ Yes |
| `nextjs-v1/src/components/home-sidebar/MainSection.tsx` | 2 | Low | No |
| `nextjs-v1/electron/main.js` | 2 | Low | ✅ Yes |
| `nextjs-v1/src/app/layout.tsx` | 5 | Medium | No |
| `nextjs-v1/src/app/LayoutWrapper.tsx` (new) | 15 | Low | No |

**Total Estimated Changes:** ~430 lines (mostly moving existing code)

---

## Rollback Plan

### Immediate Rollback
If issues are discovered during testing:

1. **Revert page.tsx:**
   ```bash
   git checkout HEAD -- nextjs-v1/src/app/page.tsx
   ```

2. **Revert electron/main.js:**
   ```bash
   git checkout HEAD -- nextjs-v1/electron/main.js
   ```

3. **Test:** Both web and Electron should work at `/web-transc` again

### Full Rollback
```bash
git checkout HEAD -- nextjs-v1/src/app/
git checkout HEAD -- nextjs-v1/electron/main.js
git checkout HEAD -- nextjs-v1/src/components/
```

---

## Testing Checklist

### Web Application Tests
- [ ] `localhost:3000/` loads landing page
- [ ] Click "Use Web Version" → navigates to `/#upload`
- [ ] Sidebar appears when in app views (upload, transcribe, etc.)
- [ ] Sidebar hidden when on landing page
- [ ] Upload file and transcribe → works correctly
- [ ] Navigate between views using sidebar → works
- [ ] Browser back/forward buttons → work correctly
- [ ] Deep link `localhost:3000/#transcript/abc123` → loads correctly
- [ ] Deep link `localhost:3000/#saved` → loads correctly
- [ ] Reload page while on a view → restores view correctly

### Electron Application Tests
- [ ] Development: `npm run electron:start` → loads to upload view
- [ ] Production build: Electron loads to upload view (not landing)
- [ ] Transcription works in Electron
- [ ] Worker loads correctly
- [ ] All views navigate properly
- [ ] No console errors

### Backward Compatibility Tests
- [ ] Old URL `localhost:3000/web-transc` → redirects to `/#upload`
- [ ] Old bookmarks still work (or redirect properly)
- [ ] Shared links with old URLs still work

---

## Migration Order (Recommended)

### Option A: Incremental Migration (Safer)
1. **Week 1:** Create LandingView, add to router (backward compatible)
2. **Week 2:** Test landing view at `/#landing`
3. **Week 3:** Move router to root, update Electron URLs
4. **Week 4:** Test thoroughly, then deploy
5. **Week 5:** Deprecate `/web-transc` with redirect

### Option B: Single Migration (Faster)
1. **Day 1:** Make all changes in a feature branch
2. **Day 2-3:** Test thoroughly in development
3. **Day 4:** Test Electron builds (Mac, Windows, Linux)
4. **Day 5:** Deploy to production
5. **Day 6-7:** Monitor for issues, be ready to rollback

**Recommended:** Option A (incremental) for production codebase

---

## Potential Risks & Mitigations

### Risk 1: Breaking Electron Builds
**Mitigation:**
- Test Electron builds thoroughly before deploying
- Keep old `/web-transc` route as fallback during transition
- Test on all platforms (Mac, Windows, Linux)

### Risk 2: IndexedDB Data Loss
**Mitigation:**
- Custom router uses same IndexedDB regardless of URL
- No data migration needed
- Zustand persisted state uses same key

### Risk 3: External Links to /web-transc
**Mitigation:**
- Keep redirect from `/web-transc` → `/#upload`
- Update all marketing materials, GitHub links, etc.

### Risk 4: Layout Component Type Issues
**Mitigation:**
- Use LayoutWrapper pattern to keep layout.tsx as Server Component
- Test both layouts (with/without sidebar)

---

## Post-Migration Tasks

### 1. Update Documentation
- [ ] README.md - Update URLs
- [ ] ROUTER_IMPLEMENTATION_COMPLETE.md - Update with new structure
- [ ] Release notes for next version

### 2. Update External References
- [ ] GitHub README
- [ ] Website (if any)
- [ ] Download links
- [ ] Marketing materials

### 3. Clean Up (After 2-4 Weeks in Production)
- [ ] Remove `/web-transc/page.tsx` (keep redirect for longer)
- [ ] Remove old feature flag if any
- [ ] Archive old documentation

---

## Success Criteria

### Functional
- ✅ App starts at `localhost:3000/` (not `/web-transc`)
- ✅ Landing page accessible at `/#landing` or `/`
- ✅ All app views work correctly
- ✅ Sidebar only shows in app views (not landing)
- ✅ Electron loads directly to upload view
- ✅ Browser navigation works correctly
- ✅ Deep links work
- ✅ Backward compatibility maintained

### Non-Functional
- ✅ No breaking changes to user data
- ✅ Clean, maintainable code
- ✅ Easy to rollback if needed
- ✅ Minimal code changes (production codebase requirement)

---

## Alternative Approaches Considered

### Alternative 1: Keep /web-transc Route
**Pros:**
- No changes needed
- Zero risk

**Cons:**
- Doesn't meet user requirement (start at `/`)
- Still has two routing systems

**Verdict:** ❌ Rejected - doesn't solve the problem

---

### Alternative 2: Use Next.js Router for Everything
**Pros:**
- One routing system
- Standard Next.js patterns

**Cons:**
- Requires different build configuration for Electron
- Loses type-safe navigation
- More complex worker management
- Would require rewriting custom router (high risk)

**Verdict:** ❌ Rejected - too risky for production codebase

---

### Alternative 3: Hybrid Approach (This Plan)
**Pros:**
- Extends existing custom router (low risk)
- Minimal changes to existing code
- Maintains all current benefits
- Easy to rollback

**Cons:**
- Still uses hash-based routing (slightly different from standard Next.js)

**Verdict:** ✅ **Selected** - Best balance of risk vs benefit

---

## Questions for User

Before proceeding with implementation, please confirm:

1. **Landing page treatment:**
   - Option A: Landing page becomes a view in the router (`/#landing`)
   - Option B: Landing page at `/`, app at `/#upload` (requires checking hash)

   **Recommended:** Option A (simpler, consistent)

2. **Electron behavior:**
   - Should Electron skip landing page and go straight to `#upload`?

   **Recommended:** Yes (current behavior)

3. **Backward compatibility:**
   - Keep `/web-transc` route with redirect?

   **Recommended:** Yes, for at least 1-2 months

4. **Sidebar on landing:**
   - Hide sidebar on landing page?

   **Recommended:** Yes (it's a marketing page)

5. **Migration timeline:**
   - Incremental (safer, slower) or Single migration (faster, riskier)?

   **Recommended:** Incremental for production codebase

---

**Document End**
