import { useCallback, useRef, useEffect } from "react";

interface UseAutoSaveOptions {
  enabled: boolean; // Default should be false
  interval: number; // Auto-save interval in milliseconds (default: 30000 = 30s)
  onSave: () => Promise<void>; // Save function to call
  isDirty: boolean; // Whether there are unsaved changes
  isManualSaving: boolean; // Whether a manual save is in progress
}

interface UseAutoSaveReturn {
  isAutoSaving: boolean;
  lastAutoSave: Date | null;
  cancelAutoSave: () => void;
  triggerAutoSave: () => Promise<void>;
}

export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveReturn {
  const {
    enabled,
    interval = 30000, // 30 seconds default
    onSave,
    isDirty,
    isManualSaving,
  } = options;

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoSavingRef = useRef(false);
  const lastAutoSaveRef = useRef<Date | null>(null);

  // Cancel any pending auto-save
  const cancelAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  }, []);

  // Trigger auto-save immediately
  const triggerAutoSave = useCallback(async () => {
    if (!enabled || !isDirty || isManualSaving || isAutoSavingRef.current) {
      return;
    }

    try {
      isAutoSavingRef.current = true;
      console.debug("Auto-save triggered");

      await onSave();

      lastAutoSaveRef.current = new Date();
      console.debug("Auto-save completed successfully");
    } catch (error) {
      console.error("Auto-save failed:", error);
      throw error; // Allow the caller to handle the error
    } finally {
      isAutoSavingRef.current = false;
    }
  }, [enabled, isDirty, isManualSaving, onSave]);

  // Schedule auto-save
  const scheduleAutoSave = useCallback(() => {
    cancelAutoSave();

    if (!enabled || !isDirty || isManualSaving) {
      return;
    }

    console.debug("Scheduling auto-save in", interval, "ms");
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await triggerAutoSave();
      } catch (error) {
        console.error("Scheduled auto-save failed:", error);
      }
    }, interval);
  }, [
    enabled,
    isDirty,
    isManualSaving,
    interval,
    triggerAutoSave,
    cancelAutoSave,
  ]);

  // Effect to handle auto-save scheduling
  useEffect(() => {
    if (enabled && isDirty && !isManualSaving) {
      scheduleAutoSave();
    } else {
      cancelAutoSave();
    }

    return cancelAutoSave;
  }, [enabled, isDirty, isManualSaving, scheduleAutoSave, cancelAutoSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAutoSave();
    };
  }, [cancelAutoSave]);

  return {
    isAutoSaving: isAutoSavingRef.current,
    lastAutoSave: lastAutoSaveRef.current,
    cancelAutoSave,
    triggerAutoSave,
  };
}
