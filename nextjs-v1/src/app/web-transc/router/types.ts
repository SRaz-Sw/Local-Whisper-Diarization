/**
 * Router types for view-based SPA navigation
 */

export type ViewName =
  | 'upload'       // Initial state - upload audio
  | 'transcribe'   // Model loading + transcription
  | 'transcript'   // View completed transcript
  | 'saved';       // Browse saved transcripts

export interface ViewParams {
  upload: void;
  transcribe: void;
  transcript: { id: string };
  saved: void;
}

export type ViewComponent<T extends ViewName> = React.ComponentType<
  ViewParams[T] extends void ? Record<string, never> : ViewParams[T]
>;

export interface NavigationState {
  currentView: ViewName;
  params: any;
  history: Array<{ view: ViewName; params: any }>;
}
