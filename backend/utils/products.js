const mongoose = require("mongoose");
const Product = require("../models/Product");
const defaultProducts = require("../data/defaultProducts");

function fallbackProducts() {
  return defaultProducts.map(product => ({
    _id: product.slug,
    ...product
  }));
}

async function ensureDefaultProducts() {
  for (const product of defaultProducts) {
    await Product.updateOne(
      { slug: product.slug },
      { $setOnInsert: product },
      { upsert: true }
    );
  }
}

function productQuery(id) {
  return mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
}

function findFallbackProduct(id) {
  return fallbackProducts().find(product => {
    return [product._id, product.id, product.slug, product.name]
      .filter(Boolean)
      .map(String)
      .includes(String(id));
  });
}

module.exports = {
  ensureDefaultProducts,
  fallbackProducts,
  findFallbackProduct,
  productQuery
};
