/**
 * Router store for view-based SPA navigation
 * Manages current view, params, and navigation history
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewName, NavigationState } from '../router/types';

interface RouterStore extends NavigationState {
  // Actions
  navigate: (view: ViewName, params?: any) => void;
  back: () => void;
  replace: (view: ViewName, params?: any) => void;
  getFullPath: () => string;
}

export const useRouterStore = create<RouterStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: 'upload',
      params: {},
      history: [],

      // Navigate to a new view (pushes to history)
      navigate: (view, params = {}) => {
        const { currentView, params: currentParams, history } = get();

        // Skip if navigating to the same view with same params
        if (currentView === view && JSON.stringify(currentParams) === JSON.stringify(params)) {
          console.log('🔗 Skipping duplicate navigation to:', view, params);
          return;
        }

        // Update URL hash (for web shareable links)
        if (typeof window !== 'undefined') {
          const path = params.id ? `${view}/${params.id}` : view;
          window.location.hash = path;
        }

        set({
          currentView: view,
          params,
          history: [...history, { view: currentView, params: currentParams }],
        });
      },

      // Navigate back in history
      back: () => {
        const { history } = get();
        if (history.length === 0) return;

        const previous = history[history.length - 1];

        // Update hash
        if (typeof window !== 'undefined') {
          const path = previous.params?.id
            ? `${previous.view}/${previous.params.id}`
            : previous.view;
          window.location.hash = path;
        }

        set({
          currentView: previous.view,
          params: previous.params,
          history: history.slice(0, -1),
        });
      },

      // Replace current view (doesn't push to history)
      replace: (view, params = {}) => {
        // Update hash
        if (typeof window !== 'undefined') {
          const path = params.id ? `${view}/${params.id}` : view;
          window.location.hash = path;
        }

        set({ currentView: view, params });
      },

      // Get full path for current view (for debugging/logging)
      getFullPath: () => {
        const { currentView, params } = get();
        return params.id ? `${currentView}/${params.id}` : currentView;
      },
    }),
    {
      name: 'whisper-router',
      partialize: (state) => ({
        // Persist current view to resume where user left off
        currentView: state.currentView,
        params: state.params,
        // Do NOT persist history (reset on reload)
      }),
    }
  )
);
