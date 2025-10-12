import { db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    console.log("🌱 Seeding database...");

    // Check if admin already exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log("✅ Admin user already exists");
      return;
    }

    // Create initial admin user
    const hashedPassword = await hashPassword('admin123'); // Change this password!
    
    await db.insert(users).values({
      username: 'admin',
      email: 'admin@crm.local',
      password: hashedPassword,
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator'
    });

    console.log("✅ Admin user created successfully");
    console.log("📧 Email: admin@crm.local");
    console.log("🔑 Password: admin123");
    console.log("⚠️  IMPORTANT: Change this password after first login!");
    
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seed();
