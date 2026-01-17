import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing DB Connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Defined' : 'Undefined');

if (process.env.DATABASE_URL) {
    // Hide password for log safety if needed, but here we want to verify structure
    console.log('URL Structure:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@'));
}

const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log('Successfully connected to database!');
    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
