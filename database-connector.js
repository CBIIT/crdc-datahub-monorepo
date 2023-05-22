const config = require("../config");
const MongoClient = require('mongodb').MongoClient;

const ConnectionString = `mongodb://${config.mongo_db_user}:${config.mongo_db_password}@${config.mongo_db_host}:${config.mongo_db_port}`;
class DatabaseConnector {
    constructor() {
        this.client = null;
    }

    async connect() {
        try {
            this.client = new MongoClient(ConnectionString, { useNewUrlParser: true, useUnifiedTopology: true });
            await this.client.connect();
            console.log('Connected to MongoDB');

        } catch (err) {
            console.error('Error connecting to MongoDB:', err);
        }
        return this.client;
    }

    async disconnect() {
        try {
            if (this.client) {
                await this.client.close();
                console.log('Disconnected from MongoDB');
            }
        } catch (err) {
            console.error('Error disconnecting from MongoDB:', err);
        }
    }
}

module.exports = {
    DatabaseConnector,
    ConnectionString
};