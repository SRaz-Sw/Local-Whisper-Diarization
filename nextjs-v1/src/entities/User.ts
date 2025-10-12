// User entity class for frontend operations
import apiService from "@/lib/api";
import { UserData } from "@/types/schemas";

export class User {
  static async me(): Promise<UserData> {
    try {
      const user = await apiService.getCurrentUser();
      if (!user) {
        console.trace("No authenticated user found");
        throw new Error("No authenticated user found");
      }
      return user;
    } catch (error) {
      console.error("Failed to get current user:", error);
      throw error;
    }
  }

  static async findById(id: string): Promise<UserData | null> {
    try {
      // This would need to be implemented in the backend API
      // For now, return null as it's not implemented
      console.warn("User.findById not yet implemented in backend");
      return null;
    } catch (error) {
      console.error("Failed to find user by id:", error);
      return null;
    }
  }

  static async update(
    id: string,
    userData: Partial<UserData>,
  ): Promise<UserData> {
    try {
      // Use the existing updateCurrentUser method
      const updatedUser = await apiService.updateCurrentUser(userData);
      return updatedUser;
    } catch (error) {
      console.error("Failed to update user:", error);
      throw error;
    }
  }

  static async findAll(): Promise<UserData[]> {
    try {
      const users = await apiService.getUsers();
      return users;
    } catch (error) {
      console.error("Failed to get all users:", error);
      return [];
    }
  }

  static async create(userData: Partial<UserData>): Promise<UserData> {
    try {
      // This would typically be handled by registration
      // For now, throw an error as direct user creation should go through auth
      throw new Error(
        "User creation should be handled through registration API",
      );
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      // This would need to be implemented in the backend API
      throw new Error("User deletion not yet implemented");
    } catch (error) {
      console.error("Failed to delete user:", error);
      throw error;
    }
  }
}
