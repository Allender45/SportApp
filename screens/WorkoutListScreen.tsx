import React, {useState, useCallback, useRef} from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, PanResponder
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

type Props = {
    navigation: NativeStackNavigationProp<any>;
    route: RouteProp<any>;
};

// Группа упражнений = одна тренировка
type WorkoutGroup = {
    workoutGroup: number;
    total: number;
    done: number;
};

export default function WorkoutListScreen({ navigation, route }: Props) {
    const { athleteId } = route.params as { athleteId: string };
    const [groups, setGroups] = useState<WorkoutGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const groupsRef = useRef<WorkoutGroup[]>([]);

    const swipePan = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) =>
                Math.abs(gs.dx) > Math.abs(gs.dy) * 2 && Math.abs(gs.dx) > 30,
            onPanResponderRelease: (_, gs) => {
                if (gs.dx > 80) {
                    const next = groupsRef.current.find(g => g.done < g.total);
                    if (next) {
                        navigation.navigate('WorkoutDetail', {
                            workoutGroup: next.workoutGroup,
                            athleteId,
                        });
                    }
                }
            },
        })
    ).current;

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            const fetchExercises = async () => {
                try {
                    const q = query(
                        collection(db, 'exercises'),
                        where('athleteId', '==', athleteId)
                    );
                    const snapshot = await getDocs(q);

                    const groupMap: Record<number, WorkoutGroup> = {};
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        const g = data.workoutGroup as number;
                        if (!groupMap[g]) groupMap[g] = { workoutGroup: g, total: 0, done: 0 };
                        groupMap[g].total++;
                        if (data.status === true) groupMap[g].done++;
                    });

                    const sorted = Object.values(groupMap).sort((a, b) => a.workoutGroup - b.workoutGroup);
                    groupsRef.current = sorted;
                    setGroups(sorted);
                } catch (error) {
                    console.error('Ошибка загрузки:', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchExercises();
        }, [athleteId])
    );

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#2196F3" />
        </View>
    );

    if (groups.length === 0) return (
        <View style={styles.center}>
            <Text style={styles.emptyText}>Тренировок пока нет</Text>
        </View>
    );

    return (
        <View style={{ flex: 1 }} {...swipePan.panHandlers}>
            <FlatList
                style={styles.list}
                contentContainerStyle={styles.listContent}
                data={groups}
                keyExtractor={item => String(item.workoutGroup)}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => navigation.navigate('WorkoutDetail', {
                            workoutGroup: item.workoutGroup,
                            athleteId,
                        })}
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
                            <Text style={styles.cardTitle}>ТРЕНИРОВКА #{item.workoutGroup}</Text>
                            <Text style={styles.cardProgress}>{item.done} / {item.total} выполнено</Text>
                        </View>
                        <Text style={[styles.cardPercent, item.done === item.total && item.total > 0 && styles.cardPercentDone]}>
                            {item.total > 0 ? Math.round((item.done / item.total) * 100) : 0}%
                        </Text>
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
});