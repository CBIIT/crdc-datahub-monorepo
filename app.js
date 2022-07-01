const newrelic = require('newrelic');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
const {createSession} = require("./services/session");
var logger = require('morgan');
const fs = require('fs');
const cors = require('cors');
const config = require('./config');
const {createProxyMiddleware, fixRequestBody} = require('http-proxy-middleware');
console.log(config);

const LOG_FOLDER = 'logs';
if (!fs.existsSync(LOG_FOLDER)) {
  fs.mkdirSync(LOG_FOLDER);
}


// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, LOG_FOLDER, 'access.log'), { flags: 'a'})

var authRouter = require('./routes/auth');
var app = express();
app.use(cors());

// setup the logger
app.use(logger('combined', { stream: accessLogStream }))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(createSession({ sessionSecret: config.cookie_secret, session_timeout: config.session_timeout }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRouter);

if (config.authorization_enabled) {
  app.use((req, res, next) => {
      if (req.session.userInfo){
          req.headers['email'] = req.session.userInfo.email;
          req.headers['idp'] = req.session.userInfo.idp;
      }
      next();
  });
  app.use('/api/auth/graphql', createProxyMiddleware({
      target: config.authorization_url+'/api/users/graphql',
      changeOrigin: true,
      onProxyReq: fixRequestBody
  }));
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json(res.locals.message);
});

module.exports = app;
