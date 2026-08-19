import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {AxiosError} from 'axios';
import {Plus, Lock} from 'lucide-react';
import {api} from '../../api/client';
import type {CoachAthlete} from '../../api/types';

const emptyForm = {lastName: '', firstName: ''};

export default function CoachAthletesPage() {
    const navigate = useNavigate();

    const [athletes, setAthletes] = useState<CoachAthlete[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [phone, setPhone] = useState('');

    const load = () => {
        api.get<CoachAthlete[]>('/athletes').then(res => setAthletes(res.data));
    };
    useEffect(load, []);

    const createAthlete = async () => {
        if (phone.length !== 10) {
            setError('Введи телефон полностью: 10 цифр');
            return;
        }
        setError('');
        setSaving(true);
        try {
            await api.post('/athletes', {
                lastName: form.lastName,
                firstName: form.firstName,
                phone,
                password: phone,
            });
            setShowForm(false);
            setForm(emptyForm);
            setPhone('');
            load();
        } catch (err) {
            const axiosErr = err as AxiosError<{ error?: string }>;
            setError(axiosErr.response?.data?.error ?? 'Не удалось создать атлета');
        } finally {
            setSaving(false);
        }
    };

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

    return (
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
            {/* Заголовок страницы */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="text-cyan text-[11px] font-bold tracking-[0.25em] mb-1">
                        КАБИНЕТ ТРЕНЕРА
                    </div>
                    <h1 className="text-ink text-xl font-bold">Мои атлеты</h1>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-ember-deep to-ember
                               hover:brightness-110 text-white font-semibold rounded-xl px-4 py-2.5
                               transition-all shadow-lg shadow-ember/20"
                >
                    <Plus size={18}/> Атлет
                </button>
            </div>

            {athletes.length === 0 && (
                <p className="text-dim text-center mt-16">Пока нет ни одного атлета</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                {athletes.map(a => (
                    <button
                        key={a.id}
                        onClick={() => navigate(`/coach/athletes/${a.id}`)}
                        className="text-left bg-card border border-line rounded-2xl p-4
                                   hover:border-cyan/50 transition-colors"
                    >
                        <div className="font-bold text-ink">{a.user.lastName} {a.user.firstName}</div>
                        <div className="text-dim text-xs mt-1">
                            {a.user.phone}
                        </div>
                        <div className="text-dim text-xs mt-2 flex items-center gap-2">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan"/>
                            Тренировок: {a._count.workouts}
                        </div>
                        {a.coachNotes && (
                            <div className="text-dim text-[11px] italic mt-2 border-t border-line pt-2
                                            flex items-start gap-1.5">
                                <Lock size={12} className="shrink-0 mt-0.5"/>
                                {a.coachNotes}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Модалка создания атлета */}
            {showForm && (
                <div
                    className="fixed inset-0 z-40 bg-night/90 backdrop-blur-sm
                               flex items-center justify-center p-6"
                    onClick={() => setShowForm(false)}
                >
                    <div
                        className="w-full max-w-sm bg-panel border border-line rounded-2xl p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="text-cyan text-[11px] font-bold tracking-[0.25em] text-center">
                            НОВЫЙ АТЛЕТ
                        </div>
                        <h2 className="text-ink font-bold text-center mt-1 mb-5">
                            Создание аккаунта
                        </h2>
                        <div className="space-y-3">
                            <input className={`w-full bg-night border border-line rounded-xl px-4 py-2.5
                      text-ink placeholder-dim/50 outline-none focus:border-cyan transition-colors`}
                                   placeholder="Фамилия"
                                   value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})}/>
                            <input className={`w-full bg-night border border-line rounded-xl px-4 py-2.5
                      text-ink placeholder-dim/50 outline-none focus:border-cyan transition-colors`} placeholder="Имя"
                                   value={form.firstName}
                                   onChange={e => setForm({...form, firstName: e.target.value})}/>
                            <input className={`w-full bg-night border border-line rounded-xl px-4 py-2.5
                      text-ink placeholder-dim/50 outline-none focus:border-cyan transition-colors`}
                                   placeholder="+7 (___) ___-__-__"
                                   onChange={e => handlePhoneChange(e.target.value)}
                                   value={formatPhone(phone)}/>
                        </div>
                        {error && <p className="text-ember text-sm mt-3 text-center">{error}</p>}
                        <p className="text-dim text-[11px] mt-3">
                            Атлет войдёт по номеру телефона, пароль на первый вход — тот же номер
                        </p>
                        <button
                            onClick={createAthlete}
                            disabled={saving}
                            className="w-full bg-gradient-to-r from-ember-deep to-ember hover:brightness-110
                                       disabled:opacity-50 text-white font-bold rounded-xl py-3 mt-4 transition-all"
                        >
                            {saving ? 'Создание...' : 'Создать'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}