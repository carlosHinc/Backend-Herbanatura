// Backend/src/controllers/ordersController.js
const Order = require("../models/Order");

const ordersController = {
  /**
   * POST /api/orders - Crear un nuevo pedido
   * Body: {
   *   batches: [
   *     {
   *       idProduct: number,
   *       batchName: string,
   *       expirationDate: string (YYYY-MM-DD),
   *       stock: number,
   *       unitPurchasePrice: number
   *     }
   *   ]
   * }
   */
  async create(req, res) {
    try {
      const { batches } = req.body;

      // Validación: batches debe ser un array
      if (!batches || !Array.isArray(batches) || batches.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Debes proporcionar al menos un lote de productos",
        });
      }

      // Validar cada lote
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        if (!batch.idProduct) {
          return res.status(400).json({
            success: false,
            message: `Lote ${i + 1}: El ID del producto es obligatorio`,
          });
        }

        if (!batch.batchName || !batch.batchName.trim()) {
          return res.status(400).json({
            success: false,
            message: `Lote ${i + 1}: El nombre del lote es obligatorio`,
          });
        }

        if (!batch.expirationDate) {
          return res.status(400).json({
            success: false,
            message: `Lote ${i + 1}: La fecha de vencimiento es obligatoria`,
          });
        }

        // Validar que la fecha sea futura
        const expirationDate = new Date(batch.expirationDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expirationDate < today) {
          return res.status(400).json({
            success: false,
            message: `Lote ${i + 1}: La fecha de vencimiento debe ser futura`,
          });
        }

        if (!batch.stock || batch.stock < 1) {
          return res.status(400).json({
            success: false,
            message: `Lote ${i + 1}: La cantidad debe ser mayor a 0`,
          });
        }

        if (
          batch.unitPurchasePrice === undefined ||
          batch.unitPurchasePrice < 0
        ) {
          return res.status(400).json({
            success: false,
            message: `Lote ${i + 1}: El precio unitario no puede ser negativo`,
          });
        }
      }

      // Crear el pedido
      const order = await Order.createOrder(batches);

      res.status(201).json({
        success: true,
        message: "Pedido creado exitosamente",
        data: order,
      });
    } catch (error) {
      console.error("Error al crear pedido:", error);

      if (error.message.includes("no existen")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error al crear el pedido",
        error: error.message,
      });
    }
  },

  /**
   * GET /api/orders - Obtener todos los pedidos
   */
  async getAll(req, res) {
    try {
      const orders = await Order.getAllOrders();

      res.status(200).json({
        success: true,
        message: "Pedidos obtenidos exitosamente",
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener los pedidos",
        error: error.message,
      });
    }
  },

  /**
   * GET /api/orders/:id - Obtener un pedido por ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Pedido no encontrado",
        });
      }

      res.status(200).json({
        success: true,
        message: "Pedido obtenido exitosamente",
        data: order,
      });
    } catch (error) {
      console.error("Error al obtener pedido:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener el pedido",
        error: error.message,
      });
    }
  },
};

module.exports = ordersController;
