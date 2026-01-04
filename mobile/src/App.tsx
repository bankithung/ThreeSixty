/**
 * ThreeSixty Mobile App Entry Point
 */

import React from 'react';
import { StatusBar, LogBox } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import store from './store';
import { RootNavigator } from './navigation';
import { colors } from './constants/colors';

// Ignore some warnings in development
LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
]);

const App: React.FC = () => {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Provider store={store}>
                <SafeAreaProvider>
                    <StatusBar
                        barStyle="dark-content"
                        backgroundColor={colors.background}
                    />
                    <RootNavigator />
                </SafeAreaProvider>
            </Provider>
        </GestureHandlerRootView>
    );
};

export default App;
