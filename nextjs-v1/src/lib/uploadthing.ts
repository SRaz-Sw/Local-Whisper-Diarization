import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";

// Get the API URL from environment or determine dynamically
// IMPORTANT: In production, we should use an environment variable for this
const getApiUrl = (): string => {
  // Try to get from environment variable first
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_UPLOADTHING_API_URL) {
    return process.env.NEXT_PUBLIC_UPLOADTHING_API_URL;
  }

  // For server-side rendering, use a default
  if (typeof window === "undefined") {
    return "http://localhost:3010/uploadthing";
  }

  // Client-side: Determine based on environment
  const currentLocation = window.location.origin;
  
  // If we're on localhost, use the local server
  if (currentLocation.includes("localhost")) {
    return "http://localhost:3010/uploadthing";
  }
  
  // For Vercel deployment, try to use the same domain with API path
  // This assumes the frontend and backend are deployed to the same Vercel project
  const isVercel = currentLocation.includes("vercel.app");
  if (isVercel) {
    // For client app on vercel, the backend is probably also on vercel
    // Use *.vercel.app domain for backend
    return `${currentLocation}/uploadthing`;
  }
  
  // For other deployments, adapt as needed
  // Return a fallback URL (should be configured in production)
  return `${currentLocation.replace("3000", "3010")}/uploadthing`;
};

// Get the API URL
const API_URL = getApiUrl();

// Log the determined API URL for debugging
if (typeof window !== "undefined") {
  console.log(`UploadThing using API URL: ${API_URL}`);
}

// Configuration with additional headers and options
const config = {
  url: API_URL,
  apiUrl: API_URL, // Explicitly set apiUrl to prevent '/api' being prepended
  // Add custom fetch function with full CORS configuration
  customFetch: (url: string, options: RequestInit = {}) => {
    console.log(`UploadThing making request to: ${url}`, {
      method: options.method,
      headers: options.headers,
    });
    
    return fetch(url, {
      ...options,
      credentials: 'include',
      mode: 'cors',
      headers: {
        ...options.headers,
        // Ensure we send the Origin header
        'Origin': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      }
    })
    .then(response => {
      // Check if the response is successful
      if (!response.ok) {
        // Log detailed error info
        console.error(`UploadThing request failed: ${response.status} ${response.statusText}`);
        console.error("Response details:", response);
        // Try to get more details from the response
        return response.text().then(text => {
          console.error("Response body:", text);
          throw new Error(`Upload request failed: ${response.status} ${response.statusText} - ${text}`);
        });
      }
      return response;
    })
    .catch(error => {
      // Log and rethrow the error
      console.error("UploadThing fetch error:", error);
      throw error;
    });
  },
  // Add explicit multi-file config to support multiple files
  multiFileConfig: {
    multi: true,    // Allow multi-file upload 
    maxFileCount: 10 // Maximum number of files allowed
  }
};

// Export the components with our API URL
export const UploadButton = generateUploadButton(config);
export const UploadDropzone = generateUploadDropzone(config);

// This is just for development logging to help diagnose issues
if (typeof window !== "undefined") {
  console.log("UploadThing configuration:", {
    apiUrl: API_URL,
    origin: window.location.origin,
    multiFileSupport: config.multiFileConfig,
  });
} 