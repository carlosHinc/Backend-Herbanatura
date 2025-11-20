// Backend/src/models/Order.js
const pool = require("../config/database");

class Order {
  /**
   * Crear un pedido con múltiples lotes de productos
   * @param {Array} batches - Array de objetos con datos de lotes:
   *   [{
   *     idProduct: number,
   *     batchName: string,
   *     expirationDate: string,
   *     stock: number,
   *     unitPurchasePrice: number
   *   }]
   * @returns {Object} - Información del pedido creado con bill y batches
   */
  async createOrder(batches) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Validar que todos los productos existan
      const productIds = batches.map((b) => b.idProduct);
      const productCheckQuery = `
        SELECT id FROM products 
        WHERE id = ANY($1::int[])
      `;
      const productCheckResult = await client.query(productCheckQuery, [
        productIds,
      ]);

      if (productCheckResult.rows.length !== productIds.length) {
        throw new Error("Uno o más productos no existen");
      }

      // 2. Calcular el valor total del pedido
      let totalValue = 0;
      const batchesToInsert = [];

      for (const batch of batches) {
        const unitPrice = parseInt(batch.unitPurchasePrice) || 0;
        const quantity = parseInt(batch.stock) || 0;
        const totalPrice = unitPrice * quantity;

        totalValue += totalPrice;

        batchesToInsert.push({
          idProduct: batch.idProduct,
          batchName: batch.batchName,
          expirationDate: batch.expirationDate,
          stock: quantity,
          unitPurchasePrice: unitPrice,
          totalPurchasePrice: totalPrice,
        });
      }

      // 3. Registrar la factura (bill) del pedido
      const billQuery = `
        INSERT INTO bills (type, value)
        VALUES ($1, $2)
        RETURNING id, type, value, created_at
      `;

      const billResult = await client.query(billQuery, [
        "Pedido productos",
        totalValue,
      ]);

      const bill = billResult.rows[0];

      // 4. Insertar todos los lotes en product_batches
      const insertedBatches = [];

      for (const batch of batchesToInsert) {
        const batchQuery = `
          INSERT INTO product_batches 
          (id_product, batch_name, expiration_date, stock, unit_purchase_price, total_purchase_price, entry_date)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
          RETURNING id, id_product, batch_name, expiration_date, stock, unit_purchase_price, total_purchase_price, entry_date
        `;

        const batchResult = await client.query(batchQuery, [
          batch.idProduct,
          batch.batchName,
          batch.expirationDate,
          batch.stock,
          batch.unitPurchasePrice,
          batch.totalPurchasePrice,
        ]);

        insertedBatches.push(batchResult.rows[0]);
      }

      await client.query("COMMIT");

      // 5. Retornar el resumen del pedido
      return {
        bill: {
          id: bill.id,
          type: bill.type,
          value: bill.value,
          createdAt: bill.created_at,
        },
        batches: insertedBatches,
        summary: {
          totalBatches: insertedBatches.length,
          totalProducts: new Set(batches.map((b) => b.idProduct)).size,
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
   * Obtener todos los pedidos (bills de tipo "Pedido productos")
   */
  async getAllOrders() {
    const query = `
      SELECT 
        id,
        type,
        value,
        created_at,
        updated_at
      FROM bills
      WHERE type = 'Pedido productos'
      ORDER BY created_at DESC
    `;

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener pedidos: ${error.message}`);
    }
  }

  /**
   * Obtener detalles de un pedido específico con sus lotes
   * @param {number} billId - ID de la factura
   */
  async getOrderById(billId) {
    const client = await pool.connect();

    try {
      // 1. Obtener la información de la factura
      const billQuery = `
        SELECT 
          id,
          type,
          value,
          created_at,
          updated_at
        FROM bills
        WHERE id = $1 AND type = 'Pedido productos'
      `;

      const billResult = await client.query(billQuery, [billId]);

      if (billResult.rows.length === 0) {
        return null;
      }

      const bill = billResult.rows[0];

      // 2. Obtener los lotes asociados al pedido (por fecha de creación cercana)
      // Nota: Para una relación más precisa, considera agregar un campo bill_id en product_batches
      const batchesQuery = `
        SELECT 
          pb.id,
          pb.id_product,
          p.name AS product_name,
          pb.batch_name,
          pb.expiration_date,
          pb.stock,
          pb.unit_purchase_price,
          pb.total_purchase_price,
          pb.entry_date
        FROM product_batches pb
        JOIN products p ON pb.id_product = p.id
        WHERE DATE(pb.entry_date) = DATE($1)
        ORDER BY pb.id ASC
      `;

      const batchesResult = await client.query(batchesQuery, [bill.created_at]);

      return {
        bill: bill,
        batches: batchesResult.rows,
      };
    } catch (error) {
      throw new Error(`Error al obtener el pedido: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Verificar si un producto existe
   * @param {number} productId
   */
  async productExists(productId) {
    const query = "SELECT id FROM products WHERE id = $1";

    try {
      const result = await pool.query(query, [productId]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error al verificar producto: ${error.message}`);
    }
  }
}

module.exports = new Order();
