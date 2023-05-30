const {MongoQueries} = require("../database-drivers/mongo-queries");

describe('Mongo DB Test', () => {
    test('/find document',  async () => {
        const mongoQueries = new MongoQueries();
        const result = await mongoQueries.find("users", {name: 'John'})
        console.log(result);
    });

    test('/insert document',  async () => {
        const mongoQueries = new MongoQueries();
        const result = await mongoQueries.insertOne("users", {name: 'mongo users'})
        console.log("")
    });

    test('/update one document',  async () => {
        const mongoQueries = new MongoQueries();
        await mongoQueries.updateOne("users", { "name": "updated name"},
            {
                $set: { "name": "John", city: "Seoul" }
            });
    });

    test('/update many document',  async () => {
        const mongoQueries = new MongoQueries();
        await mongoQueries.updateMany("users", { name: "John"},
            {
                $set: { "name": "John test", city: "New York" }
            })
    });

    test('/delete one document',  async () => {
        const mongoQueries = new MongoQueries();
        await mongoQueries.deleteOne("users", { name: "John" });
    });

    test('/delete many document',  async () => {
        const mongoQueries = new MongoQueries();
        await mongoQueries.deleteMany("users", { age: {$lt : 20}  })
    });

});