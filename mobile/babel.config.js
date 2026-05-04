module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@thesis-tracker/shared': '../shared/src',
        },
      },
    ],
  ],
};
