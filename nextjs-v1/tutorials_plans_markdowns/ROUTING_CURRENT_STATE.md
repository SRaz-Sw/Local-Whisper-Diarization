# Current Routing State Analysis

## Date: 2025-10-26

## Overview

The application currently has **two separate routing systems** running in
parallel:

1. **Next.js File-Based Routing** - Used for the landing page
2. **Custom View-Based Routing** - Used inside the `/web-transc` route for
   the actual application

---

## Current URL Structure

### Web Application URLs

- **Landing Page:** `http://localhost:3000/` →
  [nextjs-v1/src/app/page.tsx](nextjs-v1/src/app/page.tsx)
- **Web App Base:** `http://localhost:3000/web-transc` →
  [nextjs-v1/src/app/web-transc/page.tsx](nextjs-v1/src/app/web-transc/page.tsx)
- **Web App Views (Hash-based):**
  - `http://localhost:3000/web-transc#upload`
  - `http://localhost:3000/web-transc#transcribe`
  - `http://localhost:3000/web-transc#transcript/{id}`
  - `http://localhost:3000/web-transc#saved`

### Electron Application URLs

- **Development:** `http://localhost:3000/web-transc` (loaded in
  main.js:89)
- **Production:** `app://localhost/web-transc/index.html` (loaded in
  main.js:94)

---

## Routing System #1: Next.js File-Based Routing

### Structure

```
nextjs-v1/src/app/
├── layout.tsx                    # Root layout with navbar + sidebar
├── page.tsx                      # Landing page (localhost:3000/)
└── web-transc/
    └── page.tsx                  # Web app entry point (localhost:3000/web-transc)
```

### How It Works

- Uses Next.js App Router convention (folder-based routing)
- [page.tsx](nextjs-v1/src/app/page.tsx) is the **landing page** with:
  - Download buttons for desktop apps
  - "Use Web Version" button linking to `/web-transc`
  - Feature showcase and marketing content
- [layout.tsx](nextjs-v1/src/app/layout.tsx) wraps all pages with:
  - HomeNavbar (top navigation bar)
  - HomeSidebar (left sidebar)
  - Toaster for notifications
  - Theme provider and other global providers

### Links to `/web-transc`

