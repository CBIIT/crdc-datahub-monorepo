const session = require('express-session');
const {randomBytes} = require("crypto");
const MongoStore = require('connect-mongo');
const config = require('../config');
const {ConnectionString} = require("../database-drivers/database-connector");
function createSession({ sessionSecret, session_timeout } = {}) {
    sessionSecret = sessionSecret || randomBytes(16).toString("hex");
    return session({
        secret: sessionSecret,
        // rolling: true,
        saveUninitialized: false,
        resave: true,
        store: MongoStore.create({
            mongoUrl: ConnectionString,
            touchAfter: session_timeout // time period in seconds
        })
    });
}

module.exports = {
    createSession
};