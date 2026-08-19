import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter, athletesRouter, workoutsRouter, myRouter, exerciseTemplatesRoutes } from './routes';
import helmet from 'helmet';
import morgan from 'morgan';
import path from "node:path";

const app = express();
const webDist = path.resolve(__dirname, '../../web/dist');

app.use(express.static(webDist));
app.get(/^(?!\/(api|uploads|health)).*/, (_req, res) =>
    res.sendFile(path.join(webDist, 'index.html')));
app.use(cors());            // разрешаем запросы с других origin (админка)
app.use(express.json());    // парсим JSON-тела запросов
app.use('/uploads', express.static('uploads')); // картинки упражнений
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // картинки отдаём на фронт :5173
}));
app.use(morgan('dev'))
app.use('/api/auth', authRouter);
app.use('/api/athletes', athletesRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/my', myRouter);
app.use('/api/exercise-templates', exerciseTemplatesRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});