export type SettingsLanguage = "vi" | "en";
export type DefaultBudget = "auto" | "30000" | "50000" | "100000";

export interface UserSettings {
  language: SettingsLanguage;
  notificationSearch: boolean;
  notificationSupport: boolean;
  notificationFavorites: boolean;
  allowLocation: boolean;
  allowAiPersonalization: boolean;
  defaultRadiusKm: number;
  defaultBudget: DefaultBudget;
}

const SETTINGS_KEY = "wanderbite_settings";
export const SETTINGS_UPDATED_EVENT = "wanderbite:settings-updated";

export const defaultSettings: UserSettings = {
  language: "vi",
  notificationSearch: true,
  notificationSupport: true,
  notificationFavorites: true,
  allowLocation: true,
  allowAiPersonalization: true,
  defaultRadiusKm: 2,
  defaultBudget: "auto",
};

function getStorageUserId(userId?: string | null): string {
  return userId || "guest";
}

function readSettingsMap(): Record<string, UserSettings> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) as Record<string, UserSettings> : {};
  } catch {
    return {};
  }
}

function writeSettingsMap(data: Record<string, UserSettings>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
}

function normalizeSettings(value?: Partial<UserSettings>): UserSettings {
  return {
    ...defaultSettings,
    ...(value || {}),
  };
}

export const settingsService = {
  async getSettings(userId?: string | null): Promise<UserSettings> {
    const key = getStorageUserId(userId);
    const data = readSettingsMap();
    return normalizeSettings(data[key]);
  },

  async updateSettings(
    userId: string | null | undefined,
    updates: Partial<UserSettings>,
  ): Promise<UserSettings> {
    const key = getStorageUserId(userId);
    const data = readSettingsMap();
    const nextSettings = normalizeSettings({
      ...(data[key] || defaultSettings),
      ...updates,
    });

    data[key] = nextSettings;
    writeSettingsMap(data);
    return nextSettings;
  },

  async resetSettings(userId?: string | null): Promise<UserSettings> {
    const key = getStorageUserId(userId);
    const data = readSettingsMap();
    data[key] = defaultSettings;
    writeSettingsMap(data);
    return defaultSettings;
  },
};
