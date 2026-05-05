import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import { getConfig, clearConfig } from './src/services/storage';

type RootStackParamList = {
  Login: undefined;
  Timeline: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    (async () => {
      const config = await getConfig();
      setInitialRoute(config ? 'Timeline' : 'Login');
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2D5A4A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login">
          {({ navigation }) => (
            <LoginScreen onLoginSuccess={() => navigation.replace('Timeline')} />
          )}
        </Stack.Screen>
        <Stack.Screen name="Timeline">
          {({ navigation }) => (
            <TimelineScreen
              onLogout={async () => {
                await clearConfig();
                navigation.replace('Login');
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
