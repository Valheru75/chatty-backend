import mongoose from 'mongoose';
import { config } from '@root/config';
import Logger from 'bunyan';

const log: Logger = config.createLogger('database');
const databaseUri = config.DATABASE_URL!;

export const databaseConnection = () => {
  const connect = () => {
    mongoose
      .connect(databaseUri)
      .then(() => log.info('Successfully connected to database.'))
      .catch((error) => {
        log.error('Error connecting to database', error);
        setTimeout(connect, 5000); // Retry after 5 seconds
      });
  };

  connect();

  mongoose.connection.on('disconnected', () => {
    log.info('Database connection lost. Attempting to reconnect...');
    connect();
  });

  mongoose.connection.on('error', (error) => {
    log.error('Database connection error:', error);
  });
};
