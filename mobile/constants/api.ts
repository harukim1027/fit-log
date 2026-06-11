if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn('[api] EXPO_PUBLIC_API_URL is not set — falling back to localhost');
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';
