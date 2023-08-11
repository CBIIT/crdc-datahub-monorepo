const config = require('../config');
const {DatabaseConnector} = require("../crdc-datahub-database-drivers/database-connector");
const {MongoDBCollection} = require("../crdc-datahub-database-drivers/mongodb-collection");
const {DATABASE_NAME, SESSION_COLLECTION} = require("../crdc-datahub-database-drivers/database-constants");
const dbConnector = new DatabaseConnector(config.mongo_db_connection_string);




const getTTL = (req, res) => {
    const sessionID = req.sessionID
    if (sessionID){
        let expires = req.session.cookie.expires;
        if (!expires){
            response = {ttl: 0}
        }
        else {
            let dt = new Date(expires);
            let ttl = Math.round((dt.valueOf() - Date.now()));
            response = {ttl: ttl};
        }
        res.json(response)
    } else {
        res.json({ttl: null, error: "An internal server error occurred, please contact the administrators"});
    }
}



module.exports = {
    getTTL
}