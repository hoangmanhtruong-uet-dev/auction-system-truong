/**
 * Migration script to migrate users from Supabase Auth to Aiven PostgreSQL
 * Run this once to import existing users with hashed passwords
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface SupabaseUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string | null;
  user_metadata?: {
    full_name?: string;
  };
  audit?: {
    session_id?: string;
  };
}

// Supabase users data (export from Supabase auth.users table)
// Format: { id, email, email_confirmed_at, created_at, updated_at, user_metadata, etc }
const supabaseUsers: SupabaseUser[] = [
  // Add your Supabase users here
  // Example:
  // {
  //   id: "uuid-here",
  //   email: "user@example.com",
  //   email_confirmed_at: "2024-01-01T00:00:00Z",
  //   created_at: "2024-01-01T00:00:00Z",
  //   updated_at: "2024-01-01T00:00:00Z",
  //   user_metadata: { full_name: "User Name" }
  // }
];

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

async function migrateUsers() {
  console.log("Starting migration of Supabase users to Aiven PostgreSQL...");

let migratedCount = 0;
  const errors: Array<{ user: SupabaseUser; error: string }> = [];

  // NOTE: This is a template - you need to provide actual passwords for migrated users
  // For security, users will need to reset their passwords after migration

  for (const user of supabaseUsers) {
    try {
      const existing = await prisma.profile.findUnique({
        where: { id: user.id },
      });

      if (existing) {
        console.log(`User ${user.email} already exists, skipping...`);
        continue;
      }

      // Create user with a placeholder password
      // Users will need to reset their password after migration
      const passwordHash = await hashPassword(`TEMP_PASSWORD_${Date.now()}`);

      await prisma.profile.create({
        data: {
          id: user.id,
          email: user.email,
          passwordHash,
          emailVerified: !!user.email_confirmed_at,
          fullName: user.user_metadata?.full_name || user.email.split("@")[0],
          role: "USER",
          createdAt: new Date(user.created_at),
          updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
        },
      });

      migratedCount++;
      console.log(`Migrated user: ${user.email}`);
    } catch (error) {
      errors.push({ user, error: error instanceof Error ? error.message : "Unknown error" });
      console.error(`Failed to migrate user ${user.email}:`, error);
    }
  }

  console.log(`\nMigration completed!`);
  console.log(`Total users processed: ${supabaseUsers.length}`);
  console.log(`Successfully migrated: ${migratedCount}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nError details:");
    errors.forEach(({ user, error }) => {
      console.log(`- ${user.email}: ${error}`);
    });
  }

  process.exit(0);
}

migrateUsers().catch(console.error);