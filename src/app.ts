import { config } from './config';
import express, { Express } from 'express';
import { ChattyServer } from './setupServer';
import { databaseConnection } from './setupDatabase';
import Logger from 'bunyan';

const log: Logger = config.createLogger('app');

log.info('Initializing application...');
class Application {
  public initialize(): void {
    this.loadConfig();
    databaseConnection();
    const app: Express = express();
    const server: ChattyServer = new ChattyServer(app);
    server.start();
  }

  private loadConfig(): void {
    config.validateConfig();
  }
}

const application: Application = new Application();
application.initialize();
