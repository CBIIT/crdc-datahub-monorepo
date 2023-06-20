const DATABASE_ERROR = new Error("Database operation failed, please see logs for more information");
class MongoDBCollection {

    constructor(client, databaseName, collectionName) {
        this.collection = client.db(databaseName).collection(collectionName);
    }

    async find(id){
        try{
            return await this.collection.find({_id: id}).toArray();
        }
        catch (e){
            console.debug("An exception occurred during a find operation");
            console.debug(e);
            throw DATABASE_ERROR;
        }
    }

    async aggregate(pipeline){
        try{
            return await this.collection.aggregate(pipeline).toArray()
        }
        catch (e){
            console.debug("An exception occurred during an aggregate operation");
            console.debug(e);
            throw DATABASE_ERROR;
        }
    }

    async insert(application){
        try{
            return await this.collection.insertOne(application);
        }
        catch (e){
            console.debug("An exception occurred during an insert operation");
            console.debug(e);
            throw DATABASE_ERROR;
        }
    }

    async update(application) {
        const filter = {
            _id: application._id
        };
        const updateDoc = {
            $set: application
        };
        try{
            return await this.collection.updateOne(filter, updateDoc);
        }
        catch (e){
            console.debug("An exception occurred during an update one operation");
            console.debug(e);
            throw DATABASE_ERROR;
        }
    }
}

module.exports = {
    MongoDBCollection
}
