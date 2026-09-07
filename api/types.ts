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