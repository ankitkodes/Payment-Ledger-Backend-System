import { AppError } from "../base/AppError.js";

export class ForbiddenError extends AppError {
    constructor() {
        super("You do not have permission to access this resource", 403);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}