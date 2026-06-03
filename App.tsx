import React from 'react';
import { ImageBackground, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AthleteScreen from './screens/AthleteScreen';
import WorkoutListScreen from './screens/WorkoutListScreen';
import WorkoutDetailScreen from './screens/WorkoutDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <SafeAreaProvider>
            <ImageBackground
                source={require('./images/main_bg.png')}
                style={styles.background}
                resizeMode="cover"
            >
                <NavigationContainer>
                    <Stack.Navigator
                        screenOptions={{
                            headerShown: false,
                            headerStyle: { backgroundColor: '#2196F3' },
                            headerTintColor: '#fff',
                            headerTitleStyle: { fontWeight: 'bold' },
                            contentStyle: { backgroundColor: 'transparent', paddingTop: StatusBar.currentHeight ?? 0 },
                        }}
                    >
                        <Stack.Screen name="Athlete" component={AthleteScreen} options={{ title: 'Вход' }} />
                        <Stack.Screen name="WorkoutList" component={WorkoutListScreen} options={{ title: 'Тренировки' }} />
                        <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ title: 'Тренировка' }} />
                    </Stack.Navigator>
                </NavigationContainer>
            </ImageBackground>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
});