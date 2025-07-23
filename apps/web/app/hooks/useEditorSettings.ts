import { useState, useEffect, useCallback } from "react";

interface EditorSettings {
  autoSave: {
    enabled: boolean;
    interval: number; // in milliseconds
    showIndicator: boolean;
  };
  // Future settings can be added here
  // theme: 'light' | 'dark';
  // fontSize: number;
  // wordWrap: boolean;
}

const defaultSettings: EditorSettings = {
  autoSave: {
    enabled: false, // Disabled by default as per requirements
    interval: 30000, // 30 seconds
    showIndicator: true,
  },
};

const SETTINGS_STORAGE_KEY = "editor-settings";

export function useEditorSettings() {
  const [settings, setSettings] = useState<EditorSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        // Merge with defaults to ensure all required fields exist
        setSettings({
          ...defaultSettings,
          ...parsedSettings,
          autoSave: {
            ...defaultSettings.autoSave,
            ...parsedSettings.autoSave,
          },
        });
      }
    } catch (error) {
      console.error("Failed to load editor settings:", error);
      // Keep default settings if loading fails
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save editor settings:", error);
    }
  }, [settings]);

  // Update auto-save settings
  const updateAutoSaveSettings = useCallback(
    (updates: Partial<EditorSettings["autoSave"]>) => {
      setSettings(prev => ({
        ...prev,
        autoSave: {
          ...prev.autoSave,
          ...updates,
        },
      }));
    },
    []
  );

  // Toggle auto-save enabled/disabled
  const toggleAutoSave = useCallback(() => {
    updateAutoSaveSettings({ enabled: !settings.autoSave.enabled });
  }, [settings.autoSave.enabled, updateAutoSaveSettings]);

  return {
    settings,
    setSettings,
    updateAutoSaveSettings,
    toggleAutoSave,
  };
}
