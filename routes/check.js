const express = require('express');
const router = express.Router();
const config = require('../config');
const {DatabaseConnector} = require("../crdc-datahub-database-drivers/database-connector");
const {MongoDBCollection} = require("../crdc-datahub-database-drivers/mongodb-collection");
const {DATABASE_NAME, SESSION_COLLECTION} = require("../crdc-datahub-database-drivers/database-constants");
const dbConnector = new DatabaseConnector(config.mongo_db_connection_string);
const {ttlSessions} = require('../services/ttl-query')


router.get('/session-ttl',async function(req, res){
    let sessionID
    let response
    if (!req || !req.cookies || !req.cookies["connect.sid"]){
        sessionID = null;
    }
    else{
        sessionID =  req.cookies["connect.sid"].match(':.*[.]')[0].slice(1,-1);
    }
    if (sessionID){
        dbConnector.connect().then( async () => {
            const sessionCollection = new MongoDBCollection(dbConnector.client, DATABASE_NAME, SESSION_COLLECTION);
            const dataInterface = new ttlSessions(sessionCollection)
            response = {
                ttl: await dataInterface.getSession(sessionID),
            }

            res.send(response);

        })
    }else{
        res.json({ttl: null, error: "No Session is found."});
    }
})

module.exports = router;