Found in [page.tsx:185-189](nextjs-v1/src/app/page.tsx#L185-L189):

```tsx
<Link href="/web-transc">
  <Globe className="mr-2 h-5 w-5" />
  Use Web Version
  <ChevronRight className="ml-2 h-5 w-5" />
</Link>
```

And [page.tsx:361-365](nextjs-v1/src/app/page.tsx#L361-L365):

```tsx
<Link href="/web-transc">
  <Globe className="mr-2 h-5 w-5" />
  Try Web Version
</Link>
```

---

## Routing System #2: Custom View-Based Routing (Inside /web-transc)

### Structure

```
nextjs-v1/src/app/web-transc/
├── page.tsx                         # Entry point with feature flag
├── router/
│   ├── Router.tsx                   # Main router component
│   ├── types.ts                     # View names & param types
│   └── views.ts                     # Lazy-loaded view registry
├── views/
│   ├── UploadView.tsx               # upload view
│   ├── TranscribeView.tsx           # transcribe view
│   ├── TranscriptView.tsx           # transcript view
│   └── SavedView.tsx                # saved view
└── store/
    └── useRouterStore.ts            # Navigation state management
```

### How It Works

#### 1. Entry Point ([web-transc/page.tsx](nextjs-v1/src/app/web-transc/page.tsx))

```tsx
const USE_NEW_ROUTER = true; // Feature flag

export default function WebTranscriptionPage() {
  return (
    <ErrorBoundary>
      {USE_NEW_ROUTER ? <Router /> : <WhisperDiarization />}
    </ErrorBoundary>
  );
}
```

- Feature flag controls which version to use (new router vs old monolith)
- Currently set to `true` (using new router)

#### 2. View Registry ([router/views.ts](nextjs-v1/src/app/web-transc/router/views.ts))

```tsx
export const views = {
  upload: lazy(() => import("../views/UploadView")),
  transcribe: lazy(() => import("../views/TranscribeView")),
  transcript: lazy(() => import("../views/TranscriptView")),
  saved: lazy(() => import("../views/SavedView")),
};
```

- Lazy-loaded for code splitting
- Each view is a separate component

#### 3. Type Definitions ([router/types.ts](nextjs-v1/src/app/web-transc/router/types.ts))

```tsx
export type ViewName = "upload" | "transcribe" | "transcript" | "saved";

export interface ViewParams {
  upload: void;
  transcribe: void;
  transcript: { id: string }; // Requires transcript ID
  saved: void;
}
```

- Type-safe navigation
- `transcript` view requires an `id` parameter

#### 4. Router Store ([store/useRouterStore.ts](nextjs-v1/src/app/web-transc/store/useRouterStore.ts))

```tsx
interface RouterStore extends NavigationState {
  navigate: (view: ViewName, params?: any) => void;
  back: () => void;
  replace: (view: ViewName, params?: any) => void;
  getFullPath: () => string;
}
```

**Key Features:**

- **Hash-based routing:** Updates `window.location.hash` (line 38-39)
- **State persistence:** Persists `currentView` and `params` to
  localStorage (line 89-96)
- **Navigation history:** Maintains history stack for back navigation (line
  24, 45)
- **URL sync:** Keeps URL hash in sync with current view (line 37-40)

#### 5. Router Component ([router/Router.tsx](nextjs-v1/src/app/web-transc/router/Router.tsx))

**Responsibilities:**

1. **Worker initialization** (line 22-123): Initializes Web Worker once and
   handles all worker messages
2. **Hash navigation** (line 125-185):
   - Parses URL hash on mount
   - Listens to `hashchange` events for browser back/forward
   - Validates routes and transcript IDs
3. **View rendering** (line 187-196): Renders current view with React
   Suspense

**Hash Navigation Logic (line 126-184):**

```tsx
const handleHashChange = () => {
  const hash = window.location.hash.slice(1);

  // No hash = go to upload
  if (!hash) {
    navigate("upload");
    return;
  }

  const [view, id] = hash.split("/");

  // Validate view exists
  if (!(view in views)) {
    navigate("upload");
    return;
  }

  // Validate transcript ID if navigating to transcript view
  if (view === "transcript" && id) {
    // Check if transcript exists in IndexedDB
    getWithAudio(id).then((result) => {
      if (result) {
        navigate(view, { id });
      } else {
        navigate("upload"); // Transcript not found
      }
    });
  } else {
    navigate(view, id ? { id } : undefined);
  }
};
```

---

## Navigation Flow

### From Landing Page to Web App

1. User visits `localhost:3000/`
2. Clicks "Use Web Version" button
3. Next.js routes to `/web-transc`
4. Custom Router mounts and parses hash
5. If no hash, navigates to `upload` view
6. URL becomes `localhost:3000/web-transc#upload`

### Within Web App (Custom Router)

1. User clicks "Run model" in UploadView
2. Calls `navigate('transcribe')`
3. Router updates:
   - `window.location.hash = 'transcribe'`
   - Zustand state: `currentView = 'transcribe'`
   - Renders TranscribeView
4. URL: `localhost:3000/web-transc#transcribe`

### Browser Back/Forward

1. User clicks browser back button
2. `hashchange` event fires
3. Router's `handleHashChange` parses new hash
4. Updates view accordingly
5. **Works correctly** with browser navigation

---

## Sidebar Integration

The sidebar components
([MainSection.tsx](nextjs-v1/src/components/home-sidebar/MainSection.tsx),
[transcriptsSection.tsx](nextjs-v1/src/components/home-sidebar/transcriptsSection.tsx))
use the custom router:

### MainSection.tsx (line 33-46)

```tsx
const navigate = useRouterStore((state) => state.navigate);
const currentView = useRouterStore((state) => state.currentView);

<SidebarMenuButton
  isActive={currentView === "upload"}
  onClick={() => navigate("upload")}
>
  <Link href={item.url} className="flex items-center gap-4">
    {item.icon}
    <span className="text-sm">{item.title}</span>
  </Link>
</SidebarMenuButton>;
```

**Issue:** Uses both `Link href="/web-transc"` AND
`onClick={() => navigate("upload")}`. The Link is redundant since the
custom router handles navigation via hash.

### transcriptsSection.tsx (line 25-45)

```tsx
const navigate = useRouterStore((state) => state.navigate);
const currentView = useRouterStore((state) => state.currentView);
const params = useRouterStore((state) => state.params);

<SidebarMenuButton
  isActive={currentView === "transcript" && params.id === item.id}
  onClick={() => navigate("transcript", { id: item.id })}
>
```

**Works correctly:** Uses custom router for navigation to transcript views.

---

## Electron Integration

### Development Mode ([electron/main.js:89](nextjs-v1/electron/main.js#L89))

```js
mainWindow.loadURL("http://localhost:3000/web-transc");
```

- Loads directly to `/web-transc` route
- Skips the landing page
- Uses Next.js dev server

### Production Mode ([electron/main.js:94](nextjs-v1/electron/main.js#L94))

```js
mainWindow.loadURL("app://localhost/web-transc/index.html");
```

- Loads from static export
- Uses custom `app://` protocol
- Serves files from `out/web-transc/` directory

**Key Observation:** Electron **always loads `/web-transc`** directly,
never the landing page at `/`.

---

## Current Issues & Limitations

### 1. Double Routing System

- Landing page uses Next.js routing
- Web app uses custom hash-based routing
- **Different paradigms** for same app

### 2. Inconsistent Base URL

- Web: `localhost:3000/` for landing, `localhost:3000/web-transc` for app
- Electron: Always `localhost:3000/web-transc`
- **User requirement:** Want app to start at `/` instead of `/web-transc`

### 3. Redundant Links in Sidebar

- MainSection uses both `<Link href="/web-transc">` and
  `onClick={() => navigate("upload")}`
- Should use one consistent method

### 4. Layout Applied to Landing Page

- [layout.tsx](nextjs-v1/src/app/layout.tsx) includes navbar + sidebar for
  ALL pages
- Landing page doesn't need sidebar (it's a marketing page)
- Sidebar is only relevant when inside the app

### 5. No Direct Deep Linking Between Systems

- Can't navigate from landing page directly to a specific view (e.g.,
  `/#transcript/123`)
