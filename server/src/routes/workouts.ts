import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('COACH', 'ADMIN'));

const exerciseSchema = z.object({
    id: z.string(),
    order: z.number().int(),
    name: z.string().min(1),
    sets: z.number().int().min(1),
    reps: z.number().int().min(1),
    weight: z.number().min(0).default(0),
    trainerNote: z.string().optional(),
});

const createWorkoutSchema = z.object({
    athleteId: z.string(),
    title: z.string().optional(),
    exercises: z.array(exerciseSchema).min(1),
});

// Проверка, что атлет принадлежит текущему тренеру
async function ownsAthlete(athleteId: string, coachId: string): Promise<boolean> {
    const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, coachId } });
    return athlete !== null;
}

// POST /workouts — создать тренировку; номер присваивается автоматически
router.post('/', async (req, res) => {
    const parsed = createWorkoutSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Некорректные данные', details: parsed.error.flatten() });
        return;
    }
    const { athleteId, title, exercises } = parsed.data;

    if (!(await ownsAthlete(athleteId, req.user!.userId))) {
        res.status(404).json({ error: 'Атлет не найден' });
        return;
    }

    const max = await prisma.workout.aggregate({
        where: { athleteId },
        _max: { number: true },
    });

    const workout = await prisma.workout.create({
        data: {
            athleteId,
            number: (max._max.number ?? 0) + 1,
            title,
            exercises: { create: exercises },
        },
        include: { exercises: true },
    });

    await Promise.all(exercises.map(e =>
        prisma.exerciseTemplate.upsert({
            where: { name: e.name },
            update: {},
            create: { name: e.name },
        }),
    ));

    res.status(201).json(workout);
});

// GET /workouts/:id — одна тренировка целиком
router.get('/:id', async (req, res) => {
    const workout = await prisma.workout.findFirst({
        where: { id: req.params.id, athlete: { coachId: req.user!.userId } },
        include: {
            exercises: { orderBy: { order: 'asc' } },
            athlete: { select: { id: true, user: { select: { lastName: true, firstName: true } } } },
        },
    });
    if (!workout) {
        res.status(404).json({ error: 'Тренировка не найдена' });
        return;
    }
    res.json(workout);
});

// PATCH /workouts/:id — пересобрать упражнения (редактор сохраняет весь список)
router.patch('/:id', async (req, res) => {
    const parsed = z.object({
        title: z.string().nullable().optional(),
        exercises: z.array(exerciseSchema).min(1),
    }).safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Некорректные данные', details: parsed.error.flatten() });
        return;
    }

    const workout = await prisma.workout.findFirst({
        where: { id: req.params.id, athlete: { coachId: req.user!.userId } },
    });

    if (!workout) {
        res.status(404).json({ error: 'Тренировка не найдена' });
        return;
    }

    const { exercises, title } = parsed.data;
    const keepIds = exercises.map(e => e.id);

    await prisma.$transaction([
        ...exercises.map(e =>
            prisma.exerciseTemplate.upsert({
                where: { name: e.name },
                update: {},
                create: { name: e.name },
            }),
        ),
        prisma.exercise.deleteMany({
            where: { workoutId: workout.id, id: { notIn: keepIds } },
        }),
        ...exercises.map(e =>
            prisma.exercise.upsert({
                where: { id: e.id },
                update: { order: e.order, name: e.name, sets: e.sets, reps: e.reps, weight: e.weight, trainerNote: e.trainerNote },
                create: { id: e.id, workoutId: workout.id, order: e.order, name: e.name, sets: e.sets, reps: e.reps, weight: e.weight, trainerNote: e.trainerNote },
            }),
        ),
        ...(title !== undefined
            ? [prisma.workout.update({ where: { id: workout.id }, data: { title } })]
            : []),
    ]);

    res.json({ ok: true });
});

// POST /workouts/:id/copy — копия тренировки под новым номером
router.post('/:id/copy', async (req, res) => {
    const source = await prisma.workout.findFirst({
        where: { id: req.params.id, athlete: { coachId: req.user!.userId } },
        include: { exercises: true },
    });
    if (!source) {
        res.status(404).json({ error: 'Тренировка не найдена' });
        return;
    }

    const max = await prisma.workout.aggregate({
        where: { athleteId: source.athleteId },
        _max: { number: true },
    });

    const copy = await prisma.workout.create({
        data: {
            athleteId: source.athleteId,
            number: (max._max.number ?? 0) + 1,
            title: source.title,
            exercises: {
                create: source.exercises.map(e => ({
                    order: e.order, name: e.name, sets: e.sets, reps: e.reps,
                    weight: e.weight, trainerNote: e.trainerNote,
                })),
            },
        },
        include: { exercises: true },
    });

    res.status(201).json(copy);
});

// DELETE /workouts/:id
router.delete('/:id', async (req, res) => {
    const result = await prisma.workout.deleteMany({
        where: { id: req.params.id, athlete: { coachId: req.user!.userId } },
    });
    if (result.count === 0) {
        res.status(404).json({ error: 'Тренировка не найдена' });
        return;
    }
    res.json({ ok: true });
});

export default router;