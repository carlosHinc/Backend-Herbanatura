const pool = require("../config/database");

class Product {
  // Obtener lista de productos con stock total
  async getAll() {
    const query = `
      SELECT 
        p.id,
        p.name AS name,
        l.name AS laboratory,
        p.description,
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
        p.id_laboratory,
        l.name AS laboratory,
        p.description,
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

      // 1. Verificar que no exista un producto con el mismo nombre Y laboratorio
      const duplicateQuery = `
      SELECT id FROM products 
      WHERE LOWER(name) = LOWER($1) AND id_laboratory = $2
    `;
      const duplicateResult = await client.query(duplicateQuery, [
        productData.name,
        productData.idLaboratory,
      ]);

      if (duplicateResult.rows.length > 0) {
        throw new Error(
          "Ya existe un producto con ese nombre en el mismo laboratorio"
        );
      }

      // 2. Crear el producto
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

      // 3. Crear el lote inicial si se proporciona stock
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

      // 4. Obtener el nombre del laboratorio
      const labQuery = "SELECT name FROM laboratories WHERE id = $1";
      const labResult = await pool.query(labQuery, [productData.idLaboratory]);
      const laboratoryName = labResult.rows[0]?.name || "";

      // 5. Retornar el producto completo con su información
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

      throw error;
    } finally {
      client.release();
    }
  }

  // Crear un nuevo producto

  /*
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
    */

  /**
   * Actualizar información de un producto
   * @param {number} id - ID del producto a actualizar
   * @param {Object} productData - Datos del producto a actualizar
   * @returns {Object} - Producto actualizado
   */
  async update(id, productData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Verificar que el producto existe y obtener su laboratorio actual
      const existsQuery =
        "SELECT id, id_laboratory FROM products WHERE id = $1";
      const existsResult = await client.query(existsQuery, [id]);

      if (existsResult.rows.length === 0) {
        throw new Error("Producto no encontrado");
      }

      const currentProduct = existsResult.rows[0];

      // 2. Determinar el laboratorio final (si se actualiza o se mantiene el actual)
      const finalLaboratory =
        productData.idLaboratory !== undefined
          ? productData.idLaboratory
          : currentProduct.id_laboratory;

      // 3. Si se actualiza el nombre, verificar duplicados con el mismo laboratorio
      if (productData.name) {
        const duplicateQuery = `
        SELECT id FROM products 
        WHERE LOWER(name) = LOWER($1) 
          AND id_laboratory = $2
          AND id != $3
      `;
        const duplicateResult = await client.query(duplicateQuery, [
          productData.name,
          finalLaboratory,
          id,
        ]);

        if (duplicateResult.rows.length > 0) {
          throw new Error(
            "Ya existe otro producto con ese nombre en el mismo laboratorio"
          );
        }
      }

      // 4. Si solo se actualiza el laboratorio, verificar que no haya duplicados
      if (
        productData.idLaboratory !== undefined &&
        productData.name === undefined
      ) {
        // Obtener el nombre actual del producto
        const nameQuery = "SELECT name FROM products WHERE id = $1";
        const nameResult = await client.query(nameQuery, [id]);
        const currentName = nameResult.rows[0].name;

        const duplicateQuery = `
        SELECT id FROM products 
        WHERE LOWER(name) = LOWER($1) 
          AND id_laboratory = $2
          AND id != $3
      `;
        const duplicateResult = await client.query(duplicateQuery, [
          currentName,
          productData.idLaboratory,
          id,
        ]);

        if (duplicateResult.rows.length > 0) {
          throw new Error(
            "Ya existe un producto con ese nombre en el laboratorio seleccionado"
          );
        }
      }

      // 5. Si se proporciona un laboratorio, verificar que existe
      if (productData.idLaboratory) {
        const labQuery = "SELECT id FROM laboratories WHERE id = $1";
        const labResult = await client.query(labQuery, [
          productData.idLaboratory,
        ]);

        if (labResult.rows.length === 0) {
          throw new Error("El laboratorio especificado no existe");
        }
      }

      // 6. Construir la query de actualización dinámicamente
      const updates = [];
      const values = [];
      let paramCounter = 1;

      if (productData.idLaboratory !== undefined) {
        updates.push(`id_laboratory = $${paramCounter++}`);
        values.push(productData.idLaboratory);
      }

      if (productData.name !== undefined) {
        updates.push(`name = $${paramCounter++}`);
        values.push(productData.name);
      }

      if (productData.description !== undefined) {
        updates.push(`description = $${paramCounter++}`);
        values.push(productData.description || null);
      }

      if (productData.salesPrice !== undefined) {
        updates.push(`sales_price = $${paramCounter++}`);
        values.push(productData.salesPrice || null);
      }

      // Si no hay nada que actualizar
      if (updates.length === 0) {
        throw new Error("No se proporcionaron datos para actualizar");
      }

      // Agregar el ID al final
      values.push(id);

      const updateQuery = `
      UPDATE products
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCounter}
      RETURNING id, name, sales_price, updated_at
    `;

      const updateResult = await client.query(updateQuery, values);
      const updatedProduct = updateResult.rows[0];

      await client.query("COMMIT");

      // 7. Obtener el producto completo con toda su información
      const fullProductQuery = `
      SELECT 
        p.id,
        p.name,
        p.id_laboratory,
        l.name AS laboratory,
        p.description,
        p.sales_price,
        COALESCE(SUM(pb.stock), 0) AS stock,
        p.updated_at
      FROM products p
      LEFT JOIN laboratories l ON p.id_laboratory = l.id
      LEFT JOIN product_batches pb ON p.id = pb.id_product
      WHERE p.id = $1
      GROUP BY p.id, p.name, l.name, p.description, p.sales_price, p.updated_at
    `;

      const fullProductResult = await pool.query(fullProductQuery, [id]);
      return fullProductResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
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

  /**
   * Obtener productos próximos a vencer
   * @param {number} days - Número de días para considerar productos próximos a vencer
   * @returns {Array} - Lista de productos próximos a vencer agrupados
   */
  async getExpiringProducts(days) {
    const query = `
    SELECT 
      p.id AS product_id,
      p.name AS product_name,
      p.sales_price,
      l.name AS laboratory,
      pb.id AS batch_id,
      pb.batch_name,
      pb.expiration_date,
      pb.stock,
      pb.entry_date,
      (pb.expiration_date - CURRENT_DATE) AS days_to_expire
    FROM product_batches pb
    JOIN products p ON pb.id_product = p.id
    JOIN laboratories l ON p.id_laboratory = l.id
    WHERE pb.stock > 0
      AND pb.expiration_date < CURRENT_DATE + ($1 || ' days')::INTERVAL
      AND pb.expiration_date >= CURRENT_DATE
    ORDER BY pb.expiration_date ASC, p.name ASC
  `;

    try {
      const result = await pool.query(query, [days]);

      // Agrupar por producto
      const groupedProducts = {};

      result.rows.forEach((row) => {
        const productId = row.product_id;

        if (!groupedProducts[productId]) {
          groupedProducts[productId] = {
            productId: row.product_id,
            productName: row.product_name,
            laboratory: row.laboratory,
            salesPrice: row.sales_price,
            totalStock: 0,
            batches: [],
          };
        }

        groupedProducts[productId].totalStock += row.stock;
        groupedProducts[productId].batches.push({
          batchId: row.batch_id,
          batchName: row.batch_name,
          expirationDate: row.expiration_date,
          stock: row.stock,
          entryDate: row.entry_date,
          daysToExpire: parseInt(row.days_to_expire),
        });
      });

      // Convertir objeto a array y ordenar por fecha de vencimiento más próxima
      return Object.values(groupedProducts).sort((a, b) => {
        const minExpirationA = Math.min(
          ...a.batches.map((batch) => batch.daysToExpire)
        );
        const minExpirationB = Math.min(
          ...b.batches.map((batch) => batch.daysToExpire)
        );
        return minExpirationA - minExpirationB;
      });
    } catch (error) {
      throw new Error(
        `Error al obtener productos próximos a vencer: ${error.message}`
      );
    }
  }
}

module.exports = new Product();
