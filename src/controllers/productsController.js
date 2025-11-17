const Product = require("../models/Product");

const productsController = {
  // Obtener todos los productos
  async getAll(req, res) {
    try {
      const products = await Product.getAll();

      res.status(200).json({
        success: true,
        message: "Productos obtenidos exitosamente",
        data: products,
        count: products.length,
      });
    } catch (error) {
      console.error("Error al obtener productos:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener los productos",
        error: error.message,
      });
    }
  },

  // Obtener producto por ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.getById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado",
        });
      }

      res.status(200).json({
        success: true,
        message: "Producto obtenido exitosamente",
        data: product,
      });
    } catch (error) {
      console.error("Error al obtener producto:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener el producto",
        error: error.message,
      });
    }
  },

  // Crear un nuevo producto
  async create(req, res) {
    try {
      const {
        name,
        idLaboratory,
        description,
        batchNumber,
        expirationDate,
        stock,
        purchasePrice,
      } = req.body;

      // Validaciones básicas
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "El nombre del producto es obligatorio",
        });
      }

      if (!idLaboratory) {
        return res.status(400).json({
          success: false,
          message: "El ID del laboratorio es obligatorio",
        });
      }

      // Validar que idLaboratory sea un número válido
      const labId = parseInt(idLaboratory);
      if (isNaN(labId) || labId < 1) {
        return res.status(400).json({
          success: false,
          message: "El ID del laboratorio debe ser un número válido",
        });
      }

      // Validar que el nombre no tenga más de 255 caracteres
      if (name.trim().length > 255) {
        return res.status(400).json({
          success: false,
          message: "El nombre del producto no puede exceder 255 caracteres",
        });
      }

      // Verificar si el laboratorio existe
      const labExists = await Product.laboratoryExists(labId);
      if (!labExists) {
        return res.status(404).json({
          success: false,
          message: "El laboratorio especificado no existe",
        });
      }

      // Verificar si el producto ya existe
      const exists = await Product.existsByName(name);
      if (exists) {
        return res.status(409).json({
          success: false,
          message: "Ya existe un producto con ese nombre",
        });
      }

      // Validaciones para el lote (opcional)
      if (batchNumber || expirationDate || stock || purchasePrice) {
        if (!batchNumber || !batchNumber.trim()) {
          return res.status(400).json({
            success: false,
            message:
              "El número de lote es obligatorio si deseas agregar stock inicial",
          });
        }

        if (!expirationDate) {
          return res.status(400).json({
            success: false,
            message:
              "La fecha de vencimiento es obligatoria si deseas agregar stock inicial",
          });
        }

        if (!stock || stock < 1) {
          return res.status(400).json({
            success: false,
            message: "La cantidad de stock debe ser mayor a 0",
          });
        }

        // Validar que la fecha de vencimiento sea futura
        const expirationDateObj = new Date(expirationDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expirationDateObj < today) {
          return res.status(400).json({
            success: false,
            message: "La fecha de vencimiento debe ser futura",
          });
        }

        if (purchasePrice && purchasePrice < 0) {
          return res.status(400).json({
            success: false,
            message: "El precio de compra no puede ser negativo",
          });
        }
      }

      // Preparar datos del producto
      const productData = {
        name: name.trim(),
        idLaboratory: labId,
        description: description?.trim() || null,
        batchNumber: batchNumber?.trim() || null,
        expirationDate: expirationDate || null,
        stock: stock ? parseInt(stock) : 0,
        purchasePrice: purchasePrice ? parseInt(purchasePrice) : null,
      };

      // Crear el producto
      const newProduct = await Product.create(productData);

      res.status(201).json({
        success: true,
        message: "Producto creado exitosamente",
        data: newProduct,
      });
    } catch (error) {
      console.error("Error al crear producto:", error);

      if (error.message === "El laboratorio especificado no existe") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error al crear el producto",
        error: error.message,
      });
    }
  },
};

module.exports = productsController;
