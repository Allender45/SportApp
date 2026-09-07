import {useEffect, useState} from 'react';
import {AxiosError} from 'axios';
import {Plus} from 'lucide-react';
import {api} from '../api/client';
import {Modal} from '@/components';
import {uuid} from '@shared/utils';

type ExRow = { key: string; name: string; weight: number; sets: number; reps: number };

const emptyEx = (): ExRow => ({
    key: uuid(), name: '', weight: 0, sets: 3, reps: 10,
});

const emptyRows = (count: number): ExRow[] =>
    Array.from({length: count}, () => emptyEx());

export default function NewWorkoutModal({athleteId, onClose, onCreated}: {
    athleteId: string;
    onClose: () => void;
    onCreated: (workoutId: string) => void;
}) {
    const [exRows, setExRows] = useState<ExRow[]>(emptyRows(10));
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
            const res = await api.post<{ id: string }>('/workouts', {athleteId, exercises});
            onCreated(res.data.id);
        } catch (err) {
            const axiosErr = err as AxiosError<{ error?: string }>;
            setError(axiosErr.response?.data?.error ?? 'Не удалось создать тренировку');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal onClose={onClose} maxWidthClass="max-w-3xl">
            <div className="text-cyan text-[11px] font-bold tracking-[0.25em] text-center">
                НОВАЯ ТРЕНИРОВКА
            </div>

            <div className="max-h-[55vh] overflow-y-auto mt-4 border border-line rounded-xl">
                <table className="w-full border-collapse">
                    <thead>
                    <tr className="border-b border-line text-dim text-[10px] uppercase tracking-wider text-left sticky top-0 bg-panel">
                        <th className="px-2 py-2 w-8">№</th>
                        <th className="px-2 py-2">Название</th>
                        <th className="px-2 py-2 w-20">Вес, кг</th>
                        <th className="px-2 py-2 w-20">Подходы</th>
                        <th className="px-2 py-2 w-20">Повторы</th>
                    </tr>
                    </thead>
                    <tbody>
                    {exRows.map((row, i) => (
                        <tr key={row.key} className="border-b border-line/50 last:border-0">
                            <td className="px-2 text-dim text-xs text-center">{i + 1}</td>
                            <td>
                                <input
                                    className="w-full bg-transparent px-2 py-1.5 text-ink text-sm outline-none
                                   placeholder-dim/40 focus:bg-night rounded-lg transition-colors"
                                    placeholder="Название"
                                    value={row.name}
                                    onChange={e => setExRows(rs => rs.map(r =>
                                        r.key === row.key ? {...r, name: e.target.value} : r))}
                                />
                            </td>
                            {([
                                ['weight', 0, 0.5],
                                ['sets', 1, 1],
                                ['reps', 1, 1],
                            ] as const).map(([field, min, step]) => (
                                <td key={field}>
                                    <input
                                        type="number" min={min} step={step}
                                        className="w-full bg-transparent px-2 py-1.5 text-ink text-sm outline-none
                                       placeholder-dim/40 focus:bg-night rounded-lg transition-colors"
                                        value={row[field] || ''}
                                        onChange={e => setExRows(rs => rs.map(r =>
                                            r.key === row.key ? {...r, [field]: Number(e.target.value)} : r))}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <button
                onClick={() => setExRows(rs => [...rs, emptyEx()])}
                className="w-full flex items-center justify-center gap-2 text-cyan text-sm font-medium
                               border border-dashed border-line hover:border-cyan/50 rounded-xl py-2.5 mt-3 transition-colors"
            >
                <Plus size={16}/> Ещё упражнение
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