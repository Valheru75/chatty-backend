"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const bunyan_1 = __importDefault(require("bunyan"));
dotenv_1.default.config({});
class Config {
    constructor() {
        this.DEFAULT_DATABASE_URL = 'mongodb://localhost:27017/chattyapp-backend';
        this.DEFAULT_CLIENT_URL = 'http://localhost:3000';
        this.DEFAULT_REDIS_HOST = 'redis://localhost:6379';
        this.DATABASE_URL = process.env.DATABASE_URL || this.DEFAULT_DATABASE_URL;
        this.CLIENT_URL = process.env.CLIENT_URL || this.DEFAULT_CLIENT_URL;
        this.REDIS_HOST = process.env.REDIS_HOST || this.DEFAULT_REDIS_HOST;
        this.JWT_TOKEN = process.env.JWT_TOKEN || '';
        this.NODE_ENV = process.env.NODE_ENV || 'development';
        this.SECRET_KEY_ONE = process.env.SECRET_KEY_ONE || '';
        this.SECRET_KEY_TWO = process.env.SECRET_KEY_TWO || '';
    }
    createLogger(name) {
        return bunyan_1.default.createLogger({ name, level: 'debug' });
    }
    validateConfig() {
        const requiredConfigs = ['JWT_TOKEN', 'SECRET_KEY_ONE', 'SECRET_KEY_TWO'];
        for (const key of requiredConfigs) {
            if (this[key] === undefined || this[key] === '') {
                // Check for both undefined and empty string
                throw new Error(`Configuration for ${key} must be explicitly set and not empty.`);
            }
        }
    }
}
exports.config = new Config();
//# sourceMappingURL=config.js.map