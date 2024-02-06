import { Application, json, urlencoded, Response, Request, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import cookieSession from 'cookie-session';
import HTTP_STATUS from 'http-status-codes';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import Logger from 'bunyan';
import 'express-async-errors';
import compression from 'compression';
import { config } from '@root/config';
import applicationRoutes from '@root/routes';
import { CustomError, IErrorResponse } from '@global/helpers/error-handler';

const SERVER_PORT = 5000;
const log: Logger = config.createLogger('server');

export class ChattyServer {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
    log.info('ChattyServer instance created.');
  }

  public start(): void {
    log.info('Starting ChattyServer...');
    this.securityMiddleware(this.app);
    this.standardMiddleware(this.app);
    this.routesMiddleware(this.app);
    this.globalErrorHandler(this.app);
    this.startServer(this.app);
    log.info('ChattyServer startup sequence completed.');
  }

  private securityMiddleware(app: Application): void {
    log.info('Configuring security middleware...');
    app.use(
      cookieSession({
        name: 'session',
        keys: [config.SECRET_KEY_ONE!, config.SECRET_KEY_TWO!],
        maxAge: 24 * 7 * 3600000,
        secure: config.NODE_ENV !== 'development'
      })
    );
    app.use(hpp());
    app.use(helmet());
    app.use(
      cors({
        origin: config.CLIENT_URL,
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      })
    );
    log.info('Security middleware configured.');
  }

  private standardMiddleware(app: Application): void {
    log.info('Configuring standard middleware...');
    app.use(compression());
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));
    log.info('Standard middleware configured.');
  }

  private routesMiddleware(app: Application): void {
    applicationRoutes(app);
  }

  private globalErrorHandler(app: Application): void {
    // Catch-all handler for undefined routes
    app.all('*', (req: Request, res: Response) => {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: `Route ${req.originalUrl} not found` });
    });

    // Global error handling middleware
    app.use((error: IErrorResponse, _req: Request, res: Response, _next: NextFunction) => {
      log.error(error); // Consider more advanced logging for production

      if (error instanceof CustomError) {
        return res.status(error.statusCode).json(error.serializeErrors());
      }

      // Handle unexpected errors
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: 'Something went wrong',
        status: 'error',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR
      });
    });
  }

  private async startServer(app: Application): Promise<void> {
    try {
      log.info('Starting server...');
      const httpServer: http.Server = new http.Server(app);
      const socketIO: Server = await this.createSocketIO(httpServer);
      await this.startHttpServer(httpServer);
      this.socketIOConnections(socketIO);
    } catch (error) {
      log.error('Failed to start the server:', error);
    }
  }

  private async createSocketIO(httpServer: http.Server): Promise<Server> {
    const io: Server = new Server(httpServer, {
      cors: {
        origin: config.CLIENT_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      }
    });

    const MAX_RETRIES = 5; // Set this to the maximum number of reconnection attempts you want to allow

    const createRedisClient = (url: string) => {
      return createClient({
        url: url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > MAX_RETRIES) {
              log.info('Max reconnection attempts reached for Redis client, giving up...');
              return new Error('Max reconnection attempts reached');
            }
            // Set a delay for reconnection attempts
            return Math.min(retries * 100, 3000); // Delay increases with each attempt, up to a maximum of 3000ms
          }
        }
      });
    };

    const pubClient = createRedisClient(config.REDIS_HOST!);
    const subClient = createRedisClient(config.REDIS_HOST!).duplicate();

    // Setup event listeners for Redis clients
    pubClient.on('connect', () => log.info('Redis publisher client connected'));
    pubClient.on('error', (err) => log.error('Redis publisher client error:', err));

    subClient.on('connect', () => log.info('Redis subscriber client connected'));
    subClient.on('error', (err) => log.error('Redis subscriber client error:', err));

    try {
      // Connect both Redis clients
      await Promise.all([pubClient.connect(), subClient.connect()]);
      log.info('Both Redis clients connected successfully');

      // Set up the Redis adapter for Socket.IO
      io.adapter(createAdapter(pubClient, subClient));
    } catch (error) {
      log.error('Error connecting to Redis:', error);
      throw error; // Optionally rethrow the error to handle it further up
    }

    return io;
  }

  private startHttpServer(httpServer: http.Server): Promise<void> {
    return new Promise((resolve, reject) => {
      log.info(`Attempting to start HTTP server on port ${SERVER_PORT}...`);
      httpServer
        .listen(SERVER_PORT, () => {
          log.info(`HTTP Server successfully running on port ${SERVER_PORT}`);
          resolve();
        })
        .on('error', (error) => {
          log.error('Error starting HTTP server:', error);
          reject(error);
        });
    });
  }

  private socketIOConnections(io: Server): void {
    log.info('socketIOConnections');
  }
}
