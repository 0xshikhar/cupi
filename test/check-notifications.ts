
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('--- Checking Notifications ---');
    const walletAddress = "0xTestWallet123456";

    const user = await prisma.user.findUnique({
        where: { walletAddress },
        include: { notifications: true }
    });

    if (!user) {
        console.error('❌ User not found!');
        process.exit(1);
    }

    console.log(`User ID: ${user.id}`);
    console.log(`Notification Count: ${user.notifications.length}`);

    if (user.notifications.length === 2) {
        console.log('✅ Success: 2 Default notifications found.');
        user.notifications.forEach(n => {
            console.log(`- [${n.type}] ${n.title}: ${n.message}`);
        });
    } else {
        console.error(`❌ Expected 2 notifications, found ${user.notifications.length}`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
