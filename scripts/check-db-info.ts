
import dotenv from 'dotenv'


dotenv.config({ path: '.env.development.local' });
// dotenv.config(); // Disable default .env loading to ensure we use the requested one


const getConnectionString = () => {
    if (process.env.VERCEL_ENV === "production") {
        return process.env.PROD_DATABASE_URL || process.env.PROD_POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
    }
    if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") {
        return process.env.PREVIEW_DATABASE_URL || process.env.PREVIEW_POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
    }
    return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
}

const url = getConnectionString();
if (!url) {
    console.log("No connection string found.");
} else {
    try {
        // Handle postgres:// syntax
        const dbUrl = new URL(url);
        console.log(`Connected to Host: ${dbUrl.hostname}`);
        console.log(`Database Name: ${dbUrl.pathname.substring(1)}`);
        console.log(`Port: ${dbUrl.port}`);
        console.log(`Environment: ${process.env.VERCEL_ENV || 'local (default)'}`);
    } catch (e) {
        console.log("Could not parse URL, might be a socket or invalid format.");
        // safe substring to show beginning 
        console.log(`Raw start: ${url.substring(0, 15)}...`);
    }
}
