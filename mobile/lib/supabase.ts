import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
    // Log a warning but do NOT throw — a module-level throw crashes the entire
    // JS bundle before SplashScreen.hideAsync() can run, freezing the splash screen.
    // The app will fail gracefully at the auth step instead.
    console.warn(
        '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
        'Check your .env file and EAS environment variable configuration.'
    );
}

// SecureStore has a 2KB per-value limit, so large tokens must be chunked.
const CHUNK_SIZE = 1800; // bytes, safely under the 2048 limit

const ChunkedSecureStoreAdapter = {
    getItem: async (key: string): Promise<string | null> => {
        // Check if the value was stored in chunks
        const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunkCount`);

        if (chunkCountStr !== null) {
            // Reassemble chunks
            const chunkCount = parseInt(chunkCountStr, 10);
            const chunks: string[] = [];
            for (let i = 0; i < chunkCount; i++) {
                const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
                if (chunk === null) return null;
                chunks.push(chunk);
            }
            return chunks.join('');
        }

        // Fall back to a plain (non-chunked) value
        return SecureStore.getItemAsync(key);
    },

    setItem: async (key: string, value: string): Promise<void> => {
        if (value.length <= CHUNK_SIZE) {
            // Small enough to store directly — clean up any old chunks first
            await ChunkedSecureStoreAdapter.removeItem(key);
            await SecureStore.setItemAsync(key, value);
            return;
        }

        // Split into chunks
        const chunks: string[] = [];
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
            chunks.push(value.slice(i, i + CHUNK_SIZE));
        }

        // Remove any previously unchunked value for this key
        await SecureStore.deleteItemAsync(key);

        // Store each chunk and record the count
        for (let i = 0; i < chunks.length; i++) {
            await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
        }
        await SecureStore.setItemAsync(`${key}_chunkCount`, String(chunks.length));
    },

    removeItem: async (key: string): Promise<void> => {
        const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunkCount`);

        if (chunkCountStr !== null) {
            const chunkCount = parseInt(chunkCountStr, 10);
            for (let i = 0; i < chunkCount; i++) {
                await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
            }
            await SecureStore.deleteItemAsync(`${key}_chunkCount`);
        }

        // Always attempt to remove the plain key too
        await SecureStore.deleteItemAsync(key);
    },
};

// On web, SecureStore is unavailable — fall back to AsyncStorage.
// For production web you may want a more secure alternative.
const storage = Platform.OS === 'web' ? AsyncStorage : ChunkedSecureStoreAdapter;

// Import shared types
// Note: In a real monorepo, this would be a package import. 
// For now, we access the parent directory. 
// If Metro fails to resolve this, we might need a `tsconfig` path alias or copy the file.
import { Database } from '../../types/database';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});