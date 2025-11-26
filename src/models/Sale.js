// Backend/src/models/Sale.js
const pool = require("../config/database");

class Sale {
  /**
   * Crear una venta con sus detalles y descontar del inventario
   * @param {Object} saleData - Datos de la venta
   * @param {string} saleData.description - Descripción de la venta
   * @param {Array} saleData.products - Array de productos:
   *   [{
   *     idProduct: number,
   *     unitValue: number,
   *     stock: number
   *   }]
   */
  async createSale(saleData) {
    const client = await pool.connect();

    console.log("data", saleData);

    try {
      await client.query("BEGIN");

      // 1. Calcular el valor total de la venta
      let totalValue = 0;
      const productsToSell = [];

      for (const product of saleData.products) {
        const unitPrice = parseInt(product.unitPrice) || 0;
        const quantity = parseInt(product.stock) || 0;
        const totalPrice = unitPrice * quantity;

        totalValue += totalPrice;

        productsToSell.push({
          idProduct: product.idProduct,
          unitPrice: unitPrice,
          stock: quantity,
          totalPrice: totalPrice,
        });
      }

      // 2. Crear el registro de venta
      const saleQuery = `
        INSERT INTO sales (value, description)
        VALUES ($1, $2)
        RETURNING id, value, date, description, created_at
      `;

      const saleResult = await client.query(saleQuery, [
        totalValue,
        saleData.description,
      ]);

      const sale = saleResult.rows[0];

      // 3. Insertar detalles de venta y descontar del inventario
      const saleDetails = [];

      for (const product of productsToSell) {
        // 3.1. Insertar detalle de venta
        const detailQuery = `
          INSERT INTO sale_details (id_sale, id_product, unit_price, stock, total_price)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, id_sale, id_product, unit_price, stock, total_price
        `;

        const detailResult = await client.query(detailQuery, [
          sale.id,
          product.idProduct,
          product.unitPrice,
          product.stock,
          product.totalPrice,
        ]);

        saleDetails.push(detailResult.rows[0]);

        // 3.2. Descontar del inventario (lotes con fecha de vencimiento más próxima primero)
        await this.deductFromInventory(
          client,
          product.idProduct,
          product.stock
        );
      }

      await client.query("COMMIT");

      // 4. Retornar el resumen de la venta
      return {
        sale: {
          id: sale.id,
          value: sale.value,
          date: sale.date,
          description: sale.description,
          createdAt: sale.created_at,
        },
        details: saleDetails,
        summary: {
          totalProducts: productsToSell.length,
          totalItems: productsToSell.reduce((sum, p) => sum + p.stock, 0),
          totalValue: totalValue,
        },
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Descontar stock del inventario usando FIFO por fecha de vencimiento
   * @param {Object} client - Cliente de PostgreSQL
   * @param {number} productId - ID del producto
   * @param {number} quantityToDeduct - Cantidad a descontar
   */
  async deductFromInventory(client, productId, quantityToDeduct) {
    // Obtener lotes ordenados por fecha de vencimiento (más próxima primero)
    const batchesQuery = `
      SELECT id, stock, expiration_date
      FROM product_batches
      WHERE id_product = $1 AND stock > 0
      ORDER BY expiration_date ASC, id ASC
    `;

    const batchesResult = await client.query(batchesQuery, [productId]);
    const batches = batchesResult.rows;

    // Verificar que haya suficiente stock
    const totalAvailableStock = batches.reduce(
      (sum, batch) => sum + batch.stock,
      0
    );

    if (totalAvailableStock < quantityToDeduct) {
      throw new Error(
        `Stock insuficiente para el producto ID ${productId}. Disponible: ${totalAvailableStock}, Requerido: ${quantityToDeduct}`
      );
    }

    // Descontar del inventario usando FIFO
    let remainingToDeduct = quantityToDeduct;

    for (const batch of batches) {
      if (remainingToDeduct <= 0) break;

      const deductFromThisBatch = Math.min(batch.stock, remainingToDeduct);
      const newStock = batch.stock - deductFromThisBatch;

      // Actualizar el stock del lote
      const updateQuery = `
        UPDATE product_batches
        SET stock = $1, updated_at = NOW()
        WHERE id = $2
      `;

      await client.query(updateQuery, [newStock, batch.id]);

      remainingToDeduct -= deductFromThisBatch;
    }

    if (remainingToDeduct > 0) {
      throw new Error(
        `Error al descontar inventario para producto ID ${productId}`
      );
    }
  }

  /**
   * Obtener todas las ventas
   */
  async getAllSales() {
    const query = `
      SELECT 
        id,
        value,
        date,
        description,
        created_at,
        updated_at
      FROM sales
      ORDER BY date DESC, created_at DESC
    `;

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener ventas: ${error.message}`);
    }
  }

  /**
   * Obtener una venta por ID con sus detalles
   * @param {number} saleId - ID de la venta
   */
  async getSaleById(saleId) {
    const client = await pool.connect();

    try {
      // 1. Obtener información de la venta
      const saleQuery = `
        SELECT 
          id,
          value,
          date,
          description,
          created_at,
          updated_at
        FROM sales
        WHERE id = $1
      `;

      const saleResult = await client.query(saleQuery, [saleId]);

      if (saleResult.rows.length === 0) {
        return null;
      }

      const sale = saleResult.rows[0];

      // 2. Obtener detalles de la venta con nombres de productos
      const detailsQuery = `
        SELECT 
          sd.id,
          sd.id_sale,
          sd.id_product,
          p.name AS product_name,
          lb.name as laboratory,
          sd.unit_price,
          sd.stock,
          sd.total_price,
          sd.created_at as createdAt
        FROM sale_details sd
        JOIN products p ON sd.id_product = p.id
        JOIN laboratories lb ON p.id_laboratory = lb.id
        WHERE sd.id_sale = $1
        ORDER BY sd.id ASC
      `;

      const detailsResult = await client.query(detailsQuery, [saleId]);

      return {
        sale: sale,
        details: detailsResult.rows,
      };
    } catch (error) {
      throw new Error(`Error al obtener la venta: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Verificar si un producto existe y tiene stock suficiente
   * @param {number} productId
   * @param {number} quantity
   */
  async checkProductStock(productId, quantity) {
    const query = `
      SELECT COALESCE(SUM(stock), 0) AS total_stock
      FROM product_batches
      WHERE id_product = $1 AND stock > 0
    `;

    try {
      const result = await pool.query(query, [productId]);
      const totalStock = parseInt(result.rows[0].total_stock);
      return {
        available: totalStock >= quantity,
        totalStock: totalStock,
        required: quantity,
      };
    } catch (error) {
      throw new Error(`Error al verificar stock: ${error.message}`);
    }
  }
}

module.exports = new Sale();
