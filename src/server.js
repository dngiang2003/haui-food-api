const express = require('express');
const mongoose = require('mongoose');
const { env, logger, morgan } = require('./config');
const { errorConverter, errorHandler } = require('./middlewares/error.middleware');
const ApiError = require('./utils/ApiError');
const httpStatus = require('http-status');

const app = express();

if (env.nodeEnv !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

app.get('/', (req, res) => {
  res.send('Server HaUI Food is running 🎉');
});

app.all('*', (req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Resource not found.'));
});

app.use(errorConverter);
app.use(errorHandler);

mongoose
  .connect(env.mongoURI)
  .then(() => logger.info('MongoDB Connected...'))
  .then(() =>
    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    }),
  )
  .catch((err) => logger.error(err));
