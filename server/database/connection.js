import * as dotenv from "dotenv";
import mysql from "mysql";

dotenv.config();

// Creamos la conexion a la base de datos
const pool = mysql.createPool({
  host: process.env.MYSQL_DB_HOST_CONNECTION,
  user: process.env.MYSQL_DB_USER_CONNECTION,
  password: process.env.MYSQL_DB_PASSWORD_CONNECTION,
  database: process.env.MYSQL_DB_DBNAME_CONNECTION,
  connectionLimit: 10,
});

export default pool;
