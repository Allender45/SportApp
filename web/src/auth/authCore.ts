import { createContext, useContext } from 'react';

export type Role = 'COACH' | 'ATHLETE' | 'ADMIN';

export type User = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: Role;
    active: boolean;
    createdAt: string;
    updatedAt: string;
};

export type AuthContextValue = {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => void;
};

export const AuthCore = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthCore);
    if (!ctx) throw new Error('useAuth должен использоваться внутри AuthCore');
    return ctx;
}