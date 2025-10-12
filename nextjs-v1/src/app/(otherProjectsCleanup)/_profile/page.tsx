"use client";

import { useEffect, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import { UserData } from "@sraz-sw/fullstack-shared";
import { Separator } from "@/components/ui/separator";
import FileUploader from '@/components/upload/FileUploader';
import { Loader2, UserX, UserCheck } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// Create a schema for profile data
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

// Infer the type from the schema
type FormValues = z.infer<typeof formSchema>;

export default function ProfilePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [blockedUsers, setBlockedUsers] = useState<UserData[]>([]);
    const [isLoadingBlockedUsers, setIsLoadingBlockedUsers] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form setup using react-hook-form with better defaults
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            email: '',
        },
        mode: "onChange",
    });

    // Get the current user data
    const { data: user, isLoading, error } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            return apiService.getCurrentUser();
        },
    });

    // Update form values when user data is loaded
    useEffect(() => {
        if (user) {
            form.reset({
                name: user.name || '',
                email: user.email || '',
            });
        }
    }, [user, form]);

    // Fetch blocked users
    const fetchBlockedUsers = useCallback(async () => {
        if (!user || !user.blockedUserIds || user.blockedUserIds.length === 0) return;
        
        setIsLoadingBlockedUsers(true);
        try {
            const allUsers = await apiService.getUsers();
            const filtered = allUsers.filter(u => 
                user.blockedUserIds!.includes(u.id)
            );
            setBlockedUsers(filtered);
        } catch (error) {
            console.error("Failed to load blocked users:", error);
            toast.error("Failed to load blocked users");
        } finally {
            setIsLoadingBlockedUsers(false);
        }
    }, [user]);

    // Fetch blocked users when user data is loaded
    useEffect(() => {
        if (user && user.blockedUserIds && user.blockedUserIds.length > 0) {
            fetchBlockedUsers();
        }
    }, [user, fetchBlockedUsers]);

    // Profile update mutation
    const profileMutation = useMutation({
        mutationFn: async (values: FormValues) => {
            return apiService.updateCurrentUser(values);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            toast.success("Your profile has been updated successfully.");
            setIsEditing(false);
        },
        onError: (error) => {
            toast.error("Failed to update your profile. Please try again.");
        },
    });

    // Profile image update mutation
    const imageMutation = useMutation({
        mutationFn: async (imageUrl: string) => {
            return apiService.updateCurrentUser({ image: imageUrl });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            toast.success("Your profile image has been updated successfully.");
            setUploadedImageUrl(data.image || null);
        },
        onError: (error) => {
            toast.error("Failed to update your profile image. Please try again.");
        },
    });

    // Unblock user mutation
    const unblockMutation = useMutation({
        mutationFn: async (userToUnblock: UserData) => {
            if (!user) throw new Error("Not logged in");
            
            // Filter out the user to unblock
            const updatedBlockedUserIds = user.blockedUserIds?.filter(id => id !== userToUnblock.id) || [];
            
            return apiService.updateCurrentUser({
                blockedUserIds: updatedBlockedUserIds
            });
        },
        onSuccess: (data, variables) => {
            // Update local state by removing the unblocked user
            setBlockedUsers(blockedUsers.filter(u => u.id !== variables.id));
            toast.success(`Unblocked ${variables.name}`);
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
        onError: (error) => {
            toast.error("Failed to unblock user. Please try again.");
        }
    });

    // Handle unblock user
    const handleUnblockUser = (blockedUser: UserData) => {
        unblockMutation.mutate(blockedUser);
    };

    // Handle profile form submission
    const onSubmit = (values: FormValues) => {
        profileMutation.mutate(values);
    };

    // Handle profile image update
    const handleImageUpdated = (imageUrl: string) => {
        setUploadedImageUrl(imageUrl);
        imageMutation.mutate(imageUrl);
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading your profile...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-4">
                <p className="text-destructive mb-4">Error loading profile. Please try again.</p>
                <Button onClick={() => router.push('/')}>Return to home</Button>
            </div>
        );
    }

    // Extract name for display
    const displayName = user?.name || '';
    const firstInitial = displayName.charAt(0).toUpperCase();
    const lastInitial = displayName.includes(' ') 
        ? displayName.split(' ')[1]?.charAt(0).toUpperCase() 
        : '';

    return (
        <div className="container max-w-3xl mx-auto py-10 px-4 sm:px-6 space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
            <p className="text-muted-foreground mb-8">Manage your personal information and preferences.</p>
            
            <div className="grid gap-8 md:grid-cols-[300px_1fr] mx-auto">
                {/* Profile Photo Card */}
                <Card className="bg-card border shadow-sm h-fit">
                    <CardHeader>
                        <CardTitle className="text-xl">Your Photo</CardTitle>
                        <CardDescription>
                            Share a photo to personalize your profile.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <div className="w-40 mx-auto mb-6">
                            <AspectRatio ratio={1/1} className="bg-muted rounded-md overflow-hidden">
                                <Avatar className="w-full h-full">
                                    <AvatarImage 
                                        src={uploadedImageUrl || user?.image || undefined} 
                                        alt={user?.name || "User"} 
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="text-4xl bg-primary/10">
                                        {firstInitial}{lastInitial}
                                    </AvatarFallback>
                                </Avatar>
                            </AspectRatio>
                        </div>
                        
                        <div className="w-full">
                            <FileUploader 
                                endpoint="imageUploader"
                                type="avatar"
                                onUploadComplete={(url: string) => {
                                    handleImageUpdated(url);
                                }}
                                onUploadError={(error: Error) => {
                                    toast.error("Failed to upload image.");
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
                
                {/* Profile Details Card */}
                <Card className="bg-card border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl">Profile Details</CardTitle>
                        <CardDescription>
                            View and update your personal information.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isEditing ? (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Your name" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    This is the name that will be displayed to other users.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="your.email@example.com" type="email" {...field} disabled />
                                                </FormControl>
                                                <FormDescription>
                                                    Your email address is used for login and cannot be changed.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    
                                    <div className="flex justify-end space-x-2 pt-4">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => setIsEditing(false)}
                                            disabled={profileMutation.isPending}
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            disabled={profileMutation.isPending || !form.formState.isDirty}
                                        >
                                            {profileMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : "Save Changes"}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                                    <p className="text-base">{user?.name}</p>
                                </div>
                                
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                                    <p className="text-base">{user?.email}</p>
                                </div>
                                
                                <div className="pt-4">
                                    <Button 
                                        onClick={() => setIsEditing(true)}
                                        className="w-full"
                                    >
                                        Edit Profile
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {/* Blocked Users Section */}
            <div className="mt-12">
                <h2 className="text-2xl font-semibold mb-6">Blocked Users</h2>
                
                <Card className="bg-card border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl">Blocked Users</CardTitle>
                        <CardDescription>
                            Manage users you&apos;ve blocked from contacting you.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingBlockedUsers ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : blockedUsers.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <UserX className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
                                <p className="font-medium mb-1">You haven&apos;t blocked any users</p>
                                <p className="text-sm">Blocked users won&apos;t be able to contact you or see your status.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground mb-2">
                                    Users you&apos;ve blocked ({blockedUsers.length})
                                </p>
                                
                                <div className="divide-y">
                                    {blockedUsers.map((blockedUser) => (
                                        <div 
                                            key={blockedUser.id} 
                                            className="py-3 flex items-center justify-between"
                                        >
                                            <div className="flex items-center">
                                                <Avatar className="h-10 w-10 mr-3">
                                                    <AvatarImage 
                                                        src={blockedUser.image || undefined} 
                                                        alt={blockedUser.name || "User"} 
                                                    />
                                                    <AvatarFallback>
                                                        {blockedUser.name?.charAt(0)?.toUpperCase() || ''}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{blockedUser.name}</p>
                                                    {blockedUser.email && (
                                                        <p className="text-sm text-muted-foreground">{blockedUser.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleUnblockUser(blockedUser)}
                                                disabled={unblockMutation.isPending}
                                                className="flex items-center gap-1"
                                            >
                                                <UserCheck className="h-4 w-4" />
                                                <span>Unblock</span>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 