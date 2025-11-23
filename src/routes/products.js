const express = require("express");
const router = express.Router();
const productsController = require("../controllers/productsController");

// GET /api/products - Obtener todos los productos
router.get("/", productsController.getAll);

// GET /api/products/for-sale - Obtener productos disponibles para venta
// IMPORTANTE: Esta ruta debe ir ANTES de /:id
router.get("/for-sale", productsController.getProductsForSale);

// GET /api/products/:id - Obtener producto por ID
router.get("/:id", productsController.getById);

// POST /api/products - Crear un nuevo producto
router.post("/", productsController.create);

module.exports = router;
