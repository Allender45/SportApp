import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { TokenPayload, verifyAccessToken } from '../auth/tokens';

// Расширяем тип Request, чтобы в req.user лежал payload токена
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Нет токена' });
        return;
    }
    try {
        req.user = verifyAccessToken(header.slice(7));
        next();
    } catch {
        res.status(401).json({ error: 'Токен недействителен или истёк' });
    }
}

export function requireRole(...roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Недостаточно прав' });
            return;
        }
        next();
    };
}