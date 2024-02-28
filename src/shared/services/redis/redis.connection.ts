import Logger from 'bunyan';
import { config } from '@root/config';
import { BaseCache } from '@service/redis/base.cache';

const log: Logger = config.createLogger('RedisConnection');

class RedisConnection extends BaseCache {
  constructor() {
    super('RedisConnection');
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      const res = await this.client.ping();
      log.info(`Redis Ping Response: ${res}`);
    } catch (error) {
      log.error({ err: error }, 'Error connecting to Redis');
    }
  }
}

export const redisConnection: RedisConnection = new RedisConnection();
