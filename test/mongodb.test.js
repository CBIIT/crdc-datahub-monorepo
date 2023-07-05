const {MongoQueries} = require("../crdc-datahub-database-drivers/mongo-queries");
const config = require("../config");
const {DATABASE_NAME} = require("../crdc-datahub-database-drivers/database-constants");

describe('Mongo DB Test', () => {
    test('/find document',  async () => {
        const mongoQueries = new MongoQueries(config.mongo_db_connection_string, DATABASE_NAME);
        const result = await mongoQueries.find("users", {name: 'John'})
        console.log(result);
    });

    test('/insert document',  async () => {
        const mongoQueries = new MongoQueries(config.mongo_db_connection_string, DATABASE_NAME);
        const result = await mongoQueries.insertOne("users", {name: 'mongo users'})
        console.log("")
    });

    test('/update one document',  async () => {
        const mongoQueries = new MongoQueries(config.mongo_db_connection_string, DATABASE_NAME);
        await mongoQueries.updateOne("users", { "name": "updated name"},
            {
                $set: { "name": "John", city: "Seoul" }
            });
    });

    test('/update many document',  async () => {
        const mongoQueries = new MongoQueries(config.mongo_db_connection_string, DATABASE_NAME);
        await mongoQueries.updateMany("users", { name: "John"},
            {
                $set: { "name": "John test", city: "New York" }
            })
    });

    test('/delete one document',  async () => {
        const mongoQueries = new MongoQueries(config.mongo_db_connection_string, DATABASE_NAME);
        await mongoQueries.deleteOne("users", { name: "John" });
    });

    test('/delete many document',  async () => {
        const mongoQueries = new MongoQueries(config.mongo_db_connection_string, DATABASE_NAME);
        await mongoQueries.deleteMany("users", { age: {$lt : 20}  })
    });

});