import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AxiosError } from 'axios';
import { api, saveTokens, getAccessToken } from '../api/client';

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function AthleteScreen({ navigation }: Props) {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        getAccessToken().then(token => {
            if (token) {
                navigation.replace('WorkoutList');
            } else {
                setChecking(false);
            }
        });
    }, [navigation]);

    const handleLogin = async () => {
        if (!phone.trim() || !password) return;
        setError('');
        setSubmitting(true);
        try {
            const res = await api.post('/auth/login', { phone: phone.trim(), password });
            await saveTokens(res.data.accessToken, res.data.refreshToken);
            navigation.replace('WorkoutList');
        } catch (err) {
            const axiosErr = err as AxiosError<{ error?: string }>;
            setError(axiosErr.response?.data?.error ?? 'Не удалось войти. Проверь соединение.');
        } finally {
            setSubmitting(false);
        }
    };

    if (checking) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#8F959E" />
        </View>
    );

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Телефон"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
            />
            <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Пароль"
                placeholderTextColor="#555"
                secureTextEntry
                onSubmitEditing={handleLogin}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={submitting}>
                <Text style={styles.buttonText}>{submitting ? 'Вход...' : 'Войти'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container:  { flex: 1, padding: 24, justifyContent: 'center' },
    input:      { backgroundColor: 'rgba(30,33,38,0.97)', borderWidth: 1, borderColor: '#3A3F47', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 16, color: '#EFF2F5' },
    error:      { color: '#BF5050', fontSize: 13, marginBottom: 12, textAlign: 'center' },
    button:     { backgroundColor: '#3A6B3A', borderRadius: 8, padding: 16, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});