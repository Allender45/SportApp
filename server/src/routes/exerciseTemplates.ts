import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

const router = Router();
router.use(requireAuth, requireRole('COACH', 'ADMIN'));

const uploadDir = path.resolve('uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${crypto.randomUUID()}${ext}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 МБ
    fileFilter: (_req, file, cb) => {
        cb(null, ['.jpg', '.jpeg', '.png', '.webp'].includes(
            path.extname(file.originalname).toLowerCase()));
    },
});

// GET /exercise-templates?q=жим — подсказки для автокомплита
router.get('/', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const templates = await prisma.exerciseTemplate.findMany({
        where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
        orderBy: { name: 'asc' },
        take: q ? 10 : undefined,
    });
    res.json(templates);
});

export default router;

router.post('/:id/image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'Нужен файл image (jpg/png/webp, до 5 МБ)' });
        return;
    }
    const tpl = await prisma.exerciseTemplate.findUnique({ where: { id: req.params.id } });
    if (!tpl) {
        fs.unlinkSync(req.file.path);
        res.status(404).json({ error: 'Шаблон не найден' });
        return;
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    await prisma.exerciseTemplate.update({ where: { id: tpl.id }, data: { imageUrl } });
    res.json({ imageUrl });
});