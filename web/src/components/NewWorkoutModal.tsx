import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { Plus } from 'lucide-react';
import { api } from '../api/client';
import { Modal, Input } from '@/components';
import { uuid } from '@shared/utils';

type ExRow = { key: string; name: string; weight: number; sets: number; reps: number };

const emptyEx = (): ExRow => ({
    key: uuid(), name: '', weight: 0, sets: 3, reps: 10,
});

export default function NewWorkoutModal({ athleteId, onClose, onCreated }: {
    athleteId: string;
    onClose: () => void;
    onCreated: (workoutId: string) => void;
}) {
    const [exRows, setExRows] = useState<ExRow[]>([emptyEx()]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    // Закрытие по Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const createWorkout = async () => {
        const exercises = exRows
            .filter(r => r.name.trim())
            .map((r, i) => ({
                id: uuid(),
                name: r.name.trim(),
                weight: r.weight,
                sets: r.sets,
                reps: r.reps,
                order: i + 1,
            }));
        if (exercises.length === 0) {
            setError('Добавь хотя бы одно упражнение с названием');
            return;
        }
        setError('');
        setSaving(true);
        try {
            const res = await api.post<{ id: string }>('/workouts', { athleteId, exercises });
            onCreated(res.data.id);
        } catch (err) {
            const axiosErr = err as AxiosError<{ error?: string }>;
            setError(axiosErr.response?.data?.error ?? 'Не удалось создать тренировку');
        } finally {
            setSaving(false);
        }
    };

    const loadExerciseNames = async (q: string): Promise<string[]> => {
        const res = await api.get<{ id: string; name: string }[]>('/exercise-templates', { params: { q } });
        return res.data.map(t => t.name);
    };

    return (
        <Modal onClose={onClose}>
            <div className="text-cyan text-[11px] font-bold tracking-[0.25em] text-center">
                НОВАЯ ТРЕНИРОВКА
            </div>

                <div className="max-h-[55vh] overflow-y-auto mt-4 space-y-3 pr-1">
                    {exRows.map((row, i) => (
                        <div key={row.key} className="bg-night border border-line rounded-xl p-3">
                            <div className="text-dim text-[10px] mb-2">УПРАЖНЕНИЕ {i + 1}</div>
                            <Input
                                className="w-full bg-transparent border-b border-line pb-1.5 text-ink text-sm
               placeholder-dim/40 outline-none focus:border-cyan mb-2"
                                placeholder="Название"
                                value={row.name}
                                onChange={v => setExRows(rs => rs.map(r =>
                                    r.key === row.key ? { ...r, name: v } : r))}
                                loadOptions={loadExerciseNames}
                            />
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    ['Вес, кг', 'weight'],
                                    ['Подходы', 'sets'],
                                    ['Повторы', 'reps'],
                                ] as const).map(([label, field]) => (
                                    <label key={field} className="block">
                                        <span className="text-dim text-[10px]">{label}</span>
                                        <input
                                            type="number" min={0}
                                            className="w-full bg-panel border border-line rounded-lg px-2 py-1.5
                                                       text-ink text-sm outline-none focus:border-cyan"
                                            value={row[field] || ''}
                                            onChange={e => setExRows(rs => rs.map(r =>
                                                r.key === row.key ? { ...r, [field]: Number(e.target.value) } : r))}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => setExRows(rs => [...rs, emptyEx()])}
                    className="w-full flex items-center justify-center gap-2 text-cyan text-sm font-medium
                               border border-dashed border-line hover:border-cyan/50 rounded-xl py-2.5 mt-3 transition-colors"
                >
                    <Plus size={16} /> Ещё упражнение
                </button>

                {error && <p className="text-ember text-sm mt-3 text-center">{error}</p>}

                <button
                    onClick={createWorkout}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-ember-deep to-ember hover:brightness-110
                               disabled:opacity-50 text-white font-bold rounded-xl py-3 mt-4 transition-all"
                >
                    {saving ? 'Создание...' : 'Создать тренировку'}
                </button>
        </Modal>
    );
}