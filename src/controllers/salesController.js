// Backend/src/controllers/salesController.js
const Sale = require("../models/Sale");

const salesController = {
  /**
   * POST /api/sales - Crear una nueva venta
   * Body: {
   *   description: string,
   *   products: [
   *     {
   *       idProduct: number,
   *       unitValue: number,
   *       stock: number
   *     }
   *   ]
   * }
   */
  async create(req, res) {
    try {
      const { description, products } = req.body;

      // Validaciones básicas
      if (!description || !description.trim()) {
        return res.status(400).json({
          success: false,
          message: "La descripción de la venta es obligatoria",
        });
      }

      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Debes proporcionar al menos un producto para la venta",
        });
      }

      // Validar cada producto
      for (let i = 0; i < products.length; i++) {
        const product = products[i];

        if (!product.idProduct) {
          return res.status(400).json({
            success: false,
            message: `Producto ${i + 1}: El ID del producto es obligatorio`,
          });
        }

        if (!product.stock || product.stock < 1) {
          return res.status(400).json({
            success: false,
            message: `Producto ${i + 1}: La cantidad debe ser mayor a 0`,
          });
        }

        if (product.unitPrice === undefined || product.unitPrice < 0) {
          return res.status(400).json({
            success: false,
            message: `Producto ${
              i + 1
            }: El precio unitario no puede ser negativo`,
          });
        }

        // Verificar stock disponible
        const stockCheck = await Sale.checkProductStock(
          product.idProduct,
          product.stock
        );

        if (!stockCheck.available) {
          return res.status(400).json({
            success: false,
            message: `Producto ${i + 1}: Stock insuficiente. Disponible: ${
              stockCheck.totalStock
            }, Requerido: ${stockCheck.required}`,
          });
        }
      }

      // Crear la venta
      const saleData = {
        description: description.trim(),
        products: products,
      };

      const sale = await Sale.createSale(saleData);

      res.status(201).json({
        success: true,
        message: "Venta creada exitosamente",
        data: sale,
      });
    } catch (error) {
      console.error("Error al crear venta:", error);

      if (error.message.includes("Stock insuficiente")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error al crear la venta",
        error: error.message,
      });
    }
  },

  /**
   * GET /api/sales - Obtener todas las ventas
   */
  async getAll(req, res) {
    try {
      const sales = await Sale.getAllSales();

      res.status(200).json({
        success: true,
        message: "Ventas obtenidas exitosamente",
        data: sales,
        count: sales.length,
      });
    } catch (error) {
      console.error("Error al obtener ventas:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener las ventas",
        error: error.message,
      });
    }
  },

  /**
   * GET /api/sales/:id - Obtener una venta por ID con sus detalles
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const sale = await Sale.getSaleById(id);

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Venta no encontrada",
        });
      }

      res.status(200).json({
        success: true,
        message: "Venta obtenida exitosamente",
        data: sale,
      });
    } catch (error) {
      console.error("Error al obtener venta:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener la venta",
        error: error.message,
      });
    }
  },
};

module.exports = salesController;
