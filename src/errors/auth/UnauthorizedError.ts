import { AppError } from "../base/AppError.js";

export class UnauthorizedError extends AppError {
    constructor() {
        super("Authentication required", 401);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}