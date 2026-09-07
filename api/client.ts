import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Android-эмулятор: 10.0.2.2 указывает на localhost хостовой машины.
// Для физического устройства укажите IP компьютера в локальной сети, например 'http://192.168.1.50:3000/api'.
export const API_URL = 'http://10.0.2.2:3000/api';

export const api = axios.create({ baseURL: API_URL });

const SERVER_ORIGIN = API_URL.replace(/\/api\/?$/, '');
export const fileUrl = (u: string) => new URL(u, SERVER_ORIGIN).href;

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export async function saveTokens(access: string, refresh: string) {
    await AsyncStorage.multiSet([[ACCESS_KEY, access], [REFRESH_KEY, refresh]]);
}

export async function clearTokens() {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}

export async function getAccessToken() {
    return AsyncStorage.getItem(ACCESS_KEY);
}

api.interceptors.request.use(async config => {
    const token = await getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let refreshing: Promise<void> | null = null;

api.interceptors.response.use(
    response => response,
    async error => {
        const original = error.config;
        if (error.response?.status !== 401 || original._retried) {
            return Promise.reject(error);
        }

        const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
        if (!refreshToken) {
            await clearTokens();
            return Promise.reject(error);
        }

        original._retried = true;
        try {
            refreshing ??= axios
                .post(`${API_URL}/auth/refresh`, { refreshToken })
                .then(res => saveTokens(res.data.accessToken, res.data.refreshToken))
                .finally(() => { refreshing = null; });

            await refreshing;
            return api(original);
        } catch {
            await clearTokens();
            return Promise.reject(error);
        }
    },
);