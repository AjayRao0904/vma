// worker.js - SQS Worker for processing video/audio jobs
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, ChangeMessageVisibilityCommand } = require('@aws-sdk/client-sqs');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const cloudwatchClient = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' });

let config = {};

// Load configuration from Secrets Manager
async function loadSecrets() {
  try {
    console.log('Loading secrets from Secrets Manager...');
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: 'vma/production/env' })
    );
    config = JSON.parse(response.SecretString);

    // Set environment variables from secrets
    Object.keys(config).forEach(key => {
      process.env[key] = config[key];
    });

    console.log('✓ Secrets loaded successfully');
    console.log(`✓ Queue URL: ${config.SQS_QUEUE_URL}`);
    console.log(`✓ S3 Bucket: ${config.S3_BUCKET_NAME}`);
  } catch (error) {
    console.error('✗ Error loading secrets:', error);
    process.exit(1);
  }
}

// Send custom metrics to CloudWatch
async function sendMetric(metricName, value, unit = 'Count') {
  try {
    await cloudwatchClient.send(new PutMetricDataCommand({
      Namespace: 'VMA/Worker',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date()
      }]
    }));
  } catch (error) {
    console.error('Error sending metric:', error);
  }
}

// Poll SQS queue for messages
async function pollQueue() {
  const params = {
    QueueUrl: config.SQS_QUEUE_URL,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20, // Long polling
    VisibilityTimeout: 900, // 15 minutes
    MessageAttributeNames: ['All'],
    AttributeNames: ['All']
  };

  try {
    const data = await sqsClient.send(new ReceiveMessageCommand(params));

    if (data.Messages && data.Messages.length > 0) {
      await sendMetric('MessagesReceived', data.Messages.length);

      for (const message of data.Messages) {
        const startTime = Date.now();
        let success = false;

        try {
          await processMessage(message);
          success = true;

          // Delete message after successful processing
          await sqsClient.send(new DeleteMessageCommand({
            QueueUrl: config.SQS_QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle
          }));

          const processingTime = Date.now() - startTime;
          await sendMetric('ProcessingTime', processingTime, 'Milliseconds');
          await sendMetric('MessagesProcessed', 1);

          console.log(`✓ Message processed successfully in ${processingTime}ms`);
        } catch (error) {
          console.error('✗ Error processing message:', error);
          await sendMetric('ProcessingErrors', 1);

          // Optionally extend visibility timeout if processing takes longer
          // Or let the message return to queue for retry
          throw error;
        }
      }
    } else {
      // No messages available
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('✗ Error polling queue:', error);
    await sendMetric('PollingErrors', 1);

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Process individual message
async function processMessage(message) {
  console.log('\n' + '='.repeat(60));
  console.log('Processing new job');
  console.log('='.repeat(60));
  console.log(`Message ID: ${message.MessageId}`);
  console.log(`Receipt Handle: ${message.ReceiptHandle.substring(0, 50)}...`);

  let body;
  try {
    body = JSON.parse(message.Body);
  } catch (error) {
    console.error('✗ Invalid message body:', error);
    throw new Error('Invalid JSON in message body');
  }

  const { type, data, timestamp } = body;

  console.log(`Job Type: ${type}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Data:`, JSON.stringify(data, null, 2));

  // Route to appropriate handler based on job type
  switch (type) {
    case 'video-processing':
      await processVideo(data);
      break;

    case 'audio-generation':
      await processAudioGeneration(data);
      break;

    case 'thumbnail-generation':
      await processThumbnail(data);
      break;

    case 'scene-analysis':
      await processSceneAnalysis(data);
      break;

    case 'video-export':
      await processVideoExport(data);
      break;

    default:
      console.warn(`⚠ Unknown job type: ${type}`);
      throw new Error(`Unknown job type: ${type}`);
  }

  console.log('='.repeat(60));
}

// Video processing handler
async function processVideo(data) {
  console.log('🎬 Processing video...');
  const { videoId, s3Key, userId } = data;

  // TODO: Implement video processing logic
  // 1. Download video from S3
  // 2. Extract frames/scenes using ffmpeg
  // 3. Generate thumbnails
  // 4. Analyze scenes
  // 5. Upload results back to S3
  // 6. Update database

  console.log(`Video ID: ${videoId}`);
  console.log(`S3 Key: ${s3Key}`);
  console.log(`User ID: ${userId}`);

  // Placeholder implementation
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('✓ Video processed successfully');
}

// Audio generation handler
async function processAudioGeneration(data) {
  console.log('🎵 Generating audio...');
  const { sceneId, prompt, type } = data;

  // TODO: Implement audio generation logic
  // 1. Call Replicate API for music/sound effects
  // 2. Download generated audio
  // 3. Upload to S3
  // 4. Update database with audio URL

  console.log(`Scene ID: ${sceneId}`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Type: ${type}`);

  // Placeholder implementation
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('✓ Audio generated successfully');
}

// Thumbnail generation handler
async function processThumbnail(data) {
  console.log('🖼️  Generating thumbnail...');
  const { videoId, s3Key, timestamp } = data;

  // TODO: Implement thumbnail generation
  // 1. Download video from S3
  // 2. Extract frame at specified timestamp using ffmpeg
  // 3. Resize and optimize image
  // 4. Upload thumbnail to S3
  // 5. Update database

  console.log(`Video ID: ${videoId}`);
  console.log(`S3 Key: ${s3Key}`);
  console.log(`Timestamp: ${timestamp}`);

  // Placeholder implementation
  await new Promise(resolve => setTimeout(resolve, 1500));
  console.log('✓ Thumbnail generated successfully');
}

// Scene analysis handler
async function processSceneAnalysis(data) {
  console.log('🔍 Analyzing scene...');
  const { sceneId, videoS3Key, startTime, endTime } = data;

  // TODO: Implement scene analysis
  // 1. Download video segment from S3
  // 2. Extract frames
  // 3. Analyze with OpenAI Vision API
  // 4. Extract audio and transcribe
  // 5. Generate scene description
  // 6. Update database

  console.log(`Scene ID: ${sceneId}`);
  console.log(`Video S3 Key: ${videoS3Key}`);
  console.log(`Start Time: ${startTime}`);
  console.log(`End Time: ${endTime}`);

  // Placeholder implementation
  await new Promise(resolve => setTimeout(resolve, 4000));
  console.log('✓ Scene analyzed successfully');
}

// Video export handler
async function processVideoExport(data) {
  console.log('📹 Exporting final video...');
  const { projectId, scenes, userId } = data;

  // TODO: Implement video export
  // 1. Download all scene videos and audio from S3
  // 2. Merge using ffmpeg
  // 3. Add audio tracks
  // 4. Apply transitions
  // 5. Upload final video to S3
  // 6. Update database
  // 7. Send notification to user

  console.log(`Project ID: ${projectId}`);
  console.log(`Number of scenes: ${scenes.length}`);
  console.log(`User ID: ${userId}`);

  // Placeholder implementation
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('✓ Video exported successfully');
}

// Graceful shutdown handler
let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log('Force shutdown...');
    process.exit(1);
  }

  console.log(`\n${signal} received, starting graceful shutdown...`);
  isShuttingDown = true;

  // Give current job time to complete
  setTimeout(() => {
    console.log('Shutdown complete');
    process.exit(0);
  }, 30000); // 30 seconds
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Main worker loop
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('VMA Worker Starting...');
  console.log('='.repeat(60));
  console.log(`Node Version: ${process.version}`);
  console.log(`Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log('='.repeat(60) + '\n');

  await loadSecrets();

  console.log('\n🚀 Worker ready - polling queue...\n');

  await sendMetric('WorkerStarted', 1);

  // Main polling loop
  while (!isShuttingDown) {
    try {
      await pollQueue();
    } catch (error) {
      console.error('Fatal error in main loop:', error);
      // Don't exit - retry
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Start the worker
main().catch(error => {
  console.error('Fatal error starting worker:', error);
  process.exit(1);
});
