import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type OfflineAction = {
    id: string;
    type: 'SUBMIT_FORM' | 'CLOCK_IN' | 'CLOCK_OUT' | 'CHECKPOINT_SCAN';
    payload: Record<string, any>;
    timestamp: number;
    status: 'pending' | 'syncing' | 'failed';
    error?: string;
    retries: number;
    nextRetryAt: number; // epoch ms – skip syncing until this time
};

const OUTBOX_KEY = '@workforceone_outbox';
const MAX_RETRIES = 8;
const BASE_BACKOFF_MS = 30_000; // 30 seconds
const MAX_BACKOFF_MS = 30 * 60 * 1000; // 30 minutes

function computeNextRetry(retries: number): number {
    // Exponential backoff: 30s, 60s, 120s, ... capped at 30min
    const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, retries), MAX_BACKOFF_MS);
    return Date.now() + delay;
}

export const offlineStore = {
    async getOutbox(): Promise<OfflineAction[]> {
        try {
            const jsonValue = await AsyncStorage.getItem(OUTBOX_KEY);
            if (jsonValue == null) return [];
            const parsed: any[] = JSON.parse(jsonValue);
            // Backfill legacy entries that pre-date retry fields
            return parsed.map(a => ({
                retries: 0,
                nextRetryAt: 0,
                ...a,
            }));
        } catch (e) {
            console.error('Error reading outbox', e);
            return [];
        }
    },

    async saveOutbox(outbox: OfflineAction[]) {
        try {
            await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
        } catch (e) {
            console.error('Error saving outbox', e);
        }
    },

    async addToOutbox(action: Omit<OfflineAction, 'id' | 'timestamp' | 'status' | 'retries' | 'nextRetryAt'>) {
        const outbox = await this.getOutbox();
        const newAction: OfflineAction = {
            ...action,
            id: Math.random().toString(36).substring(2, 10),
            timestamp: Date.now(),
            status: 'pending',
            retries: 0,
            nextRetryAt: 0,
        };
        outbox.push(newAction);
        await this.saveOutbox(outbox);
        return newAction;
    },

    async removeFromOutbox(id: string) {
        const outbox = await this.getOutbox();
        await this.saveOutbox(outbox.filter(a => a.id !== id));
    },

    async removeFromOutboxBatch(ids: string[]) {
        const outbox = await this.getOutbox();
        await this.saveOutbox(outbox.filter(a => !ids.includes(a.id)));
    },

    async clearOutbox() {
        await AsyncStorage.removeItem(OUTBOX_KEY);
    },

    /** Mark a failed action with backoff so it isn't retried immediately. */
    async markFailed(id: string, errMsg: string) {
        const outbox = await this.getOutbox();
        const updated = outbox.map(a => {
            if (a.id !== id) return a;
            const retries = (a.retries || 0) + 1;
            return {
                ...a,
                status: 'failed' as const,
                error: errMsg,
                retries,
                nextRetryAt: retries >= MAX_RETRIES ? Infinity : computeNextRetry(retries),
            };
        });
        await this.saveOutbox(updated);
    },

    async syncOutbox(): Promise<{ success: number; failed: number; skipped: number }> {
        const outbox = await this.getOutbox();
        if (outbox.length === 0) return { success: 0, failed: 0, skipped: 0 };

        const now = Date.now();

        // Skip actions not yet due for retry or permanently failed
        const due = outbox.filter(a => a.nextRetryAt <= now && a.retries < MAX_RETRIES);
        const skipped = outbox.length - due.length;

        if (due.length === 0) return { success: 0, failed: 0, skipped };

        let successCount = 0;
        let failedCount = 0;

        // Batch SUBMIT_FORM actions
        const submitActions = due.filter(a => a.type === 'SUBMIT_FORM');
        const otherActions = due.filter(a => a.type !== 'SUBMIT_FORM');

        if (submitActions.length > 0) {
            try {
                const payloads = submitActions.map(a => a.payload);
                const { error } = await supabase.rpc('submit_batch', { submissions: payloads });
                if (error) throw error;

                await this.removeFromOutboxBatch(submitActions.map(a => a.id));
                successCount += submitActions.length;
            } catch (error: any) {
                console.error('Batch submit failed', error);
                failedCount += submitActions.length;
                // Mark each for backoff
                for (const action of submitActions) {
                    await this.markFailed(action.id, error?.message || 'Batch submit failed');
                }
            }
        }

        // Process other actions sequentially
        for (const action of otherActions) {
            try {
                await this.processAction(action);
                await this.removeFromOutbox(action.id);
                successCount++;
            } catch (error: any) {
                console.error(`Sync failed for ${action.id}`, error);
                failedCount++;
                await this.markFailed(action.id, error?.message || 'Unknown error');
            }
        }

        return { success: successCount, failed: failedCount, skipped };
    },

    async processAction(action: OfflineAction) {
        switch (action.type) {
            case 'SUBMIT_FORM': {
                const { error } = await supabase
                    .from('submissions')
                    .insert(action.payload);
                if (error) throw error;
                break;
            }

            case 'CLOCK_IN': {
                const { error } = await supabase
                    .from('time_entries')
                    .insert({
                        user_id: action.payload.user_id,
                        organization_id: action.payload.organization_id,
                        clock_in: action.payload.clock_in,
                        location: action.payload.location,
                        notes: action.payload.notes,
                    });
                if (error) throw error;
                break;
            }

            case 'CLOCK_OUT': {
                if (!action.payload.entry_id) throw new Error('Missing entry_id for CLOCK_OUT');
                const { error } = await supabase
                    .from('time_entries')
                    .update({ clock_out: action.payload.clock_out })
                    .eq('id', action.payload.entry_id);
                if (error) throw error;
                break;
            }

            case 'CHECKPOINT_SCAN': {
                const { error } = await supabase
                    .from('patrol_logs')
                    .insert({
                        patrol_id: action.payload.patrol_id,
                        checkpoint_id: action.payload.checkpoint_id,
                        user_id: action.payload.user_id,
                        organization_id: action.payload.organization_id,
                        scanned_at: action.payload.scanned_at,
                        location: action.payload.location,
                        notes: action.payload.notes,
                    });
                if (error) throw error;
                break;
            }

            default:
                throw new Error(`Unknown action type: ${(action as any).type}`);
        }
    },

    /** Returns counts of outbox items by status, useful for UI badges. */
    async getOutboxStats(): Promise<{ total: number; failed: number; pendingDue: number }> {
        const outbox = await this.getOutbox();
        const now = Date.now();
        return {
            total: outbox.length,
            failed: outbox.filter(a => a.retries >= MAX_RETRIES).length,
            pendingDue: outbox.filter(a => a.nextRetryAt <= now && a.retries < MAX_RETRIES).length,
        };
    },
};
