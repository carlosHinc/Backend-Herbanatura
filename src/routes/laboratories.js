const express = require("express");
const router = express.Router();
const laboratoriesController = require("../controllers/laboratoriesController");

// GET /api/laboratories - Obtener todos los laboratorios
router.get("/", laboratoriesController.getAll);

// GET /api/laboratories/:id - Obtener laboratorio por ID
router.get("/:id", laboratoriesController.getById);

// POST /api/laboratories - Crear un nuevo laboratorio
router.post("/", laboratoriesController.create);

module.exports = router;
