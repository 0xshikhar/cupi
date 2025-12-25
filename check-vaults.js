const { PrismaClient } = require('@prisma/client');

async function checkVaults() {
  const prisma = new PrismaClient();
  
  try {
    const vaults = await prisma.morphoVault.findMany({
      take: 5,
      select: {
        address: true,
        name: true,
        isWhitelisted: true,
        chainId: true,
        tokenSymbol: true
      }
    });
    
    console.log('Found vaults:', vaults.length);
    console.log('Vaults:', JSON.stringify(vaults, null, 2));
    
    const whitelistedCount = await prisma.morphoVault.count({
      where: { isWhitelisted: true }
    });
    
    console.log('Whitelisted vaults:', whitelistedCount);
    
  } finally {
    await prisma.$disconnect();
  }
}

checkVaults().catch(console.error);