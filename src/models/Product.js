const pool = require("../config/database");

class Product {
  // Obtener lista de productos con stock total
  async getAll() {
    const query = `
      SELECT 
        p.id,
        p.name AS name,
        l.name AS laboratory,
        p.sales_price,
        COALESCE(SUM(pb.stock), 0) AS stock
      FROM products p
      LEFT JOIN laboratories l ON p.id_laboratory = l.id
      LEFT JOIN product_batches pb ON p.id = pb.id_product
      GROUP BY p.id, p.name, l.name, p.sales_price
      ORDER BY p.name ASC
    `;

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener productos: ${error.message}`);
    }
  }

  /**
   * Obtener productos disponibles para venta con su stock total
   * Solo incluye productos que tengan stock disponible
   */
  async getProductsForSale() {
    const query = `
    SELECT 
      p.id,
      p.name,
      l.name AS laboratory,
      COALESCE(SUM(pb.stock), 0) AS stock,
      p.sales_price
    FROM products p
    LEFT JOIN laboratories l ON p.id_laboratory = l.id
    LEFT JOIN product_batches pb ON p.id = pb.id_product
    GROUP BY p.id, p.name, l.name, p.sales_price
    HAVING COALESCE(SUM(pb.stock), 0) > 0
    ORDER BY p.name ASC
  `;

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(
        `Error al obtener productos para venta: ${error.message}`
      );
    }
  }

  // Obtener producto por ID
  async getById(id) {
    const query = `
      SELECT 
        p.id,
        p.name AS name,
        l.name AS laboratory,
        p.sales_price,
        COALESCE(SUM(pb.stock), 0) AS stock
      FROM products p
      LEFT JOIN laboratories l ON p.id_laboratory = l.id
      LEFT JOIN product_batches pb ON p.id = pb.id_product
      WHERE p.id = $1
      GROUP BY p.id, p.name, l.name, p.sales_price
    `;

    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error al obtener el producto: ${error.message}`);
    }
  }

  // Crear un nuevo producto
  async create(productData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Crear el producto
      const productQuery = `
        INSERT INTO products (id_laboratory, name, description, sales_price)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, sales_price, created_at
      `;

      const productResult = await client.query(productQuery, [
        productData.idLaboratory,
        productData.name,
        productData.description || null,
        productData.salesPrice || null,
      ]);

      const newProduct = productResult.rows[0];

      // 2. Crear el lote inicial si se proporciona stock
      if (
        productData.batchNumber &&
        productData.expirationDate &&
        productData.stock > 0
      ) {
        const batchQuery = `
          INSERT INTO product_batches 
          (id_product, batch_name, expiration_date, stock, unit_purchase_price, total_purchase_price, entry_date)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
          RETURNING id
        `;

        await client.query(batchQuery, [
          newProduct.id,
          productData.batchNumber,
          productData.expirationDate,
          productData.stock,
          productData.unitPurchasePrice || null,
          productData.totalPurchasePrice || null,
        ]);
      }

      await client.query("COMMIT");

      // 3. Obtener el nombre del laboratorio
      const labQuery = "SELECT name FROM laboratories WHERE id = $1";
      const labResult = await pool.query(labQuery, [productData.idLaboratory]);
      const laboratoryName = labResult.rows[0]?.name || "";

      // 4. Retornar el producto completo con su información
      return {
        id: newProduct.id,
        name: newProduct.name,
        laboratory: laboratoryName,
        stock: productData.stock || 0,
        salesPrice: newProduct.sales_price,
        createdAt: newProduct.created_at,
      };
    } catch (error) {
      await client.query("ROLLBACK");

      // Manejar error de foreign key (laboratorio no existe)
      if (error.code === "23503") {
        throw new Error("El laboratorio especificado no existe");
      }

      throw new Error(`Error al crear el producto: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // Verificar si un producto ya existe por nombre
  async existsByName(name) {
    const query = "SELECT id FROM products WHERE LOWER(name) = LOWER($1)";

    try {
      const result = await pool.query(query, [name]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error al verificar producto: ${error.message}`);
    }
  }

  // Verificar si un laboratorio existe
  async laboratoryExists(idLaboratory) {
    const query = "SELECT id FROM laboratories WHERE id = $1";

    try {
      const result = await pool.query(query, [idLaboratory]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error al verificar laboratorio: ${error.message}`);
    }
  }
}

module.exports = new Product();
