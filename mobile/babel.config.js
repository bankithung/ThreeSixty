module.exports = {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
        'react-native-reanimated/plugin',
        'react-native-worklets-core/plugin',
        [
            'module-resolver',
            {
                root: ['./src'],
                extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
                alias: {
                    '@': './src',
                    '@components': './src/components',
                    '@screens': './src/screens',
                    '@navigation': './src/navigation',
                    '@api': './src/api',
                    '@store': './src/store',
                    '@hooks': './src/hooks',
                    '@utils': './src/utils',
                    '@constants': './src/constants',
                    '@types': './src/types',
                },
            },
        ],
    ],
};
