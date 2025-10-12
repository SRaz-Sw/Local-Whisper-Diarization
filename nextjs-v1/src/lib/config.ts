/**
 * Environment configuration for the client application
 */

interface Config {
  apiUrl: string;
  pusher: {
    key: string;
    cluster: string;
  };
  isDevelopment: boolean;
  isProduction: boolean;
}

const config: Config = {
  // API base URL - NEXT_PUBLIC_API_URL is set in the build environment
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3010/api",

  // Pusher configuration
  pusher: {
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'ecfb1e5db72d84b4f090',
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
  },
  
  // Environment detection 
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Log configuration at startup
if (typeof window !== 'undefined') {
  console.log('App configuration:', {
    apiUrl: config.apiUrl,
    environment: process.env.NODE_ENV,
    usePusher: !config.apiUrl.includes('localhost'),
  });
}

export default config; 