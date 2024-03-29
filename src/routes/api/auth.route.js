const express = require('express');

const { authController } = require('../../controllers');
const { authValidation } = require('../../validations');
const { auth } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');

const authRouter = express.Router();

authRouter.route('/me').get(auth, authController.getMe);

authRouter.route('/login').post(validate(authValidation.login), authController.login);

authRouter.route('/register').post(validate(authValidation.register), authController.register);

authRouter.route('/refresh-token').post(validate(authValidation.refreshToken), authController.refreshToken);

module.exports = authRouter;
