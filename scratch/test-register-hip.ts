import axios from 'axios';
import { abdmAuthService } from '../src/integrations/abdm/abdm.auth';

async function main() {
  const token = await abdmAuthService.getAccessToken();

  const facilities = [
    { id: 'IN0610000042', name: 'Mohan Hospital Haryana' },
    { id: 'IN0610000042', name: 'Mohan Hospital' },
    { id: 'IN2910000064', name: 'City Hospital' },
  ];

  for (const f of facilities) {
    const payload = {
      facilityId: f.id,
      facilityName: f.name,
      HRP: [
        {
          bridgeId: 'SBXID_009265',
          hipName: 'EMED Health',
          type: 'HIP',
          active: true,
        },
      ],
    };

    try {
      console.log('Testing with:', f);
      const res = await axios.post(
        'https://apihspsbx.abdm.gov.in/v4/int/v1/bridges/MutipleHRPAddUpdateServices',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Result for', f.id, ':', JSON.stringify(res.data));
      if (!res.data[0]?.error) {
        console.log('SUCCESS! Registered:', f);
        return;
      }
    } catch (err: any) {
      console.log('Error for', f.id, ':', err.response?.data || err.message);
    }
  }
}

main();
