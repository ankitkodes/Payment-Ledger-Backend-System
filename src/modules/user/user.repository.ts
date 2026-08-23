import { UserLoginSchema, UserRegistrationSchema } from "./user.types.js"
import { Audit_log, User } from "../../db/schema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { UnauthorizedError } from "../../errors/auth/UnauthorizedError.js";


export const RegisterRepository = async (data: UserRegistrationSchema) => {
    try {
        const isExist = await db.select().from(User).where(eq(User.phoneNo, data.phoneNo));
        if (isExist.length > 0) {
            return { message: "User Already Exist", status: 409 };
        }
        const hashedPassword = bcrypt.hashSync(data.password, 10);
        await db.insert(User).values({
            name: data.name,
            email: data.email,
            address: data.address,
            phoneNo: data.phoneNo,
            password: hashedPassword
        });
        const response = await db.select().from(User).where(eq(User.phoneNo, data.phoneNo));
        const createdUser = response[0];

        // recording in autdit_log 
        const userdata = await db.insert(Audit_log).values({
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
        return { message: "Account created successfully", status: 201 }
    } catch (err) {
        console.error(err);
        throw err;
    }

}


export const LoginRespository = async (data: UserLoginSchema) => {
    try {
        const user = await db.select().from(User).where(eq(User.phoneNo, data.phoneNo));
        if (user.length < 1) {
            throw new UnauthorizedError();
        }
        const foundUser = user[0];
        const isPasswordMatched = await bcrypt.compare(data.password, foundUser.password);
        if (!isPasswordMatched) {
            throw new UnauthorizedError();
        }
        const secret = process.env.AUTH_SECRET;
        if (!secret) {
            return { message: "Authentication secret not configured", status: 500 };
        }

        const token: string = jwt.sign({ id: foundUser.id, phoneNo: foundUser.phoneNo }, secret, { expiresIn: '12h' });
        if (!token) {
            return { message: "Failed to generate token, please try again later", status: 500 };
        }
        console.log("login completed successfully and here is users details:-", user);
        return { message: "Login successful", status: 200, token };

    } catch (err) {
        console.error(err);
        throw err;
    }
}

export const ProfileRepository = async (userId: string) => {
    try {
        const userDetails = await db.select({
            name: User.name,
            address: User.address,
            PhoneNo: User.phoneNo,
            email: User.email
        }).from(User).where(eq(User.id, userId));
        return { message: "Profile returned successfully", status: 200, user: userDetails[0] };
    } catch (err) {
        console.log(err);
        throw err;
    }
}

export const UpdateProfileRespository = async (userId: string, data: UserRegistrationSchema) => {
    try {
        const user = await db.select().from(User).where(eq(User.id, userId));
        if (user.length < 1) {
            throw new UnauthorizedError();
        }
        await db.update(User).set({
            name: data.name,
            email: data.email,
            address: data.address,
            phoneNo: data.phoneNo,
            updated_at: new Date()
        }).where(eq(User.id, userId))

        // recording in audit_log 
        await db.insert(Audit_log).values({
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
        })
        return { message: "Profile updated successfully", status: 200 }
    } catch (err) {
        console.error(err);
        throw err;
    }
}

export const DeleteProfileRepository = async (userId: string) => {
    try {
        const user = await db.select().from(User).where(eq(User.id, userId));
        if (user.length < 1) {
            throw new UnauthorizedError();
        }

        // recording in autdit_log 
        await db.insert(Audit_log).values({
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
        await db.delete(User).where(eq(User.id, userId));
        return { message: "Profile deleted successfully", status: 200 };
    } catch (err) {
        console.error(err);
        throw err;
    }
}