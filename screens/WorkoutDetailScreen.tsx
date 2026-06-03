import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, StyleSheet, ActivityIndicator, Alert, Modal, PanResponder
} from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import LinearGradient from "react-native-linear-gradient";
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
    route: RouteProp<any>;
};

type Exercise = {
    id: string;
    exercise: string;
    weight: number;
    sets: number;
    reps: number;
    trainerNote: string;
    status: boolean;
    date: string;
    athleteComment: string;
    order?: number;
};

export default function WorkoutDetailScreen({ route }: Props) {
    const { workoutGroup, athleteId } = route.params as { workoutGroup: number; athleteId: string };

    const [exercises, setExercises]       = useState<Exercise[]>([]);
    const [loading, setLoading]           = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [modalComment, setModalComment] = useState('');
    const [seconds, setSeconds]   = useState(0);
    const [running, setRunning]   = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    const swipePan = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) =>
                Math.abs(gs.dx) > Math.abs(gs.dy) * 2 && Math.abs(gs.dx) > 30,
            onPanResponderRelease: (_, gs) => {
                if (gs.dx < -80) {
                    navigation.navigate('WorkoutList', { athleteId });
                }
            },
        })
    ).current;

    const startStop = () => {
        if (running) {
            if (timerRef.current) clearInterval(timerRef.current);
            setRunning(false);
        } else {
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
            setRunning(true);
        }
    };

    const resetTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setRunning(false);
        setSeconds(0);
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };

    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    useEffect(() => {
        const fetchExercises = async () => {
            try {
                const q = query(
                    collection(db, 'exercises'),
                    where('athleteId', '==', athleteId),
                    where('workoutGroup', '==', workoutGroup)
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                })) as Exercise[];
                data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                setExercises(data);
            } catch (error) {
                console.error('Ошибка загрузки:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchExercises();
    }, [athleteId, workoutGroup]);

    const openModal = (index: number) => {
        setSelectedIndex(index);
        setModalComment(exercises[index].athleteComment || '');
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedIndex(null);
    };

    // Сохраняем результат и закрываем модалку
    const saveResult = async (done: boolean) => {
        if (selectedIndex === null) return;
        const ex      = exercises[selectedIndex];
        const newDate = new Date().toLocaleDateString('ru-RU'); // всегда

        const updated = [...exercises];
        updated[selectedIndex] = { ...ex, status: done, date: newDate, athleteComment: modalComment };
        setExercises(updated);
        closeModal();

        try {
            await updateDoc(doc(db, 'exercises', ex.id), {
                status:         done,
                date:           newDate,
                athleteComment: modalComment,
            });
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось сохранить');
        }
    };

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#8F959E" />
        </View>
    );

    const selectedEx = selectedIndex !== null ? exercises[selectedIndex] : null;

    return (
        <View style={styles.screen} {...swipePan.panHandlers}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.title}>ТРЕНИРОВКА #{workoutGroup}</Text>

                {exercises.map((ex, index) => (
                    <TouchableOpacity
                        key={ex.id}
                        style={styles.card}
                        onPress={() => openModal(index)}
                        activeOpacity={0.8}
                    >
                        {/* Градиент статуса — зелёный если выполнено, красный если нет */}
                        {ex.status && (
                            <LinearGradient
                                colors={['rgba(111,191,111,0.20)', 'rgba(111,191,111,0.00)']}
                                start={{x: 0, y: 0}} end={{x: 0.3, y: 0}}
                                style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
                            />
                        )}
                        {!ex.status && ex.date !== '' && (
                            <LinearGradient
                                colors={['rgba(191,80,80,0.20)', 'rgba(191,80,80,0.00)']}
                                start={{x: 0, y: 0}} end={{x: 0.3, y: 0}}
                                style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
                            />
                        )}
                        <View style={styles.cardInfo}>
                            <Text style={styles.exName}>{ex.exercise.toUpperCase()}</Text>
                            <View style={styles.setsRow}>
                                <View style={styles.setsBadge}>
                                    <Text style={styles.setsBadgeText}>{ex.sets} подходов</Text>
                                </View>
                                <Text style={styles.repsText}>  ×  {ex.reps} повторений</Text>
                            </View>
                            {ex.weight > 0 && (
                                <Text style={styles.weightText}>{ex.weight} кг</Text>
                            )}
                            {ex.trainerNote ? (
                                <Text style={styles.trainerNote}>📋 {ex.trainerNote}</Text>
                            ) : null}
                            {ex.athleteComment ? (
                                <Text style={styles.commentPreview}>📝 {ex.athleteComment.substring(0, 35)}</Text>
                            ) : null}
                        </View>
                    </TouchableOpacity>
                ))}

                <Modal
                    visible={modalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={closeModal}
                >
                    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeModal}>
                        <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {}}>
                            {selectedEx && (
                                <>
                                    <Text style={styles.modalExName}>
                                        {selectedEx.exercise.toUpperCase()}
                                    </Text>

                                    <TouchableOpacity style={styles.btnComplete} onPress={() => saveResult(true)}>
                                        <Text style={styles.btnText}>ВЫПОЛНЕНО</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.btnFail} onPress={() => saveResult(false)}>
                                        <Text style={styles.btnText}>НЕ ВЫПОЛНЕНО</Text>
                                    </TouchableOpacity>

                                    <TextInput
                                        style={styles.commentInput}
                                        placeholder="КОММЕНТАРИЙ (вес, ощущения)..."
                                        placeholderTextColor="#555"
                                        value={modalComment}
                                        onChangeText={setModalComment}
                                        multiline
                                        numberOfLines={2}
                                    />
                                </>
                            )}
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>
            </ScrollView>

            {/* Футер с секундомером */}
            <View style={styles.footer}>
                <Text style={styles.timerDisplay}>{formatTime(seconds)}</Text>
                <View style={styles.timerButtons}>
                    <TouchableOpacity
                        style={[styles.timerBtn, running ? styles.timerBtnStop : styles.timerBtnStart]}
                        onPress={startStop}
                    >
                        <Text style={styles.timerBtnText}>{running ? '⏸' : '▶'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.timerBtnReset} onPress={resetTimer}>
                        <Text style={styles.timerBtnText}>↺</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container:       { flex: 1 },
    content:         { padding: 16, paddingBottom: 32 },
    title:           { fontSize: 16, fontWeight: 'bold', color: '#8F959E', marginBottom: 16, letterSpacing: 1 },

    card:            { backgroundColor: 'rgba(30, 33, 38, 0.97)', borderWidth: 1, borderColor: '#3A3F47', borderRadius: 14, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
    cardInfo:        { flex: 1 },
    exName:          { fontSize: 15, fontWeight: '700', color: '#EFF2F5', marginBottom: 8 },
    setsRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    setsBadge:       { backgroundColor: 'rgba(143,149,158,0.2)', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20 },
    setsBadgeText:   { color: '#EFF2F5', fontWeight: '700', fontSize: 13 },
    repsText:        { color: '#BDC4CE', fontSize: 13 },
    weightText:      { color: '#A6ADB8', fontSize: 12, marginTop: 2 },
    trainerNote:     { color: '#A6ADB8', fontSize: 12, marginTop: 4 },
    commentPreview:  { color: '#929BA6', fontSize: 11, marginTop: 6, fontStyle: 'italic' },
    statusIcon:      { fontSize: 22, color: '#3A3F47', marginLeft: 12, fontWeight: 'bold' },
    statusDone:      { color: '#6FBF6F' },

    overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
    modalContent:    { backgroundColor: '#14171C', borderWidth: 1, borderColor: '#4A505B', borderRadius: 16, width: '85%', padding: 24 },
    modalExName:     { color: '#B2B9C2', borderBottomWidth: 1, borderBottomColor: '#2A2F37', paddingBottom: 12, marginBottom: 20, fontWeight: '600', fontSize: 17, textAlign: 'center' },
    btnComplete:     { backgroundColor: '#3A6B3A', borderRadius: 5, padding: 14, alignItems: 'center', marginBottom: 12 },
    btnFail:         { backgroundColor: '#7A2A2A', borderRadius: 5, padding: 14, alignItems: 'center', marginBottom: 16 },
    btnText:         { color: '#fff', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },
    commentInput:    { backgroundColor: '#0B0D10', borderWidth: 1, borderColor: '#404754', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, minHeight: 60 },
    screen:          { flex: 1 },
    footer:          { backgroundColor: 'rgba(20, 23, 28, 0.97)', borderTopWidth: 1, borderTopColor: '#3A3F47', paddingVertical: 12, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    timerDisplay:    { fontSize: 32, fontWeight: 'bold', color: '#EFF2F5', letterSpacing: 2, fontVariant: ['tabular-nums'] },
    timerButtons:    { flexDirection: 'row', gap: 12 },
    timerBtn:        { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    timerBtnStart:   { backgroundColor: '#3A6B3A' },
    timerBtnStop:    { backgroundColor: '#7A6B2A' },
    timerBtnReset:   { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A2F37', borderWidth: 1, borderColor: '#3A3F47' },
    timerBtnText:    { fontSize: 20, color: '#EFF2F5' },
});