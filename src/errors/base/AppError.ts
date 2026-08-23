

export class AppError extends Error {
    StatusCode: number;
    isOpertional: boolean;

    constructor(message: string, Statuscode: number) {
        super(message);
        this.StatusCode = Statuscode;
        this.isOpertional = true;
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }

    get statusCode(): number {
        return this.StatusCode;
    }
}