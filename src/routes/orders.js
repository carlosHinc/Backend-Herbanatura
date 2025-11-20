// Backend/src/routes/orders.js
const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/ordersController");

// POST /api/orders - Crear un nuevo pedido
router.post("/", ordersController.create);

// GET /api/orders - Obtener todos los pedidos
router.get("/", ordersController.getAll);

// GET /api/orders/:id - Obtener pedido por ID
router.get("/:id", ordersController.getById);

module.exports = router;
