const httpStatus = require('http-status');

const response = require('../utils/response');
const { userService } = require('../services');
const { userMessage } = require('../messages');
const catchAsync = require('../utils/catchAsync');
const { REQUEST_USER_KEY } = require('../constants');

const createUser = catchAsync(async (req, res) => {
  if (req.file) req.body['avatar'] = req.file.path;
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).json(response(httpStatus.CREATED, userMessage().CREATE_SUCCESS, user));
});

const getUsers = catchAsync(async (req, res) => {
  const users = await userService.getUsersByKeyword(req.query);
  res.status(httpStatus.OK).json(response(httpStatus.OK, userMessage().FIND_LIST_SUCCESS, users));
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId || req[REQUEST_USER_KEY].id);
  res.status(httpStatus.OK).json(response(httpStatus.OK, userMessage().FIND_SUCCESS, user));
});

const updateUser = catchAsync(async (req, res) => {
  if (req.file) req.body['avatar'] = req.file.path;
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.status(httpStatus.OK).json(response(httpStatus.OK, userMessage().UPDATE_SUCCESS, user));
});

const deleteUser = catchAsync(async (req, res) => {
  const user = await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.OK).json(response(httpStatus.OK, userMessage().DELETE_SUCCESS, user));
});

const lockUser = catchAsync(async (req, res) => {
  const user = await userService.lockUserById(req.params.userId);
  user.password = undefined;
  res
    .status(httpStatus.OK)
    .json(response(httpStatus.OK, user.isLocked ? userMessage().LOCKED_SUCCESS : userMessage().UNLOCKED_SUCCESS, user));
});

const exportExcel = catchAsync(async (req, res) => {
  const wb = await userService.exportExcel(req.query);
  wb.writeToBuffer().then((buffer) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + `users-hauifood.com-${Date.now()}.xlsx`);
    res.send(buffer);
  });
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  lockUser,
  exportExcel,
};
