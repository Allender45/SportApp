import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './auth/authCore.ts';
import type { Role, User } from './auth/authCore.ts';
import LoginPage from './pages/LoginPage';
import {Layout, StubPage} from '@/components';
import CoachAthletesPage from './pages/coach/CoachAthletesPage';
import CoachAthletePage from './pages/coach/CoachAthletePage';
import AthleteWorkoutsPage from './pages/athlete/AthleteWorkoutsPage';
import AthleteWorkoutDetailPage from './pages/athlete/AthleteWorkoutDetailPage';
import CoachWorkoutEditorPage from './pages/coach/CoachWorkoutEditorPage';
import CoachExercisesPage from './pages/coach/CoachExercisesPage';

function homeFor(user: User): string {
    return user.role === 'ATHLETE' ? '/my' : '/coach';
}

function Protected({ roles, children }: { roles?: Role[]; children: ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-night flex items-center justify-center">
                <div className="text-dim text-lg">Загрузка...</div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
    return <>{children}</>;
}

export default function App() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Зона тренера — все страницы внутри Layout */}
            <Route element={<Protected roles={['COACH', 'ADMIN']}><Layout /></Protected>}>
                <Route path="/coach" element={<CoachAthletesPage />} />
                <Route path="/coach/athletes/:id" element={<CoachAthletePage />} />
                <Route path="/coach/stats" element={<StubPage title="Статистика" />} />
                <Route path="/coach/news" element={<StubPage title="Новости" />} />
                <Route path="/coach/athletes/:id/workouts/:workoutId" element={<CoachWorkoutEditorPage />} />
                <Route path="/coach/exercises" element={<CoachExercisesPage />} />
            </Route>

            {/* Зона атлета — все страницы внутри Layout */}
            <Route element={<Protected roles={['ATHLETE']}><Layout /></Protected>}>
                <Route path="/my" element={<AthleteWorkoutsPage />} />
                <Route path="/my/workouts/:id" element={<AthleteWorkoutDetailPage />} />
                <Route path="/my/history" element={<StubPage title="История" />} />
                <Route path="/my/upcoming" element={<StubPage title="Будущие тренировки" />} />
                <Route path="/my/stats" element={<StubPage title="Статистика" />} />
                <Route path="/my/chat" element={<StubPage title="Чат с тренером" />} />
                <Route path="/my/news" element={<StubPage title="Новости" />} />
            </Route>

            <Route path="*" element={<Navigate to={user ? homeFor(user) : '/login'} replace />} />
        </Routes>
    );
}