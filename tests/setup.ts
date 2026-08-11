import 'dotenv/config';

process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'Aururm';
process.env.PLATFORM_ACCOUNTNO = process.env.PLATFORM_ACCOUNTNO || 'fd6572c9-5a1e-4412-b933-c0b92ac1fd39';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:example@localhost:5432/postgres';
