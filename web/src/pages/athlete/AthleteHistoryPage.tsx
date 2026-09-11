import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { WorkoutSummary } from '@/api/types';
import { splitWorkouts } from '@shared/utils';

export default function AthleteHistoryPage() {
    const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get<WorkoutSummary[]>('/my/workouts')
            .then(res => setWorkouts(splitWorkouts(res.data).history))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="flex justify-center py-32"><span className="text-dim">Загрузка...</span></div>;
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <h1 className="text-cyan text-sm font-bold tracking-[0.25em] mb-4">ИСТОРИЯ</h1>

            {workouts.length === 0 && (
                <p className="text-dim text-center mt-16">Пока нет выполненных тренировок</p>
            )}

            <div className="space-y-3">
                {workouts.map(w => (
                    <button
                        key={w.id}
                        onClick={() => navigate(`/my/workouts/${w.id}`)}
                        className="w-full text-left bg-card border border-cyan/40 rounded-2xl p-4
                                   flex items-center justify-between hover:border-cyan/70 transition-colors"
                    >
                        <div>
                            <div className="text-ink font-bold text-sm">
                                ТРЕНИРОВКА #{w.number}{w.title ? ` — ${w.title}` : ''}
                            </div>
                            <div className="text-dim text-xs mt-1">{w.done} / {w.total} выполнено</div>
                            {w.latestDate && (
                                <div className="text-dim/70 text-[11px] mt-1">
                                    {new Date(w.latestDate).toLocaleDateString('ru-RU')}
                                </div>
                            )}
                        </div>
                        <div className="text-cyan text-2xl font-bold">100%</div>
                    </button>
                ))}
            </div>
        </div>
    );
}