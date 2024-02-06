"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConnection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("@root/config");
const log = config_1.config.createLogger('database');
const databaseUri = config_1.config.DATABASE_URL;
const databaseConnection = () => {
    const connect = () => {
        mongoose_1.default
            .connect(databaseUri)
            .then(() => log.info('Successfully connected to database.'))
            .catch((error) => {
            log.error('Error connecting to database', error);
            setTimeout(connect, 5000); // Retry after 5 seconds
        });
    };
    connect();
    mongoose_1.default.connection.on('disconnected', () => {
        log.info('Database connection lost. Attempting to reconnect...');
        connect();
    });
    mongoose_1.default.connection.on('error', (error) => {
        log.error('Database connection error:', error);
    });
};
exports.databaseConnection = databaseConnection;
//# sourceMappingURL=setupDatabase.js.map