import axios from 'axios';
import { abdmAuthService } from '../src/integrations/abdm/abdm.auth';

async function main() {
  const token = await abdmAuthService.getAccessToken();

  const payload = {
    ownershipCode: '',
    stateLGDCode: '',
    districtLGDCode: '',
    subDistrictLGDCode: '',
    pincode: '',
    facilityName: '',
    facilityId: 'IN0410000183',
    page: 0,
  };

  const hosts = [
    'https://apihspsbx.abdm.gov.in',
    'https://dev.abdm.gov.in/api/hiecm',
  ];

  for (const host of hosts) {
    try {
      console.log('Searching on:', host);
      const res = await axios.post(
        `${host}/FacilityManagement/v1.5/facility/search`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Result from', host, ':', JSON.stringify(res.data, null, 2));
      return;
    } catch (err: any) {
      console.log('Error on', host, ':', err.response?.status, err.response?.data || err.message);
    }
  }
}

main();
