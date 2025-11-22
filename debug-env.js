// Debug script to check environment variables
console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

console.log('--- DATABASE VARIABLES ---');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***FOUND***' : 'NOT FOUND');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('');

console.log('--- REDIS VARIABLES ---');
console.log('REDIS_URL:', process.env.REDIS_URL ? '***FOUND***' : 'NOT FOUND');
console.log('REDIS_HOST:', process.env.REDIS_HOST || 'NOT SET');
console.log('REDIS_PORT:', process.env.REDIS_PORT || 'NOT SET');
console.log('');

console.log('--- PORT ---');
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('');

console.log('=== DATABASE CONFIG RESOLUTION ===');
// Simulate the config logic
if (process.env.DATABASE_URL) {
  console.log('✅ Using DATABASE_URL');
} else {
  console.log('❌ No DATABASE_URL, using individual vars:');
  console.log('  Host:', process.env.DB_HOST || 'localhost');
  console.log('  Port:', process.env.DB_PORT || '5432');
}

if (process.env.REDIS_URL) {
  console.log('✅ Using REDIS_URL');
} else {
  console.log('❌ No REDIS_URL, using individual vars:');
  console.log('  Host:', process.env.REDIS_HOST || 'localhost');
  console.log('  Port:', process.env.REDIS_PORT || '6379');
}
