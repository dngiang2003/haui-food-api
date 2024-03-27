const { Cart } = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { cartMessage } = require('../messages');
const ApiFeature = require('../utils/ApiFeature');

const getCartById = async (id) => {
  const cart = await Cart.findById(id);
  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, cartMessage().NOT_FOUND);
  }
  return cart;
};

const createCart = async (cartBody) => {
  const cart = await Cart.create(cartBody);
  return cart;
};

const getCartsByKeyword = async (query) => {
  const apiFeature = new ApiFeature(Cart);
  const { results, ...detailResult } = await apiFeature.getResults(query, [
    'cartDetail',
    'userId',
    'isOrder',
    'totalMoney',
  ]);
  return { Carts: results, ...detailResult };
};

const updateCartById = async (cartId, updateBody) => {
  const cart = await getCartById(cartId);
  Object.assign(cart, updateBody);
  await cart.save();
  return cart;
};

const deleteCartById = async (cartId) => {
  const cart = await getCartById(cartId);
  await cart.deleteOne();
  return cart;
};

module.exports = {
  getCartById,
  createCart,
  getCartsByKeyword,
  updateCartById,
  deleteCartById,
};
