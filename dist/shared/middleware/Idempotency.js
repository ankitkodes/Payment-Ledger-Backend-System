var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { db } from "../../config/db.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Idempotency } from "../../db/schema.js";
export const idempotencyMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
        // If no Idempotency-Key header is provided, pass through to next middleware
        if (!idempotencyKey) {
            return next();
        }
        // Determine user ID from req.user or Authorization header
        let userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId && ((_c = (_b = req.headers) === null || _b === void 0 ? void 0 : _b.authorization) === null || _c === void 0 ? void 0 : _c.startsWith('Bearer '))) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const secret = process.env.AUTH_SECRET || "Aururm";
                const decoded = jwt.verify(token, secret);
                userId = decoded === null || decoded === void 0 ? void 0 : decoded.id;
            }
            catch (_d) {
                // If token verification fails here, authentication middleware will handle it downstream
            }
        }
        if (!userId) {
            return res.status(401).json({ error: "Authentication required when using Idempotency-Key header" });
        }
        // Generate hash of HTTP method, route URI, and request body
        const payloadToHash = {
            method: req.method,
            path: req.originalUrl || req.url,
            body: req.body || {}
        };
        const requestHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(payloadToHash))
            .digest('hex');
        // Look up existing idempotency record
        const existingRecords = yield db
            .select()
            .from(Idempotency)
            .where(eq(Idempotency.idempotency_key, String(idempotencyKey)));
        if (existingRecords.length > 0) {
            const record = existingRecords[0];
            // Check key expiration
            if (record.expiry_at && new Date(record.expiry_at) < new Date()) {
                yield db.delete(Idempotency).where(eq(Idempotency.id, record.id));
            }
            else {
                // Validate request payload hash match
                if (record.request_hash !== requestHash) {
                    return res.status(422).json({ error: "Idempotency key reused with different payload" });
                }
                // Request is currently executing concurrently
                if (record.status === 'Pending') {
                    return res.status(409).json({ error: "Request already in progress" });
                }
                // Request completed previously; return cached response
                if (record.status === 'Success' || record.status === 'Failure') {
                    const statusCode = typeof record.response_status === 'number'
                        ? record.response_status
                        : Number(record.response_status) || 200;
                    return res.status(statusCode).json(record.response_body);
                }
            }
        }
        // Atomically claim the idempotency key in Pending state
        try {
            yield db.insert(Idempotency).values({
                idempotency_key: String(idempotencyKey),
                user_id: userId,
                request_hash: requestHash,
                status: 'Pending',
                response_status: 200,
                response_body: {},
                expiry_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 Hours TTL
            });
        }
        catch (insertError) {
            // Unique constraint error: parallel request claimed the key at the exact same time
            const raceRecord = yield db
                .select()
                .from(Idempotency)
                .where(eq(Idempotency.idempotency_key, String(idempotencyKey)));
            if (raceRecord.length > 0) {
                const rec = raceRecord[0];
                if (rec.request_hash !== requestHash) {
                    return res.status(422).json({ error: "Idempotency key reused with different payload" });
                }
                if (rec.status === 'Pending') {
                    return res.status(409).json({ error: "Request already in progress" });
                }
                const statusCode = typeof rec.response_status === 'number'
                    ? rec.response_status
                    : Number(rec.response_status) || 200;
                return res.status(statusCode).json(rec.response_body);
            }
            throw insertError;
        }
        // Intercept response methods to persist final response status and payload
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        let responsePersisted = false;
        const persistResponse = (body) => __awaiter(void 0, void 0, void 0, function* () {
            if (responsePersisted)
                return;
            responsePersisted = true;
            const responseStatus = res.statusCode || 200;
            const finalStatus = (responseStatus >= 200 && responseStatus < 400) ? 'Success' : 'Failure';
            let parsedBody = body;
            if (typeof body === 'string') {
                try {
                    parsedBody = JSON.parse(body);
                }
                catch (_a) {
                    parsedBody = { message: body };
                }
            }
            try {
                yield db.update(Idempotency)
                    .set({
                    status: finalStatus,
                    response_status: responseStatus,
                    response_body: parsedBody,
                })
                    .where(eq(Idempotency.idempotency_key, String(idempotencyKey)));
            }
            catch (err) {
                console.error("Failed to update idempotency record:", err);
            }
        });
        res.json = function (body) {
            persistResponse(body);
            return originalJson(body);
        };
        res.send = function (body) {
            persistResponse(body);
            return originalSend(body);
        };
        // Pass control to route handler
        req.idempotencyKey = idempotencyKey;
        req.idempotencyUserId = userId;
        next();
    }
    catch (error) {
        return next(error);
    }
});
