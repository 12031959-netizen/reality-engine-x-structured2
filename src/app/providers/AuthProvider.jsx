import { createContext, useEffect, useMemo, useState, useRef } from "react";
import { apiClient } from "../../services/apiClient";
import { getLocalDateKey } from "../../utils/dateKeys";

export const AuthContext = createContext(null);

const ONE_HOUR = 60 * 60 * 1000;

const defaultPreferences = {
  dailyReminders: true,
  riskAlerts: true,
  weeklySummary: false,
  privateMode: false,
  hourlyReminders: true,
  appNotifications: false,
  emailNotifications: false,
  remindMood: true,
  remindFood: true,
  remindWater: true
};

function getTodayKey() {
  return getLocalDateKey();
}

function upsertDailyHistory(history = [], date, patch) {
  const existingRecord = history.find((record) => record.date === date);
  const nextRecord = {
    ...(existingRecord || { date }),
    ...patch,
    updatedAt: new Date().toISOString()
  };

  return [
    nextRecord,
    ...history.filter((record) => record.date !== date)
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [user, setUser] = useState(null);
  const lastResetRef = useRef(null);
  const lastDbRefreshRef = useRef(null);

  async function resetExpiredDailyCheckIn() {
    if (!account) return;
    const todayKey = getTodayKey();

    if (lastResetRef.current === todayKey) return;

    if (
      !account.dailyCheckIn?.checkInDate ||
      account.dailyCheckIn.checkInDate === todayKey
    ) {
      return;
    }

    lastResetRef.current = todayKey;

    const notification = {
      title: "New daily check-in needed",
      text: "A new day started. Enter today's mood, food, water, and recovery data.",
      type: "reminder"
    };

    await updateAccount({
      previousDailyCheckIn: account.dailyCheckIn,
      dailyCheckIn: null,
      lastCheckInResetDate: todayKey,
      dailyHistory: upsertDailyHistory(account.dailyHistory, account.dailyCheckIn.checkInDate, {
        checkIn: account.dailyCheckIn
      })
    });

    await addNotification(notification);

    const preferences = account.preferences || defaultPreferences;

    if (
      preferences.appNotifications &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("Reality Engine X", {
        body: notification.text
      });
    }
  }

  async function addNotification(notification) {
    if (!account) return { ok: false };

    const title = notification.title || "Notification";
    const message = notification.message || notification.text || "";

    try {
      const response = await apiClient.post(`/accounts/${account.id}/notifications`, {
        title,
        message,
        type: notification.type || "alert",
        emailNotify: notification.emailNotify
      });

      if (response.ok && response.account) {
        setAccount(response.account);
        setUser(response.account);
      }

      return { ok: true, account: response.account };
    } catch (error) {
      console.error("Failed to save notification", error);
      return { ok: false, message: error.message };
    }
  }

  async function markNotificationsSeen() {
    if (!account) return;
    try {
      const response = await apiClient.put(`/accounts/${account.id}/notifications/read`);
      if (response.ok && response.account) {
        setAccount(response.account);
        setUser(response.account);
        return;
      }

      setAccount(current => ({
        ...current,
        notificationLog: current.notificationLog.map(n => ({ ...n, read: true }))
      }));
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  }

  function buildReminderText(preferences = {}) {
    const reminders = [];

    if (preferences.remindMood) reminders.push("mood");
    if (preferences.remindFood) reminders.push("food");
    if (preferences.remindWater) reminders.push("water");

    return reminders.length
      ? `Hourly reminder: check your ${reminders.join(", ")}.`
      : "Hourly reminder: complete your diet check-in.";
  }

  async function sendAppReminder() {
    if (!account) return;
    const preferences = account.preferences || defaultPreferences;
    const text = buildReminderText(preferences);
    const title = "Hourly diet reminder";

    try {
      await addNotification({
        title,
        text,
        type: "reminder"
      });
      
      if (
        preferences.appNotifications &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Reality Engine X", {
          body: text
        });
      }
    } catch (error) {
      console.error("Failed to send reminder", error);
    }
  }

  async function requestAppNotificationPermission() {
    if (!("Notification" in window)) {
      return {
        ok: false,
        message: "Browser notifications are not supported here."
      };
    }

    const permission = await Notification.requestPermission();
    const allowed = permission === "granted";

    if (account) {
      updateAccount({
        preferences: {
          ...account.preferences,
          appNotifications: allowed
        }
      });
    }

    return {
      ok: allowed,
      message: allowed
        ? "App notifications enabled."
        : "Notification permission was not granted."
    };
  }

  useEffect(() => {
    if (!account) return;
    const preferences = account.preferences || defaultPreferences;

    if (!user || !preferences.hourlyReminders || !preferences.appNotifications) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      sendAppReminder();
    }, ONE_HOUR);

    return () => window.clearInterval(intervalId);
  }, [
    user,
    account?.preferences?.hourlyReminders,
    account?.preferences?.appNotifications,
    account?.preferences?.remindMood,
    account?.preferences?.remindFood,
    account?.preferences?.remindWater
  ]);

  useEffect(() => {
    if (!user || !account) return;
    resetExpiredDailyCheckIn();
  }, [user, account?.dailyCheckIn?.checkInDate]);

  useEffect(() => {
    if (!account?.id || lastDbRefreshRef.current === account.id) return;

    lastDbRefreshRef.current = account.id;
    apiClient.get(`/accounts/${account.id}`)
      .then((response) => {
        if (response.ok && response.account) {
          setAccount(response.account);
          setUser(response.account);
        }
      })
      .catch((error) => {
        console.error("Failed to refresh account from database", error);
      });
  }, [account?.id]);

  async function login(identifier, password) {
    if (!identifier.trim() || !password) {
      return {
        ok: false,
        message: "Enter your email or username and password."
      };
    }

    try {
      const result = await apiClient.post("/auth/login", {
        identifier,
        password
      });

      setAccount(result.account);
      setUser(result.account);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function signup(payload) {
    try {
      const result = await apiClient.post("/auth/signup", payload);
      setAccount(result.account);
      setUser(result.account);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function resetPassword(email, password) {
    try {
      await apiClient.post("/auth/reset-password", { email, password });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function updateAccount(payload) {
    if (!account) return { ok: false };

    try {
      const response = await apiClient.put(`/accounts/${account.id}`, payload);
      if (response.ok && response.account) {
        setAccount(response.account);
        setUser(response.account);
        return { ok: true };
      }
      return { ok: false, message: response.message || "Update failed" };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function refreshAccount() {
    if (!account) return { ok: false };
    try {
      const response = await apiClient.get(`/accounts/${account.id}`);
      if (response.ok && response.account) {
        setAccount(response.account);
        setUser(response.account);
        return { ok: true, account: response.account };
      }
      return { ok: false };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  function saveDietProfile(dietProfile) {
    return updateAccount({
      dietProfile: {
        ...dietProfile,
        completed: true,
        updatedAt: new Date().toISOString()
      }
    });
  }

  async function saveDailyCheckIn(dailyCheckIn) {
    if (!account) {
      console.error("saveDailyCheckIn: No active account found!");
      return { ok: false, message: "No active account" };
    }
    try {
      const payload = { ...dailyCheckIn, checkInDate: getTodayKey() };
      const response = await apiClient.post(`/accounts/${account.id}/daily-checkin`, payload);
      
      if (response && response.ok && response.account) {
        setAccount(response.account);
        setUser(response.account);
        return { ok: true, account: response.account };
      }
      console.warn("saveDailyCheckIn: Response is missing ok or account fields!", response);
      return { ok: false, message: response?.message || "Failed to save check-in (invalid response structure)" };
    } catch (error) {
      console.error("saveDailyCheckIn: Request failed with catch error:", error);
      return { ok: false, message: error.message };
    }
  }

  async function deleteDailyCheckIn(date) {
    if (!account) return { ok: false };
    try {
      const response = await apiClient.delete(`/accounts/${account.id}/daily-checkin/${date}`);
      if (response.ok && response.account) {
        setAccount(response.account);
        setUser(response.account);
        return { ok: true };
      }
      return { ok: false, message: response.message || "Failed to delete check-in" };
    } catch (error) {
      console.error("Delete Check-in Error:", error);
      return { ok: false, message: error.message };
    }
  }

  async function deleteFailureRiskResult(riskId) {
    if (!account) return { ok: false };
    try {
      const response = await apiClient.delete(`/accounts/${account.id}/failure-risk/${riskId}`);
      if (response.ok && response.account) {
        setAccount(response.account);
        setUser(response.account);
        return { ok: true };
      }
      return { ok: false, message: response.message || "Failed to delete failure risk result" };
    } catch (error) {
      console.error("Delete Failure Risk Error:", error);
      return { ok: false, message: error.message };
    }
  }

  async function saveFailureRiskResult(result) {
    if (!account) return { ok: false };
    try {
      const response = await apiClient.post(`/accounts/${account.id}/failure-risk`, result);
      if (response.ok && response.account) {
        setAccount(response.account);
        setUser(response.account);
        return { ok: true };
      }
      return { ok: false, message: response.message || "Failed to save failure risk result" };
    } catch (error) {
      console.error("Save Failure Risk Error:", error);
      return { ok: false, message: error.message };
    }
  }

  async function saveWearableData(wearableData) {
    if (!account) return { ok: false };
    try {
      const payload = { ...wearableData, wearableDate: getTodayKey() };
      const response = await apiClient.post(`/accounts/${account.id}/wearable`, payload);
      if (response.ok && response.account) {
        setAccount(response.account);
        setUser(response.account);
        return { ok: true };
      }
      return { ok: false, message: response.message || "Failed to save mobile data" };
    } catch (error) {
      console.error("Save Mobile Data Error:", error);
      return { ok: false, message: error.message };
    }
  }

  async function saveDietPlan(plan) {
    if (!account) return { ok: false };
    try {
      const response = await apiClient.post(`/accounts/${account.id}/diet-plans`, plan);
      if (response.ok) {
        // Refresh account to get updated plans
        const refresh = await apiClient.get(`/accounts/${account.id}`);
        setAccount(refresh.account);
        setUser(refresh.account);
        return { ok: true };
      }
      return { ok: false };
    } catch (error) { return { ok: false, message: error.message }; }
  }

  async function saveFoodLog(log) {
    if (!account) return { ok: false };
    try {
      const response = await apiClient.post(`/accounts/${account.id}/food-logs`, log);
      if (response.ok) {
        const refresh = await apiClient.get(`/accounts/${account.id}`);
        setAccount(refresh.account);
        setUser(refresh.account);
        return { ok: true };
      }
      return { ok: false };
    } catch (error) { return { ok: false, message: error.message }; }
  }

  async function deleteFoodLog(logId) {
    if (!account) return { ok: false };
    try {
      const response = await apiClient.delete(`/accounts/${account.id}/food-logs/${logId}`);
      if (response.ok) {
        const refresh = await apiClient.get(`/accounts/${account.id}`);
        setAccount(refresh.account);
        setUser(refresh.account);
        return { ok: true };
      }
      return { ok: false, message: response.message || "Failed to delete meal" };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function saveMoodLog(log) {
    if (!account) return { ok: false };
    try {
      const response = await apiClient.post(`/accounts/${account.id}/mood-logs`, log);
      if (response.ok) {
        const refresh = await apiClient.get(`/accounts/${account.id}`);
        setAccount(refresh.account);
        setUser(refresh.account);
        return { ok: true };
      }
      return { ok: false };
    } catch (error) { return { ok: false, message: error.message }; }
  }

  async function saveProgress(progress) {
    if (!account) return { ok: false };
    try {
      const response = await apiClient.post(`/accounts/${account.id}/progress`, progress);
      if (response.ok) {
        const refresh = await apiClient.get(`/accounts/${account.id}`);
        setAccount(refresh.account);
        setUser(refresh.account);
        return { ok: true };
      }
      return { ok: false };
    } catch (error) { return { ok: false, message: error.message }; }
  }

  const value = useMemo(
    () => ({
      account,
      user,
      login,
      resetPassword,
      markNotificationsSeen,
      signup,
      requestAppNotificationPermission,
      addNotification,
      saveDailyCheckIn,
      deleteDailyCheckIn,
      deleteFailureRiskResult,
      saveFailureRiskResult,
      saveDietProfile,
      saveWearableData,
      saveDietPlan,
      saveFoodLog,
      deleteFoodLog,
      saveMoodLog,
      saveProgress,
      sendAppReminder,
      todayKey: getTodayKey(),
      updateAccount,
      refreshAccount,
      logout: () => {
        setAccount(null);
        setUser(null);
      },
      updateUser: setUser
    }),
    [account, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
