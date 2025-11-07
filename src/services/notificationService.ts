import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface Birthday {
  id: string;
  name: string;
  day: string;
  month: string;
  year: string;
}

export const notificationService = {
  async requestPermissions() {
    if (!Capacitor.isNativePlatform()) {
      console.log('Notifications only work on native platforms');
      return false;
    }

    const permission = await LocalNotifications.requestPermissions();
    return permission.display === 'granted';
  },

  async scheduleYearlyBirthdayNotification(birthday: Birthday) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const notificationId = parseInt(birthday.id.replace(/\D/g, '').substring(0, 9));
    
    // Calculate the date one day before birthday
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Create date for this year's birthday
    let notificationDate = new Date(
      currentYear,
      parseInt(birthday.month) - 1,
      parseInt(birthday.day) - 1, // One day before
      9, // 9 AM
      0,
      0
    );

    // If the notification date has passed, schedule for next year
    if (notificationDate < today) {
      notificationDate = new Date(
        currentYear + 1,
        parseInt(birthday.month) - 1,
        parseInt(birthday.day) - 1,
        9,
        0,
        0
      );
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: '🎂 Birthday Reminder',
          body: `${birthday.day}/${birthday.month} is birthday of ${birthday.name}`,
          schedule: {
            at: notificationDate,
            allowWhileIdle: true,
          },
          ongoing: true,
          autoCancel: false,
          extra: {
            birthdayId: birthday.id,
            personName: birthday.name,
            birthDate: `${birthday.day}/${birthday.month}`,
          },
        },
      ],
    });

    // Schedule for next year as well
    const nextYearDate = new Date(notificationDate);
    nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId + 100000,
          title: '🎂 Birthday Reminder',
          body: `${birthday.day}/${birthday.month} is birthday of ${birthday.name}`,
          schedule: {
            at: nextYearDate,
            allowWhileIdle: true,
          },
          ongoing: true,
          autoCancel: false,
          extra: {
            birthdayId: birthday.id,
            personName: birthday.name,
            birthDate: `${birthday.day}/${birthday.month}`,
          },
        },
      ],
    });
  },

  async cancelBirthdayNotification(birthdayId: string) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const notificationId = parseInt(birthdayId.replace(/\D/g, '').substring(0, 9));
    
    await LocalNotifications.cancel({
      notifications: [
        { id: notificationId },
        { id: notificationId + 100000 }
      ],
    });
  },

  async rescheduleAllNotifications(birthdays: Birthday[]) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Cancel all existing notifications
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    // Schedule notifications for all birthdays
    for (const birthday of birthdays) {
      await this.scheduleYearlyBirthdayNotification(birthday);
    }
  },

  setupNotificationListener(onGiftPrompt: (notificationData: any) => void) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      onGiftPrompt(notification.notification.extra);
    });
  },
};
