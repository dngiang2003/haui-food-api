const jwt = require('jsonwebtoken');
const twoFactor = require('node-2fa');
const httpStatus = require('http-status');

const { env } = require('../config');
const ApiError = require('../utils/ApiError');
const userService = require('./user.service');
const emailService = require('./email.service');
const tokenMappings = require('../constants/jwt.constant');
const { userMessage, authMessage } = require('../messages');
const { CODE_VERIFY_2FA_SUCCESS } = require('../constants');
const { error } = require('winston');

const login = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, authMessage().INVALID_LOGIN);
  }
  if (user.isLocked) {
    throw new ApiError(httpStatus.LOCKED, userMessage().USER_LOCKED);
  }
  if (user.is2FA) {
    const twoFaToken = generateToken('twoFA', { id: user.id });
    return { twoFaToken, user };
  }
  const accessToken = generateToken('access', { id: user.id, email, role: user.role });
  const refreshToken = generateToken('refresh', { id: user.id });
  user.lastActive = Date.now();
  await user.save();
  user.password = undefined;
  return { user, accessToken, refreshToken };
};

const register = async (fullname, email, password) => {
  const registerData = {
    fullname,
    email,
    password,
    verifyExpireAt: Date.now() + 1000 * 60 * 10,
  };
  const user = await userService.createUser(registerData);
  const tokenVerify = generateToken('verify', { id: user.id });
  const linkVerify = `https://api.hauifood.com/api/v1/auth/verify?token=${tokenVerify}`;
  await emailService.sendEmail({
    emailData: {
      emails: email,
      subject: '[HaUI Food] Verify your email address',
      linkVerify,
    },
    type: 'verify',
  });
};

const refreshToken = async (refreshToken) => {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.secretRefresh);
  } catch (err) {
    throw new ApiError(httpStatus.BAD_REQUEST, authMessage().INVALID_TOKEN);
  }
  if (!payload || payload.type !== 'refresh') {
    throw new ApiError(httpStatus.BAD_REQUEST, authMessage().INVALID_TOKEN);
  }
  const user = await userService.getUserById(payload.id);
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, authMessage().INVALID_TOKEN);
  }
  if (user.isLocked) {
    throw new ApiError(httpStatus.UNAUTHORIZED, userMessage().USER_LOCKED);
  }
  const accessToken = generateToken('access', { id: user.id, email: user.email, role: user.role });
  return { accessToken };
};

const generateToken = (type, payload) => {
  const { secret, expiresIn } = tokenMappings[type];
  const token = jwt.sign({ ...payload, type }, secret, {
    expiresIn,
  });
  return token;
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await userService.getUserById(userId);
  if (!(await user.isPasswordMatch(oldPassword))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, authMessage().INVALID_PASSWORD);
  }
  user.password = newPassword;
  await user.save();
  user.password = undefined;
  return user;
};

const toggleTwoFactorAuthentication = async (userId, code = '') => {
  const user = await userService.getUserById(userId);
  if (!user.is2FA && !(await user.is2FAMatch(code))) {
    throw new ApiError(httpStatus.BAD_REQUEST, authMessage().INVALID_2FA_CODE);
  }
  user.is2FA = !user.is2FA;
  await user.save();
  user.password = undefined;
  return user;
};

const loginWith2FA = async (token2FA, code) => {
  const payload = jwt.verify(token2FA, env.jwt.secret2FA);
  const user = await userService.getUserById(payload.id);
  if (!user || !(await user.is2FAMatch(code))) {
    throw new ApiError(httpStatus.BAD_REQUEST, authMessage().INVALID_2FA_CODE);
  }
  const accessToken = generateToken('access', { id: user.id, email: user.email, role: user.role });
  const refreshToken = generateToken('refresh', { id: user.id });
  user.lastActive = Date.now();
  await user.save();
  user.password = undefined;
  return { user, accessToken, refreshToken };
};

const generate2FASecret = () => {
  const { secret } = twoFactor.generateSecret();
  return secret;
};

const verify2FA = (secret, code) => {
  const result = twoFactor.verifyToken(secret, code);
  console.log(result);
  if (!result) return false;
  return CODE_VERIFY_2FA_SUCCESS.includes(result.delta);
};

const change2FASecret = async (userId, secret, code) => {
  const user = await userService.getUserById(userId);
  const result = verify2FA(secret, code);
  if (!result) throw new ApiError(httpStatus.BAD_REQUEST, authMessage().INVALID_2FA_CODE);
  user.secret = secret;
  await user.save();
  user.password = undefined;
  return user;
};

const verifyEmail = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secretVerify);
  } catch (err) {
    let message = '';
    switch (err.message) {
      case 'jwt expired':
        message = authMessage().INVALID_TOKEN_VERIFY_EXPIRED;
        break;
      default:
        message = authMessage().INVALID_TOKEN;
        break;
    }
    throw new ApiError(httpStatus.BAD_REQUEST, message);
  }
  const user = await userService.getUserById(payload.id);
  if (!user || user?.isVerify) {
    throw new ApiError(httpStatus.BAD_REQUEST, authMessage().INVALID_TOKEN);
  }
  user.isVerify = true;
  user.verifyExpireAt = null;
  await user.save();
  user.password = undefined;
  return user;
};

module.exports = {
  login,
  register,
  verifyEmail,
  refreshToken,
  loginWith2FA,
  changePassword,
  change2FASecret,
  generate2FASecret,
  toggleTwoFactorAuthentication,
};
