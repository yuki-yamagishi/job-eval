import { useState, useEffect, useCallback } from "react";
import { UserProfile, SkillItem, CertificationItem, ConditionMatrix, ApiSettings } from "@/types/profile";
import { storageAdapter } from "@/services/storage/storageAdapter";
import { DEFAULT_USER_PROFILE } from "@/core/constants/defaultProfile";

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const data = await storageAdapter.loadProfile();
        if (isMounted) {
          setProfile(data);
          setLastSavedTime(new Date(data.updatedAt));
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update whole profile
  const saveProfile = useCallback(async (updated: UserProfile) => {
    setIsSaving(true);
    try {
      await storageAdapter.saveProfile(updated);
      setProfile(updated);
      setLastSavedTime(new Date());
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Reset to default
  const resetToDefault = useCallback(async () => {
    setIsSaving(true);
    try {
      const def = await storageAdapter.resetProfile();
      setProfile(def);
      setLastSavedTime(new Date());
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Update specific sections
  const updateSkills = useCallback((skills: SkillItem[]) => {
    setProfile((prev) => ({ ...prev, skills }));
  }, []);

  const updateCertifications = useCallback((certifications: CertificationItem[]) => {
    setProfile((prev) => ({ ...prev, certifications }));
  }, []);

  const updateConditions = useCallback((conditions: Partial<ConditionMatrix>) => {
    setProfile((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, ...conditions },
    }));
  }, []);

  const updateApiSettings = useCallback((apiSettings: Partial<ApiSettings>) => {
    setProfile((prev) => ({
      ...prev,
      apiSettings: { ...prev.apiSettings, ...apiSettings },
    }));
  }, []);

  return {
    profile,
    setProfile,
    isLoading,
    isSaving,
    lastSavedTime,
    saveProfile,
    resetToDefault,
    updateSkills,
    updateCertifications,
    updateConditions,
    updateApiSettings,
  };
}
