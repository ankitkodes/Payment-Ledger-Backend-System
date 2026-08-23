export class AppError extends Error {
    constructor(message, Statuscode) {
        super(message);
        this.StatusCode = Statuscode;
        this.isOpertional = true;
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
    get statusCode() {
        return this.StatusCode;
    }
}
