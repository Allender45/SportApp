import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { WorkoutSummary } from '../../api/types';

export default function AthleteWorkoutsPage() {
    const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get<WorkoutSummary[]>('/my/workouts')
            .then(res => setWorkouts(res.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
            <span className="text-[#8F959E]">Загрузка...</span>
        </div>;
    }

    return (
        <div className="min-h-screen bg-[#0B0D10] p-4 max-w-2xl mx-auto">
            <h1 className="text-[#8F959E] text-sm font-bold tracking-widest mb-4 mt-2">
                МОИ ТРЕНИРОВКИ
            </h1>

            {workouts.length === 0 && (
                <p className="text-[#8F959E] text-center mt-16">Тренировок пока нет</p>
            )}

            {workouts.map(w => {
                const complete = w.total > 0 && w.done === w.total;
                const percent = w.total > 0 ? Math.round((w.done / w.total) * 100) : 0;
                return (
                    <button
                        key={w.id}
                        onClick={() => navigate(`/my/workouts/${w.id}`)}
                        className={`w-full text-left bg-[#1E2126] border rounded-2xl p-4 mb-3
                                    flex items-center justify-between transition-colors
                                    ${complete ? 'border-[#4A8B4A]' : 'border-[#3A3F47]'}`}
                    >
                        <div>
                            <div className="text-[#EFF2F5] font-bold text-sm">
                                ТРЕНИРОВКА #{w.number}{w.title ? ` — ${w.title}` : ''}
                            </div>
                            <div className="text-[#A6ADB8] text-xs mt-1">
                                {w.done} / {w.total} выполнено
                            </div>
                            {w.latestDate && (
                                <div className="text-[#8F959E] text-[11px] mt-1">
                                    {new Date(w.latestDate).toLocaleDateString('ru-RU')}
                                </div>
                            )}
                        </div>
                        <div className={`text-2xl font-bold ${complete ? 'text-[#6FBF6F]' : 'text-[#3A3F47]'}`}>
                            {percent}%
                        </div>
                    </button>
                );
            })}
        </div>
    );
}