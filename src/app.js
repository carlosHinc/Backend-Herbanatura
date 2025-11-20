// Backend/src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Importar rutas
const productsRoutes = require("./routes/products");
const laboratoriesRoutes = require("./routes/laboratories");
const ordersRoutes = require("./routes/orders"); // ← AGREGAR ESTA LÍNEA

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de salud
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API HerbaNatura funcionando correctamente",
    timestamp: new Date().toISOString(),
  });
});

// Rutas de la API
app.use("/api/products", productsRoutes);
app.use("/api/laboratories", laboratoriesRoutes);
app.use("/api/orders", ordersRoutes); // ← AGREGAR ESTA LÍNEA

// Ruta para 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// Manejo de errores
app.use((error, req, res, next) => {
  console.error("Error no manejado:", error);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
