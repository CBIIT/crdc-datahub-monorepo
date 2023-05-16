const { MongoClient } = require('mongodb');
describe('insert', () => {
    let connection;
    let db;

    beforeAll(async () => {

    });

    afterAll(async () => {
        await connection.close();
    });

    it('should insert a doc into collection', async () => {
        connection = await MongoClient.connect('mongodb://admin:password@localhost:27017', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        db = await connection.db('test');
        console.log("connection successful")

/*
        console.log("");

        await db.createCollection("testtestetst", function(err, res) {
            if (err) throw err;
            console.log("Collection created!");
            db.close();
        });
*/


        // const users = db.collection('users');
        //
        // const mockUser = {_id: 'some-user-id', name: 'John'};
        // await users.insertOne(mockUser);
        //
        // const insertedUser = await users.findOne({_id: 'some-user-id'});
        // expect(insertedUser).toEqual(mockUser);
    });
});
