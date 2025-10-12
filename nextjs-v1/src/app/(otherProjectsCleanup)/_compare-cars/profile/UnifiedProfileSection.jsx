import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  ArrowLeft,
  Save,
  Bell,
  Globe,
  Smartphone,
  Clock, // New import for sync indicator
  Loader2, // New import for sync indicator
  CheckCircle, // New import for sync indicator
} from "lucide-react";
import { useTheme } from "next-themes";
import { User as UserEntity } from "@/entities/User";
import DecimalInput from "@/components/ui/inputDecimal";
export default function UnifiedProfileSection({
  globalParams,
  setGlobalParams,
  onClose,
}) {
  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  // Local parameters state with background sync
  const [localParams, setLocalParams] = useState(globalParams);
  const [paramsSyncStatus, setParamsSyncStatus] = useState("synced"); // 'synced', 'pending', 'syncing', 'error'

  // Use refs to track sync state without causing re-renders
  const paramsyncTimeoutRef = useRef(null);
  const lastSyncedParamsRef = useRef(globalParams);

  // Theme and preferences

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [language, setLanguage] = useState("en");
  const [notifications, setNotifications] = useState(true);

  // User account editing states
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);

  // Persistent active tab - load from localStorage
  const [activeTab, setActiveTab] = useState(() => {
    return (
      localStorage.getItem("nextjsv1-profile-active-tab") || "account"
    );
  });

  // Save active tab to localStorage whenever it changes
  const handleTabChange = useCallback((newTab) => {
    setActiveTab(newTab);
    localStorage.setItem("nextjsv1-profile-active-tab", newTab);
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await UserEntity.me();
        setCurrentUser(user);
        setProfileData({
          name: user.name || "",
          email: user.email || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();

    // Initialize local params from prop and ref
    setLocalParams(globalParams);
    lastSyncedParamsRef.current = globalParams;
  }, []); // globalParams removed from dependencies as per outline

  // Background sync function for parameters
  const backgroundParamsSync = useCallback(
    async (paramsToSync) => {
      try {
        setParamsSyncStatus("syncing");

        // Update parent state and localStorage in background
        // Using setTimeout(0) to defer update, allowing UI to remain responsive if many updates happen quickly
        setTimeout(() => {
          setGlobalParams(paramsToSync);
          localStorage.setItem(
            "nextjsv1-params",
            JSON.stringify(paramsToSync),
          );
        }, 0);

        // Update last synced reference
        lastSyncedParamsRef.current = { ...paramsToSync };

        // Show synced status for a brief moment
        setTimeout(() => setParamsSyncStatus("synced"), 500);
      } catch (error) {
        console.error("Background params sync failed:", error);
        setParamsSyncStatus("error");
      }
    },
    [setGlobalParams],
  );

  // Debounced background sync for parameters
  useEffect(() => {
    if (!localParams) return;

    // Check if local params are different from last synced
    const hasChanges =
      JSON.stringify(localParams) !==
      JSON.stringify(lastSyncedParamsRef.current);

    if (!hasChanges) {
      setParamsSyncStatus("synced");
      return;
    }

    // Clear existing timeout
    if (paramsyncTimeoutRef.current) {
      clearTimeout(paramsyncTimeoutRef.current);
    }

    setParamsSyncStatus("pending");

    // Set new timeout for background sync
    paramsyncTimeoutRef.current = setTimeout(() => {
      backgroundParamsSync(localParams);
    }, 1500); // 1.5 second delay for parameters

    return () => {
      if (paramsyncTimeoutRef.current) {
        clearTimeout(paramsyncTimeoutRef.current);
      }
    };
  }, [localParams, backgroundParamsSync]);

  // Local-first parameter change handler
  const handleParamChange = useCallback((key, value) => {
    const numValue = parseFloat(value) || 0;
    setLocalParams((prev) => ({ ...prev, [key]: numValue }));
  }, []); // No dependencies as it only uses setLocalParams (updater function)

  const handleThemeToggle = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  const handleAdvancedToggle = () => {
    const newAdvanced = !showAdvanced;
    setShowAdvanced(newAdvanced);
    localStorage.setItem("nextjsv1-show-advanced", newAdvanced.toString());
  };

  const handleNotificationsToggle = () => {
    const newNotifications = !notifications;
    setNotifications(newNotifications);
    localStorage.setItem(
      "nextjsv1-notifications",
      newNotifications.toString(),
    );
  };

  const handleProfileUpdate = async () => {
    setIsSaving(true);
    try {
      const updateData = {};

      if (profileData.name !== currentUser.name) {
        updateData.name = profileData.name;
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
        await UserEntity.update(currentUser.id, updateData);

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

  // Sync status indicator for parameters at the top level
  const TopSyncIndicator = useMemo(() => {
    switch (paramsSyncStatus) {
      case "pending":
        return (
          <div className="bg-warning/10 flex items-center gap-2 rounded-lg border border-yellow-200 px-4 py-2">
            <Clock className="h-4 w-4 animate-pulse text-yellow-600" />
            <span className="text-warning text-sm">
              Changes pending...
            </span>
          </div>
        );
      case "syncing":
        return (
          <div className="bg-info/10 border-info/20 flex items-center gap-2 rounded-lg border px-4 py-2">
            <Loader2 className="text-info h-4 w-4 animate-spin" />
            <span className="text-info text-sm">Syncing changes...</span>
          </div>
        );
      case "synced": // This case will only render if paramsSyncStatus is 'synced' and the parent condition allows it
        return (
          <div className="bg-success/10 border-success/20 flex items-center gap-2 rounded-lg border px-4 py-2">
            <CheckCircle className="text-success h-4 w-4" />
            <span className="text-success text-sm">All changes saved</span>
          </div>
        );
      case "error":
        return (
          <div className="bg-destructive/10 border-destructive/20 flex items-center gap-2 rounded-lg border px-4 py-2">
            <Shield className="text-destructive h-4 w-4" />
            <span className="text-destructive text-sm">
              Error saving changes
            </span>
          </div>
        );
      default:
        return null;
    }
  }, [paramsSyncStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600">
            <UserCircle className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-foreground text-3xl font-bold dark:text-gray-100">
              {currentUser?.name || "My Profile"}
            </h1>
            <p className="text-muted-foreground dark:text-gray-400">
              Manage your account, preferences, and car comparison settings
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cars
        </Button>
      </div>

      {/* Top-level sync status indicator */}
      {paramsSyncStatus !== "synced" && ( // Only show if not 'synced' based on outline. 'synced' state will be shown briefly internally by backgroundParamsSync
        <div className="flex justify-center">{TopSyncIndicator}</div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="driving" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Driving
          </TabsTrigger>
          <TabsTrigger
            value="investment"
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Investment
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!editingProfile ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="bg-secondary dark:bg-secondary flex items-center gap-3 rounded-lg p-4">
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
                    <div className="bg-secondary dark:bg-secondary flex items-center gap-3 rounded-lg p-4">
                      <User className="text-info h-5 w-5" />
                      <div className="flex-1">
                        <Label className="text-muted-foreground dark:text-foreground/90 text-sm font-medium">
                          Full Name
                        </Label>
                        <p className="text-foreground font-semibold dark:text-gray-100">
                          {currentUser?.name || "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setEditingProfile(true)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="full-name">Full Name</Label>
                      <Input
                        id="full-name"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            name: e.target.value,
                          })
                        }
                        className="mt-1"
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
                        className="mt-1"
                      />
                      {isGoogleUser && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Email managed by Google
                        </p>
                      )}
                    </div>
                  </div>

                  {!isGoogleUser && (
                    <Card className="bg-secondary dark:bg-secondary">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Shield className="h-4 w-4" />
                          Change Password
                          <Switch
                            checked={showPasswords}
                            onCheckedChange={setShowPasswords}
                          />
                          {showPasswords ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
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
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="new-password">
                              New Password
                            </Label>
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
                              className="mt-1"
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
                              className="mt-1"
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
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileData({
                          name: currentUser?.name || "",
                          email: currentUser?.email || "",
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Driving Tab */}
        <TabsContent value="driving" className="space-y-6">
          <Card className="border-success/20 bg-gradient-to-r from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-success-foreground flex items-center gap-2 dark:text-green-200">
                    <Gauge className="h-5 w-5" />
                    Your Driving Profile
                  </CardTitle>
                  <p className="text-success text-sm dark:text-green-300">
                    Basic settings that affect all car comparisons. These
                    are essential for accurate cost calculations.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="annual-km"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Car className="text-success h-4 w-4" />
                    Annual Driving Distance
                  </Label>
                  <Input
                    id="annual-km"
                    type="text"
                    value={localParams.annualKm.toLocaleString()}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, "");
                      handleParamChange("annualKm", value);
                    }}
                    className="text-lg font-semibold"
                    placeholder="15,000"
                  />
                  <p className="text-muted-foreground text-xs dark:text-gray-400">
                    Kilometers driven per year
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="gas-price"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Fuel className="h-4 w-4 text-orange-600" />
                    Gasoline Price
                  </Label>
                  <div className="relative">
                    <DecimalInput
                      id="gas-price"
                      type="text"
                      defaultValue={localParams.gasPrice}
                      onValueChange={(numValue) =>
                        handleParamChange("gasPrice", numValue)
                      }
                      className="pr-12 text-lg font-semibold"
                      placeholder="7.5"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 transform text-sm">
                      ₪/L
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs dark:text-gray-400">
                    Current fuel price per liter
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="electricity-price"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Zap className="h-4 w-4 text-yellow-600" />
                    Electricity Price
                  </Label>
                  <div className="relative">
                    <DecimalInput
                      id="electricity-price"
                      type="text"
                      defaultValue={localParams.electricityPrice}
                      onValueChange={(numValue) =>
                        handleParamChange("electricityPrice", numValue)
                      }
                      className="pr-16 text-lg font-semibold"
                      placeholder="0.63"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 transform text-sm">
                      ₪/kWh
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs dark:text-gray-400">
                    Cost per kWh for EV charging
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investment Tab */}
        <TabsContent value="investment" className="space-y-6">
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-900/20 dark:to-orange-900/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
                    <TrendingUp className="h-5 w-5" />
                    Advanced Investment Analysis
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    >
                      Advanced
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    For users who want to factor in opportunity cost and
                    investment returns when comparing cars. This helps you
                    understand the true financial impact of your car
                    purchase decision.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="initial-investment"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    Total Available Budget
                  </Label>
                  <Input
                    id="initial-investment"
                    type="text"
                    value={localParams.initialInvestment.toLocaleString()}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, "");
                      handleParamChange("initialInvestment", value);
                    }}
                    className="text-lg font-semibold"
                    placeholder="500,000"
                  />
                  <p className="text-muted-foreground text-xs dark:text-gray-400">
                    Total money available for car purchase + alternative
                    investments
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="stock-return"
                    className="text-sm font-medium"
                  >
                    Expected Investment Return
                  </Label>
                  <div className="relative">
                    <DecimalInput
                      id="stock-return"
                      type="text"
                      defaultValue={localParams.stockMarketReturn}
                      onValueChange={(numValue) =>
                        handleParamChange("stockMarketReturn", numValue)
                      }
                      className="pr-12 text-lg font-semibold"
                      placeholder="15"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 transform text-sm">
                      %/year
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs dark:text-gray-400">
                    Annual return on stocks/investments (opportunity cost)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="inflation"
                    className="text-sm font-medium"
                  >
                    Inflation Rate
                  </Label>
                  <div className="relative">
                    <DecimalInput
                      id="inflation"
                      disabled={true}
                      type="text"
                      defaultValue={localParams.inflationRate}
                      onValueChange={(numValue) =>
                        handleParamChange("inflationRate", numValue)
                      }
                      className="pr-12 text-lg font-semibold"
                      placeholder="3.2"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 transform text-sm">
                      %/year
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs dark:text-gray-400">
                    Expected annual inflation rate (Advanced, contact
                    Shahar to unlock)
                  </p>
                </div>
              </div>

              <Card className="bg-background dark:bg-secondary border-amber-200 dark:border-amber-700">
                <CardContent className="pt-6">
                  <h4 className="mb-3 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
                    <TrendingUp className="h-4 w-4" />
                    Investment Strategy Guidelines
                  </h4>
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                    <div className="bg-muted-foreground/10 rounded-lg p-3 dark:bg-blue-900/20">
                      <div className="text-foreground font-medium dark:text-blue-200">
                        Conservative (8-12%)
                      </div>
                      <p className="text-info mt-1 text-xs dark:text-blue-300">
                        Government bonds, index funds, safe investments
                      </p>
                    </div>
                    <div className="bg-success/10 rounded-lg p-3 dark:bg-green-900/20">
                      <div className="text-foreground font-medium dark:text-green-200">
                        Moderate (12-18%)
                      </div>
                      <p className="text-success mt-1 text-xs dark:text-green-300">
                        Diversified stock portfolio, balanced funds
                      </p>
                    </div>
                    <div className="bg-destructive/10 rounded-lg p-3 dark:bg-red-900/20">
                      <div className="text-foreground font-medium dark:text-red-200">
                        Aggressive (18%+)
                      </div>
                      <p className="text-destructive mt-1 text-xs dark:text-red-300">
                        Growth stocks, high-risk high-reward investments
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* App Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  App Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? (
                      <Moon className="text-info h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <Label className="font-medium">Dark Mode</Label>
                      <p className="text-muted-foreground text-sm dark:text-gray-400">
                        Switch between light and dark themes
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={handleThemeToggle}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                    <div>
                      <Label className="font-medium">
                        Advanced Features
                      </Label>
                      <p className="text-muted-foreground text-sm dark:text-gray-400">
                        Show investment analysis options (Not available)
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={showAdvanced}
                    onCheckedChange={handleAdvancedToggle}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="text-success h-5 w-5" />
                    <div>
                      <Label className="font-medium">Notifications</Label>
                      <p className="text-muted-foreground text-sm dark:text-gray-400">
                        Enable app notifications (Not available)
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications}
                    onCheckedChange={handleNotificationsToggle}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-secondary dark:bg-secondary rounded-lg p-4">
                  <h4 className="mb-2 font-medium">Data Management</h4>
                  <p className="text-muted-foreground mb-3 text-sm dark:text-gray-400">
                    Your car data is automatically saved locally and synced
                    to the cloud.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Export Data
                    </Button>
                    <Button variant="outline" size="sm">
                      Clear Cache
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/20 w-full justify-start hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-900/20"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
