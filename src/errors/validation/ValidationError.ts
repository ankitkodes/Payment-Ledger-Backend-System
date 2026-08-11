import { AppError } from "../base/AppError.js";

export class ValidationError extends AppError {
    errors?: string[];

    constructor(message: string = "Validation failed", errors?: string[]) {
        super(message, 400);
        this.errors = errors;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}