import { AppError } from "../base/AppError.js";

export class InvalidTokenError extends AppError {
    constructor() {
        super("invalid token", 401);
        Object.setPrototypeOf(this, InvalidTokenError.prototype);
    }
}