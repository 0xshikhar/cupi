
import { AgentWalletService } from './src/lib/services/agent-wallet-service';
import { prisma } from './src/lib/prisma';

async function main() {
    console.log('--- Starting Agent Wallet Verification ---');

    // 1. Test Database
    console.log('\n1. Testing Database Connection...');
    try {
        const count = await prisma.user.count();
        console.log(`✅ Connected! User count: ${count}`);
    } catch (e) {
        console.error('❌ Database connection failed:', e);
        process.exit(1);
    }

    // 2. Test Wallet Creation
    const testUserAddress = '0x1234567890123456789012345678901234567890';
    console.log(`\n2. Testing Wallet Creation for ${testUserAddress}...`);

    try {
        // Clean up previous test runs
        await prisma.agentWalletMap.deleteMany({
            where: { userWalletAddress: testUserAddress }
        }).catch(() => { });

        console.log('Creating wallet...');
        const result = await AgentWalletService.getOrCreateAgentWallet(testUserAddress);
        console.log('✅ Wallet Created:', result);

        if (!result.agentWalletAddress || !result.privateKey) {
            throw new Error('❌ Invalid wallet result returned');
        }

        // 3. Test Idempotency
        console.log('\n3. Testing Idempotency (Retrying)...');
        const result2 = await AgentWalletService.getOrCreateAgentWallet(testUserAddress);
        console.log('✅ Retry Result:', result2);

        if (result.agentWalletAddress !== result2.agentWalletAddress) {
            throw new Error('❌ Wallet addresses do not match on retry!');
        } else {
            console.log('✅ Idempotency confirmed: Returned same wallet.');
        }

    } catch (e) {
        console.error('❌ Wallet creation test failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
