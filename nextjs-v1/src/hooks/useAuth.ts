// src/hooks/useAuth.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserData } from '@sraz-sw/fullstack-shared'; // Assuming this path is correct
import apiService from '@/lib/api'; // Import your apiService
import { saveToken, clearToken } from '@/lib/token'; // Assuming token functions exist
import { AxiosError } from 'axios'; // Import AxiosError for type checking
import { CreateUserDataViaEmail, LoginWithEmailData } from '@sraz-sw/fullstack-shared';

// Define a query key for the current user - consistency is key!
// Using an array allows for potential namespacing later
export const authKeys = {
  currentUser: ['currentUser'] as const,
};

/**
 * Fetches the current logged-in user's data.
 * Returns undefined if not logged in or during initial load.
 */
export function useCurrentUser() {
    const queryInfo = useQuery<UserData | null, AxiosError>({
      // queryKey: A unique identifier for this query. React Query uses this for caching.
      // If the key changes, React Query treats it as a new query.
      // 'currentUser' is simple and descriptive.
      queryKey: authKeys.currentUser,
  
      // queryFn: The async function that performs the data fetching.
      // It MUST return a Promise. Here, we call our API service method.
      queryFn: async () => {
        try {
          console.log("Attempting to fetch current user..."); // Debug log
          // log trace
          console.trace("Fetching current user...");
          
          const user = await apiService.getCurrentUser();
          if (!user) {
            throw new Error("No authenticated user found."); // Debug log
          }
          console.log("Fetched current user:", user); // Debug log
          return user;
        } catch (error) {
          const axiosError = error as AxiosError;
          // If the error is 401 (Unauthorized), it means the user is not logged in.
          // Instead of letting useQuery handle this as a generic error,
          // we interpret it as "no user" and return null.
          if (axiosError.response?.status === 401) {
            console.log("No authenticated user found (401)."); // Debug log
            clearToken(); // Ensure token is removed if invalid
            return null; // Return null to indicate no logged-in user
          }
          // For any other error, re-throw it so useQuery marks the query as errored.
          console.error("Error fetching current user:", error); // Debug log
          // throw error;
          return null;
        }
      },
  
      // --- Optional configurations ---
  
      // staleTime: How long (in ms) the data is considered fresh.
      // While fresh, React Query won't refetch in the background (e.g., on window focus).
      // 5 minutes might be reasonable for user data. Default is 0 (always stale).
      staleTime: 1000 * 60 * 30, // 30 minutes
  
      // gcTime (previously cacheTime): How long inactive query data stays in the cache.
      // If you have persistence, you might want this longer. Default is 5 minutes.
      gcTime: 1000 * 60 * 60 * 1, // 1 hour
  
      // retry: How many times to retry on failure.
      // For auth, retrying a 401 is usually pointless.
      retry: (failureCount, error) => {
        // Don't retry if the error is 401 Unauthorized
        if (error.response?.status === 401) {
          return false;
        }
        // Otherwise, use the default retry logic (usually 3 retries)
        return failureCount < 3;
      },
  
      // refetchOnWindowFocus: Automatically refetch when the browser window gets focus.
      // Usually good to keep true (default) for potentially stale data.
      // refetchOnWindowFocus: true,
  
       // Keep previous data while fetching new data for smoother UI transitions
       // keepPreviousData: true, // Consider this if needed
  
       // Prevent fetching if no token exists (might need getToken imported)
       // enabled: !!getToken(), // Only run if a token exists client-side
  
    });
  
    // We return the user data and the loading state for convenience
    return {
        user: queryInfo.data, // Will be UserData, null, or undefined (during initial load/error before null)
        isLoadingUser: queryInfo.isLoading, // True during initial fetch
        isFetchingUser: queryInfo.isFetching, // True during any fetch (initial or background)
        isUserError: queryInfo.isError, // True if the queryFn threw an error (other than 401 handled above)
        userError: queryInfo.error, // The error object
    }
  }


  export function useUpdateCurrentUser() {
    const queryClient = useQueryClient();
  
    return useMutation<UserData, AxiosError, Partial<UserData>>({
      mutationFn: async (partialUserData: Partial<UserData>) => {
        const currentUser = queryClient.getQueryData<UserData>(authKeys.currentUser);
        if (!currentUser) {
          throw new Error("No authenticated user found");
        }
        
        // Call the API to update the user
        const updatedUser: UserData = await apiService.updateCurrentUser(partialUserData);
        return updatedUser;
      },
      onSuccess: (updatedUserData: UserData) => {
        // Update the cache immediately
        queryClient.setQueryData(authKeys.currentUser, updatedUserData);
        
        // Optionally invalidate other queries that might depend on user data
        // queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },
      onError: (error) => {
        console.error("Failed to update user:", error.response?.data || error.message);
      }
    });
  }

/**
 * Provides a function to log the user in.
 * Handles setting the token and updating the user cache on success.
 */
export function useLogin() {
    // Get the QueryClient instance to interact with the cache
    const queryClient = useQueryClient();
  
    return useMutation<
      UserData, // Type of data returned by the mutationFn on success
      AxiosError, // Type of error thrown on failure
      LoginWithEmailData // Type of variables passed to the mutate function (e.g., { email, password })
    >({
      // mutationFn: The async function that performs the action.
      // It receives the variables passed to the 'mutate' function.
      mutationFn: async (credentials: LoginWithEmailData) => {
        // The apiService.login function already accepts email and password
        const user: UserData = await apiService.login(credentials);
        // IMPORTANT: Assuming the user object returned by login CONTAINS the token.
        // If not, the API response needs adjustment or token needs separate handling.
        if (user.token) {
          saveToken(user.token); // Store the token
          // removing the token from the user object
          delete user.token;
        } else {
          // This indicates a problem - login succeeded but no token?
          console.warn("Login successful but no token received in user data.");
          // Might need to throw an error or handle differently based on API design
        }
        return user; // Return the user data
      },
  
      // onSuccess: Callback function executed AFTER the mutationFn succeeds.
      // Receives the data returned by mutationFn, and the variables passed to mutate.
      onSuccess: (userData, variables) => {
        // console.log("Login successful:", userData);
  
        // **Crucial:** Update the 'currentUser' query cache immediately.
        // This makes the UI update instantly without waiting for a refetch.
        // We directly set the fetched userData as the new value for ['currentUser'].
        queryClient.setQueryData(authKeys.currentUser, userData);
  
        // Optional: Invalidate other queries that might depend on auth state,
        // though often just setting currentUser is enough for immediate needs.
        // queryClient.invalidateQueries({ queryKey: ['someOtherProtectedData'] });
  
        // Note: Navigation/redirects often happen in the component calling the mutation,
        // based on the isSuccess state, rather than directly inside onSuccess.
      },
  
      // onError: Callback function executed if the mutationFn throws an error.
      // Receives the error and the variables passed to mutate.
      onError: (error, variables) => {
        console.error("Login failed:", error.response?.data || error.message);
        // You might want to show a toast notification to the user here.
        // Ensure any potentially stored invalid token is removed.
        clearToken();
        // Make sure the user cache reflects the logged-out state
        queryClient.setQueryData(authKeys.currentUser, null);
      },
  
      // onSettled: Callback executed after mutation finishes (success or error).
      // Good for cleanup or actions that always run.
      // onSettled: () => { console.log("Login mutation settled."); }
    });
  }

  // src/hooks/useAuth.ts (continued)

/**
 * Provides a function to register a new user.
 * Assumes registration also logs the user in (returns user data + token).
 */
export function useRegister() {
    const queryClient = useQueryClient();
  
    return useMutation<UserData, AxiosError, CreateUserDataViaEmail>({
      mutationFn: async (credentials: CreateUserDataViaEmail) => {
        // apiService.register expects email, password, name
        const user = await apiService.register(credentials);
        // Assume registration response includes token for auto-login
        if (user.token) {
          saveToken(user.token);
        } else {
          console.warn("Registration successful but no token received.");
        }
        return user;
      },
      onSuccess: (userData) => {
        console.log("Registration successful:", userData);
        // Update cache immediately, just like in login
        queryClient.setQueryData(authKeys.currentUser, userData);
        // Potentially redirect or prompt user to login if registration doesn't auto-login
      },
      onError: (error) => {
        console.error("Registration failed:", error.response?.data || error.message);
        clearToken(); // Clean up any partial state
        queryClient.setQueryData(authKeys.currentUser, null);
      },
    });
  }

  // src/hooks/useAuth.ts (continued)

/**
 * Provides a function to log the user out.
 * Handles removing the token and clearing caches.
 */
export function useLogout() {
    const queryClient = useQueryClient();
  
    return useMutation<void, AxiosError, void>({ // Logout might not receive/need variables
      mutationFn: async () => {
          // Even if the API call fails, we still want to clear client state.
          // So, we might put client cleanup in onSettled or handle API errors gracefully.
        try {
           apiService.logout().then(logout => {
            console.log("Logout API call successful.");
           }) // Call the backend logout endpoint
        } catch (error) {
            console.warn("Logout API call failed, proceeding with client cleanup:", error);
            // Decide if this failure is critical. Usually, client cleanup is most important.
        }
      },
      onSuccess: () => {
         console.log("Logout API call successful.");
         // The primary cleanup happens here or in onSettled
      },
      onError:(error) => {
          console.error("Logout API call failed:", error);
          // Still proceed with client cleanup in onSettled.
      },
      // onSettled is often preferred for cleanup actions that MUST run
      // regardless of mutation success or failure.
      onSettled: () => {
        console.log("Performing logout cleanup...");
        // 1. Remove authentication token
        clearToken();
  
        // 2. Clear the current user data from the cache
        queryClient.setQueryData(authKeys.currentUser, null);
  
        // 3. Aggressively clear potentially sensitive cached data.
        //    `removeQueries` is safer than `invalidateQueries` as it removes data.
        //    Alternatively, `queryClient.clear()` nukes everything, which is often
        //    the simplest and best approach on logout.
        queryClient.removeQueries({ queryKey: ['conversations'] }) // Example: remove conversations
        queryClient.removeQueries({ queryKey: ['messages'] })    // Example: remove all messages
        // OR SIMPLY:
        // queryClient.clear(); // Reset the entire query client cache
  
        console.log("Logout cleanup complete.");
        // Navigation usually happens in the component after calling logout mutate.
      },
    });
  }