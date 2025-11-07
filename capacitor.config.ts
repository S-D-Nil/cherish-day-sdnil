import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.59bda040c0474288adcaee093c01b889',
  appName: 'Cherish Day',
  webDir: 'dist',
  server: {
    url: 'https://59bda040-c047-4288-adca-ee093c01b889.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#5361FF",
      sound: "beep.wav",
    },
  },
};

export default config;
