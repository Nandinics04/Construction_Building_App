const appJson = require('./app.json');

module.exports = () => {
  const app = appJson.expo;
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  return {
    ...app,
    ios: {
      ...app.ios,
      config: {
        ...app.ios?.config,
        googleMapsApiKey: mapsKey,
      },
    },
    android: {
      ...app.android,
      config: {
        ...app.android?.config,
        googleMaps: {
          apiKey: mapsKey,
        },
      },
    },
    plugins: (app.plugins ?? []).map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === 'react-native-maps') {
        return [
          'react-native-maps',
          {
            iosGoogleMapsApiKey: mapsKey,
            androidGoogleMapsApiKey: mapsKey,
          },
        ];
      }
      return plugin;
    }),
  };
};
