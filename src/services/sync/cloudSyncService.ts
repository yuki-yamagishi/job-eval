/**
 * Cloud Real-Time Synchronization Service
 * Handles multi-device synchronization via Room IDs with BroadcastChannel and WebRTC/WebSocket Relay.
 * Fully Local-First: data is synced directly between devices with smart merge, no central DB storage.
 */

import { UserProfile } from "@/types/profile";
import { JobAnalysisResult } from "@/types/job";
import { CloudSyncConfig, SyncStatusInfo, DEFAULT_SYNC_CONFIG } from "@/types/sync";
import { mergeJobs, mergeProfile } from "@/core/sync/smartMerge";

const SYNC_CONFIG_KEY = "jobeval_cloud_sync_config_v1";
const STORAGE_KEYS = {
  PROFILE: "jobeval_user_profile_v1",
  JOBS: "jobeval_saved_jobs_v1",
};

type JobListener = (jobs: JobAnalysisResult[]) => void;
type ProfileListener = (profile: UserProfile) => void;
type StatusListener = (status: SyncStatusInfo) => void;

interface SyncPacket {
  type: "HELLO" | "HELLO_ACK" | "JOBS_UPDATED" | "PROFILE_UPDATED";
  senderId: string;
  roomId: string;
  timestamp: number;
  payloadJobs?: JobAnalysisResult[];
  payloadProfile?: UserProfile;
}

export class CloudSyncService {
  private config: CloudSyncConfig = DEFAULT_SYNC_CONFIG;
  private status: SyncStatusInfo = {
    state: "disconnected",
    roomId: null,
    lastSyncedAt: null,
    connectedDeviceCount: 1,
    errorMessage: null,
  };

  private clientId: string = `client_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  private jobListeners: Set<JobListener> = new Set();
  private profileListeners: Set<ProfileListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  private broadcastChannel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;

  constructor() {
    this.loadSavedConfig();
    this.initBroadcastChannel();
    if (this.config.enabled && this.config.roomId) {
      this.connectRelay(this.config.roomId);
    }
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
          this.handleIncomingPacket(event.data);
        };
      }
    } catch (e) {
      console.warn("BroadcastChannel not supported", e);
    }
  }

  private getTopic(roomId: string): string {
    return `jobeval_sync_${roomId.trim().replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  }

