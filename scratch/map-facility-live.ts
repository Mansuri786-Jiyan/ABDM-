import axios from 'axios';
import { abdmAuthService } from '../src/integrations/abdm/abdm.auth';

async function main() {
  const token = await abdmAuthService.getAccessToken();

  try {
    const res = await axios.post(
      'https://apihspsbx.abdm.gov.in/FacilityManagement/v1.5/facility/search',
      {
        facilityId: 'IN0410000183',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Facility Search Result:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.log('Search failed:', err.response?.status, err.response?.data || err.message);
  }
}

main();
