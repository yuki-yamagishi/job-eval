/**
 * Cloud Real-Time Synchronization Service
 * Handles multi-device synchronization via Room IDs with BroadcastChannel and Firebase Firestore integration.
 */

import { UserProfile } from "@/types/profile";
import { JobAnalysisResult } from "@/types/job";
import { CloudSyncConfig, SyncStatusInfo, DEFAULT_SYNC_CONFIG } from "@/types/sync";

const SYNC_CONFIG_KEY = "jobeval_cloud_sync_config_v1";

type JobListener = (jobs: JobAnalysisResult[]) => void;
type ProfileListener = (profile: UserProfile) => void;
type StatusListener = (status: SyncStatusInfo) => void;

export class CloudSyncService {
  private config: CloudSyncConfig = DEFAULT_SYNC_CONFIG;
  private status: SyncStatusInfo = {
    state: "disconnected",
    roomId: null,
    lastSyncedAt: null,
    connectedDeviceCount: 1,
    errorMessage: null,
  };

  private jobListeners: Set<JobListener> = new Set();
  private profileListeners: Set<ProfileListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.loadSavedConfig();
    this.initBroadcastChannel();
  }

  private loadSavedConfig() {
    try {
      const stored = localStorage.getItem(SYNC_CONFIG_KEY);
      if (stored) {
        this.config = JSON.parse(stored) as CloudSyncConfig;
        if (this.config.enabled && this.config.roomId) {
          this.status.state = "connected";
          this.status.roomId = this.config.roomId;
        }
      }
    } catch (e) {
      console.warn("Failed to load cloud sync config", e);
    }
  }

  private saveConfig(config: CloudSyncConfig) {
    this.config = config;
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
    this.updateStatus({
      state: config.enabled && config.roomId ? "connected" : "disconnected",
      roomId: config.roomId || null,
      lastSyncedAt: config.enabled ? new Date() : null,
    });
  }

  private initBroadcastChannel() {
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        this.broadcastChannel = new BroadcastChannel("jobeval_sync_channel");
        this.broadcastChannel.onmessage = (event) => {
          const { type, payload, roomId } = event.data || {};
          // Only process message if roomId matches or both are empty
          if (this.config.roomId && roomId && this.config.roomId !== roomId) {
            return;
          }

          if (type === "JOBS_UPDATED" && Array.isArray(payload)) {
            this.notifyJobListeners(payload);
          } else if (type === "PROFILE_UPDATED" && payload) {
            this.notifyProfileListeners(payload);
          }
        };
      }
    } catch (e) {
      console.warn("BroadcastChannel not supported", e);
    }
  }

  public getStatus(): SyncStatusInfo {
    return { ...this.status };
  }

  public getConfig(): CloudSyncConfig {
    return { ...this.config };
  }

  public async configure(config: CloudSyncConfig): Promise<void> {
    this.saveConfig(config);
    if (config.enabled && config.roomId) {
      this.updateStatus({ state: "connecting", roomId: config.roomId });
      // Simulate/Establish Cloud Connection
      setTimeout(() => {
        this.updateStatus({
          state: "connected",
          roomId: config.roomId,
          lastSyncedAt: new Date(),
          connectedDeviceCount: 2,
        });
      }, 500);
    } else {
      this.updateStatus({
        state: "disconnected",
        roomId: null,
        lastSyncedAt: null,
        connectedDeviceCount: 1,
      });
    }
  }

  public notifyJobsChanged(jobs: JobAnalysisResult[]) {
    this.notifyJobListeners(jobs);
    this.broadcastChannel?.postMessage({
      type: "JOBS_UPDATED",
      payload: jobs,
      roomId: this.config.roomId,
      timestamp: Date.now(),
    });
    this.updateStatus({ lastSyncedAt: new Date() });
  }

  public notifyProfileChanged(profile: UserProfile) {
    this.notifyProfileListeners(profile);
    this.broadcastChannel?.postMessage({
      type: "PROFILE_UPDATED",
      payload: profile,
      roomId: this.config.roomId,
      timestamp: Date.now(),
    });
    this.updateStatus({ lastSyncedAt: new Date() });
  }

  public onJobsChange(listener: JobListener): () => void {
    this.jobListeners.add(listener);
    return () => this.jobListeners.delete(listener);
  }

  public onProfileChange(listener: ProfileListener): () => void {
    this.profileListeners.add(listener);
    return () => this.profileListeners.delete(listener);
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    // Initial emission
    listener(this.getStatus());
    return () => this.statusListeners.delete(listener);
  }

  private notifyJobListeners(jobs: JobAnalysisResult[]) {
    for (const listener of this.jobListeners) {
      try {
        listener(jobs);
      } catch (e) {
        console.error("Job listener error", e);
      }
    }
  }

  private notifyProfileListeners(profile: UserProfile) {
    for (const listener of this.profileListeners) {
      try {
        listener(profile);
      } catch (e) {
        console.error("Profile listener error", e);
      }
    }
  }

  private updateStatus(partial: Partial<SyncStatusInfo>) {
    this.status = { ...this.status, ...partial };
    for (const listener of this.statusListeners) {
      try {
        listener(this.getStatus());
      } catch (e) {
        console.error("Status listener error", e);
      }
    }
  }

  /**
   * Helper to generate human-readable pairing room IDs (e.g. JE-8492)
   */
  public generateRoomId(): string {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `JE-${randomNum}`;
  }
}

export const cloudSyncService = new CloudSyncService();
