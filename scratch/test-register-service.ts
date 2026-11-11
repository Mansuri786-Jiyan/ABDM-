import { abdmScanShareClient } from '../src/integrations/abdm/abdm.scan-share';

async function main() {
  try {
    console.log('Registering bridge service for SBXID_009265...');
    const res = await abdmScanShareClient.registerBridgeServices({
      facilityId: 'IN0410000183',
      facilityName: 'dummy sample hospital',
      hrp: [
        {
          bridgeId: 'SBXID_009265',
          hipName: 'dummy sample hospital',
          type: 'HIP',
          active: true,
        },
      ],
    });
    console.log('Success registering bridge service:', JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('Error registering bridge service:', err.response?.data || err.message);
  }
}

main();
