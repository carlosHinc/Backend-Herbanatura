const express = require("express");
const router = express.Router();
const productsController = require("../controllers/productsController");

// GET /api/products - Obtener todos los productos
router.get("/", productsController.getAll);

// GET /api/products/:id - Obtener producto por ID
router.get("/:id", productsController.getById);

// POST /api/products - Crear un nuevo producto
router.post("/", productsController.create);

module.exports = router;
