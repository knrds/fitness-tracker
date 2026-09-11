module.exports = function (api) {
  const isTest = api.env('test');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...(isTest ? ['@babel/plugin-transform-dynamic-import'] : []),
      'react-native-reanimated/plugin',
    ],
  };
};
