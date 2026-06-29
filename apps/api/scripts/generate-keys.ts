import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

function run() {
  const keysDir = path.resolve(process.cwd(), 'keys');
  
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
    console.log(`Created keys directory: ${keysDir}`);
  }
  
  const privateKeyPath = path.join(keysDir, 'private.pem');
  const publicKeyPath = path.join(keysDir, 'public.pem');
  
  if (fs.existsSync(privateKeyPath) || fs.existsSync(publicKeyPath)) {
    console.log('⚠️ Cryptographic keys already exist. Skipping generation.');
    return;
  }
  
  console.log('Generating RSA 2048-bit key pair...');
  
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
  fs.writeFileSync(publicKeyPath, publicKey, 'utf8');
  
  console.log(`✅ Private key written to: ${privateKeyPath}`);
  console.log(`✅ Public key written to: ${publicKeyPath}`);
  console.log('🔑 Keys generated successfully.');
}

run();
