import 'dotenv/config';
import express from "express";
import { UserRoutes } from "./modules/user/user.routes.js";
import { AccountRoutes } from './modules/account/account.routes.js';
import { transactionRoutes } from './modules/transaction/transaction.routes.js';
import { swaggerRouter } from './config/swagger.js';
import { notFoundHandler } from './shared/middleware/notFoundHandler.js';
import { globalErrorHanlder } from './shared/middleware/globalErrorHandler.js';
import { idempotencyMiddleware } from './shared/middleware/Idempotency.js';

export const app = express();
app.use(express.json());
app.use(idempotencyMiddleware);

app.use("/api-docs", swaggerRouter);
app.use("/api/user", UserRoutes);
app.use("/api/account", AccountRoutes);
app.use("/api/transaction", transactionRoutes);

// Global Error handlers
app.use(notFoundHandler);
app.use(globalErrorHanlder);

