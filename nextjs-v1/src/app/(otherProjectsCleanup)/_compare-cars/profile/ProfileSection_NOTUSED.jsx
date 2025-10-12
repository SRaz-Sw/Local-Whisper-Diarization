import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Settings,
  TrendingUp,
  Fuel,
  Zap,
  DollarSign,
  Car,
  LogOut,
  Mail,
  UserCircle,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Shield,
  Gauge,
} from "lucide-react";
import { User as UserEntity } from "@/entities/User";

export default function ProfileSection({
  globalParams,
  setGlobalParams,
  onClose,
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [localParams, setLocalParams] = useState(globalParams);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // User account editing states
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await UserEntity.me();
        setCurrentUser(user);
        setProfileData({
          full_name: user.full_name || "",
          email: user.email || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });

        // Check if user is Google authenticated (no password change needed)
        const isGoogleAuth =
          user.email && user.email.includes("@") && !user.password_set;
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();

    // Load dark mode preference
    const savedTheme = localStorage.getItem("nextjsv1-theme");
    setIsDarkMode(savedTheme === "dark");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const handleParamChange = (key, value) => {
    const updatedParams = {
      ...localParams,
      [key]: parseFloat(value) || 0,
    };
    setLocalParams(updatedParams);
    setGlobalParams(updatedParams);
  };

  const handleThemeToggle = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);

    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("nextjsv1-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("nextjsv1-theme", "light");
    }
  };

  const handleProfileUpdate = async () => {
    setIsSaving(true);
    try {
      const updateData = {};

      if (profileData.full_name !== currentUser.full_name) {
        updateData.full_name = profileData.full_name;
      }

      if (profileData.email !== currentUser.email) {
        updateData.email = profileData.email;
      }

      // Handle password change if provided
      if (
        profileData.newPassword &&
        profileData.newPassword === profileData.confirmPassword
      ) {
        updateData.password = profileData.newPassword;
        if (profileData.currentPassword) {
          updateData.current_password = profileData.currentPassword;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await UserEntity.updateMyUserData(updateData);

        // Refresh user data
        const updatedUser = await UserEntity.me();
        setCurrentUser(updatedUser);
        setProfileData({
          ...profileData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }

      setEditingProfile(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await UserEntity.logout();
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isGoogleUser =
    currentUser?.email?.includes("gmail.com") ||
    currentUser?.provider === "google";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Profile Header */}
      <Card className="border-info/20 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600">
                <UserCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  My Profile
                </h2>
                <p className="text-info text-sm font-normal dark:text-blue-300">
                  Manage your account and preferences
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={handleThemeToggle}
                />
                <Moon className="h-4 w-4" />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!editingProfile ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="bg-background dark:bg-secondary flex items-center gap-3 rounded-lg border border-blue-100 p-4 dark:border-blue-800">
                <Mail className="text-info h-5 w-5" />
                <div className="flex-1">
                  <Label className="text-muted-foreground dark:text-foreground/90 text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-semibold dark:text-gray-100">
                      {currentUser?.email || "Not available"}
                    </p>
                    {isGoogleUser && (
                      <Badge variant="secondary" className="text-xs">
                        Google
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-background dark:bg-secondary flex items-center gap-3 rounded-lg border border-blue-100 p-4 dark:border-blue-800">
                <User className="text-info h-5 w-5" />
                <div className="flex-1">
                  <Label className="text-muted-foreground dark:text-foreground/90 text-sm font-medium">
                    Full Name
                  </Label>
                  <p className="text-foreground font-semibold dark:text-gray-100">
                    {currentUser?.full_name || "Not set"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={profileData.full_name}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        full_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        email: e.target.value,
                      })
                    }
                    disabled={isGoogleUser}
                  />
                  {isGoogleUser && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Email managed by Google
                    </p>
                  )}
                </div>
              </div>

              {!isGoogleUser && (
                <div className="bg-secondary dark:bg-secondary space-y-4 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 font-medium">
                      <Shield className="h-4 w-4" />
                      Change Password
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="current-password">
                        Current Password
                      </Label>
                      <Input
                        id="current-password"
                        type={showPasswords ? "text" : "password"}
                        value={profileData.currentPassword}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            currentPassword: e.target.value,
                          })
                        }
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type={showPasswords ? "text" : "password"}
                        value={profileData.newPassword}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">
                        Confirm Password
                      </Label>
                      <Input
                        id="confirm-password"
                        type={showPasswords ? "text" : "password"}
                        value={profileData.confirmPassword}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  {profileData.newPassword &&
                    profileData.confirmPassword &&
                    profileData.newPassword !==
                      profileData.confirmPassword && (
                      <p className="text-destructive text-sm">
                        Passwords do not match
                      </p>
                    )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {!editingProfile ? (
              <Button
                variant="outline"
                onClick={() => setEditingProfile(true)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleProfileUpdate}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingProfile(false);
                    setProfileData({
                      full_name: currentUser?.full_name || "",
                      email: currentUser?.email || "",
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Basic Driving Settings */}
      <Card className="bg-background/60 backdrop-blur-sm dark:bg-gray-800/60">
        <CardHeader>
          <CardTitle className="text-success-foreground flex items-center gap-2 text-lg dark:text-green-200">
            <Gauge className="text-success h-5 w-5" />
            Your Driving Profile
          </CardTitle>
          <p className="text-muted-foreground text-sm dark:text-gray-400">
            Basic settings that affect all car comparisons
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <Label
                htmlFor="annual-km"
                className="flex items-center gap-1 text-sm font-medium"
              >
                <Car className="h-3 w-3" />
                Annual Driving Distance (km)
              </Label>
              <Input
                id="annual-km"
                type="text"
                value={localParams.annualKm.toLocaleString()}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, "");
                  handleParamChange("annualKm", value);
                }}
                className="mt-1 text-lg font-semibold"
                placeholder="15,000"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                How many kilometers you drive per year
              </p>
            </div>
            <div>
              <Label
                htmlFor="gas-price"
                className="flex items-center gap-1 bg-green-500 text-sm font-medium text-red-500"
              >
                <Fuel className="h-3 w-3" />
                Gasoline Price (₪/L)
              </Label>
              <Input
                id="gas-price"
                type="text"
                value={localParams.gasPrice}
                onChange={(e) =>
                  handleParamChange("gasPrice", e.target.value)
                }
                className="mt-1 text-lg font-semibold"
                placeholder="7.5"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Current fuel price per liter
              </p>
            </div>
            <div>
              <Label
                htmlFor="electricity-price"
                className="flex items-center gap-1 text-sm font-medium"
              >
                <Zap className="h-3 w-3" />
                Electricity Price (₪/kWh)
              </Label>
              <Input
                id="electricity-price"
                type="text"
                value={localParams.electricityPrice}
                onChange={(e) =>
                  handleParamChange("electricityPrice", e.target.value)
                }
                className="mt-1 text-lg font-semibold"
                placeholder="0.63"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Cost per kWh for EV charging
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Investment Settings */}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-900/20 dark:to-orange-900/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg text-amber-800 dark:text-amber-200">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              Advanced Investment Analysis
              <Badge variant="secondary" className="ml-2 text-xs">
                Advanced
              </Badge>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-amber-700 dark:text-amber-300"
            >
              {showAdvanced ? "Hide Advanced" : "Show Advanced"}
            </Button>
          </CardTitle>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            For users who want to factor in opportunity cost and investment
            returns
          </p>
        </CardHeader>
        {showAdvanced && (
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <Label
                  htmlFor="initial-investment"
                  className="flex items-center gap-1 text-sm font-medium"
                >
                  <DollarSign className="h-3 w-3" />
                  Total Available Budget (₪)
                </Label>
                <Input
                  id="initial-investment"
                  type="text"
                  value={localParams.initialInvestment.toLocaleString()}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, "");
                    handleParamChange("initialInvestment", value);
                  }}
                  className="mt-1 text-lg font-semibold"
                  placeholder="500,000"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Money available for car + alternative investments
                </p>
              </div>
              <div>
                <Label
                  htmlFor="stock-return"
                  className="text-sm font-medium"
                >
                  Expected Investment Return (%/year)
                </Label>
                <Input
                  id="stock-return"
                  type="text"
                  value={localParams.stockMarketReturn}
                  onChange={(e) =>
                    handleParamChange("stockMarketReturn", e.target.value)
                  }
                  className="mt-1 text-lg font-semibold"
                  placeholder="15"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Annual return on stocks/investments (opportunity cost)
                </p>
              </div>
              <div>
                <Label htmlFor="inflation" className="text-sm font-medium">
                  Inflation Rate (%/year)
                </Label>
                <Input
                  id="inflation"
                  type="text"
                  value={localParams.inflationRate}
                  onChange={(e) =>
                    handleParamChange("inflationRate", e.target.value)
                  }
                  className="mt-1 text-lg font-semibold"
                  placeholder="3.2"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Expected annual inflation rate
                </p>
              </div>
            </div>

            <div className="bg-background dark:bg-secondary mt-6 rounded-lg border border-amber-200 p-4 dark:border-amber-800">
              <h4 className="mb-2 font-semibold text-amber-800 dark:text-amber-200">
                💡 Investment Analysis Guidelines
              </h4>
              <div className="grid grid-cols-1 gap-4 text-sm text-amber-700 md:grid-cols-3 dark:text-amber-300">
                <div>
                  <strong>Conservative:</strong> 8-12% returns
                  <br />
                  <span className="text-xs">
                    Bonds, index funds, safe investments
                  </span>
                </div>
                <div>
                  <strong>Moderate:</strong> 12-18% returns
                  <br />
                  <span className="text-xs">
                    Diversified stock portfolio
                  </span>
                </div>
                <div>
                  <strong>Aggressive:</strong> 18%+ returns
                  <br />
                  <span className="text-xs">
                    Growth stocks, higher risk investments
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Account Actions */}
      <Card className="bg-secondary dark:bg-secondary border-border dark:border-border">
        <CardHeader>
          <CardTitle className="text-foreground/90 dark:text-foreground/90 text-lg">
            Account Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="text-destructive border-destructive/20 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-900/20"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
