import { QueuedEvent, TeamMember, Checkpoint, MedicalAlert, TeamMessage, ActivityEvent } from '../types';

export interface PersistedState {
  members: TeamMember[];
  checkpoint: Checkpoint | null;
  activeAlert: MedicalAlert | null;
  resolvedAlerts: MedicalAlert[];
  messages: TeamMessage[];
  events: ActivityEvent[];
  lastSavedAt: string;
}

const STORAGE_PREFIX = 'sahyog_state_';
const QUEUE_PREFIX = 'sahyog_queue_';

export function isStorageAvailable(): boolean {
  try {
    const testKey = '__test_storage__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function savePartyState(partyCode: string, state: PersistedState): boolean {
  if (!isStorageAvailable()) return false;
  try {
    const key = `${STORAGE_PREFIX}${partyCode.toUpperCase()}`;
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Failed to save party state:', err);
    return false;
  }
}

export function loadPartyState(partyCode: string): PersistedState | null {
  if (!isStorageAvailable()) return null;
  try {
    const key = `${STORAGE_PREFIX}${partyCode.toUpperCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch (err) {
    console.error('Failed to load party state:', err);
    return null;
  }
}

export function clearPartyState(partyCode: string): void {
  if (!isStorageAvailable()) return;
  try {
    const key = `${STORAGE_PREFIX}${partyCode.toUpperCase()}`;
    localStorage.removeItem(key);
    const queueKey = `${QUEUE_PREFIX}${partyCode.toUpperCase()}`;
    localStorage.removeItem(queueKey);
  } catch (err) {
    console.error('Failed to clear party state:', err);
  }
}

export function getOfflineQueue(partyCode: string): QueuedEvent[] {
  if (!isStorageAvailable()) return [];
  try {
    const key = `${QUEUE_PREFIX}${partyCode.toUpperCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedEvent[];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(partyCode: string, queue: QueuedEvent[]): void {
  if (!isStorageAvailable()) return;
  try {
    const key = `${QUEUE_PREFIX}${partyCode.toUpperCase()}`;
    localStorage.setItem(key, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save offline queue:', err);
  }
}

export function clearOfflineQueue(partyCode: string): void {
  if (!isStorageAvailable()) return;
  try {
    const key = `${QUEUE_PREFIX}${partyCode.toUpperCase()}`;
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