  private connectRelay(roomId: string) {
    this.disconnectRelay();

    if (typeof window === "undefined" || typeof WebSocket === "undefined") {
      return;
    }

    const topic = this.getTopic(roomId);
    const wsUrl = `wss://ntfy.sh/${encodeURIComponent(topic)}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.updateStatus({
          state: "connected",
          roomId,
          errorMessage: null,
          connectedDeviceCount: 2,
          lastSyncedAt: new Date(),
        });
        // Send initial HELLO with local data for two-way sync
        this.sendInitialHello(roomId);
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          // ntfy.sh wraps messages in an event object: { event: "message", message: "..." }
          const messageContent = raw.message || raw;
          const packet: SyncPacket = typeof messageContent === "string" ? JSON.parse(messageContent) : messageContent;
          this.handleIncomingPacket(packet);
        } catch (e) {
          // Ignore keepalive or non-JSON messages
        }
      };

      this.ws.onerror = (e) => {
        console.warn("WebSocket sync error, falling back to local channel", e);
      };

      this.ws.onclose = () => {
        if (this.config.enabled && this.config.roomId === roomId) {
          // Schedule reconnect
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (this.config.enabled && this.config.roomId) {
              this.connectRelay(this.config.roomId);
            }
          }, 3000);
        }
      };
    } catch (e) {
      console.warn("Failed to initialize WebSocket relay", e);
    }
  }

  private disconnectRelay() {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
  }

  private sendInitialHello(roomId: string) {
    let localJobs: JobAnalysisResult[] = [];
    let localProfile: UserProfile | null = null;
    try {
      const rawJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
      if (rawJobs) localJobs = JSON.parse(rawJobs);
      const rawProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (rawProfile) localProfile = JSON.parse(rawProfile);
    } catch (e) {
      console.warn("Failed to load local data for initial sync hello", e);
    }

    this.sendPacket({
      type: "HELLO",
      senderId: this.clientId,
      roomId,
      timestamp: Date.now(),
      payloadJobs: localJobs,
      payloadProfile: localProfile || undefined,
    });
  }

  private sendPacket(packet: SyncPacket) {
    // 1. Send via local BroadcastChannel
    try {
      this.broadcastChannel?.postMessage(packet);
    } catch (e) {
      console.warn("Failed to broadcast packet", e);
    }

    // 2. Send via Relay to internet peers (HTTP POST to ntfy topic)
    if (typeof fetch !== "undefined" && packet.roomId) {
      const topic = this.getTopic(packet.roomId);
      fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
        method: "POST",
        body: JSON.stringify(packet),
        headers: {
          "Title": "JobEval Sync",
          "Priority": "low",
        },
      }).catch((e) => {
        console.warn("Failed to send sync packet over relay", e);
      });
    }
  }

  private handleIncomingPacket(packet: SyncPacket) {
    if (!packet || typeof packet !== "object") return;
    const { type, senderId, roomId, payloadJobs, payloadProfile } = packet;

    // Ignore self-echoed packets
    if (senderId === this.clientId) return;

    // Ignore packets destined for different rooms
    if (this.config.roomId && roomId && this.config.roomId.toUpperCase() !== roomId.toUpperCase()) {
      return;
    }

    if (type === "HELLO" || type === "HELLO_ACK") {
      // Merge received jobs
      if (Array.isArray(payloadJobs) && payloadJobs.length > 0) {
        this.applyJobsMerge(payloadJobs);
      }
      // Merge received profile
      if (payloadProfile) {
        this.applyProfileMerge(payloadProfile);
      }

      // If this was an initial HELLO, respond with HELLO_ACK so the peer also gets our data
      if (type === "HELLO") {
        let currentJobs: JobAnalysisResult[] = [];
        let currentProfile: UserProfile | null = null;
        try {
          const rawJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
          if (rawJobs) currentJobs = JSON.parse(rawJobs);
          const rawProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
          if (rawProfile) currentProfile = JSON.parse(rawProfile);
        } catch (e) {
          console.warn("Failed to read current data for HELLO_ACK", e);
        }

        this.sendPacket({
          type: "HELLO_ACK",
          senderId: this.clientId,
          roomId: this.config.roomId || roomId,
          timestamp: Date.now(),
          payloadJobs: currentJobs,
          payloadProfile: currentProfile || undefined,
        });
      }
      this.updateStatus({ lastSyncedAt: new Date() });
    } else if (type === "JOBS_UPDATED" && Array.isArray(payloadJobs)) {
      this.applyJobsMerge(payloadJobs);
      this.updateStatus({ lastSyncedAt: new Date() });
    } else if (type === "PROFILE_UPDATED" && payloadProfile) {
      this.applyProfileMerge(payloadProfile);
      this.updateStatus({ lastSyncedAt: new Date() });
    }
  }

  private applyJobsMerge(incomingJobs: JobAnalysisResult[]) {
    let localJobs: JobAnalysisResult[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.JOBS);
      if (raw) localJobs = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to read local jobs for merge", e);
    }

    const merged = mergeJobs(localJobs, incomingJobs);
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(merged));
    this.notifyJobListeners(merged);
  }

  private applyProfileMerge(incomingProfile: UserProfile) {
    let localProfile: UserProfile | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (raw) localProfile = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to read local profile for merge", e);
    }

    const merged = localProfile ? mergeProfile(localProfile, incomingProfile) : incomingProfile;
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(merged));
    this.notifyProfileListeners(merged);
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
      this.connectRelay(config.roomId);
    } else {
      this.disconnectRelay();
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
    if (this.config.enabled && this.config.roomId) {
      this.sendPacket({
        type: "JOBS_UPDATED",
        senderId: this.clientId,
        roomId: this.config.roomId,
        timestamp: Date.now(),
        payloadJobs: jobs,
      });
      this.updateStatus({ lastSyncedAt: new Date() });
    }
  }

  public notifyProfileChanged(profile: UserProfile) {
    this.notifyProfileListeners(profile);
    if (this.config.enabled && this.config.roomId) {
      this.sendPacket({
        type: "PROFILE_UPDATED",
        senderId: this.clientId,
        roomId: this.config.roomId,
        timestamp: Date.now(),
        payloadProfile: profile,
      });
      this.updateStatus({ lastSyncedAt: new Date() });
    }
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
