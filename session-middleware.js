const session = require('express-session');
const {DATABASE_NAME, SESSION_COLLECTION} = require("./database-constants");
const MongoStore = require("connect-mongo");

function createSession(sessionSecret, sessionTimeout, connectionString) {
    return function (req, res, next) {
        const disableResave = !(req.url === '/api/authn/session-ttl');
        session({
            secret: sessionSecret,
            // rolling: true,
            saveUninitialized: false,
            resave: disableResave,
            store: MongoStore.create({
                mongoUrl: connectionString,
                collectionName: SESSION_COLLECTION,
                dbName: DATABASE_NAME,
                touchAfter: sessionTimeout // time period in seconds
            }),
            cookie: { maxAge: sessionTimeout}
        })(req, res, next);
    };
}

module.exports = createSession;
