"use client";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  UserIcon,
  LogOutIcon,
  UserCogIcon,
  ImageIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import ProfileImageUpload from "../upload/ProfileImageUpload";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { authKeys } from "@/hooks/useAuth";
import { useMainAppStateStore } from "@/app/(otherProjectsCleanup)/_compare-cars/hooks/useMainAppStateStore";

const ProfileSection = () => {
  const router = useRouter();
  const { user, isLoadingUser } = useCurrentUser();
  const { mutate: logoutMutate, isPending: logoutIsPending } = useLogout();
  const queryClient = useQueryClient();
  const { setActiveView } = useMainAppStateStore();
  // Mutation to update user profile image
  const updateProfileImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/profile-image`,
        { imageUrl },
        { withCredentials: true },
      );
      return response.data;
    },
    onSuccess: () => {
      // Refetch user data to update the UI with the new profile image
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
    },
  });

  const handleProfileImageUpdate = (imageUrl: string) => {
    updateProfileImageMutation.mutate(imageUrl);
  };

  const handleLogout = () => {
    logoutMutate(undefined, {
      onSuccess: () => {
        router.push("/login");
      },
    });
  };

  const navigateToProfile = () => {
    setActiveView("profile");
    // router.push("/profile");
  };

  if (isLoadingUser) {
    return (
      <div className="ml-auto flex items-center">
        <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
          <Avatar>
            <AvatarFallback>
              <UserIcon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-center">
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
              <Avatar>
                <AvatarImage
                  src={user.image || "/avatar-placeholder.png"}
                  alt={user.name}
                />
                <AvatarFallback>
                  <UserIcon className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* <div className="flex flex-col items-center p-2">
              <Avatar className="mb-2 h-16 w-16">
                <AvatarImage
                  src={user.image || "/avatar-placeholder.png"}
                  alt={user.name}
                />
                <AvatarFallback>
                  <UserIcon className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center">
                <span className="font-medium">{user.name}</span>
                <span className="text-xs text-gray-500">{user.email}</span>
              </div>

              <ProfileImageUpload
                currentImageUrl={user.image || undefined}
                username={user.name}
                onUploadComplete={handleProfileImageUpdate}
                buttonVariant="ghost"
              />
            </div> */}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={navigateToProfile}
              className="cursor-pointer"
            >
              <UserCogIcon className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-500"
              disabled={logoutIsPending}
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              <span>
                {logoutIsPending ? "Signing out..." : "Sign out"}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => router.push("/login")}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <UserIcon className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span>Sign in</span>
        </Button>
      )}
    </div>
  );
};

export default ProfileSection;
