import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';

// Запуск: npx tsx src/scripts/createCoach.ts <фамилия> <имя> <телефон> <пароль>
async function main() {
    const [lastName, firstName, phone, password] = process.argv.slice(2);

    if (!lastName || !firstName || !phone || !password) {
        console.error('Использование: npx tsx src/scripts/createCoach.ts <фамилия> <имя> <телефон> <пароль>');
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const coach = await prisma.user.create({
        data: { lastName, firstName, phone, passwordHash, role: 'COACH' },
    });

    console.log('Тренер создан:', coach.lastName, coach.firstName, coach.phone);
}

main()
    .catch(err => {
        console.error('Ошибка:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());