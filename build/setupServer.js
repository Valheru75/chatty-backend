"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChattyServer = void 0;
const express_1 = require("express");
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const hpp_1 = __importDefault(require("hpp"));
const cookie_session_1 = __importDefault(require("cookie-session"));
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const socket_io_1 = require("socket.io");
const redis_1 = require("redis");
const redis_adapter_1 = require("@socket.io/redis-adapter");
require("express-async-errors");
const compression_1 = __importDefault(require("compression"));
const config_1 = require("@root/config");
const routes_1 = __importDefault(require("@root/routes"));
const error_handler_1 = require("@global/helpers/error-handler");
const SERVER_PORT = 5000;
const log = config_1.config.createLogger('server');
class ChattyServer {
    constructor(app) {
        this.app = app;
        log.info('ChattyServer instance created.');
    }
    start() {
        log.info('Starting ChattyServer...');
        this.securityMiddleware(this.app);
        this.standardMiddleware(this.app);
        this.routesMiddleware(this.app);
        this.globalErrorHandler(this.app);
        this.startServer(this.app);
        log.info('ChattyServer startup sequence completed.');
    }
    securityMiddleware(app) {
        log.info('Configuring security middleware...');
        app.use((0, cookie_session_1.default)({
            name: 'session',
            keys: [config_1.config.SECRET_KEY_ONE, config_1.config.SECRET_KEY_TWO],
            maxAge: 24 * 7 * 3600000,
            secure: config_1.config.NODE_ENV !== 'development'
        }));
        app.use((0, hpp_1.default)());
        app.use((0, helmet_1.default)());
        app.use((0, cors_1.default)({
            origin: config_1.config.CLIENT_URL,
            credentials: true,
            optionsSuccessStatus: 200,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        }));
        log.info('Security middleware configured.');
    }
    standardMiddleware(app) {
        log.info('Configuring standard middleware...');
        app.use((0, compression_1.default)());
        app.use((0, express_1.json)({ limit: '50mb' }));
        app.use((0, express_1.urlencoded)({ extended: true, limit: '50mb' }));
        log.info('Standard middleware configured.');
    }
    routesMiddleware(app) {
        (0, routes_1.default)(app);
    }
    globalErrorHandler(app) {
        // Catch-all handler for undefined routes
        app.all('*', (req, res) => {
            res.status(http_status_codes_1.default.NOT_FOUND).json({ message: `Route ${req.originalUrl} not found` });
        });
        // Global error handling middleware
        app.use((error, _req, res, _next) => {
            log.error(error); // Consider more advanced logging for production
            if (error instanceof error_handler_1.CustomError) {
                return res.status(error.statusCode).json(error.serializeErrors());
            }
            // Handle unexpected errors
            res.status(http_status_codes_1.default.INTERNAL_SERVER_ERROR).json({
                message: 'Something went wrong',
                status: 'error',
                statusCode: http_status_codes_1.default.INTERNAL_SERVER_ERROR
            });
        });
    }
    startServer(app) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                log.info('Starting server...');
                const httpServer = new http_1.default.Server(app);
                const socketIO = yield this.createSocketIO(httpServer);
                yield this.startHttpServer(httpServer);
                this.socketIOConnections(socketIO);
            }
            catch (error) {
                log.error('Failed to start the server:', error);
            }
        });
    }
    createSocketIO(httpServer) {
        return __awaiter(this, void 0, void 0, function* () {
            const io = new socket_io_1.Server(httpServer, {
                cors: {
                    origin: config_1.config.CLIENT_URL,
                    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
                }
            });
            const MAX_RETRIES = 5; // Set this to the maximum number of reconnection attempts you want to allow
            const createRedisClient = (url) => {
                return (0, redis_1.createClient)({
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
            const pubClient = createRedisClient(config_1.config.REDIS_HOST);
            const subClient = createRedisClient(config_1.config.REDIS_HOST).duplicate();
            // Setup event listeners for Redis clients
            pubClient.on('connect', () => log.info('Redis publisher client connected'));
            pubClient.on('error', (err) => log.error('Redis publisher client error:', err));
            subClient.on('connect', () => log.info('Redis subscriber client connected'));
            subClient.on('error', (err) => log.error('Redis subscriber client error:', err));
            try {
                // Connect both Redis clients
                yield Promise.all([pubClient.connect(), subClient.connect()]);
                log.info('Both Redis clients connected successfully');
                // Set up the Redis adapter for Socket.IO
                io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
            }
            catch (error) {
                log.error('Error connecting to Redis:', error);
                throw error; // Optionally rethrow the error to handle it further up
            }
            return io;
        });
    }
    startHttpServer(httpServer) {
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
    socketIOConnections(io) {
        log.info('socketIOConnections');
    }
}
exports.ChattyServer = ChattyServer;
//# sourceMappingURL=setupServer.js.map