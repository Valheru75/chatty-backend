import express, { Express } from 'express';
import { ChattyServer } from '@root/setupServer';
import { databaseConnection } from '@root/setupDatabase';
import { config } from '@root/config';
import Logger from 'bunyan';
import { redisConnection } from '@service/redis/redis.connection';

const log: Logger = config.createLogger('app');

log.info('Initializing application...');
class Application {
  public initialize(): void {
    this.loadConfig();
    databaseConnection();
    redisConnection
      .connect() // Initialize Redis connection
      .then(() => log.info('Application setup complete. Starting server...'))
      .catch((error) => log.error('Failed to setup all services:', error));
    const app: Express = express();
    const server: ChattyServer = new ChattyServer(app);
    server.start();
  }

  private loadConfig(): void {
    config.validateConfig();
    config.cloudinaryConfig();
  }
}

const application: Application = new Application();
application.initialize();
