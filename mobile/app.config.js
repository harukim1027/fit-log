const IS_DEV = process.env.APP_ENV === 'development';

module.exports = ({ config }) => ({
  ...config,
  name: IS_DEV ? 'Harulog (Dev)' : 'Harulog',
  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEV ? 'com.harulog.app.dev' : 'com.harulog.app',
  },
  android: {
    ...config.android,
    package: IS_DEV ? 'com.harulog.app.dev' : 'com.harulog.app',
  },
});
