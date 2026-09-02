import { useState, useEffect, useCallback } from "react";
import { SyncStatusInfo, CloudSyncConfig } from "@/types/sync";
import { cloudSyncService } from "@/services/sync/cloudSyncService";

export function useCloudSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(cloudSyncService.getStatus());
  const [syncConfig, setSyncConfig] = useState<CloudSyncConfig>(cloudSyncService.getConfig());
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = cloudSyncService.onStatusChange((newStatus) => {
      setSyncStatus(newStatus);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const updateConfig = useCallback(async (newConfig: CloudSyncConfig) => {
    setSyncConfig(newConfig);
    await cloudSyncService.configure(newConfig);
  }, []);

  const generateNewRoomId = useCallback(() => {
    return cloudSyncService.generateRoomId();
  }, []);

  return {
    syncStatus,
    syncConfig,
    isModalOpen,
    setIsModalOpen,
    updateConfig,
    generateNewRoomId,
  };
}
