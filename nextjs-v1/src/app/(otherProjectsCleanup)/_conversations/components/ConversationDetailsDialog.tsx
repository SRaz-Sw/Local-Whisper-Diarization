"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useConversationDetailsStore } from "@/store/useConversationDetailsStore";
import { useCurrentUser, useUpdateCurrentUser } from "@/hooks/useAuth";
import { UserData, ConversationData } from "@sraz-sw/fullstack-shared";
import { useQueryClient } from "@tanstack/react-query";
import apiService from "@/lib/api";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  X,
  Check,
  Pencil,
  UserPlus,
  ChevronRight,
  Plus,
  ImageIcon,
  UserMinus,
  Image as LucideImage,
  LogOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ConversationImageUpload from "@/components/upload/ConversationImageUpload";
import Image from "next/image";

export default function ConversationDetailsDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isOpen, close, currentConversation, setCurrentConversation } =
    useConversationDetailsStore();
  const { user: currentUser } = useCurrentUser();

  // Cast the currentConversation to our extended type to handle imageUrl
  // const currentConversation = currentConversation as ConversationData | null;

  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [isRemovingMembers, setIsRemovingMembers] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editName, setEditName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState<UserData[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserData[]>([]);
  const [selectedUsersToRemove, setSelectedUsersToRemove] = useState<
    UserData[]
  >([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLeaveAlertOpen, setIsLeaveAlertOpen] = useState(false);
  const [isBlockAlertOpen, setIsBlockAlertOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<UserData | null>(null);
  const updateCurrentUser = useUpdateCurrentUser();

  // Effect to initialize edit name when opening dialog
  useEffect(() => {
    if (isOpen && currentConversation) {
      setEditName(currentConversation.name || "");
      setImageUrl(currentConversation.imageUrl || "");
      setIsEditing(false);
      setIsAddingMembers(false);
      setIsRemovingMembers(false);
      setIsEditingImage(false);
      setSelectedUsers([]);
      setSelectedUsersToRemove([]);
      setSearchQuery("");
    }
  }, [isOpen, currentConversation]);

  // Fetch available users that can be added to the conversation
  const fetchAvailableUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const allUsers = await apiService.getUsers();

      // Filter out current conversation members
      const currentMemberIds = new Set(
        currentConversation?.users?.map((user) => user.id) || [],
      );
      const filtered = allUsers.filter(
        (user) => !currentMemberIds.has(user.id),
      );

      setAvailableUsers(filtered);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load available users");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentConversation]);

  // Effect to fetch available users when adding members
  useEffect(() => {
    if (isAddingMembers && !availableUsers.length) {
      fetchAvailableUsers();
    }
  }, [isAddingMembers, availableUsers.length, fetchAvailableUsers]);

  // Log the dialog state and conversation data
  useEffect(() => {
    if (isOpen) {
      console.log(
        "Conversation details dialog opened:",
        currentConversation,
      );
    }
  }, [isOpen, currentConversation]);

  // Bail early if no conversation data
  if (!currentConversation) {
    return null;
  }

  // Get other participants (except current user)
  const otherParticipants =
    currentConversation?.users?.filter(
      (user) => user.id !== currentUser?.id,
    ) || [];

  // If group, display all users. If 1-on-1, display only the other person
  const displayParticipants = currentConversation?.isGroup
    ? currentConversation?.users || []
    : otherParticipants;

  // Get proper display name for the conversation
  const getConversationDisplayName = () => {
    if (!currentConversation) return "";

    if (currentConversation.name) {
      return currentConversation.name;
    }

    // For 1-on-1 chats without a name, use the other participant's name
    if (!currentConversation.isGroup && otherParticipants.length > 0) {
      return otherParticipants[0].name || "Conversation";
    }

    return "Group Chat";
  };

  const handleBlockUser = async () => {
    if (!userToBlock || !currentUser) return;

    try {
      setIsSaving(true);

      // Get current blocked users (or empty array if none)
      const currentBlockedUsers = currentUser.blockedUserIds || [];

      // Call the API to update blocked users
      // await apiService.updateCurrentUser({
      // 	blockedUserIds: [...currentBlockedUsers, userToBlock.id],
      // });
      await updateCurrentUser.mutateAsync({
        blockedUserIds: [...currentBlockedUsers, userToBlock.id],
      });

      // Close the dialog
      setUserToBlock(null);
      setIsBlockAlertOpen(false);

      // Notify success
      toast.success(`Blocked ${userToBlock.name}`);

      // Update the cache if needed
      // queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    } catch (error) {
      console.error("Failed to block user:", error);
      toast.error("Failed to block user");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle user selection for adding to conversation
  const toggleUserSelection = (user: UserData) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Toggle user selection for removing from conversation
  const toggleUserRemoval = (user: UserData) => {
    // Don't allow removing yourself
    if (user.id === currentUser?.id) {
      toast.error("You can't remove yourself from the conversation");
      return;
    }

    if (selectedUsersToRemove.some((u) => u.id === user.id)) {
      setSelectedUsersToRemove(
        selectedUsersToRemove.filter((u) => u.id !== user.id),
      );
    } else {
      setSelectedUsersToRemove([...selectedUsersToRemove, user]);
    }
  };

  // Check if user is selected
  const isUserSelected = (userId: string) => {
    return selectedUsers.some((user) => user.id === userId);
  };

  // Check if user is selected for removal
  const isUserSelectedForRemoval = (userId: string) => {
    return selectedUsersToRemove.some((user) => user.id === userId);
  };

  // Filter users based on search
  const filteredUsers = searchQuery
    ? availableUsers.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : availableUsers;

  // Handle save of edits
  const handleSave = async () => {
    if (!currentConversation) return;

    try {
      setIsSaving(true);

      const updateData: {
        name?: string;
        addMembers?: string[];
        removeMembers?: string[];
        imageUrl?: string;
      } = {};

      // Only include name if editing and it's changed
      if (isEditing && editName !== currentConversation.name) {
        updateData.name = editName;
      }

      // Include image URL if editing image and it's changed
      if (isEditingImage && imageUrl !== currentConversation.imageUrl) {
        updateData.imageUrl = imageUrl;
      }

      // Only include addMembers if there are selected users
      if (isAddingMembers && selectedUsers.length > 0) {
        updateData.addMembers = selectedUsers.map((user) => user.id);
      }

      // Only include removeMembers if there are selected users for removal
      if (isRemovingMembers && selectedUsersToRemove.length > 0) {
        updateData.removeMembers = selectedUsersToRemove.map(
          (user) => user.id,
        );
      }

      // Only proceed if there are changes
      if (Object.keys(updateData).length === 0) {
        setIsEditing(false);
        setIsAddingMembers(false);
        setIsRemovingMembers(false);
        setIsEditingImage(false);
        return;
      }

      // Make the API call
      const updatedConversation = await apiService.updateConversation(
        currentConversation.id,
        updateData,
      );

      // Update the conversation in the store and modal
      setCurrentConversation(updatedConversation);

      // Update the UI and cache
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["conversation", currentConversation.id],
      });

      // Notify success
      if (isEditing) {
        toast.success("Conversation renamed successfully");
      } else if (isEditingImage) {
        toast.success("Conversation image updated successfully");
      } else if (isAddingMembers) {
        toast.success(
          `${selectedUsers.length} participant${selectedUsers.length !== 1 ? "s" : ""} added successfully`,
        );
      } else if (isRemovingMembers) {
        toast.success(
          `${selectedUsersToRemove.length} participant${
            selectedUsersToRemove.length !== 1 ? "s" : ""
          } removed successfully`,
        );
      } else {
        toast.success("Conversation updated successfully");
      }

      // Reset state
      setIsEditing(false);
      setIsAddingMembers(false);
      setIsRemovingMembers(false);
      setIsEditingImage(false);
      setSelectedUsers([]);
      setSelectedUsersToRemove([]);
    } catch (error) {
      console.error("Failed to update conversation:", error);
      toast.error("Failed to update conversation");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle the user leaving the group
  const handleLeaveGroup = async () => {
    if (!currentConversation || !currentUser) return;

    try {
      setIsSaving(true);

      // Call the API to remove the current user
      await apiService.updateConversation(currentConversation.id, {
        removeMembers: [currentUser.id],
      });

      // Update the cache
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Close the dialog
      close();

      // Notify success
      toast.success("You have left the group");

      // Navigate back to conversations list
      router.push("/conversations");
    } catch (error) {
      console.error("Failed to leave group:", error);
      toast.error("Failed to leave the group");
    } finally {
      setIsSaving(false);
      setIsLeaveAlertOpen(false);
    }
  };

  // Handle image upload completion
  const handleImageUploadComplete = (imageUrl: string) => {
    // Set the imageUrl in the state
    setImageUrl(imageUrl);

    // Save the changes immediately
    handleSaveImage(imageUrl);
  };

  // Handle saving image independently
  const handleSaveImage = async (newImageUrl: string) => {
    if (!currentConversation) return;

    try {
      setIsSaving(true);

      // Make the API call
      const updatedConversation = await apiService.updateConversation(
        currentConversation.id,
        {
          imageUrl: newImageUrl,
        },
      );

      // Update the conversation in the store and modal
      setCurrentConversation(updatedConversation);

      // Update the UI and cache
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["conversation", currentConversation.id],
      });

      // Notify success
      toast.success("Conversation image updated successfully");
    } catch (error) {
      console.error("Failed to update conversation image:", error);
      toast.error("Failed to update conversation image");
    } finally {
      setIsSaving(false);
    }
  };

  const getDialogTitle = () => {
    if (isAddingMembers) return "Add participants";
    if (isRemovingMembers) return "Remove participants";
    if (isEditingImage) return "Change conversation image";
    return currentConversation?.isGroup ? "Group info" : "Contact info";
  };

  const getActionButton = () => {
    if (
      isEditing ||
      isAddingMembers ||
      isRemovingMembers ||
      isEditingImage
    ) {
      return (
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/100 rounded-full"
          onClick={handleSave}
          disabled={isSaving}
          aria-label="Save changes"
          type="button"
        >
          <Check className="h-5 w-5" />
        </Button>
      );
    }

    if (currentConversation?.isGroup) {
      return (
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/100 rounded-full"
          onClick={() => setIsEditing(true)}
          aria-label="Edit conversation"
          type="button"
        >
          <Pencil className="h-5 w-5" />
        </Button>
      );
    }

    return null;
  };
  const blockedUsersByCurrentUser = currentUser?.blockedUserIds || [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
        <DialogContent
          className="bg-accent mx-auto mt-[10vh] flex h-[90vh] max-h-[90vh] w-[95%] max-w-full flex-col overflow-hidden rounded-t-lg p-0 sm:max-w-[95%] md:mt-0 md:h-auto md:max-h-[80vh] md:max-w-lg md:rounded-lg"
          aria-describedby="conversation-details-description"
        >
          <DialogHeader className="bg-primary/90 text-primary-foreground sticky top-0 z-10 p-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                {getDialogTitle()}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {getActionButton()}
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-primary/100 rounded-full"
                    aria-label="Close dialog"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          {/* Hidden description for accessibility */}
          <DialogDescription
            id="conversation-details-description"
            className="sr-only"
          >
            Details about the conversation and its participants
          </DialogDescription>

          <div className="flex-1 overflow-y-auto">
            {isAddingMembers ? (
              <>
                {/* Search input for adding users */}
                <div className="bg-secondary sticky top-0 z-10 p-3 shadow-md">
                  <div className="relative">
                    <Input
                      placeholder="Search contacts"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-accent pl-3"
                    />
                  </div>
                </div>

                {/* Selected users */}
                {selectedUsers.length > 0 && (
                  <div className="bg-accent border-muted-foreground/20 border-b p-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((user) => (
                        <Badge
                          key={user.id}
                          variant="secondary"
                          className="flex items-center gap-1 px-2 py-1"
                        >
                          {user.name}
                          <button
                            onClick={() => toggleUserSelection(user)}
                            className="hover:bg-muted-foreground/10 ml-1 rounded-full p-0.5"
                            aria-label={`Remove ${user.name}`}
                            type="button"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available users list */}
                <div className="flex-1 overflow-y-auto">
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="border-primary/90 h-8 w-8 animate-spin rounded-full border-t-2 border-b-2"></div>
                    </div>
                  ) : filteredUsers.length > 0 ? (
                    <div className="divide-muted-foreground/20 divide-y">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`hover:bg-muted-foreground/10 flex cursor-pointer items-center justify-between p-3 ${
                            isUserSelected(user.id) ? "bg-ring/20" : ""
                          }`}
                          onClick={() => toggleUserSelection(user)}
                        >
                          <div className="flex items-center">
                            <Avatar className="mr-3 h-12 w-12">
                              <AvatarImage src={user.image} />
                              <AvatarFallback className="bg-ring/20 text-muted-foreground">
                                {user.name?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.name}
                              </div>
                              {user.email && (
                                <div className="text-muted-foreground text-sm">
                                  {user.email}
                                </div>
                              )}
                            </div>
                          </div>
                          {isUserSelected(user.id) && (
                            <div className="text-primary/90">
                              <Check className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="text-muted-foreground p-8 text-center">
                      No results found
                    </div>
                  ) : (
                    <div className="text-muted-foreground p-8 text-center">
                      No users available to add
                    </div>
                  )}
                </div>
              </>
            ) : isRemovingMembers ? (
              <>
                {/* Search input for removing users */}
                <div className="bg-secondary sticky top-0 z-10 p-3 shadow-md">
                  <div className="relative">
                    <Input
                      placeholder="Search participants"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-accent pl-3"
                    />
                  </div>
                </div>

                {/* Selected users to remove */}
                {selectedUsersToRemove.length > 0 && (
                  <div className="bg-accent border-muted-foreground/20 border-b p-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedUsersToRemove.map((user) => (
                        <Badge
                          key={user.id}
                          variant="secondary"
                          className="flex items-center gap-1 px-2 py-1"
                        >
                          {user.name}
                          <button
                            onClick={() => toggleUserRemoval(user)}
                            className="hover:bg-muted-foreground/10 ml-1 rounded-full p-0.5"
                            aria-label={`Keep ${user.name}`}
                            type="button"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Participants list for removal */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-muted-foreground/20 divide-y">
                    {displayParticipants
                      .filter((user) => user.id !== currentUser?.id) // Don't show current user
                      .filter(
                        (user) =>
                          !searchQuery ||
                          user.name
                            ?.toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          user.email
                            ?.toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                      )
                      .map((user) => (
                        <div
                          key={user.id}
                          className={`hover:bg-muted-foreground/10 flex cursor-pointer items-center justify-between p-3 ${
                            isUserSelectedForRemoval(user.id)
                              ? "bg-destructive/10"
                              : ""
                          }`}
                          onClick={() => toggleUserRemoval(user)}
                        >
                          <div className="flex items-center">
                            <Avatar className="mr-3 h-12 w-12">
                              <AvatarImage src={user.image} />
                              <AvatarFallback className="bg-ring/20 text-muted-foreground">
                                {user.name?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.name}
                              </div>
                              {user.email && (
                                <div className="text-muted-foreground text-sm">
                                  {user.email}
                                </div>
                              )}
                            </div>
                          </div>
                          {isUserSelectedForRemoval(user.id) && (
                            <div className="text-destructive">
                              <X className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                  {displayParticipants.filter(
                    (user) => user.id !== currentUser?.id,
                  ).length === 0 && (
                    <div className="text-muted-foreground p-8 text-center">
                      No other participants in this conversation
                    </div>
                  )}
                </div>
              </>
            ) : isEditingImage ? (
              <div className="p-6">
                <div className="mb-6 flex flex-col items-center">
                  <Avatar className="mb-4 h-24 w-24">
                    {imageUrl ? (
                      <AvatarImage
                        src={imageUrl}
                        alt={currentConversation?.name || "Group"}
                      />
                    ) : (
                      <AvatarFallback className="bg-primary/10">
                        <ImageIcon className="text-primary/80 h-12 w-12" />
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <ConversationImageUpload
                    currentImageUrl={imageUrl}
                    conversationName={currentConversation?.name}
                    onUploadComplete={handleImageUploadComplete}
                    buttonVariant="default"
                  />

                  <p className="text-muted-foreground mt-6 text-center text-xs">
                    Or enter an image URL manually:
                  </p>

                  <div className="mt-4 w-full">
                    <Input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Enter image URL"
                      className="w-full"
                    />
                  </div>

                  {imageUrl && (
                    <div className="mt-4">
                      <p className="mb-2 text-center text-sm">Preview:</p>
                      <div className="bg-muted-foreground/10 relative mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full">
                        <Image
                          src={imageUrl}
                          alt="Conversation"
                          fill
                          className="object-cover"
                          onError={(e) => {
                            // Reset the src on error and show error message
                            e.currentTarget.src = "";
                            e.currentTarget.parentElement?.classList.add(
                              "bg-destructive/10",
                            );
                            toast.error("Invalid image URL");
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Avatar and Name Section */}
                <div className="bg-secondary flex flex-col items-center py-8">
                  <Avatar className="mb-4 h-24 w-24">
                    {currentConversation?.imageUrl ? (
                      <AvatarImage src={currentConversation.imageUrl} />
                    ) : currentConversation?.isGroup ? (
                      <div className="bg-ring/20 text-muted-foreground flex h-full w-full items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                    ) : (
                      <>
                        <AvatarImage src={otherParticipants[0]?.image} />
                        <AvatarFallback className="bg-ring/20 text-muted-foreground">
                          {otherParticipants[0]?.name
                            ?.charAt(0)
                            .toUpperCase() || "?"}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  {isEditing && currentConversation.isGroup ? (
                    <div className="w-full max-w-xs px-4">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Group name"
                        className="text-center font-bold"
                      />
                    </div>
                  ) : (
                    <h2 className="text-xl font-bold">
                      {getConversationDisplayName()}
                    </h2>
                  )}
                  <p className="text-muted-foreground mt-1 text-sm">
                    {currentConversation?.isGroup
                      ? `Group · ${displayParticipants.length} ${
                          displayParticipants.length === 1
                            ? "participant"
                            : "participants"
                        }`
                      : otherParticipants[0]?.email || ""}
                  </p>

                  {/* Edit image button */}
                  {currentConversation.isGroup && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 gap-2 text-xs"
                      onClick={() => setIsEditingImage(true)}
                    >
                      <LucideImage className="h-4 w-4" />
                      Change image
                    </Button>
                  )}
                </div>

                {/* Group Management Buttons (only for groups) */}
                {currentConversation.isGroup && (
                  <div className="bg-accent border-muted-foreground/20 border-b">
                    {/* Add Members Button */}
                    <button
                      className="hover:bg-muted-foreground/10 border-muted-foreground/10 flex w-full items-center border-b p-3"
                      onClick={() => setIsAddingMembers(true)}
                    >
                      <div className="bg-ring/20 text-primary/90 mr-3 flex h-10 w-10 items-center justify-center rounded-full">
                        <UserPlus className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-left">
                        Add participant
                      </div>
                      <ChevronRight className="text-muted-foreground h-5 w-5" />
                    </button>

                    {/* Remove Members Button */}
                    <button
                      className="hover:bg-muted-foreground/10 border-muted-foreground/10 flex w-full items-center border-b p-3"
                      onClick={() => setIsRemovingMembers(true)}
                    >
                      <div className="bg-destructive/10 text-destructive mr-3 flex h-10 w-10 items-center justify-center rounded-full">
                        <UserMinus className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-left">
                        Remove participant
                      </div>
                      <ChevronRight className="text-muted-foreground h-5 w-5" />
                    </button>

                    {/* Leave Group Button */}
                    <button
                      className="hover:bg-muted-foreground/10 text-destructive flex w-full items-center p-3"
                      onClick={() => setIsLeaveAlertOpen(true)}
                      disabled={isSaving}
                    >
                      <div className="bg-destructive/10 text-destructive mr-3 flex h-10 w-10 items-center justify-center rounded-full">
                        <LogOut className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-left">Leave group</div>
                    </button>
                  </div>
                )}

                {/* Participants */}
                <div className="bg-accent">
                  <div className="border-muted-foreground/20 border-b p-4 pb-3">
                    <h3 className="text-base font-medium">
                      {currentConversation?.isGroup
                        ? `${displayParticipants.length} participant${
                            displayParticipants.length !== 1 ? "s" : ""
                          }`
                        : "Participant"}
                    </h3>
                  </div>

                  {/* List of participants */}
                  <div className="divide-muted-foreground/20 divide-y">
                    {displayParticipants.map((user: UserData) => (
                      <div
                        key={user.id}
                        className="hover:bg-muted-foreground/10 flex items-center p-3"
                      >
                        <Avatar className="mr-3 h-12 w-12">
                          <AvatarImage src={user.image} />
                          <AvatarFallback className="bg-ring/20 text-muted-foreground">
                            {user.name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div
                            className={`font-medium ${
                              blockedUsersByCurrentUser.includes(user.id)
                                ? "line-through"
                                : ""
                            }`}
                          >
                            {user.name}
                          </div>
                          <div
                            className={`text-muted-foreground text-sm ${
                              blockedUsersByCurrentUser.includes(user.id)
                                ? "line-through"
                                : ""
                            }`}
                          >
                            {user.email || ""}
                          </div>
                        </div>
                        {user.id === currentUser?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/profile")}
                            className="text-muted-foreground hover:bg-muted-foreground/10 ml-auto text-sm"
                          >
                            You
                          </Button>
                        )}
                        {user.id !== currentUser?.id &&
                          !blockedUsersByCurrentUser.includes(user.id) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserToBlock(user);
                                setIsBlockAlertOpen(true);
                              }}
                              className="text-destructive hover:bg-destructive/10 ml-auto"
                            >
                              Block
                            </Button>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Group Alert Dialog */}
      <AlertDialog
        open={isLeaveAlertOpen}
        onOpenChange={setIsLeaveAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group? You won&apos;t
              receive any more messages from this group unless someone adds
              you back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-destructive hover:bg-destructive/90 text-primary-foreground"
            >
              {isSaving ? "Leaving..." : "Leave group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isBlockAlertOpen}
        onOpenChange={setIsBlockAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {userToBlock?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block this user? You won&apos;t
              receive any more messages from them and they won&apos;t be
              able to contact you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToBlock(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              className="bg-destructive hover:bg-destructive/90 text-primary-foreground"
            >
              {isSaving ? "Blocking..." : "Block User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
