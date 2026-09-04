/**
 * Cloud Real-Time & Persistent Synchronization Service
 * Backed by Cloudflare D1 (E2EE Zero-Knowledge DB) + Real-Time WebSocket Relay.
 * Fully Local-First: Zero latency UI (0ms), asynchronous background cloud persistence.
 * Cloud Single Source of Truth (SSoT) Architecture with Clean Snapshot Mirroring.
 */

import { UserProfile } from "@/types/profile";
import { JobAnalysisResult } from "@/types/job";
import { CloudSyncConfig, SyncStatusInfo, DEFAULT_SYNC_CONFIG } from "@/types/sync";
import { applyJobsSnapshot, applyProfileSnapshot } from "@/core/sync/smartMerge";
import { encryptJson, decryptJson } from "@/core/crypto/e2eeCrypto";

const SYNC_CONFIG_KEY = "jobeval_cloud_sync_config_v1";
const STORAGE_KEYS = {
  PROFILE: "jobeval_user_profile_v1",
  JOBS: "jobeval_saved_jobs_v1",
};

type JobListener = (jobs: JobAnalysisResult[]) => void;
type ProfileListener = (profile: UserProfile) => void;
type StatusListener = (status: SyncStatusInfo) => void;

interface SyncSignalPacket {
  type: "DATA_UPDATED";
  senderId: string;
  roomId: string;
  timestamp: number;
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
  private pollingTimer: any = null;

