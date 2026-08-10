import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Aurum — Payment Ledger Backend System',
        version: '1.0.0',
        description: 'REST API for a payment/banking system with user management, bank accounts, and financial transactions with a double-entry ledger system.',
        contact: {
            name: 'Ankit Kumar'
        }
    },
    servers: [
        {
            url: '/api',
            description: 'API base path'
        }
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter the JWT token obtained from the /user/login endpoint'
            }
        },
        schemas: {
            // ─── User Schemas ───
            UserRegister: {
                type: 'object',
                required: ['name', 'address', 'phoneNo', 'email', 'password'],
                properties: {
                    name: { type: 'string', example: 'Ankit Kumar' },
                    address: { type: 'string', example: '123, Main Street, Delhi' },
                    phoneNo: { type: 'string', example: '9876543210', maxLength: 15 },
                    email: { type: 'string', format: 'email', example: 'ankit@example.com' },
                    password: { type: 'string', example: 'StrongPass@123', maxLength: 255 }
                }
            },
            UserLogin: {
                type: 'object',
                required: ['phoneNo', 'password'],
                properties: {
                    phoneNo: { type: 'string', example: '9876543210' },
                    password: { type: 'string', example: 'StrongPass@123' }
                }
            },
            UserProfile: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    address: { type: 'string' },
                    phoneNo: { type: 'string' },
                    email: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' }
                }
            },
            // ─── Account Schemas ───
            CreateAccount: {
                type: 'object',
                required: ['category', 'balance'],
                properties: {
                    category: {
                        type: 'string',
                        enum: ['Saving', 'Current', 'Salary'],
                        example: 'Saving',
                        description: 'Saving requires min ₹2000, Current requires min ₹10000'
                    },
                    balance: {
                        type: 'string',
                        example: '5000.00',
                        description: 'Initial deposit amount (numeric string with 2 decimal places)'
                    }
                }
            },
            AccountDetails: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    accountType: { type: 'string', enum: ['Saving', 'Current', 'Salary'] },
                    accountNumber: { type: 'integer' },
                    balance: { type: 'string' },
                    user_id: { type: 'string', format: 'uuid' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' }
                }
            },
            // ─── Transaction Schemas ───
            SendMoney: {
                type: 'object',
                required: ['senderAccountNo', 'receiverAccountNo', 'amount'],
                properties: {
                    senderAccountNo: { type: 'integer', example: 1234567890, description: 'Sender account number' },
                    receiverAccountNo: { type: 'integer', example: 9876543210, description: 'Receiver account number' },
                    amount: { type: 'string', example: '1000.00', description: 'Amount to transfer' }
                }
            },
            DepositMoney: {
                type: 'object',
                required: ['transaction_amount', 'sender_account_id'],
                properties: {
                    transaction_amount: { type: 'string', example: '5000.00', description: 'Amount to deposit (min ₹500)' },
                    sender_account_id: { type: 'string', format: 'uuid', description: 'Account UUID to deposit into' }
                }
            },
            CreditMoney: {
                type: 'object',
                required: ['accountNo', 'amount'],
                properties: {
                    accountNo: { type: 'integer', example: 1234567890, description: 'Account number to withdraw from' },
                    amount: { type: 'string', example: '1000.00', description: 'Amount to withdraw (min ₹500)' }
                }
            },
            // ─── Common Response ───
            MessageResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    status: { type: 'integer' }
                }
            },
            LoginResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    token: { type: 'string', description: 'JWT token (use this in Bearer Auth)' }
                }
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string' }
                }
            }
        }
    },
    // ─────────────────── PATHS ───────────────────
    paths: {
        // ═══════════════ USER ENDPOINTS ═══════════════
        '/user/register': {
            post: {
                tags: ['User'],
                summary: 'Register a new user',
                description: 'Creates a new user account with hashed password. Checks for duplicate phone numbers.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/UserRegister' }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Account created successfully',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } }
                    },
                    '409': {
                        description: 'User already exists (duplicate phone number)',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        '/user/login': {
            post: {
                tags: ['User'],
                summary: 'Login and get JWT token',
                description: 'Authenticates user with phone number and password. Returns a JWT token valid for 12 hours. **Copy the token and use it in the Authorize button above.**',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/UserLogin' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Login successful — copy the token for authenticated requests',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } }
                    },
                    '401': {
                        description: 'Invalid credentials',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '404': {
                        description: 'User not found',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        '/user/getProfile/{userId}': {
            get: {
                tags: ['User'],
                summary: 'Get user profile',
                description: 'Fetches user profile details by user ID. Requires authentication.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'userId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' },
                        description: 'User UUID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Profile returned successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        user: { $ref: '#/components/schemas/UserProfile' }
                                    }
                                }
                            }
                        }
                    },
                    '401': {
                        description: 'Unauthorized — missing or invalid token',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        '/user/update/{userId}': {
            put: {
                tags: ['User'],
                summary: 'Update user profile',
                description: 'Updates user profile fields. Requires authentication.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'userId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' },
                        description: 'User UUID'
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/UserRegister' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Profile updated successfully',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } }
                    },
                    '404': {
                        description: 'User not found',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '401': {
                        description: 'Unauthorized',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        '/user/delete/{userId}': {
            delete: {
                tags: ['User'],
                summary: 'Delete user profile',
                description: 'Permanently deletes a user account. Requires authentication.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'userId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' },
                        description: 'User UUID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Profile deleted successfully',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } }
                    },
                    '404': {
                        description: 'User not found',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '401': {
                        description: 'Unauthorized',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        // ═══════════════ ACCOUNT ENDPOINTS ═══════════════
        '/account/create/{userId}': {
            post: {
                tags: ['Account'],
                summary: 'Create a new bank account',
                description: 'Creates a bank account for the given user. Minimum balance: Saving ₹2000, Current ₹10000. Requires authentication.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'userId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' },
                        description: 'User UUID who will own this account'
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateAccount' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Account created successfully',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } }
                    },
                    '400': {
                        description: 'Validation error or minimum balance not met',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '401': {
                        description: 'Unauthorized',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        '/account/accountDetails/{accountId}': {
            get: {
                tags: ['Account'],
                summary: 'Get account details',
                description: 'Fetches details of a specific bank account by its UUID. Requires authentication.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'accountId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' },
                        description: 'Account UUID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Account details returned',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        account: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/AccountDetails' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '401': {
                        description: 'Unauthorized',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        '/account/{accountId}/statement': {
            get: {
                tags: ['Account'],
                summary: 'Get transaction history / statement',
                description: 'Fetches transaction history for a specific bank account by account UUID. Requires authentication.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'accountId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' },
                        description: 'Account UUID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Transaction history returned',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        transactions: {
                                            type: 'array',
                                            items: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '401': {
                        description: 'Unauthorized',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        '/account/account/{userId}': {
            get: {
                tags: ['Account'],
                summary: 'Get all accounts of a user',
                description: 'Fetches all bank accounts belonging to a specific user. Requires authentication.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'userId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' },
                        description: 'User UUID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'List of user accounts',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        account: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/AccountDetails' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '401': {
                        description: 'Unauthorized',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        '/account/deleteAccount/{accountId}': {
            delete: {
                tags: ['Account'],
                summary: 'Delete a bank account',
                description: 'Permanently deletes a bank account. Requires authentication.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'accountId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' },
                        description: 'Account UUID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Account deleted successfully',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } }
                    },
                    '401': {
                        description: 'Unauthorized',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        // ═══════════════ TRANSACTION ENDPOINTS ═══════════════
        '/transaction/send/{senderAccountNo}/{receiverAccountNo}': {
            post: {
                tags: ['Transaction'],
                summary: 'Send money (peer-to-peer transfer)',
                description: 'Transfers money from sender account to receiver account. Deducts 3% platform charges. Creates ledger entries for both parties and the platform.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'senderAccountNo',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer', example: 1234567890 },
                        description: 'Sender account number'
                    },
                    {
                        name: 'receiverAccountNo',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer', example: 9876543210 },
                        description: 'Receiver account number'
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['amount'],
                                properties: {
                                    amount: { type: 'string', example: '1000.00', description: 'Amount to transfer' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Money transferred successfully',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } }
                    },
                    '400': {
                        description: 'Insufficient balance or invalid amount',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '401': {
                        description: 'Unauthorized — missing or invalid token',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '403': {
                        description: 'Forbidden — you do not own the sender account',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '404': {
                        description: 'Sender or receiver account not found',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        '/transaction/deposit': {
            post: {
                tags: ['Transaction'],
                summary: 'Deposit money into account',
                description: 'Adds money to a bank account. Minimum deposit amount is ₹500. Creates a transaction record and updates account balance.',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/DepositMoney' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Deposit completed successfully',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } }
                    },
                    '400': {
                        description: 'Amount below minimum (₹500)',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '401': {
                        description: 'Unauthorized — missing or invalid token',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '403': {
                        description: 'Forbidden — you do not own the account',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '404': {
                        description: 'Account not found',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        },
        '/transaction/withdraw/{accountNo}': {
            post: {
                tags: ['Transaction'],
                summary: 'Withdraw money from account',
                description: 'Withdraws money from a bank account. Minimum withdrawal amount is ₹500. Checks for sufficient balance before processing.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'accountNo',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer', example: 1234567890 },
                        description: 'Account number to withdraw from'
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['amount'],
                                properties: {
                                    amount: { type: 'string', example: '1000.00', description: 'Amount to withdraw (min ₹500)' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Withdrawal completed successfully',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } }
                    },
                    '400': {
                        description: 'Amount below minimum (₹500) or insufficient balance',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '401': {
                        description: 'Unauthorized — missing or invalid token',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '403': {
                        description: 'Forbidden — you do not own the account',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '404': {
                        description: 'Account not found',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    },
                    '500': {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
                    }
                }
            }
        }
    },
    tags: [
        { name: 'User', description: 'User registration, login, and profile management' },
        { name: 'Account', description: 'Bank account creation and management' },
        { name: 'Transaction', description: 'Money transfers, deposits, and withdrawals' }
    ]
};
const swaggerRouter = Router();
swaggerRouter.use('/', swaggerUi.serve);
swaggerRouter.get('/', swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Aurum API Docs',
    swaggerOptions: {
        persistAuthorization: true
    }
}));
export { swaggerRouter, swaggerDocument };
