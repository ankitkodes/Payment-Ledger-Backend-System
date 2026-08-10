var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Audit_log, User } from "../../db/schema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { UnauthorizedError } from "../../errors/auth/UnauthorizedError.js";
export const RegisterRepository = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isExist = yield db.select().from(User).where(eq(User.phoneNo, data.phoneNo));
        if (isExist.length > 0) {
            return { message: "User Already Exist", status: 409 };
        }
        const hashedPassword = bcrypt.hashSync(data.password, 10);
        yield db.insert(User).values({
            name: data.name,
            email: data.email,
            address: data.address,
            phoneNo: data.phoneNo,
            password: hashedPassword
        });
        const response = yield db.select().from(User).where(eq(User.phoneNo, data.phoneNo));
        const createdUser = response[0];
        // recording in autdit_log 
        const userdata = yield db.insert(Audit_log).values({
            user_id: createdUser.id,
            entity_id: createdUser.id,
            action: "Account registered successfully",
            entity_type: "User",
            metadata: {
                userId: createdUser.id,
                name: createdUser.name,
                email: createdUser.email,
                phoneNo: createdUser.phoneNo,
                registrationSource: "self-service"
            }
        });
        console.log("registered user data:- ", userdata);
        return { message: "Account created successfully", status: 201 };
    }
    catch (err) {
        console.error(err);
        throw err;
    }
});
export const LoginRespository = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield db.select().from(User).where(eq(User.phoneNo, data.phoneNo));
        if (user.length < 1) {
            throw new UnauthorizedError();
        }
        const foundUser = user[0];
        const isPasswordMatched = yield bcrypt.compare(data.password, foundUser.password);
        if (!isPasswordMatched) {
            throw new UnauthorizedError();
        }
        const secret = process.env.AUTH_SECRET;
        if (!secret) {
            return { message: "Authentication secret not configured", status: 500 };
        }
        const token = jwt.sign({ id: foundUser.id, phoneNo: foundUser.phoneNo }, secret, { expiresIn: '12h' });
        if (!token) {
            return { message: "Failed to generate token, please try again later", status: 500 };
        }
        console.log("login completed successfully and here is users details:-", user);
        return { message: "Login successful", status: 200, token };
    }
    catch (err) {
        console.error(err);
        throw err;
    }
});
export const ProfileRepository = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userDetails = yield db.select().from(User).where(eq(User.id, userId));
        return { message: "Profile returned successfully", status: 200, user: userDetails[0] };
    }
    catch (err) {
        console.log(err);
        throw err;
    }
});
export const UpdateProfileRespository = (userId, data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield db.select().from(User).where(eq(User.id, userId));
        if (user.length < 1) {
            throw new UnauthorizedError();
        }
        yield db.update(User).set({
            name: data.name,
            email: data.email,
            address: data.address,
            phoneNo: data.phoneNo,
            updated_at: new Date()
        }).where(eq(User.id, userId));
        // recording in audit_log 
        yield db.insert(Audit_log).values({
            user_id: user[0].id,
            entity_id: user[0].id,
            action: "Profile updated",
            entity_type: "User",
            metadata: {
                previous: {
                    name: user[0].name,
                    email: user[0].email,
                    address: user[0].address,
                    phoneNo: user[0].phoneNo,
                },
                updated: {
                    name: data.name,
                    email: data.email,
                    address: data.address,
                    phoneNo: data.phoneNo,
                }
            }
        });
        return { message: "Profile updated successfully", status: 200 };
    }
    catch (err) {
        console.error(err);
        throw err;
    }
});
export const DeleteProfileRepository = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield db.select().from(User).where(eq(User.id, userId));
        if (user.length < 1) {
            throw new UnauthorizedError();
        }
        // recording in autdit_log 
        yield db.insert(Audit_log).values({
            user_id: user[0].id,
            entity_id: user[0].id,
            action: "Profile deleted",
            entity_type: "User",
            metadata: {
                deletedUser: {
                    id: user[0].id,
                    name: user[0].name,
                    email: user[0].email,
                    phoneNo: user[0].phoneNo,
                    address: user[0].address,
                }
            }
        });
        yield db.delete(User).where(eq(User.id, userId));
        return { message: "Profile deleted successfully", status: 200 };
    }
    catch (err) {
        console.error(err);
        throw err;
    }
});
