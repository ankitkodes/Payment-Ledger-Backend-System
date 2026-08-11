import jwt from "jsonwebtoken";
import { InvalidTokenError } from "../../errors/auth/InvalidTokenError.js";
import { UnauthorizedError } from "../../errors/auth/UnauthorizedError.js";

export const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers?.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new UnauthorizedError());
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
        return res.status(500).json({ message: "authentication secret not configured" });
    }

    try {
        const user = jwt.verify(token, secret);
        req.user = user;
        next();
    } catch (err) {
        next(new InvalidTokenError());
    }
};