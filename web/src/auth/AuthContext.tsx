import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, saveTokens, clearTokens, getAccessToken } from '../api/client';
import { AuthCore } from './authCore.ts';
import type { User } from './authCore.ts';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(() => !!getAccessToken());

    useEffect(() => {
        if (!getAccessToken()) return;
        api.get<User>('/auth/me')
            .then(res => setUser(res.data))
            .catch(() => clearTokens())
            .finally(() => setLoading(false));
    }, []);

    const login = async (phone: string, password: string): Promise<User> => {
        const res = await api.post('/auth/login', { phone, password });
        saveTokens(res.data.accessToken, res.data.refreshToken);
        setUser(res.data.user);
        return res.data.user;
    };

    const logout = () => {
        clearTokens();
        setUser(null);
    };

    return (
        <AuthCore.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthCore.Provider>
    );
}