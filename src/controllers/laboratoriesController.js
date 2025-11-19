const Laboratory = require("../models/Laboratory");

const laboratoriesController = {
  // Obtener todos los laboratorios
  async getAll(req, res) {
    try {
      const laboratories = await Laboratory.getAll();

      res.status(200).json({
        success: true,
        message: "Laboratorios obtenidos exitosamente",
        data: laboratories,
        count: laboratories.length,
      });
    } catch (error) {
      console.error("Error al obtener laboratorios:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener los laboratorios",
        error: error.message,
      });
    }
  },

  // Obtener laboratorio por ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const laboratory = await Laboratory.getById(id);

      if (!laboratory) {
        return res.status(404).json({
          success: false,
          message: "Laboratorio no encontrado",
        });
      }

      res.status(200).json({
        success: true,
        message: "Laboratorio obtenido exitosamente",
        data: laboratory,
      });
    } catch (error) {
      console.error("Error al obtener laboratorio:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener el laboratorio",
        error: error.message,
      });
    }
  },

  // Crear un nuevo laboratorio
  async create(req, res) {
    try {
      const { name } = req.body;

      // Validaciones
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "El nombre del laboratorio es obligatorio",
        });
      }

      if (name.trim().length > 255) {
        return res.status(400).json({
          success: false,
          message: "El nombre del laboratorio no puede exceder 255 caracteres",
        });
      }

      // Verificar si ya existe
      const exists = await Laboratory.existsByName(name);
      if (exists) {
        return res.status(409).json({
          success: false,
          message: "Ya existe un laboratorio con ese nombre",
        });
      }

      // Crear el laboratorio
      const newLaboratory = await Laboratory.create(name.trim());

      res.status(201).json({
        success: true,
        message: "Laboratorio creado exitosamente",
        data: newLaboratory,
      });
    } catch (error) {
      console.error("Error al crear laboratorio:", error);

      if (error.message === "Ya existe un laboratorio con ese nombre") {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error al crear el laboratorio",
        error: error.message,
      });
    }
  },
};

module.exports = laboratoriesController;
