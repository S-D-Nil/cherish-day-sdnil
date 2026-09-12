import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface Birthday {
  id: string;
  name: string;
  day: string;
  month: string;
  year: string;
  gift_idea?: string | null;
}

export type WebNotificationPermission = NotificationPermission | 'unsupported';

let visibilityTrackerListener: (() => void) | null = null;
let awayNotification: Notification | null = null;
let awayInterval: ReturnType<typeof setInterval> | null = null;
let awayStartTime: Date | null = null;
let isAwayTrackingActive = false;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

// Active web notifications map for clearing on gift submission
const activeWebNotifications = new Map<string, Notification>();

// Deterministic integer ID for Capacitor notifications
export function getNumericNotificationId(id: string): number {
  if (!id) return 10001;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

// Formats the exact notification text: "<date of birth> is birthday of <person’s name>" (e.g. "16/10 is birthday of Rashi")
export function formatBirthdayNotificationText(day: string, month: string, name: string): string {
  const d = day.trim().padStart(2, '0');
  const m = month.trim().padStart(2, '0');
  return `${d}/${m} is birthday of ${name.trim()}`;
}

export const notificationService = {
  isWebSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  isServiceWorkerSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  },

  // Register service worker to display system-level notifications directly in the phone navigation tray
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isServiceWorkerSupported()) {
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      serviceWorkerRegistration = reg;
      console.log('Service Worker registered successfully for phone navigation tray alerts:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('Service Worker registration error (fallback to standard web notification API):', err);
      return null;
    }
  },

  async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (serviceWorkerRegistration) return serviceWorkerRegistration;
    if (!this.isServiceWorkerSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      serviceWorkerRegistration = reg;
      return reg;
    } catch {
      return null;
    }
  },

  getPermission(): WebNotificationPermission {
    if (Capacitor.isNativePlatform()) {
      return 'granted';
    }
    if (!this.isWebSupported()) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  async requestPermissions(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await LocalNotifications.requestPermissions();
        // Set up high-priority channel on Android for tray persistence
        await this.ensureNotificationChannel();
        return permission.display === 'granted';
      } catch (e) {
        console.error('Error requesting native permissions:', e);
        return false;
      }
    }

    if (!this.isWebSupported()) {
      console.warn('Web notifications are not supported in this environment.');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        // Also ensure service worker is active for phone tray notifications
        await this.registerServiceWorker();
      }
      return perm === 'granted';
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return false;
    }
  },

  async ensureNotificationChannel() {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.createChannel({
          id: 'birthday_reminders',
          name: 'Birthday Reminders',
          description: '1-day before birthday alerts with gift note prompt',
          importance: 5,
          visibility: 1,
          vibration: true,
        });
      } catch (err) {
        console.warn('Channel creation error (ignored if already created):', err);
      }
    }
  },

  async requestWebPermissionWithFeedback(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isWebSupported()) {
      return 'unsupported';
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        await this.registerServiceWorker();
      }
      return perm;
    } catch (e) {
      console.error('Permission request error:', e);
      return Notification.permission;
    }
  },

  // Tracks handled status per year so each person triggers only one notification per year
  isNotificationHandledThisYear(birthdayId: string, year = new Date().getFullYear()): boolean {
    try {
      const key = `cherish_handled_birthdays_${year}`;
      const stored = localStorage.getItem(key);
      if (!stored) return false;
      const map = JSON.parse(stored);
      return Boolean(map[birthdayId]);
    } catch (e) {
      console.error('Error checking handled notification status:', e);
      return false;
    }
  },

  markNotificationHandled(birthdayId: string, giftIdea?: string, year = new Date().getFullYear()) {
    try {
      const key = `cherish_handled_birthdays_${year}`;
      const stored = localStorage.getItem(key);
      const map = stored ? JSON.parse(stored) : {};
      map[birthdayId] = {
        handledAt: new Date().toISOString(),
        giftIdea: giftIdea || null,
      };
      localStorage.setItem(key, JSON.stringify(map));
    } catch (e) {
      console.error('Error marking notification handled:', e);
    }
  },

  resetNotificationHandled(birthdayId: string, year = new Date().getFullYear()) {
    try {
      const key = `cherish_handled_birthdays_${year}`;
      const stored = localStorage.getItem(key);
      if (!stored) return;
      const map = JSON.parse(stored);
      delete map[birthdayId];
      localStorage.setItem(key, JSON.stringify(map));
    } catch (e) {
      console.error('Error resetting notification handled status:', e);
    }
  },

  // Calculate notification date (1 day before birthday at 09:00)
  calculate1DayBeforeDate(day: string, month: string, referenceDate = new Date()): { notificationDate: Date; birthdayYear: number } {
    const today = referenceDate;
    const currentYear = today.getFullYear();
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);

    // Target birthday this year
    let targetBirthday = new Date(currentYear, m - 1, d, 9, 0, 0);
    let notifDate = new Date(targetBirthday.getTime() - 24 * 60 * 60 * 1000);
    let targetYear = currentYear;

    // If 1 day before has already passed this year, schedule for next year
    if (notifDate.getTime() <= today.getTime()) {
      targetYear = currentYear + 1;
      targetBirthday = new Date(targetYear, m - 1, d, 9, 0, 0);
      notifDate = new Date(targetBirthday.getTime() - 24 * 60 * 60 * 1000);
    }

    return { notificationDate: notifDate, birthdayYear: targetYear };
  },

  // Sends system-level push notification 1 day before birthday into phone navigation / lock tray
  // Notification text matches exactly: "<date of birth> is birthday of <person's name>"
  async sendBirthday1DayBeforeNotification(
    birthday: Birthday,
    onClick?: () => void
  ): Promise<boolean> {
    const text = formatBirthdayNotificationText(birthday.day, birthday.month, birthday.name);

    // 1. If running as native mobile app via Capacitor (APK / iOS app)
    if (Capacitor.isNativePlatform()) {
      try {
        await this.ensureNotificationChannel();
        const numericId = getNumericNotificationId(birthday.id);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: numericId,
              title: text,
              body: text,
              channelId: 'birthday_reminders',
              schedule: { at: new Date(Date.now() + 500) }, // Trigger immediately in phone navigation tray
              ongoing: true, // Remains in notification tray until user taps
              autoCancel: false,
              extra: {
                birthdayId: birthday.id,
                personName: birthday.name,
                birthDate: `${birthday.day.padStart(2, '0')}/${birthday.month.padStart(2, '0')}`,
                exactText: text,
              },
            },
          ],
        });
        return true;
      } catch (err) {
        console.error('Error triggering native phone navigation notification:', err);
      }
    }

    // 2. If running on Mobile Browser (Chrome/Firefox on Android, Edge, Safari iOS 16.4+)
    // Service Worker registration.showNotification() is the ONLY way to put notifications
    // into the phone's top navigation tray on mobile devices.
    const swReg = await this.getServiceWorkerRegistration();
    if (swReg && 'showNotification' in swReg && Notification.permission === 'granted') {
      try {
        await swReg.showNotification(text, {
          body: text,
          tag: `birthday-reminder-${birthday.id}`,
          icon: '/logo_centered.png',
          badge: '/logo_centered.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          data: {
            birthdayId: birthday.id,
            personName: birthday.name,
            birthDate: `${birthday.day.padStart(2, '0')}/${birthday.month.padStart(2, '0')}`,
            exactText: text,
          },
        });
        return true;
      } catch (swErr) {
        console.warn('Service worker showNotification failed, trying fallback:', swErr);
      }
    }

    // 3. Fallback to standard window.Notification (desktop browsers)
    if (this.isWebSupported() && Notification.permission === 'granted') {
      try {
        const notification = new Notification(text, {
          body: text,
          tag: `birthday-reminder-${birthday.id}`,
          icon: '/logo_centered.png',
          badge: '/logo_centered.png',
          requireInteraction: true,
          data: {
            birthdayId: birthday.id,
            personName: birthday.name,
            birthDate: `${birthday.day.padStart(2, '0')}/${birthday.month.padStart(2, '0')}`,
            exactText: text,
          },
        });

        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          if (onClick) {
            onClick();
          }
        };

        activeWebNotifications.set(birthday.id, notification);
        return true;
      } catch (err) {
        console.error('Error creating Notification API alert:', err);
      }
    }

    return false;
  },

  // Clear and dismiss notification from mobile tray and web
  async clearNotificationForBirthday(birthdayId: string) {
    // 1. Close web notification if active in browser window
    const webNotif = activeWebNotifications.get(birthdayId);
    if (webNotif) {
      try {
        webNotif.close();
      } catch (err) {
        console.error('Error closing web notification:', err);
      }
      activeWebNotifications.delete(birthdayId);
    }

    // 2. Clear from Service Worker notifications tray (phone notification center)
    const swReg = await this.getServiceWorkerRegistration();
    if (swReg && 'getNotifications' in swReg) {
      try {
        const notifs = await swReg.getNotifications({ tag: `birthday-reminder-${birthdayId}` });
        notifs.forEach((n) => n.close());
      } catch (err) {
        console.error('Error closing service worker notification:', err);
      }
    }

    // 3. Clear native notification from phone tray
    if (Capacitor.isNativePlatform()) {
      try {
        const numericId = getNumericNotificationId(birthdayId);
        await LocalNotifications.cancel({
          notifications: [{ id: numericId }, { id: numericId + 100000 }],
        });
        await LocalNotifications.removeDeliveredNotifications({
          notifications: [{ id: numericId }, { id: numericId + 100000 }],
        });
      } catch (e) {
        console.error('Error clearing native notification:', e);
      }
    }
  },

  // Standard web notification dispatcher
  async sendWebNotification(
    title: string,
    options?: NotificationOptions & { onClick?: () => void }
  ): Promise<boolean> {
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission is not granted (current state:', Notification.permission, ')');
      return false;
    }

    // Try service worker first for mobile phone navigation tray
    const swReg = await this.getServiceWorkerRegistration();
    if (swReg && 'showNotification' in swReg) {
      try {
        const { onClick: _onClick, ...notifOptions } = options || {};
        await swReg.showNotification(title, {
          icon: '/logo_centered.png',
          badge: '/logo_centered.png',
          vibrate: [200, 100, 200],
          ...notifOptions,
        });
        return true;
      } catch (e) {
        console.warn('Service worker showNotification failed:', e);
      }
    }

    // Desktop fallback
    if (this.isWebSupported()) {
      try {
        const { onClick, ...notifOptions } = options || {};
        const notification = new Notification(title, {
          icon: '/logo_centered.png',
          badge: '/logo_centered.png',
          ...notifOptions,
        });

        if (onClick) {
          notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            onClick();
            notification.close();
          };
        } else {
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
        return true;
      } catch (err) {
        console.error('Failed to create notification:', err);
      }
    }

    return false;
  },

  startVisibilityTracker(callbacks?: {
    onTick?: (diffSeconds: number) => void;
    onStateChange?: (state: 'hidden' | 'visible') => void;
  }): boolean {
    if (!this.isWebSupported()) {
      return false;
    }

    if (isAwayTrackingActive) {
      this.stopVisibilityTracker();
    }

    isAwayTrackingActive = true;

    visibilityTrackerListener = () => {
      if (document.visibilityState === 'hidden') {
        if (callbacks?.onStateChange) callbacks.onStateChange('hidden');
        awayStartTime = new Date();

        if (awayInterval) clearInterval(awayInterval);

        awayInterval = setInterval(async () => {
          if (!awayStartTime) return;
          const diff = Math.round((new Date().getTime() - awayStartTime.getTime()) / 1000);
          if (callbacks?.onTick) callbacks.onTick(diff);

          if (Notification.permission === 'granted') {
            try {
              const swReg = await notificationService.getServiceWorkerRegistration();
              if (swReg && 'showNotification' in swReg) {
                await swReg.showNotification('Come back please', {
                  body: `You have been gone for ${diff} seconds`,
                  tag: 'come back',
                  icon: '/logo_centered.png',
                  data: { awaySince: awayStartTime?.toISOString(), diffSeconds: diff },
                });
              } else {
                awayNotification = new Notification('Come back please', {
                  body: `You have been gone for ${diff} seconds`,
                  tag: 'come back',
                  icon: '/logo_centered.png',
                  data: { awaySince: awayStartTime?.toISOString(), diffSeconds: diff },
                });
              }
            } catch (err) {
              console.error('Error updating away notification:', err);
            }
          }
        }, 1000);
      } else {
        if (callbacks?.onStateChange) callbacks.onStateChange('visible');
        if (awayInterval) {
          clearInterval(awayInterval);
          awayInterval = null;
        }
        if (awayNotification) {
          try {
            awayNotification.close();
          } catch {
            // ignore
          }
          awayNotification = null;
        }
        // Also clear any SW notification
        notificationService.getServiceWorkerRegistration().then((reg) => {
          if (reg && 'getNotifications' in reg) {
            reg.getNotifications({ tag: 'come back' }).then((notifs) => notifs.forEach((n) => n.close()));
          }
        });
        if (callbacks?.onTick) callbacks.onTick(0);
      }
    };

    document.addEventListener('visibilitychange', visibilityTrackerListener);
    return true;
  },

  stopVisibilityTracker() {
    isAwayTrackingActive = false;
    if (visibilityTrackerListener) {
      document.removeEventListener('visibilitychange', visibilityTrackerListener);
      visibilityTrackerListener = null;
    }
    if (awayInterval) {
      clearInterval(awayInterval);
      awayInterval = null;
    }
    if (awayNotification) {
      try {
        awayNotification.close();
      } catch {
        // ignore
      }
      awayNotification = null;
    }
    awayStartTime = null;
  },

  isVisibilityTrackingActive(): boolean {
    return isAwayTrackingActive;
  },

  // Schedules yearly notification 1 day before birthday
  // Exact notification text: "<date of birth> is birthday of <person’s name>"
  async scheduleYearlyBirthdayNotification(birthday: Birthday) {
    const exactText = formatBirthdayNotificationText(birthday.day, birthday.month, birthday.name);
    const { notificationDate } = this.calculate1DayBeforeDate(birthday.day, birthday.month);

    if (Capacitor.isNativePlatform()) {
      const notificationId = getNumericNotificationId(birthday.id);

      await this.ensureNotificationChannel();

      // Schedule for 1 day before birthday, repeating yearly in phone notification tray
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: exactText,
            body: exactText,
            channelId: 'birthday_reminders',
            schedule: {
              at: notificationDate,
              repeats: true,
              every: 'year',
              allowWhileIdle: true,
            },
            // Persistent / special behavior: ongoing in tray so user is guided to tap it
            ongoing: true,
            autoCancel: false,
            extra: {
              birthdayId: birthday.id,
              personName: birthday.name,
              birthDate: `${birthday.day.padStart(2, '0')}/${birthday.month.padStart(2, '0')}`,
              exactText,
            },
          },
        ],
      });
    }
  },

  async cancelBirthdayNotification(birthdayId: string) {
    await this.clearNotificationForBirthday(birthdayId);
    if (Capacitor.isNativePlatform()) {
      const notificationId = getNumericNotificationId(birthdayId);
      await LocalNotifications.cancel({
        notifications: [
          { id: notificationId },
          { id: notificationId + 100000 },
        ],
      });
    }
  },

  async rescheduleAllNotifications(birthdays: Birthday[]) {
    if (Capacitor.isNativePlatform()) {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      for (const birthday of birthdays) {
        await this.scheduleYearlyBirthdayNotification(birthday);
      }
    }
  },

  setupNotificationListener(onGiftPrompt: (notificationData: Record<string, unknown>) => void) {
    // 1. Capacitor native notification click listener
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        onGiftPrompt(notification.notification.extra as Record<string, unknown>);
      });
    }

    // 2. Service worker notification click listener (from phone navigation tray)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
          onGiftPrompt(event.data.data as Record<string, unknown>);
        }
      });
    }
  },
};
