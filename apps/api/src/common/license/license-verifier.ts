import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';


/**
 * Retrieves the unique hardware machine UUID from the operating system.
 */
export function getMachineUuid(): string {
  const platform = os.platform();
  try {
    if (platform === 'win32') {
      try {
        const output = execSync('wmic csproduct get uuid', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const matches = output.match(/[a-fA-F0-9-]{36}/);
        if (matches) return matches[0].trim().toLowerCase();
      } catch {
        // Fallback: PowerShell if wmic is not available or blocked by policy
        const output = execSync('powershell -Command "(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID"', {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        });
        const matches = output.match(/[a-fA-F0-9-]{36}/);
        if (matches) return matches[0].trim().toLowerCase();
      }
    } else if (platform === 'linux') {
      try {
        return fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim().toLowerCase();
      } catch {
        try {
          return fs.readFileSync('/etc/machine-id', 'utf8').trim().toLowerCase();
        } catch {
          // If filesystem read fails, fall back to shell cat
          try {
            return execSync('cat /etc/machine-id', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().toLowerCase();
          } catch {
            // Ignore and try fallback below
          }
        }
      }
    } else if (platform === 'darwin') {
      const output = execSync('ioreg -rd1 -c IOPlatformExpertDevice', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const matches = output.match(/"IOPlatformUUID" = "([^"]+)"/);
      if (matches) return matches[1].trim().toLowerCase();
    }
  } catch (error) {
    console.error('Failed to retrieve machine UUID:', error);
  }
  
  // Hard fallback: Stable system profile hashing
  return generateFallbackFingerprint();
}

/**
 * Generates a stable fallback fingerprint based on network MAC addresses and CPU.
 */
function generateFallbackFingerprint(): string {
  const interfaces = os.networkInterfaces();
  const macs: string[] = [];
  
  for (const name of Object.keys(interfaces)) {
    const netInterface = interfaces[name];
    if (netInterface) {
      for (const info of netInterface) {
        if (!info.internal && info.mac !== '00:00:00:00:00:00') {
          macs.push(info.mac);
        }
      }
    }
  }
  
  const cpus = os.cpus().map(cpu => cpu.model).join(',');
  const rawString = `${macs.sort().join('|')}-${cpus}-${os.arch()}-${os.totalmem()}`;
  
  return crypto.createHash('sha256').update(rawString).digest('hex');
}

export interface VerifiedLicense {
  isValid: boolean;
  message: string;
  licenseData?: {
    customer: string;
    issuedAt: string;
    expiresAt: string;
    maxUsers: number;
    maxOrganizations: number;
    hardwareId: string;
  };
}

export function verifyLicense(
  licensePath: string = getLicensePath(),
  publicKeyPath: string = getPublicKeyPath()
): VerifiedLicense {
  try {
    if (!fs.existsSync(licensePath)) {
      return { isValid: false, message: 'License file not found. Please activate the system.' };
    }
    
    if (!fs.existsSync(publicKeyPath)) {
      return { isValid: false, message: 'Public verification key not found on server.' };
    }
    
    const licenseJson = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
    const { signature, ...payload } = licenseJson;
    
    if (!signature) {
      return { isValid: false, message: 'License signature is missing or corrupt.' };
    }
    
    // Canonicalize key order to guarantee identical JSON strings during validation
    const canonicalData = JSON.stringify({
      customer: payload.customer,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      maxUsers: payload.maxUsers,
      maxOrganizations: payload.maxOrganizations,
      hardwareId: payload.hardwareId
    });
    
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    const verify = crypto.createVerify('SHA256');
    verify.update(canonicalData);
    
    const isSignatureValid = verify.verify(publicKey, signature, 'base64');
    if (!isSignatureValid) {
      return { isValid: false, message: 'License signature is invalid or has been tampered with.' };
    }
    
    // Expiration check
    const expiryDate = new Date(payload.expiresAt);
    if (expiryDate.getTime() < Date.now()) {
      return { isValid: false, message: `License expired on ${expiryDate.toLocaleDateString()}` };
    }
    
    // Hardware Match
    const currentMachineId = getMachineUuid();
    if (currentMachineId !== payload.hardwareId.toLowerCase()) {
      return { 
        isValid: false, 
        message: `License is locked to hardware ID ${payload.hardwareId}, but this machine has ID ${currentMachineId}` 
      };
    }
    
    return {
      isValid: true,
      message: 'License verified successfully.',
      licenseData: payload
    };
  } catch (error: any) {
    return { isValid: false, message: `License verification error: ${error.message}` };
  }
}

export function getLicensePath(): string {
  const localPath = path.resolve(process.cwd(), 'license.json');
  const parentPath = path.resolve(process.cwd(), '../../license.json');
  if (!fs.existsSync(localPath) && fs.existsSync(parentPath)) {
    return parentPath;
  }
  return localPath;
}

export function getPublicKeyPath(): string {
  const paths = [
    path.resolve(process.cwd(), 'keys/public.pem'),
    path.resolve(process.cwd(), 'apps/api/keys/public.pem'),
    path.resolve(process.cwd(), '../../keys/public.pem'),
    path.resolve(__dirname, '../../../../keys/public.pem'), // from dist/common/license/
    path.resolve(__dirname, '../../keys/public.pem')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return paths[0]; // fallback
}

