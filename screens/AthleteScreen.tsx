import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

async function navigateToNextWorkout(
    navigation: NativeStackNavigationProp<any>,
    athleteId: string
) {
    try {
        const snapshot = await getDocs(
            query(collection(db, 'exercises'), where('athleteId', '==', athleteId))
        );

        const groupMap: Record<number, { total: number; done: number }> = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const g = data.workoutGroup as number;
            if (!groupMap[g]) groupMap[g] = { total: 0, done: 0 };
            groupMap[g].total++;
            if (data.status === true) groupMap[g].done++;
        });

        const sorted = Object.entries(groupMap)
            .map(([g, v]) => ({ workoutGroup: Number(g), ...v }))
            .sort((a, b) => a.workoutGroup - b.workoutGroup);

        const next = sorted.find(g => g.done < g.total);

        if (next) {
            navigation.replace('WorkoutDetail', { workoutGroup: next.workoutGroup, athleteId });
        } else {
            navigation.replace('WorkoutList', { athleteId });
        }
    } catch {
        navigation.replace('WorkoutList', { athleteId });
    }
}

export default function AthleteScreen({ navigation }: Props) {
    const [athleteId, setAthleteId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem('athleteId').then(id => {
            if (id) {
                navigateToNextWorkout(navigation, id);
            } else {
                setLoading(false);
            }
        });
    }, [navigation]);

    const handleLogin = async () => {
        const id = athleteId.trim();
        if (!id) return;
        setLoading(true);
        AsyncStorage.setItem('athleteId', id);
        await navigateToNextWorkout(navigation, id);
    };

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#8F959E" />
        </View>
    );

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                value={athleteId}
                onChangeText={setAthleteId}
                placeholder="кто ты?"
                placeholderTextColor="#555"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Войти</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container:  { flex: 1, padding: 24, justifyContent: 'center' },
    input:      { backgroundColor: 'rgba(30,33,38,0.97)', borderWidth: 1, borderColor: '#3A3F47', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 16, color: '#EFF2F5' },
    button:     { backgroundColor: '#3A6B3A', borderRadius: 8, padding: 16, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});