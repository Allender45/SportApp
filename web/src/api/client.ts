import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
});

// --- хранение токенов ---
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export function saveTokens(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken() {
    return localStorage.getItem(ACCESS_KEY);
}

// --- подписываем каждый запрос access-токеном ---
api.interceptors.request.use(config => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// --- при 401 пробуем обновить токен и повторить запрос ---
let refreshing: Promise<void> | null = null;

api.interceptors.response.use(
    response => response,
    async error => {
        const original = error.config;
        if (error.response?.status !== 401 || original._retried) {
            return Promise.reject(error);
        }

        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (!refreshToken) {
            clearTokens();
            return Promise.reject(error);
        }

        original._retried = true;
        try {
            // Если refresh уже идёт (несколько запросов упали одновременно) — ждём его
            refreshing ??= axios
                .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
                .then(res => saveTokens(res.data.accessToken, res.data.refreshToken))
                .finally(() => { refreshing = null; });

            await refreshing;
            return api(original); // повторяем исходный запрос с новым токеном
        } catch {
            clearTokens();
            window.location.href = '/login';
            return Promise.reject(error);
        }
    },
);