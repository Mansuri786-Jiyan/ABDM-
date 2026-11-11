import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEV_DEFAULT_CLIENT } from '../src/modules/hospital/hospital.service';
import { abdmConfig } from '../src/config/abdm.config';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial hospital and development client...');

  // 1. Seed Hospital
  const hospital = await prisma.hospital.upsert({
    where: { code: DEV_DEFAULT_CLIENT.hospitalCode },
    update: {},
    create: {
      id: DEV_DEFAULT_CLIENT.hospitalId,
      name: DEV_DEFAULT_CLIENT.hospitalName,
      code: DEV_DEFAULT_CLIENT.hospitalCode,
      email: 'admin@generalhospital.sandbox',
      phone: '+919999999999',
      address: 'Sandbox Health City, New Delhi',
      isActive: true,
    },
  });

  // 2. Seed Connector Client
  const clientSecretHash = await bcrypt.hash(DEV_DEFAULT_CLIENT.clientSecret, 10);
  await prisma.connectorClient.upsert({
    where: { clientId: DEV_DEFAULT_CLIENT.clientId },
    update: {
      clientSecretHash,
      isActive: true,
    },
    create: {
      id: 'cli_dev_uuid_0001',
      hospitalId: hospital.id,
      clientId: DEV_DEFAULT_CLIENT.clientId,
      clientSecretHash,
      name: 'Development Sandbox Client',
      isActive: true,
      rateLimit: 1000,
    },
  });

  // 3. Seed ABDM Configuration
  await prisma.aBDMConfiguration.upsert({
    where: { id: 'abdm_cfg_sandbox_001' },
    update: {
      gatewayUrl: abdmConfig.gatewayBaseUrl,
      abhaUrl: abdmConfig.abhaBaseUrl,
      cmId: abdmConfig.cmId,
    },
    create: {
      id: 'abdm_cfg_sandbox_001',
      hospitalId: hospital.id,
      env: 'sandbox',
      clientId: abdmConfig.clientId || 'SANDBOX_CLIENT_ID',
      clientSecretEncrypted: abdmConfig.clientSecret || 'SANDBOX_CLIENT_SECRET',
      gatewayUrl: abdmConfig.gatewayBaseUrl,
      abhaUrl: abdmConfig.abhaBaseUrl,
      cmId: abdmConfig.cmId,
      isActive: true,
    },
  });

  console.log('Seed completed successfully:');
  console.log(`- Hospital: ${hospital.name} (${hospital.code})`);
  console.log(`- Development Client ID: ${DEV_DEFAULT_CLIENT.clientId}`);
  console.log(`- Development Client Secret: ${DEV_DEFAULT_CLIENT.clientSecret}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
