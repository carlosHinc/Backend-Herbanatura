// Backend/src/routes/sales.js
const express = require("express");
const router = express.Router();
const salesController = require("../controllers/salesController");

// POST /api/sales - Crear una nueva venta
router.post("/", salesController.create);

// GET /api/sales - Obtener todas las ventas
router.get("/", salesController.getAll);

// GET /api/sales/:id - Obtener venta por ID con detalles
router.get("/:id", salesController.getById);

module.exports = router;
