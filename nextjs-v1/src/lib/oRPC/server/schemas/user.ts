import * as z from "zod";

export type NewUser = z.infer<typeof NewUserSchema>;
export type User = z.infer<typeof UserSchema>;

export const NewUserSchema = z.object({
  name: z.string(),
  email: z.email(), // TODO: Convert to email once we upgrade to zod 4
  password: z.string(),
});

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
});
