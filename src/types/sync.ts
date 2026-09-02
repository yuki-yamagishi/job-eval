export type SyncState = "disconnected" | "connecting" | "connected" | "syncing" | "error";

export interface SyncStatusInfo {
  state: SyncState;
  roomId: string | null;
  lastSyncedAt: Date | null;
  connectedDeviceCount?: number;
  errorMessage?: string | null;
}

export interface CloudSyncConfig {
  enabled: boolean;
  roomId: string;
  firebaseApiKey?: string;
  firebaseProjectId?: string;
  firebaseAppId?: string;
  autoSync: boolean;
}

export const DEFAULT_SYNC_CONFIG: CloudSyncConfig = {
  enabled: false,
  roomId: "",
  autoSync: true,
};
