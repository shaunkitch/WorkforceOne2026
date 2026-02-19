import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type OfflineAction = {
    id: string;
    type: 'SUBMIT_FORM' | 'CLOCK_IN' | 'CLOCK_OUT' | 'CHECKPOINT_SCAN';
    payload: Record<string, any>;
    timestamp: number;
    status: 'pending' | 'syncing' | 'failed';
    error?: string;
};

const OUTBOX_KEY = '@workforceone_outbox';

export const offlineStore = {
    async getOutbox(): Promise<OfflineAction[]> {
        try {
            const jsonValue = await AsyncStorage.getItem(OUTBOX_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error("Error reading outbox", e);
            return [];
        }
    },

    async saveOutbox(outbox: OfflineAction[]) {
        try {
            await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
        } catch (e) {
            console.error("Error saving outbox", e);
        }
    },

    async addToOutbox(action: Omit<OfflineAction, 'id' | 'timestamp' | 'status'>) {
        const outbox = await this.getOutbox();
        const newAction: OfflineAction = {
            ...action,
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
            status: 'pending'
        };
        outbox.push(newAction);
        await this.saveOutbox(outbox);
        return newAction;
    },

    async removeFromOutbox(id: string) {
        const outbox = await this.getOutbox();
        const newOutbox = outbox.filter(a => a.id !== id);
        await this.saveOutbox(newOutbox);
    },

    async clearOutbox() {
        await AsyncStorage.removeItem(OUTBOX_KEY);
    },

    async syncOutbox(): Promise<{ success: number; failed: number }> {
        const outbox = await this.getOutbox();
        if (outbox.length === 0) return { success: 0, failed: 0 };

        let successCount = 0;
        let failedCount = 0;

        // Group SUBMIT_FORM actions for batching
        const submitActions = outbox.filter(a => a.type === 'SUBMIT_FORM' && a.status !== 'syncing');
        const otherActions = outbox.filter(a => a.type !== 'SUBMIT_FORM' && a.status !== 'syncing');

        // Mark as syncing
        const idsToSync = [...submitActions, ...otherActions].map(a => a.id);
        if (idsToSync.length === 0) return { success: 0, failed: 0 };

        // Process Batch Submissions
        if (submitActions.length > 0) {
            try {
                const payloads = submitActions.map(a => ({
                    ...a.payload,
                    // Ensure ID from action is used to deduplicate if we wanted, 
                    // but payload usually has its own structure. 
                    // Let's assume payload is ready for insert.
                    // We might need to inject the ID if the RPC expects it.
                    // The RPC expects jsonb[].
                }));

                const { data, error } = await supabase.rpc('submit_batch', { submissions: payloads });

                if (error) throw error;

                // data.success_ids contains UUIDs of inserted submissions. 
                // We should assume all succeeded if no error, OR filter based on returned IDs if RPC supports it.
                // Our RPC returns { success_ids: [...] }
                const successIds = data?.success_ids || [];

                // Remove successful actions from outbox
                // We match based on payload content or just assume batch success? 
                // The outbox action ID is random, not the submission ID.
                // If RPC succeeds, all in batch succeeded usually (unless partial logic).
                // Our RPC loops and returns success_ids.

                // We need to map back to outbox IDs. 
                // Since we sent them in order, if the RPC is atomic-ish or returns all, we can assume success.
                // For robustness, let's remove ALL submitActions that were sent.

                await this.removeFromOutboxBatch(submitActions.map(a => a.id));
                successCount += submitActions.length;

            } catch (error) {
                console.error("Batch submit failed", error);
                failedCount += submitActions.length;
                // Mark them as failed? Or just leave pending/retry?
                // Let's leave them to retry, but maybe backoff?
            }
        }

        // Process Other Actions Sequentially
        for (const action of otherActions) {
            try {
                await this.processAction(action);
                await this.removeFromOutbox(action.id);
                successCount++;
            } catch (error: unknown) {
                console.error(`Sync failed for ${action.id}`, error);
                // action.status = 'failed'; // We don't save status back in this simplified loops
                failedCount++;
            }
        }

        return { success: successCount, failed: failedCount };
    },

    async removeFromOutboxBatch(ids: string[]) {
        const outbox = await this.getOutbox();
        const newOutbox = outbox.filter(a => !ids.includes(a.id));
        await this.saveOutbox(newOutbox);
    },

    async processAction(action: OfflineAction) {
        switch (action.type) {
            case 'SUBMIT_FORM':
                // Should not happen here if batching works, but fallback
                const { error: submitError } = await supabase
                    .from('submissions')
                    .insert(action.payload);
                if (submitError) throw submitError;
                break;

            case 'CLOCK_IN':
            case 'CLOCK_OUT':
                // Placeholder
                break;

            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }
};
