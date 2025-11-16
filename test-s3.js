const { S3Client, ListBucketsCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { readFileSync } = require('fs');

// Manually load .env.local
try {
  const envContent = readFileSync('.env.local', 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=#]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
} catch (e) {
  console.error('Could not load .env.local:', e.message);
}

console.log('=== Testing AWS S3 Connectivity ===\n');

console.log('Configuration:');
console.log('  Region:', process.env.AWS_REGION);
console.log('  Access Key ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...');
console.log('  Bucket:', process.env.AWS_S3_BUCKET);
console.log('');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  requestHandler: {
    requestTimeout: 10000, // 10 second timeout for testing
  },
});

async function testS3() {
  try {
    console.log('1. Testing AWS credentials by listing buckets...');
    const listCommand = new ListBucketsCommand({});
    const listResult = await s3Client.send(listCommand);
    console.log('✅ Credentials are valid!');
    console.log('   Available buckets:', listResult.Buckets?.map(b => b.Name).join(', '));
    console.log('');

    console.log('2. Testing if bucket exists:', process.env.AWS_S3_BUCKET);
    const headCommand = new HeadBucketCommand({
      Bucket: process.env.AWS_S3_BUCKET,
    });
    await s3Client.send(headCommand);
    console.log('✅ Bucket exists and is accessible!');
    console.log('');

    console.log('✅ All tests passed! S3 is working correctly.');
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('   Error name:', error.name);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('\n💡 This looks like a network connectivity issue.');
      console.error('   Possible causes:');
      console.error('   - Firewall blocking AWS connections');
      console.error('   - VPN/proxy issues');
      console.error('   - No internet connection');
      console.error('   - ISP blocking AWS');
    } else if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      console.error('\n💡 Invalid AWS credentials.');
      console.error('   Please check your .env.local file.');
    } else if (error.code === 'NoSuchBucket' || error.code === '404') {
      console.error('\n💡 Bucket does not exist or wrong region.');
      console.error('   Check bucket name and region in .env.local');
    }

    process.exit(1);
  }
}

testS3();
