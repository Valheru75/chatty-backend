"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setupServer_1 = require("@root/setupServer");
const setupDatabase_1 = require("@root/setupDatabase");
const config_1 = require("@root/config");
const log = config_1.config.createLogger('app');
log.info('Initializing application...');
class Application {
    initialize() {
        this.loadConfig();
        (0, setupDatabase_1.databaseConnection)();
        const app = (0, express_1.default)();
        const server = new setupServer_1.ChattyServer(app);
        server.start();
    }
    loadConfig() {
        config_1.config.validateConfig();
    }
}
const application = new Application();
application.initialize();
//# sourceMappingURL=app.js.map