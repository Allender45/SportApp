import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { api } from '../../api/client';

type Row = {
    id: string;
    name: string;
    weight: number;
    sets: number;
    reps: number;
    trainerNote: string;
};

type WorkoutFull = {
    id: string;
    number: number;
    title: string | null;
    exercises: { id: string; name: string; weight: number; sets: number; reps: number; trainerNote: string | null }[];
    athlete: { user: { lastName: string; firstName: string } };
};

const emptyRow = (): Row => ({
    id: crypto.randomUUID(),
    name: '', weight: 0, sets: 3, reps: 10, trainerNote: '',
});

export default function CoachWorkoutEditorPage() {
    const { id, workoutId } = useParams<{ id: string; workoutId: string }>();
    const navigate = useNavigate();

    const [workout, setWorkout] = useState<WorkoutFull | null>(null);
    const [rows, setRows] = useState<Row[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        api.get<WorkoutFull>(`/workouts/${workoutId}`).then(res => {
            setWorkout(res.data);
            setRows(res.data.exercises.map(e => ({
                id: e.id,
                name: e.name,
                weight: e.weight,
                sets: e.sets,
                reps: e.reps,
                trainerNote: e.trainerNote ?? '',
            })));
        });
    }, [workoutId]);

    const updateRow = (rowId: string, patch: Partial<Row>) => {
        setRows(rs => rs.map(r => (r.id === rowId ? { ...r, ...patch } : r)));
    };

    const save = async () => {
        setSaving(true);
        try {
            await api.patch(`/workouts/${workoutId}`, {
                exercises: rows
                    .filter(r => r.name.trim())
                    .map((r, i) => ({
                        id: r.id,
                        name: r.name.trim(),
                        sets: r.sets,
                        reps: r.reps,
                        weight: r.weight,
                        trainerNote: r.trainerNote || undefined,
                        order: i + 1,
                    })),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } finally {
            setSaving(false);
        }
    };

    if (!workout) {
        return <div className="flex justify-center py-32"><span className="text-dim">Загрузка...</span></div>;
    }

    const cellInput = `w-full bg-transparent px-3 py-2 text-sm text-ink outline-none
                       placeholder-dim/40 focus:bg-panel rounded-lg transition-colors`;

    return (
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate(`/coach/athletes/${id}`)}
                        className="flex items-center gap-1.5 text-dim hover:text-ink text-sm mb-4 transition-colors"
                    >
                        <ArrowLeft size={16} /></button>
                    <div className="text-cyan text-[11px] font-bold tracking-[0.25em]">
                        ТРЕНИРОВКА #{workout.number}
                    </div>
                </div>
                <button
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-r from-ember-deep to-ember
                               hover:brightness-110 disabled:opacity-50 text-white text-sm font-semibold
                               rounded-xl px-4 py-2 transition-all shadow-lg shadow-ember/20"
                >
                    <Save size={16} /> {saved ? '✓ Сохранено' : saving ? 'Сохранение...' : 'Сохранить'}
                </button>
            </div>

            {/* Таблица упражнений */}
            <div className="bg-card border border-line rounded-2xl overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                    <thead>
                    <tr className="border-b border-line text-dim text-[11px] uppercase tracking-wider text-left">
                        <th className="px-3 py-3 w-10">№</th>
                        <th className="px-3 py-3">Упражнение</th>
                        <th className="px-3 py-3 w-24">Вес, кг</th>
                        <th className="px-3 py-3 w-24">Подходы</th>
                        <th className="px-3 py-3 w-24">Повторы</th>
                        <th className="px-3 py-3">Заметка</th>
                        <th className="w-12" />
                    </tr>
                    </thead>
                    <tbody>
                    {rows.map((row, i) => (
                        <tr key={row.id} className="border-b border-line/50 last:border-0">
                            <td className="px-3 text-dim text-sm text-center">{i + 1}</td>
                            <td>
                                <input className={cellInput} placeholder="Название"
                                       value={row.name}
                                       onChange={e => updateRow(row.id, { name: e.target.value })} />
                            </td>
                            <td>
                                <input className={cellInput} type="number" min={0} step={0.5}
                                       value={row.weight || ''}
                                       onChange={e => updateRow(row.id, { weight: Number(e.target.value) })} />
                            </td>
                            <td>
                                <input className={cellInput} type="number" min={1}
                                       value={row.sets || ''}
                                       onChange={e => updateRow(row.id, { sets: Number(e.target.value) })} />
                            </td>
                            <td>
                                <input className={cellInput} type="number" min={1}
                                       value={row.reps || ''}
                                       onChange={e => updateRow(row.id, { reps: Number(e.target.value) })} />
                            </td>
                            <td>
                                <input className={cellInput} placeholder="Техника, акценты..."
                                       value={row.trainerNote}
                                       onChange={e => updateRow(row.id, { trainerNote: e.target.value })} />
                            </td>
                            <td className="pr-2">
                                <button
                                    onClick={() => setRows(rs => rs.filter(r => r.id !== row.id))}
                                    className="text-dim hover:text-ember transition-colors p-1"
                                    aria-label="Удалить"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                <button
                    onClick={() => setRows(rs => [...rs, emptyRow()])}
                    className="flex items-center gap-2 text-cyan text-sm font-medium px-4 py-3
                               hover:bg-panel transition-colors w-full"
                >
                    <Plus size={16} /> Добавить упражнение
                </button>
            </div>

            <p className="text-dim text-xs mt-3">
                Пустые строки без названия при сохранении игнорируются. Порядок строк = порядок упражнений.
            </p>
        </div>
    );
}