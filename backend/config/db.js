// Sequelize database configuration for MySQL
const { Sequelize } = require('sequelize');
require('dotenv').config();

// create sequelize instance with mysql connection
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// test database connection
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL Database connected successfully');

        const shouldAlterSchema = process.env.DB_SYNC_ALTER === 'true';
        if (shouldAlterSchema) {
            console.log('Schema sync mode: alter');
            await sequelize.sync({ alter: true });
        } else {
            console.log('Schema sync mode: safe');
            await sequelize.sync();
        }

        console.log('All models synchronized');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };
