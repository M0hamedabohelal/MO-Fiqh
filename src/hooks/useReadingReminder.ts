import { useState, useEffect, useCallback } from 'react';
import { safeGet, safeSet } from '../utils/safeStorage';

export const REMINDER_ENABLED_KEY = 'reading_reminder_enabled';
export const REMINDER_TIME_KEY = 'reading_reminder_time';
export const REMINDER_LAST_NOTIFIED_KEY = 'reading_reminder_last_date';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface ReadingReminderState {
  isSupported: boolean;
  permission: NotificationPermissionState;
  isEnabled: boolean;
  preferredTime: string;
  enableReminder: () => Promise<boolean>;
  disableReminder: () => void;
  setPreferredTime: (time: string) => void;
  triggerTestReminder: () => boolean;
}

export function useReadingReminder(streakDays?: number): ReadingReminderState {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  const [permission, setPermission] = useState<NotificationPermissionState>(() => {
    if (!isSupported) return 'unsupported';
    return Notification.permission as NotificationPermissionState;
  });

  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (!isSupported) return false;
    const stored = safeGet(REMINDER_ENABLED_KEY);
    return stored === 'true' && Notification.permission === 'granted';
  });

  const [preferredTime, setPreferredTimeState] = useState<string>(() => {
    const stored = safeGet(REMINDER_TIME_KEY);
    return stored && /^\d{2}:\d{2}$/.test(stored) ? stored : '20:00';
  });



  const enableReminder = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      let currentPerm = Notification.permission;
      if (currentPerm === 'default') {
        currentPerm = await Notification.requestPermission();
      }

      setPermission(currentPerm as NotificationPermissionState);

      if (currentPerm === 'granted') {
        safeSet(REMINDER_ENABLED_KEY, 'true');
        setIsEnabled(true);

        try {
          // إشعار ترحيبي تأكيدي لطيف
          new Notification('يَسِّر — تفعيل تذكير الورد اليومي', {
            body: 'تم تفعيل التذكير بنجاح! سنذكرك يومياً بقراءة مسألة فقهية نافعة في ضوء الكتاب والسنة.',
            icon: '/icons/icon-192.png',
          });
        } catch {
          // Fail silently for notification constructor issues on some browsers
        }
        return true;
      }

      safeSet(REMINDER_ENABLED_KEY, 'false');
      setIsEnabled(false);
      return false;
    } catch {
      return false;
    }
  }, [isSupported]);

  const disableReminder = useCallback((): void => {
    safeSet(REMINDER_ENABLED_KEY, 'false');
    setIsEnabled(false);
  }, []);

  const setPreferredTime = useCallback((time: string): void => {
    if (/^\d{2}:\d{2}$/.test(time)) {
      safeSet(REMINDER_TIME_KEY, time);
      setPreferredTimeState(time);
    }
  }, []);

  const triggerTestReminder = useCallback((): boolean => {
    if (!isSupported || Notification.permission !== 'granted') return false;

    try {
      const body = streakDays && streakDays > 0
        ? `واصل سلسلة مواظبتك اليومية (${streakDays} أيام)! تعلّم مسألة فقهية جديدة اليوم.`
        : 'حان وقت الورد الفقهي اليومي. مسألة فقهية ميسّرة تنير بصيرتك.';

      new Notification('يَسِّر — تذكير الورد الفقهي اليومي', {
        body,
        icon: '/icons/icon-192.png',
      });
      return true;
    } catch {
      return false;
    }
  }, [isSupported, streakDays]);

  // فحص وإطلاق التذكير اليومي التلقائي عند فتح التطبيق
  useEffect(() => {
    if (!isSupported || !isEnabled || permission !== 'granted') return;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastNotified = safeGet(REMINDER_LAST_NOTIFIED_KEY);

      if (lastNotified === today) return;

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      // إذا تجاوز الوقت الحالي الوقت المفضل للمستخدم لهذا اليوم
      if (currentTimeStr >= preferredTime) {
        const body = streakDays && streakDays > 0
          ? `واصل سلسلة مواظبتك اليومية (${streakDays} أيام)! تعلّم مسألة فقهية جديدة اليوم.`
          : 'حان وقت الورد الفقهي اليومي. تعلّم مسألة فقهية ميسّرة في ضوء الكتاب والسنة.';

        new Notification('يَسِّر — تذكير الورد الفقهي اليومي', {
          body,
          icon: '/icons/icon-192.png',
        });

        safeSet(REMINDER_LAST_NOTIFIED_KEY, today);
      }
    } catch {
      // Ignore background notification check failures
    }
  }, [isSupported, isEnabled, permission, preferredTime, streakDays]);

  return {
    isSupported,
    permission,
    isEnabled,
    preferredTime,
    enableReminder,
    disableReminder,
    setPreferredTime,
    triggerTestReminder,
  };
}
