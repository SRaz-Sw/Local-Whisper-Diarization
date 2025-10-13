"use client";
// src/app/login/page.tsx

import React, { useState, useEffect, Suspense } from "react";
import {
  useCurrentUser,
  useLogin,
  useRegister,
  useLogout,
} from "@/hooks/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AxiosError } from "axios";

// Define schemas directly based on the original schemas
const loginWithEmailSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string(),
});

const createUserViaEmailSchema = z.object({
  name: z
    .string()
    .min(4, "Name must be at least 4 characters")
    .max(20, "Name must be between 4 and 20 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string(),
});

type LoginWithEmailData = z.infer<typeof loginWithEmailSchema>;
type CreateUserDataViaEmail = z.infer<typeof createUserViaEmailSchema>;

// ShadCN components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

// Component that uses useSearchParams
function LoginContent() {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  // Set isClient to true once component mounts on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auth hooks
  const { user, isLoadingUser } = useCurrentUser();
  const {
    mutate: loginMutate,
    isPending: loginIsPending,
    error: loginError,
  } = useLogin();
  const {
    mutate: registerMutate,
    isPending: registerIsPending,
    error: registerError,
  } = useRegister();
  const { mutate: logoutMutate, isPending: logoutIsPending } = useLogout();

  // Redirect to returnUrl if user is already logged in
  useEffect(() => {
    if (isClient && user && !isLoadingUser) {
      router.push(decodeURIComponent(returnUrl));
    }
  }, [user, isClient, isLoadingUser, router, returnUrl]);

  // Form handling for login
  const loginForm = useForm<LoginWithEmailData>({
    resolver: zodResolver(loginWithEmailSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Form handling for registration
  const registerForm = useForm<CreateUserDataViaEmail>({
    resolver: zodResolver(createUserViaEmailSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onLoginSubmit = (values: LoginWithEmailData) => {
    loginMutate(values, {
      onSuccess: () => {
        // Redirect on successful login
        router.push(decodeURIComponent(returnUrl));
      },
    });
  };

  const onRegisterSubmit = (values: CreateUserDataViaEmail) => {
    registerMutate(values, {
      onSuccess: () => {
        // Redirect on successful registration
        router.push(decodeURIComponent(returnUrl));
      },
    });
  };

  // Helper function to extract error message
  const getErrorMessage = (error: any) => {
    if (error instanceof AxiosError) {
      return error.response?.data?.message || error.message;
    }
    return error?.message || "An unexpected error occurred";
  };

  const handleLogout = () => {
    logoutMutate();
  };

  // Prevent hydration errors by waiting for client-side render
  if (!isClient) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        {/* Empty placeholder with same structure to prevent layout shift */}
        <div className="w-full max-w-md rounded-xl border py-6">
          {/* Empty loading state */}
        </div>
      </div>
    );
  }

  // Client-side only UI
  // User is loading
  if (isLoadingUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex w-full max-w-md justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // If user is logged in, show profile
  if (user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome back!</CardTitle>
            <CardDescription>You are currently logged in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Name</h3>
                <p>{user.name}</p>
              </div>
              <div>
                <h3 className="font-medium">Email</h3>
                <p>{user.email}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={handleLogout}
              disabled={logoutIsPending}
            >
              {logoutIsPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Logout"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If user is not logged in, show login/register form
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Car Wise קנה רכב - חכם
          </CardTitle>
          <CardDescription className="text-center">
            Login or create an account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="email@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {loginError && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-500">
                      {getErrorMessage(loginError)}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginIsPending}
                  >
                    {loginIsPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form
                  onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="email@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {registerError && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-500">
                      {getErrorMessage(registerError)}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerIsPending}
                  >
                    {registerIsPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Main component that wraps the search params usage in suspense
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="flex w-full max-w-md justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
