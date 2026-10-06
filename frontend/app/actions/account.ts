"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export type AccountState = {
  error?: string;
  success?: string;
} | undefined;

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

const ChangePasswordSchema = z.object({
  current: z.string().min(1, "Current password is required"),
  next: z.string().min(8, "New password must be at least 8 characters"),
  confirm: z.string().min(1, "Please confirm the new password"),
});

export async function changePassword(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };

  const parsed = ChangePasswordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }
  const { current, next, confirm } = parsed.data;

  if (next !== confirm) return { error: "New passwords do not match" };
  if (next === current)
    return { error: "New password must be different from the current one" };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user) return { error: "Account not found" };

  const currentOk = isBcryptHash(user.password)
    ? await bcrypt.compare(current, user.password)
    : current === user.password;
  if (!currentOk) return { error: "Current password is incorrect" };

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(next, 10) },
  });

  return { success: "Password changed successfully" };
}

const CreateUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function createUser(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };

  const parsed = CreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with this email already exists" };

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      password: await bcrypt.hash(parsed.data.password, 10),
      role: "ADMIN",
    },
  });

  return { success: `${parsed.data.name} added successfully` };
}

export async function deleteUser(userId: string): Promise<AccountState> {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };
  if (userId === session.userId) {
    return { error: "You cannot delete your own account" };
  }

  const remaining = await prisma.user.count({
    where: { id: { not: userId } },
  });
  if (remaining === 0) {
    return { error: "Cannot delete the last remaining user" };
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    return { error: "User not found" };
  }
  return { success: "User removed" };
}
