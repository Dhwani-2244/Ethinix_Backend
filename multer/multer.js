const multer = require("multer");
const path = require("path");

const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/categories"),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});

const itemStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/items"),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/profiles"),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});



const categoryUpload = multer({ storage: categoryStorage });
const itemUpload = multer({ storage: itemStorage});
const profileUpload = multer({ storage: profileStorage});

module.exports = { categoryUpload, itemUpload, profileUpload };
