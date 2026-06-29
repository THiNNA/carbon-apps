import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getMachineUuid } from '../src/common/license/license-verifier.js';

function run() {
  const privateKeyPath = path.resolve(process.cwd(), 'keys/private.pem');
  const licenseOutputPath = path.resolve(process.cwd(), 'license.json');
  
  if (!fs.existsSync(privateKeyPath)) {
    console.error(`❌ Error: Private key not found at: ${privateKeyPath}`);
    console.error('Please run the key generation script first: pnpm --filter api run tsx scripts/generate-keys.ts');
    process.exit(1);
  }
  
  // Extract arguments or use default
  const args = process.argv.slice(2);
  
  // Usage helper
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: npx tsx scripts/generate-license.ts [customer] [hardwareId] [expiresInDays] [maxUsers] [maxOrganizations]');
    console.log('Example: npx tsx scripts/generate-license.ts "สสจ. เชียงใหม่" "4c4c4544-0043-4e10-8050-b2c04f595632" 365 200 20');
    return;
  }
  
  const customer = args[0] || 'สสจ. Sandbox Customer';
  
  // Auto-detect current machine UUID if not specified
  let hardwareId = args[1];
  if (!hardwareId) {
    try {
      hardwareId = getMachineUuid();
      console.log(`ℹ️ No hardware ID provided. Auto-detected current machine ID: ${hardwareId}`);
    } catch (e: any) {
      console.error(`❌ Failed to auto-detect hardware ID: ${e.message}`);
      process.exit(1);
    }
  }
  
  const days = parseInt(args[2] || '365', 10);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  const maxUsers = parseInt(args[3] || '100', 10);
  const maxOrganizations = parseInt(args[4] || '10', 10);
  
  const payload = {
    customer,
    issuedAt: new Date().toISOString(),
    expiresAt: expiryDate.toISOString(),
    maxUsers,
    maxOrganizations,
    hardwareId: hardwareId.toLowerCase()
  };
  
  const canonicalData = JSON.stringify({
    customer: payload.customer,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    maxUsers: payload.maxUsers,
    maxOrganizations: payload.maxOrganizations,
    hardwareId: payload.hardwareId
  });
  
  console.log('Signing license payload...');
  
  try {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const sign = crypto.createSign('SHA256');
    sign.update(canonicalData);
    const signature = sign.sign(privateKey, 'base64');
    
    const licenseJson = {
      ...payload,
      signature
    };
    
    fs.writeFileSync(licenseOutputPath, JSON.stringify(licenseJson, null, 2), 'utf8');
    console.log(`✅ License generated successfully!`);
    console.log(`📂 Saved to: ${licenseOutputPath}`);
    console.log('--------------------------------------------------');
    console.log(JSON.stringify(licenseJson, null, 2));
    console.log('--------------------------------------------------');
  } catch (error: any) {
    console.error(`❌ Failed to sign license: ${error.message}`);
    process.exit(1);
  }
}

run();
