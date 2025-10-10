// Production-ready logging utility with AWS CloudWatch integration
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand
} from '@aws-sdk/client-cloudwatch-logs';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private cloudWatchClient: CloudWatchLogsClient | null = null;
  private logGroupName: string | null = null;
  private logStreamName: string | null = null;
  private sequenceToken: string | undefined = undefined;
  private logBuffer: Array<{ timestamp: number; message: string }> = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeCloudWatch();
  }

  private initializeCloudWatch() {
    // Only initialize CloudWatch in production or if explicitly enabled
    const enableCloudWatch = process.env.ENABLE_CLOUDWATCH_LOGS === 'true';

    if (!this.isDevelopment || enableCloudWatch) {
      try {
        const region = process.env.AWS_REGION;
        const logGroup = process.env.CLOUDWATCH_LOG_GROUP;
        const logStream = process.env.CLOUDWATCH_LOG_STREAM || `app-${Date.now()}`;

        if (region && logGroup) {
          this.cloudWatchClient = new CloudWatchLogsClient({ region });
          this.logGroupName = logGroup;
          this.logStreamName = logStream;

          // Create log stream if it doesn't exist
          this.createLogStream().catch(err => {
            console.error('Failed to create CloudWatch log stream:', err);
          });

          // Flush logs every 5 seconds
          this.flushInterval = setInterval(() => this.flushLogs(), 5000);
        }
      } catch (error) {
        console.error('Failed to initialize CloudWatch:', error);
      }
    }
  }

  private async createLogStream() {
    if (!this.cloudWatchClient || !this.logGroupName || !this.logStreamName) {
      return;
    }

    try {
      // Check if log stream exists
      const describeCommand = new DescribeLogStreamsCommand({
        logGroupName: this.logGroupName,
        logStreamNamePrefix: this.logStreamName,
      });

      const describeResponse = await this.cloudWatchClient.send(describeCommand);
      const existingStream = describeResponse.logStreams?.find(
        stream => stream.logStreamName === this.logStreamName
      );

      if (existingStream) {
        this.sequenceToken = existingStream.uploadSequenceToken;
      } else {
        // Create new log stream
        const createCommand = new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
        });
        await this.cloudWatchClient.send(createCommand);
      }
    } catch (error) {
      console.error('Error creating log stream:', error);
    }
  }

  private async flushLogs() {
    if (
      !this.cloudWatchClient ||
      !this.logGroupName ||
      !this.logStreamName ||
      this.logBuffer.length === 0
    ) {
      return;
    }

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: logsToSend,
        sequenceToken: this.sequenceToken,
      });

      const response = await this.cloudWatchClient.send(command);
      this.sequenceToken = response.nextSequenceToken;
    } catch (error) {
      console.error('Failed to send logs to CloudWatch:', error);
      // Re-add failed logs to buffer
      this.logBuffer.unshift(...logsToSend);
    }
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}`;
  }

  private sendToCloudWatch(message: string) {
    if (this.cloudWatchClient && this.logGroupName && this.logStreamName) {
      this.logBuffer.push({
        timestamp: Date.now(),
        message,
      });

      // If buffer is getting large, flush immediately
      if (this.logBuffer.length >= 50) {
        this.flushLogs();
      }
    }
  }

  info(message: string, context?: LogContext) {
    const formatted = this.formatMessage('info', message, context);
    console.log(formatted);
    this.sendToCloudWatch(formatted);
  }

  warn(message: string, context?: LogContext) {
    const formatted = this.formatMessage('warn', message, context);
    console.warn(formatted);
    this.sendToCloudWatch(formatted);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const formatted = this.formatMessage('error', message, context);
    console.error(formatted);

    let errorDetails = formatted;
    if (error instanceof Error) {
      console.error(error.stack);
      errorDetails += `\n${error.stack}`;
    } else if (error) {
      console.error(error);
      errorDetails += `\n${JSON.stringify(error)}`;
    }

    this.sendToCloudWatch(errorDetails);
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      const formatted = this.formatMessage('debug', message, context);
      console.debug(formatted);
      this.sendToCloudWatch(formatted);
    }
  }

  // Cleanup method to flush remaining logs on shutdown
  async shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushLogs();
  }
}

export const logger = new Logger();
