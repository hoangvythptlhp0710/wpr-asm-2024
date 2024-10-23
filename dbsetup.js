require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs").promises;

// MySQL connection details
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT || 3306;
const DB_NAME = "wpr2201140110"; // Database name

async function setupDatabase() {
  try {
    // Create a connection to MySQL
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true, // Allow multiple statements if needed later
    });

    // Step 1: Create the database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME};`);

    // Step 2: Use the database
    await connection.query(`USE ${DB_NAME};`);

    // Step 3: Read the rest of the SQL from the file
    const sql = await fs.readFile("./setup.sql", { encoding: "utf8" });

    // Step 4: Execute the SQL file commands (excluding DB creation)
    await connection.query(sql);

    console.log("Database setup completed.");
    await connection.end();
  } catch (error) {
    console.error("Error setting up the database:", error);
  }
}

// Run the setup function
setupDatabase();
