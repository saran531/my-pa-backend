require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const reminderScheduler = require('./utils/reminderScheduler');

const PORT = process.env.PORT || 5000;

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason instanceof Error ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err.message, err.stack);
});

const start = async () => {
  await connectDB();
  reminderScheduler.start();
  app.listen(PORT, () => {
    console.log(`🚀 MY PA backend running on http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
  });
};

start();
