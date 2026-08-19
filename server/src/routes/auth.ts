import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';
import {
    signAccessToken, signRefreshToken, verifyRefreshToken,
} from '../auth/tokens';
import { requireAuth } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
    phone: z.string().min(5),
    password: z.string().min(1),
});

// Открытая часть профиля, которую отдаём клиенту
const publicUser = {
    id: true, phone: true, email: true,
    lastName: true, firstName: true, middleName: true, role: true,
} as const;

// POST /auth/login
router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Некорректные данные', details: parsed.error.flatten() });
        return;
    }

    const { phone, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: 'Неверный телефон или пароль' });
        return;
    }

    const payload = { userId: user.id, role: user.role };
    res.json({
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
        user: {
            id: user.id, phone: user.phone, email: user.email,
            lastName: user.lastName, firstName: user.firstName,
            middleName: user.middleName, role: user.role,
        },
    });
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken !== 'string') {
        res.status(400).json({ error: 'Нужен refreshToken' });
        return;
    }
    try {
        const payload = verifyRefreshToken(refreshToken);
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user || !user.active) {
            res.status(401).json({ error: 'Пользователь не найден' });
            return;
        }
        const newPayload = { userId: user.id, role: user.role };
        res.json({
            accessToken: signAccessToken(newPayload),
            refreshToken: signRefreshToken(newPayload),
        });
    } catch {
        res.status(401).json({ error: 'Refresh-токен недействителен' });
    }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: publicUser,
    });
    if (!user) {
        res.status(404).json({ error: 'Пользователь не найден' });
        return;
    }
    res.json(user);
});

export default router;