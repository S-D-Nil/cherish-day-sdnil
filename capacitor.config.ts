import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sdnil.cherishday',
  appName: 'Cherish Day',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#5361FF",
      sound: "beep.wav",
    },
  },
};

export default config;