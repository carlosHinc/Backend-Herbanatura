const pool = require("../config/database");

class Laboratory {
  // Obtener todos los laboratorios
  async getAll() {
    const query = `
      SELECT 
        id,
        name,
        created_at
      FROM laboratories
      ORDER BY name ASC
    `;

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error al obtener laboratorios: ${error.message}`);
    }
  }

  // Obtener laboratorio por ID
  async getById(id) {
    const query = `
      SELECT 
        id,
        name,
        created_at
      FROM laboratories
      WHERE id = $1
    `;

    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error al obtener el laboratorio: ${error.message}`);
    }
  }

  // Crear un nuevo laboratorio
  async create(name) {
    const query = `
      INSERT INTO laboratories (name)
      VALUES ($1)
      RETURNING id, name, created_at
    `;

    try {
      const result = await pool.query(query, [name]);
      return result.rows[0];
    } catch (error) {
      // Manejar error de duplicado (nombre único)
      if (error.code === "23505") {
        throw new Error("Ya existe un laboratorio con ese nombre");
      }
      throw new Error(`Error al crear el laboratorio: ${error.message}`);
    }
  }

  // Verificar si un laboratorio existe por nombre
  async existsByName(name) {
    const query = "SELECT id FROM laboratories WHERE LOWER(name) = LOWER($1)";

    try {
      const result = await pool.query(query, [name]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error al verificar laboratorio: ${error.message}`);
    }
  }
}

module.exports = new Laboratory();