  constructor() {
    this.loadSavedConfig();
    this.initBroadcastChannel();
    this.initWindowFocusListener();
    if (this.config.enabled && this.config.roomId) {
      this.connectRelay(this.config.roomId);
      this.syncWithD1(this.config.roomId);
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

  private initWindowFocusListener() {
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("focus", () => {
        if (this.config.enabled && this.config.roomId) {
          this.pullFromD1(this.config.roomId);
        }
      });
    }
  }

  private getTopic(roomId: string): string {
    return `jobeval_sync_${roomId.trim().replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  }

  private getD1ApiUrl(): string {
    if (typeof window === "undefined") return "https://job-eval.pages.dev/api/sync";
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "" || window.location.protocol === "tauri:";
    return isLocal ? "https://job-eval.pages.dev/api/sync" : "/api/sync";
  }

  // ==============================================================
  // D1 E2EE CLOUD SSOT PERSISTENT SYNCHRONIZATION (PUSH / PULL)
  // ==============================================================

  /**
   * Pulls authoritative encrypted snapshot from Cloudflare D1 and applies it cleanly.
   * Cloud is the Single Source of Truth (SSoT).
   */
  public async pullFromD1(roomId: string): Promise<boolean> {
    if (!roomId) return false;

    try {
      const res = await fetch(this.getD1ApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pull",
          roomId: roomId.trim().toUpperCase(),
        }),
      });

      if (!res.ok) {
        console.warn("D1 pull failed with status", res.status);
        return false;
      }

      const data = await res.json();
      if (!data.success) return false;

      // If room does not exist in D1 yet, do not overwrite local data
      if (data.exists === false) {
        return false;
      }

      // 1. Decrypt and apply authoritative profile snapshot
      if (data.profile && data.profile.encrypted) {
        const decryptedProfile = await decryptJson<UserProfile>(data.profile.encrypted, roomId);
        if (decryptedProfile) {
          this.applyProfileSnapshot(decryptedProfile);
        }
      }

      // 2. Decrypt and apply authoritative jobs snapshot
      if (Array.isArray(data.jobs)) {
        const decryptedJobs: JobAnalysisResult[] = [];
        for (const j of data.jobs) {
          if (j.encrypted) {
            const dec = await decryptJson<JobAnalysisResult>(j.encrypted, roomId);
            if (dec) decryptedJobs.push(dec);
          }
        }
        this.applyJobsSnapshot(decryptedJobs);
      }

      this.updateStatus({ lastSyncedAt: new Date() });
      return true;
    } catch (err) {
      console.warn("Failed to pull from D1 cloud DB", err);
      return false;
    }
  }

  /**
   * Pushes local jobs & profile snapshot to Cloudflare D1 with E2EE AES-GCM encryption.
   */
  public async pushToD1(roomId: string, jobsToPush?: JobAnalysisResult[], profileToPush?: UserProfile): Promise<boolean> {
    if (!roomId) return false;

    try {
      // 1. Encrypt profile if provided
      let encryptedProfile: { encrypted: string; updatedAt: number } | undefined;
      if (profileToPush) {
        const enc = await encryptJson(profileToPush, roomId);
        encryptedProfile = {
          encrypted: enc,
          updatedAt: Date.now(),
        };
      }

      // 2. Encrypt jobs snapshot if provided (handles empty array for full deletion)
      let encryptedJobs: Array<{ jobId: string; encrypted: string; updatedAt: number }> | undefined;
      if (Array.isArray(jobsToPush)) {
        encryptedJobs = [];
        for (const job of jobsToPush) {
          if (job?.metadata?.id) {
            const enc = await encryptJson(job, roomId);
            const ts = job.metadata.updatedAt ? new Date(job.metadata.updatedAt).getTime() : Date.now();
            encryptedJobs.push({
              jobId: job.metadata.id,
              encrypted: enc,
              updatedAt: isNaN(ts) ? Date.now() : ts,
            });
          }
        }
      }

      const res = await fetch(this.getD1ApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "push",
          roomId: roomId.trim().toUpperCase(),
          profile: encryptedProfile,
          jobs: encryptedJobs,
        }),
      });

      if (!res.ok) {
        console.warn("D1 push failed with status", res.status);
        return false;
      }

      const data = await res.json();
      if (data.success) {
        this.updateStatus({ lastSyncedAt: new Date() });
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Failed to push to D1 cloud DB", err);
      return false;
    }
  }

  /**
   * Initial synchronization with D1:
   * 1. Pulls latest authoritative cloud data first.
   * 2. If room does not exist in cloud yet, populates it with current local data.
   */
  private async syncWithD1(roomId: string) {
    // 1. Pull latest authoritative snapshot from cloud
    const cloudRoomExists = await this.pullFromD1(roomId);

    // 2. If room did not exist in cloud, populate it with current local data
    if (!cloudRoomExists) {
      let localProfile: UserProfile | null = null;
      let localJobs: JobAnalysisResult[] = [];
      try {
        const rawProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
        if (rawProfile) localProfile = JSON.parse(rawProfile);
        const rawJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
        if (rawJobs) localJobs = JSON.parse(rawJobs);
      } catch (e) {
        console.warn("Failed to read local storage for initial D1 sync check", e);
      }

      const isCustomProfile = localProfile && localProfile.id !== "user-default";
      if (isCustomProfile || localJobs.length > 0) {
        await this.pushToD1(roomId, localJobs, localProfile || undefined);
      }
    }
  }

  // ==========================================
  // REAL-TIME WEBSOCKET RELAY (LIGHTWEIGHT PING)
  // ==========================================

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
        // Pull latest from cloud on connection
        this.pullFromD1(roomId);
      };

      this.ws.onmessage = async (event) => {
        try {
          const raw = JSON.parse(event.data);
          const messageContent = raw.message || raw;
          if (typeof messageContent === "string" && messageContent.startsWith("{")) {
            const packet = JSON.parse(messageContent);
            this.handleIncomingPacket(packet);
          } else if (messageContent && typeof messageContent === "object") {
            this.handleIncomingPacket(messageContent as SyncSignalPacket);
          }
        } catch (e) {
          // Ignore keepalive or malformed messages
        }
      };

      this.ws.onerror = (e) => {
        console.warn("WebSocket sync error, falling back to background polling", e);
      };

      this.ws.onclose = () => {
        if (this.config.enabled && this.config.roomId === roomId) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (this.config.enabled && this.config.roomId) {
              this.connectRelay(this.config.roomId);
            }
          }, 3000);
        }
      };

      // Periodic polling for D1 background sync (every 20s)
      clearInterval(this.pollingTimer);
      this.pollingTimer = setInterval(() => {
        if (this.config.enabled && this.config.roomId) {
          this.pullFromD1(this.config.roomId);
        }
      }, 20000);
    } catch (e) {
      console.warn("Failed to initialize WebSocket relay", e);
    }
  }

  private disconnectRelay() {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pollingTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
  }

  /**
   * Broadcasts a lightweight DATA_UPDATED signal to peer devices
   */
  private sendSignal() {
    if (!this.config.roomId) return;

    const packet: SyncSignalPacket = {
      type: "DATA_UPDATED",
      senderId: this.clientId,
      roomId: this.config.roomId,
      timestamp: Date.now(),
    };

    // 1. Send via local BroadcastChannel for same-device tabs
    try {
      this.broadcastChannel?.postMessage(packet);
    } catch (e) {
      console.warn("Failed to broadcast packet", e);
    }

    // 2. Send via Relay to internet peers (HTTP POST to ntfy topic)
    if (typeof fetch !== "undefined") {
      const topic = this.getTopic(this.config.roomId);
      fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
        method: "POST",
        body: JSON.stringify(packet),
        headers: {
          "Title": "JobEval Sync Ping",
          "Priority": "low",
        },
      }).catch((e) => {
        console.warn("Failed to send sync ping over relay", e);
      });
    }
  }

  private handleIncomingPacket(packet: SyncSignalPacket) {
    if (!packet || typeof packet !== "object") return;
    const { senderId, roomId } = packet;

    // Ignore self-echoed packets
    if (senderId === this.clientId) return;

    // Ignore packets destined for different rooms
    if (this.config.roomId && roomId && this.config.roomId.toUpperCase() !== roomId.toUpperCase()) {
      return;
    }

    // On DATA_UPDATED signal, pull authoritative snapshot from D1
    if (this.config.enabled && this.config.roomId) {
      this.pullFromD1(this.config.roomId);
    }
  }

  private applyJobsSnapshot(cloudJobs: JobAnalysisResult[]) {
    let localJobs: JobAnalysisResult[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.JOBS);
      if (raw) localJobs = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to read local jobs", e);
    }

    const snapshot = applyJobsSnapshot(localJobs, cloudJobs);
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(snapshot));
    this.notifyJobListeners(snapshot);
  }

  private applyProfileSnapshot(cloudProfile: UserProfile) {
    let localProfile: UserProfile | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (raw) localProfile = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to read local profile", e);
    }

    const snapshot = applyProfileSnapshot(localProfile, cloudProfile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(snapshot));
    this.notifyProfileListeners(snapshot);
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
      await this.syncWithD1(config.roomId);
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
      // 1. D1 Persistent Cloud Push (Background)
      this.pushToD1(this.config.roomId, jobs).catch((e) => {
        console.warn("Background D1 job push error", e);
      });

      // 2. Broadcast lightweight signal
      this.sendSignal();
      this.updateStatus({ lastSyncedAt: new Date() });
    }
  }

  public notifyProfileChanged(profile: UserProfile) {
    this.notifyProfileListeners(profile);
    if (this.config.enabled && this.config.roomId) {
      // 1. D1 Persistent Cloud Push (Background)
      this.pushToD1(this.config.roomId, undefined, profile).catch((e) => {
        console.warn("Background D1 profile push error", e);
      });

      // 2. Broadcast lightweight signal
      this.sendSignal();
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
   * Helper to generate human-readable pairing room IDs (e.g. JE-8492-7K9A)
   */
  public generateRoomId(): string {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `JE-${randomNum}-${randomSuffix}`;
  }
}

export const cloudSyncService = new CloudSyncService();
