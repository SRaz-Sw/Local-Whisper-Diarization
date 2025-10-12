"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ApiInputs,
  ApiOutputs,
  client,
  orpc,
} from "@/lib/oRPC_node_server/clients/orpc";
import { saveToken, clearToken, getToken } from "@/lib/token";

// Types from the node server API
export type LoginFormValues = ApiInputs["auth"]["login"];
export type LoginOutput = ApiOutputs["auth"]["login"]["user"];
export type UserOutput = ApiOutputs["auth"]["me"];
export type AllUsersParams = ApiInputs["users"]["getAll"];
export type AllUsersOutput = ApiOutputs["users"]["getAll"];

export function DemoNodeServer() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<Partial<UserOutput> | null>(null);
  const [users, setUsers] = useState<AllUsersOutput>([]);
  const [error, setError] = useState<string | null>(null);

  // Check current token status
  const currentToken = getToken();
  const hasToken =
    currentToken &&
    currentToken !==
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2N2ViZTQ1ZGU5NGI1MDE1NDBkZGVjNzgiLCJpYXQiOjE3NDQxMjM2NjYsImV4cCI6MTc0NDcyODQ2Nn0.Hyqlk78MCNK0x6iiDmSumlxr5KmJJbKxpsa4n-7NtK4";

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values: LoginFormValues = {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? "").trim(),
    };

    if (!values.email || !values.password) return;

    setIsSubmitting(true);
    setError(null);

    try {
      console.log("🔐 ATTEMPTING LOGIN - Check console for header logs");

      const result = await client.auth.login(values);

      if (result.user?.token) {
        // Save the real token
        saveToken(result.user.token);
        setUser(result.user);
        console.log("✅ LOGIN SUCCESS - Token saved to localStorage");
        console.log(
          "New token:",
          result.user.token.substring(0, 30) + "...",
        );
      }
    } catch (err: any) {
      console.error("❌ LOGIN FAILED:", err);
      setError(err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGetMe() {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log("🔍 CALLING AUTH.ME - Check console for header logs");
      console.log(
        "Current token in localStorage:",
        getToken()?.substring(0, 30) + "...",
      );

      const result = await client.auth.me({});
      setUser(result);
      console.log("✅ GET ME SUCCESS:", result);
    } catch (err: any) {
      console.error("❌ GET ME FAILED:", err);
      setError(err.message || "Failed to get user info");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGetUsers() {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log("👥 GETTING ALL USERS - Check console for header logs");

      const result = await client.users.getAll({});
      setUsers(result || []);
      console.log("✅ GET USERS SUCCESS:", result);
    } catch (err: any) {
      console.error("❌ GET USERS FAILED:", err);
      setError(err.message || "Failed to get users");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setUsers([]);
    setError(null);
    console.log("🚪 LOGGED OUT - Token cleared");
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>oRPC Node Server Authentication Test</CardTitle>
          <CardDescription>
            Test authentication flow and observe console logs for header
            function calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <strong>Current Token Status:</strong>{" "}
            {hasToken ? (
              <span className="text-green-600">✅ Has valid token</span>
            ) : (
              <span className="text-orange-600">
                ⚠️ Using default/no token
              </span>
            )}
          </div>

          {user && (
            <div className="rounded-md bg-green-50 p-3">
              <strong>Logged in as:</strong> {user.email} (
              {user.name || "No name"})
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="ml-2"
              >
                Logout
              </Button>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login Form */}
      <Card>
        <CardHeader>
          <CardTitle>1. Login (Public Endpoint)</CardTitle>
          <CardDescription>
            This should work without a token. Watch console for "🔑 oRPC
            Request" logs.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin} className="contents">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="test@example.com"
                defaultValue="dev@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="password"
                defaultValue="11223344"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="ml-auto"
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Get Me Button */}
      <Card>
        <CardHeader>
          <CardTitle>2. Get Current User (Protected Endpoint)</CardTitle>
          <CardDescription>
            This requires a valid token. Login first to test.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGetMe}
            disabled={isSubmitting}
            variant={hasToken ? "default" : "secondary"}
          >
            {isSubmitting ? "Loading..." : "Get My Info"}
          </Button>
        </CardContent>
      </Card>

      {/* Get Users Button */}
      <Card>
        <CardHeader>
          <CardTitle>3. Get All Users (Protected Endpoint)</CardTitle>
          <CardDescription>
            This also requires a valid token. Each request should log
            headers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGetUsers}
            disabled={false} // isSubmitting || !hasToken
            variant={hasToken ? "default" : "secondary"}
          >
            {isSubmitting ? "Loading..." : "Get All Users"}
          </Button>
        </CardContent>
      </Card>

      {/* Users Results */}
      {users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((u, index) => (
                <div key={u.id || index} className="rounded-md border p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{u.name || "No name"}</p>
                      <p className="text-muted-foreground text-sm">
                        {u.email}
                      </p>
                      {u.id && (
                        <p className="text-muted-foreground text-xs">
                          ID: {u.id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base">Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm">
            <li>Open browser dev tools console</li>
            <li>
              Click "Login" - you should see "🔑 oRPC Request" log with
              default token
            </li>
            <li>
              After successful login, click "Get My Info" - check if you
              see a new log with the real token
            </li>
            <li>
              Click "Get All Users" - each request should show the header
              function running
            </li>
            <li>
              If you see the logs for each request, the headers function is
              working correctly!
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
