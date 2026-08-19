import { useState } from 'react';
import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useAuth } from '../auth/authCore.ts';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const formatPhone = (digits: string): string => {
        let out = '+7';
        if (digits.length > 0) out += ` (${digits.slice(0, 3)}`;
        if (digits.length >= 3) out += ')';
        if (digits.length > 3) out += ` ${digits.slice(3, 6)}`;
        if (digits.length > 6) out += `-${digits.slice(6, 8)}`;
        if (digits.length > 8) out += `-${digits.slice(8, 10)}`;
        return out;
    };

    const handlePhoneChange = (value: string) => {
        let digits = value.replace(/\D/g, '');
        if (digits.startsWith('7') || digits.startsWith('8')) digits = digits.slice(1);
        setPhone(digits.slice(0, 10));
    };

    const onSubmit: ComponentProps<'form'>['onSubmit'] = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(phone, password);
            navigate(user.role === 'ATHLETE' ? '/my' : '/coach', { replace: true });
        } catch (err) {
            const axiosErr = err as AxiosError<{ error?: string }>;
            setError(axiosErr.response?.data?.error ?? 'Не удалось войти. Проверь соединение.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center p-6">
            <form
                onSubmit={onSubmit}
                className="w-full max-w-sm bg-[#1E2126] border border-[#3A3F47] rounded-2xl p-8"
            >
                <h1 className="text-[#EFF2F5] text-xl font-bold text-center mb-6 tracking-wide">
                    TRAINING APP
                </h1>

                <input
                    type="tel"
                    value={formatPhone(phone)}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    autoComplete="tel"
                    className="w-full bg-[#0B0D10] border border-[#404754] rounded-lg px-4 py-3
               text-[#EFF2F5] placeholder-[#555] mb-4 outline-none focus:border-[#4A8B4A]"
                />
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Пароль"
                    autoComplete="current-password"
                    className="w-full bg-[#0B0D10] border border-[#404754] rounded-lg px-4 py-3
                               text-[#EFF2F5] placeholder-[#555] mb-4 outline-none focus:border-[#4A8B4A]"
                />

                {error && <p className="text-[#BF5050] text-sm mb-4 text-center">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#3A6B3A] hover:bg-[#4A8B4A] disabled:opacity-50
                               text-white font-semibold rounded-lg py-3 transition-colors"
                >
                    {loading ? 'Вход...' : 'Войти'}
                </button>
            </form>
        </div>
    );
}