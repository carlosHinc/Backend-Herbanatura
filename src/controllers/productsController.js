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

  /**
   * GET /api/products/for-sale - Obtener productos disponibles para venta
   */
  async getProductsForSale(req, res) {
    try {
      const products = await Product.getProductsForSale();

      res.status(200).json({
        success: true,
        message: "Productos disponibles para venta obtenidos exitosamente",
        data: products,
        count: products.length,
      });
    } catch (error) {
      console.error("Error al obtener productos para venta:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener los productos disponibles para venta",
        error: error.message,
      });
    }
  },

  /**
   * GET /api/products/expiring?days=30 - Obtener productos próximos a vencer
   */
  async getExpiringProducts(req, res) {
    try {
      const { days } = req.query;

      // Validar que days sea un número válido
      if (!days || isNaN(days) || parseInt(days) < 1) {
        return res.status(400).json({
          success: false,
          message: 'El parámetro "days" debe ser un número mayor a 0',
        });
      }

      const daysNumber = parseInt(days);

      const expiringProducts = await Product.getExpiringProducts(daysNumber);

      res.status(200).json({
        success: true,
        message: `Productos que vencen en los próximos ${daysNumber} días`,
        data: expiringProducts,
        count: expiringProducts.length,
        daysFilter: daysNumber,
      });
    } catch (error) {
      console.error("Error al obtener productos próximos a vencer:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener los productos próximos a vencer",
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

  /*
  // Crear un nuevo producto
  async create(req, res) {
    try {
      const {
        name,
        idLaboratory,
        description,
        salesPrice,
        batchNumber,
        expirationDate,
        stock,
        unitPurchasePrice,
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

      // Validar salesPrice si se proporciona
      if (
        salesPrice !== undefined &&
        salesPrice !== null &&
        salesPrice !== ""
      ) {
        const salePriceNum = parseInt(salesPrice);
        if (isNaN(salePriceNum) || salePriceNum < 0) {
          return res.status(400).json({
            success: false,
            message:
              "El precio de venta debe ser un número válido mayor o igual a 0",
          });
        }
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
      let totalPurchasePrice = null;
      if (batchNumber || expirationDate || stock || unitPurchasePrice) {
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

        if (unitPurchasePrice && unitPurchasePrice < 0) {
          return res.status(400).json({
            success: false,
            message: "El precio de compra unitario no puede ser negativo",
          });
        }

        // Calcular el precio total de compra
        const unitPrice = parseInt(unitPurchasePrice) || 0;
        const quantity = parseInt(stock) || 0;
        totalPurchasePrice = unitPrice * quantity;
      }

      // Preparar datos del producto
      const productData = {
        name: name.trim(),
        idLaboratory: labId,
        description: description?.trim() || null,
        salesPrice: salesPrice ? parseInt(salesPrice) : null,
        batchNumber: batchNumber?.trim() || null,
        expirationDate: expirationDate || null,
        stock: stock ? parseInt(stock) : 0,
        unitPurchasePrice: unitPurchasePrice
          ? parseInt(unitPurchasePrice)
          : null,
        totalPurchasePrice: totalPurchasePrice,
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
  */

  /**
   * POST /api/products - Crear un nuevo producto
   */
  async create(req, res) {
    try {
      const {
        idLaboratory,
        name,
        description,
        salesPrice,
        batchNumber,
        expirationDate,
        stock,
        unitPurchasePrice,
      } = req.body;

      // Validaciones básicas
      if (!idLaboratory || !name) {
        return res.status(400).json({
          success: false,
          message: "El laboratorio y el nombre del producto son obligatorios",
        });
      }

      // Preparar datos del producto
      const productData = {
        idLaboratory: parseInt(idLaboratory),
        name: name.trim(),
        description: description?.trim(),
        salesPrice: salesPrice ? parseInt(salesPrice) : null,
      };

      // Si se proporciona información del lote
      if (batchNumber && expirationDate && stock) {
        productData.batchNumber = batchNumber.trim();
        productData.expirationDate = expirationDate;
        productData.stock = parseInt(stock);
        productData.unitPurchasePrice = unitPurchasePrice
          ? parseInt(unitPurchasePrice)
          : null;
        productData.totalPurchasePrice = productData.unitPurchasePrice
          ? productData.unitPurchasePrice * productData.stock
          : null;
      }

      const newProduct = await Product.create(productData);

      res.status(201).json({
        success: true,
        message: "Producto creado exitosamente",
        data: newProduct,
      });
    } catch (error) {
      console.error("Error al crear producto:", error);

      // Manejar errores específicos
      if (
        error.message === "El laboratorio especificado no existe" ||
        error.message ===
          "Ya existe un producto con ese nombre en el mismo laboratorio"
      ) {
        return res.status(400).json({
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

  /**
   * PUT /api/products/:id - Actualizar un producto
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { idLaboratory, name, description, salesPrice } = req.body;

      // Validar ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "ID de producto inválido",
        });
      }

      // Validar que al menos un campo esté presente
      if (
        idLaboratory === undefined &&
        name === undefined &&
        description === undefined &&
        salesPrice === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Debe proporcionar al menos un campo para actualizar",
        });
      }

      // Validaciones específicas
      if (name !== undefined && name.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "El nombre del producto no puede estar vacío",
        });
      }

      if (
        idLaboratory !== undefined &&
        (!idLaboratory || isNaN(idLaboratory))
      ) {
        return res.status(400).json({
          success: false,
          message: "ID de laboratorio inválido",
        });
      }

      if (salesPrice !== undefined && salesPrice !== null && salesPrice < 0) {
        return res.status(400).json({
          success: false,
          message: "El precio de venta no puede ser negativo",
        });
      }

      // Preparar datos para actualizar
      const productData = {};
      if (idLaboratory !== undefined)
        productData.idLaboratory = parseInt(idLaboratory);
      if (name !== undefined) productData.name = name.trim();
      if (description !== undefined)
        productData.description = description?.trim() || null;
      if (salesPrice !== undefined)
        productData.salesPrice = salesPrice ? parseInt(salesPrice) : null;

      // Actualizar producto
      const updatedProduct = await Product.update(parseInt(id), productData);

      res.status(200).json({
        success: true,
        message: "Producto actualizado exitosamente",
        data: updatedProduct,
      });
    } catch (error) {
      console.error("Error al actualizar producto:", error);

      // Errores específicos
      if (error.message === "Producto no encontrado") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (
        error.message === "Ya existe otro producto con ese nombre" ||
        error.message === "El laboratorio especificado no existe"
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error al actualizar el producto",
        error: error.message,
      });
    }
  },
};

module.exports = productsController;
