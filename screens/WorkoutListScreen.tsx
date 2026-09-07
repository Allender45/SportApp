import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, PanResponder,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { api } from '../api/client';
import type { WorkoutSummary } from '../api/types';

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function WorkoutListScreen({ navigation }: Props) {
    const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const workoutsRef = useRef<WorkoutSummary[]>([]);

    const swipePan = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) =>
                Math.abs(gs.dx) > Math.abs(gs.dy) * 2 && Math.abs(gs.dx) > 30,
            onPanResponderRelease: (_, gs) => {
                if (gs.dx > 80) {
                    const next = workoutsRef.current.find(w => w.done < w.total);
                    if (next) {
                        navigation.navigate('WorkoutDetail', { workoutId: next.id });
                    }
                }
            },
        })
    ).current;

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            api.get<WorkoutSummary[]>('/my/workouts')
                .then(res => {
                    workoutsRef.current = res.data;
                    setWorkouts(res.data);
                })
                .catch(error => console.error('Ошибка загрузки:', error))
                .finally(() => setLoading(false));
        }, [])
    );

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#2196F3" />
        </View>
    );

    if (workouts.length === 0) return (
        <View style={styles.center}>
            <Text style={styles.emptyText}>Тренировок пока нет</Text>
        </View>
    );

    return (
        <View style={{ flex: 1 }} {...swipePan.panHandlers}>
            <FlatList
                style={styles.list}
                contentContainerStyle={styles.listContent}
                data={workouts}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
                        activeOpacity={0.8}
                    >
                        {item.done === item.total && item.total > 0 && (
                            <LinearGradient
                                colors={['rgba(111,191,111,0.20)', 'rgba(111,191,111,0.00)']}
                                start={{x: 0, y: 0}} end={{x: 0.3, y: 0}}
                                style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
                            />
                        )}
                        <View>
                            <Text style={styles.cardTitle}>
                                ТРЕНИРОВКА #{item.number}{item.title ? ` — ${item.title}` : ''}
                            </Text>
                            <Text style={styles.cardProgress}>{item.done} / {item.total} выполнено</Text>
                        </View>
                        <Text style={[styles.cardPercent, item.done === item.total && item.total > 0 && styles.cardPercentDone]}>
                            {item.total > 0 ? Math.round((item.done / item.total) * 100) : 0}%
                        </Text>
                        {item.latestDate && (
                            <Text style={styles.cardDate}>{new Date(item.latestDate).toLocaleDateString('ru-RU')}</Text>
                        )}
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText:     { fontSize: 16, color: '#8F959E' },
    list:          { flex: 1 },
    listContent:   { padding: 16, paddingBottom: 32 },

    card:          { backgroundColor: 'rgba(30, 33, 38, 0.97)', borderWidth: 1, borderColor: '#3A3F47', borderRadius: 14, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
    cardTitle:     { fontSize: 15, fontWeight: '700', color: '#EFF2F5', marginBottom: 4 },
    cardProgress:  { fontSize: 13, color: '#A6ADB8' },
    cardPercent:   { fontSize: 22, fontWeight: 'bold', color: '#3A3F47' },
    cardPercentDone: { color: '#6FBF6F' },
    cardDate: { fontSize: 11, color: '#8F959E', marginTop: 2, textAlign: 'right' },
});