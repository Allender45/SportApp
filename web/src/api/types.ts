import type { User } from '../auth/authCore';

export type WorkoutSummary = {
    id: string;
    number: number;
    title: string | null;
    total: number;
    done: number;
    latestDate: string | null;
};

export type ExerciseResult = {
    id: string;
    status: 'DONE' | 'FAILED';
    athleteComment: string | null;
    completedAt: string;
};

export type ExerciseItem = {
    id: string;
    order: number;
    name: string;
    sets: number;
    reps: number;
    weight: number;
    trainerNote: string | null;
    lastResult: ExerciseResult | null;
    imageUrl: string | null;
};

export type WorkoutDetail = {
    id: string;
    number: number;
    title: string | null;
    exercises: ExerciseItem[];
};

export type CoachAthlete = {
    id: string;
    coachNotes: string | null;
    user: Pick<User, 'id' | 'firstName' | 'lastName' | 'phone'> & { active: boolean };
    _count: { workouts: number };
};

export type CoachAthleteDetail = {
    id: string;
    coachNotes: string | null;
    user: Pick<User, 'id' | 'firstName' | 'lastName' | 'phone'> & {
        middleName: string | null;
        email: string | null;
        active: boolean;
    };
    workouts: {
        id: string;
        number: number;
        createdAt: string;
        exercises: {
            id: string;
            name: string;
            weight: number;
            sets: number;
            reps: number;
            results: { status: 'DONE' | 'FAILED' }[];
        }[];
    }[];
};