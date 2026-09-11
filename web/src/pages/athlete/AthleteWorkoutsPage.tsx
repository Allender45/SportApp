import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { WorkoutSummary } from '@/api/types';
import { splitWorkouts } from '@shared/utils';

export default function AthleteWorkoutsPage() {
    const navigate = useNavigate();

    useEffect(() => {
        api.get<WorkoutSummary[]>('/my/workouts').then(res => {
            const { current } = splitWorkouts(res.data);
            if (current) {
                navigate(`/my/workouts/${current.id}`, { replace: true });
            } else {
                navigate('/my/history', { replace: true }); // всё выполнено
            }
        });
    }, [navigate]);

    return (
        <div className="flex justify-center py-32">
            <span className="text-dim">Загрузка...</span>
        </div>
    );
}