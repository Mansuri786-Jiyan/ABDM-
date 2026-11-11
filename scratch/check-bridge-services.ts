import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { abdmAuthService } from '../src/integrations/abdm/abdm.auth';
import { abdmConfig } from '../src/config/abdm.config';

async function main() {
  const token = await abdmAuthService.getAccessToken();

  const body = {
    serviceId: 'IN0410000183',
    name: 'EMED Lifeline Hospital',
    type: 'HIP',
    active: true,
  };

  try {
    console.log('Trying PUT /gateway/v3/bridge-services...');
    const res = await axios.put(
      `${abdmConfig.gatewayBaseUrl}/gateway/v3/bridge-services`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'REQUEST-ID': uuidv4(),
          TIMESTAMP: new Date().toISOString(),
          'X-CM-ID': abdmConfig.cmId,
        },
      }
    );
    console.log('PUT Success:', res.status, res.data);
  } catch (err: any) {
    console.log('PUT failed:', err.response?.status, err.response?.data || err.message);

    try {
      console.log('Trying POST /gateway/v3/bridge-services...');
      const res2 = await axios.post(
        `${abdmConfig.gatewayBaseUrl}/gateway/v3/bridge-services`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'REQUEST-ID': uuidv4(),
            TIMESTAMP: new Date().toISOString(),
            'X-CM-ID': abdmConfig.cmId,
          },
        }
      );
      console.log('POST Success:', res2.status, res2.data);
    } catch (err2: any) {
      console.log('POST failed:', err2.response?.status, err2.response?.data || err2.message);
    }
  }
}

main();