- Would need to go through `/web-transc` first

---

## Why Custom Router Was Built

From
[ROUTER_IMPLEMENTATION_COMPLETE.md](ROUTER_IMPLEMENTATION_COMPLETE.md):

### Purpose

- **Electron compatibility:** Hash-based routing works in both web and
  Electron without build-time conditionals
- **Worker persistence:** Single worker instance survives view transitions
- **Type-safe navigation:** Compile-time guarantees for routes and
  parameters
- **Browser back/forward:** Full browser history support
- **Deep links:** Shareable URLs with hash-based routing
- **Code splitting:** Lazy-loaded views reduce bundle size

### Why Not Use Next.js Router?

- Next.js App Router relies on server-side routing
- Electron loads static files via custom protocol
- Hash-based routing is **environment-agnostic**
- No need for different code paths for web vs Electron

---

## Summary of Current State

### What Works Well

✅ Custom router handles all internal navigation smoothly ✅ Type-safe
navigation with TypeScript ✅ Browser back/forward buttons work correctly
✅ Deep links via hash routing (`#transcript/abc123`) ✅ Sidebar correctly
shows active view ✅ Electron loads directly to app (skips landing page) ✅
Worker persists across view transitions

### What Needs Improvement

❌ Two separate routing paradigms (Next.js + Custom) ❌ App starts at
`/web-transc` instead of `/` ❌ Landing page has unnecessary sidebar ❌
Redundant navigation code in sidebar ❌ Landing page not integrated with
custom router

---

## Files Involved in Routing

### Next.js Routing

- [nextjs-v1/src/app/layout.tsx](nextjs-v1/src/app/layout.tsx) - Root
  layout
- [nextjs-v1/src/app/page.tsx](nextjs-v1/src/app/page.tsx) - Landing page

### Custom Router (Web-Transc)

- [nextjs-v1/src/app/web-transc/page.tsx](nextjs-v1/src/app/web-transc/page.tsx) -
  Entry point
- [nextjs-v1/src/app/web-transc/router/Router.tsx](nextjs-v1/src/app/web-transc/router/Router.tsx) -
  Router logic
- [nextjs-v1/src/app/web-transc/router/types.ts](nextjs-v1/src/app/web-transc/router/types.ts) -
  Types
- [nextjs-v1/src/app/web-transc/router/views.ts](nextjs-v1/src/app/web-transc/router/views.ts) -
  View registry
- [nextjs-v1/src/app/web-transc/store/useRouterStore.ts](nextjs-v1/src/app/web-transc/store/useRouterStore.ts) -
  State

### Views

- [nextjs-v1/src/app/web-transc/views/UploadView.tsx](nextjs-v1/src/app/web-transc/views/UploadView.tsx)
- [nextjs-v1/src/app/web-transc/views/TranscribeView.tsx](nextjs-v1/src/app/web-transc/views/TranscribeView.tsx)
- [nextjs-v1/src/app/web-transc/views/TranscriptView.tsx](nextjs-v1/src/app/web-transc/views/TranscriptView.tsx)
- [nextjs-v1/src/app/web-transc/views/SavedView.tsx](nextjs-v1/src/app/web-transc/views/SavedView.tsx)

### Sidebar Components

- [nextjs-v1/src/components/home-sidebar/HomeSidebar.tsx](nextjs-v1/src/components/home-sidebar/HomeSidebar.tsx)
- [nextjs-v1/src/components/home-sidebar/MainSection.tsx](nextjs-v1/src/components/home-sidebar/MainSection.tsx)
- [nextjs-v1/src/components/home-sidebar/transcriptsSection.tsx](nextjs-v1/src/components/home-sidebar/transcriptsSection.tsx)

### Electron

- [nextjs-v1/electron/main.js](nextjs-v1/electron/main.js) - Main process

---

**Document End**
