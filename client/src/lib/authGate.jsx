/* eslint-disable react-refresh/only-export-components */
// Auth-gate plumbing for module-level action buttons.
// Mixing the Provider component with hook exports here is intentional —
// it keeps a single import path for callers. The eslint-disable above
// only loses Vite's fast refresh on edits to THIS file (rare); component
// files that consume the hooks still HMR normally.
//
// Why: routes are already paywalled at the navigation layer — anonymous
// visitors can SEE a module's empty UI but the LoginModal pops over the
// page (see Dashboard.gatedNav). The hole this file closes is buttons
// INSIDE those modules: "+ Add URL", "+ Upload", "+ New Folder", "Delete",
// "Save", etc. Without a per-handler gate, a determined click still hits
// the backend even though the modal is showing — bad UX (silent writes by
// anon users) and a small correctness risk if a leftover Meta token still
// exists from a previous session.
//
// Pattern:
//
//   <AuthGateProvider isAppAuthed={...} requestSignIn={...}>
//     ...module renders...
//   </AuthGateProvider>
//
// Inside any module:
//
//   import { useRequireAuth } from '../lib/authGate.jsx';
//   const requireAuth = useRequireAuth();
//
//   <button onClick={requireAuth(() => handleCrawl(url))}>+ Add URL</button>
//
//   // or as a wrapper around an entire handler:
//   const handleUpload = requireAuth(async (file) => { ... });
//
// requireAuth(fn) returns a function that:
//   1. If user is signed in (isAppAuthed === true) → forwards args to fn
//   2. If not → calls requestSignIn() to open the LoginModal and bails out
//
// Default context value treats isAppAuthed as TRUE so unit tests / Storybook
// renders that don't mount a provider don't accidentally lock the UI down.
import { createContext, useCallback, useContext } from 'react';

const AuthGateContext = createContext({
  isAppAuthed: true,
  requestSignIn: () => {},
});

export const AuthGateProvider = ({ isAppAuthed, requestSignIn, children }) => (
  <AuthGateContext.Provider value={{ isAppAuthed, requestSignIn }}>
    {children}
  </AuthGateContext.Provider>
);

// Raw read of the gate state. Useful when a component needs to render a
// disabled-style affordance ("Sign in to continue") rather than a hard
// click block.
export const useAuthGate = () => useContext(AuthGateContext);

// Higher-order: wrap any function so it gates on isAppAuthed before
// invocation. The returned function preserves the original's args/return.
//
// Memoised on the gate state so wrapping inside `onClick={requireAuth(fn)}`
// doesn't churn a new ref every render — important when handlers are
// passed into deep child components with React.memo.
export const useRequireAuth = () => {
  const { isAppAuthed, requestSignIn } = useContext(AuthGateContext);
  return useCallback((fn) => (...args) => {
    if (!isAppAuthed) {
      requestSignIn();
      return undefined;
    }
    return fn?.(...args);
  }, [isAppAuthed, requestSignIn]);
};
