module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT || 'production';
  if (!['development', 'preview', 'production'].includes(variant)) {
    throw new Error('APP_VARIANT must be development, preview, or production.');
  }
  const suffix = variant === 'production' ? '' : `.${variant}`;
  return {
    ...config,
    name: variant === 'production' ? config.name : `${config.name} (${variant})`,
    ios: { ...config.ios, bundleIdentifier: `${config.ios.bundleIdentifier}${suffix}` },
    android: { ...config.android, package: `${config.android.package}${suffix}` },
  };
};
