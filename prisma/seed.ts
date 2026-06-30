import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// ฟังก์ชันสำหรับแยกคำสั่ง SQL อย่างชาญฉลาดโดยไม่แยกเครื่องหมาย Semicolon ที่อยู่ใน Single/Double Quotes หรือ Comments
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inComment = false;
  let inMultilineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    // จัดการคอมเมนต์แบบบรรทัดเดียว (-- หรือ #)
    if (inComment) {
      if (char === '\n') {
        inComment = false;
      }
      continue;
    }

    // จัดการคอมเมนต์แบบหลายบรรทัด (/* ... */)
    if (inMultilineComment) {
      if (char === '*' && nextChar === '/') {
        inMultilineComment = false;
        i++; // ข้าม '/'
      }
      continue;
    }

    // เริ่มต้นคอมเมนต์
    if (char === '-' && nextChar === '-') {
      inComment = true;
      i++;
      continue;
    }
    if (char === '#' && (i === 0 || sql[i - 1] === '\n')) {
      inComment = true;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      inMultilineComment = true;
      i++;
      continue;
    }

    // จัดการเครื่องหมาย Single Quotes (') โดยตรวจสอบ Escape string (\') ด้วย
    if (char === "'" && !inDoubleQuote) {
      if (i === 0 || sql[i - 1] !== '\\') {
        inSingleQuote = !inSingleQuote;
      }
    }

    // จัดการเครื่องหมาย Double Quotes (") โดยตรวจสอบ Escape string (\") ด้วย
    if (char === '"' && !inSingleQuote) {
      if (i === 0 || sql[i - 1] !== '\\') {
        inDoubleQuote = !inDoubleQuote;
      }
    }

    // แยกคำสั่งเฉพาะเมื่อเจอ Semicolon (;) ที่อยู่นอก Quotes และ Comments
    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      const trimmed = currentStatement.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      currentStatement = '';
    } else {
      currentStatement += char;
    }
  }

  const finalTrimmed = currentStatement.trim();
  if (finalTrimmed) {
    statements.push(finalTrimmed);
  }

  return statements;
}

async function main() {
  console.log('🌱 Starting database seeding from SQL dump...');

  const sqlPath = path.join(__dirname, 'carbon_db.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`❌ SQL dump file not found at: ${sqlPath}`);
  }

  console.log(`📖 Reading SQL dump file from: ${sqlPath}`);
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('Parsing SQL statements...');
  const statements = splitSqlStatements(sqlContent);

  console.log(`🚀 Found ${statements.length} SQL statements to execute.`);

  // รันคำสั่งทั้งหมดภายใต้ Connection Session เดียวกันเพื่อปิด/เปิด Foreign Key Checks ได้อย่างสมบูรณ์
  console.log('⚙️ Disabling foreign key checks for seeding session...');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  let successCount = 0;
  let failCount = 0;

  for (const statement of statements) {
    const upperStatement = statement.toUpperCase();

    // ข้ามคำสั่งสร้างหรือใช้ Database เพื่อใช้ database จาก connection string ของ Prisma เป็นหลัก
    if (upperStatement.startsWith('CREATE DATABASE') || upperStatement.startsWith('USE ')) {
      console.log(`\n⏭️ Skipping database config statement: ${statement.substring(0, 70)}...`);
      continue;
    }

    try {
      await prisma.$executeRawUnsafe(statement);
      successCount++;
    } catch (error: any) {
      console.warn(`\n⚠️ Warning executing statement: ${statement.substring(0, 100)}...`);
      console.warn(`Reason: ${error.message || error}`);
      failCount++;
    }
  }

  console.log('\n⚙️ Re-enabling foreign key checks...');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

  console.log(`\n🌱 Seeding completed. Success: ${successCount}, Failed/Skipped: ${failCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
