// generate-prisma.mjs
import { exec } from 'child_process';

exec('npx prisma generate', (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
  if (stderr) {
    console.error(`⚠️  Stderr: ${stderr}`);
  }
  console.log(`✅ Output:\n${stdout}`);
});
