module.exports = {
  presets: ['@react-native/babel-preset'], // ✅ CAMBIO PRINCIPAL: preset correcto
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        blocklist: null,
        allowlist: null,
        safe: false,
        allowUndefined: true,
      },
    ],
    // 👇 Plugins necesarios para Flow / TypeScript interop
    '@babel/plugin-syntax-flow',
    '@babel/plugin-transform-flow-strip-types',
  ],
};