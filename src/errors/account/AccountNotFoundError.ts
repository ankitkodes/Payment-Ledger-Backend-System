import { AppError } from "../base/AppError.js";

export class AccountNotFoundError extends AppError {
    constructor(account: string) {
        super(`this Account no:- ${account} not found`, 400);
        Object.setPrototypeOf(this, AccountNotFoundError.prototype);
    }
}