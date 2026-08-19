import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';

// Запуск: npx tsx src/scripts/resetPassword.ts <phone> <новый пароль>
async function main() {
    const [phone, password] = process.argv.slice(2);

    if (!phone || !password) {
        console.error('Использование: npx tsx src/scripts/resetPassword.ts <phone> <новый пароль>');
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.user.updateMany({
        where: { phone },
        data: { passwordHash },
    });

    if (result.count === 0) {
        console.error('Пользователь с таким phone не найден');
        process.exit(1);
    }
    console.log('Пароль обновлён для:', phone);
}

main()
    .catch(err => {
        console.error('Ошибка:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());