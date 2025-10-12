"use client";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Car,
  Plus,
  Search,
  Settings,
  Trash2,
  Copy,
  GripVertical,
  User,
  BarChart3,
  Calculator,
  TrendingUp,
  RefreshCw,
  WifiOff,
  Share,
  Download,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  parseImportedCars,
  exportAllCars,
  formatCarForClipboard,
} from "@/app/(compare)/utils/ioCars";

// Sortable item component for car list
const SortableCarItem = ({
  car,
  isActive,
  onClick,
  onRemove,
  onDuplicate,
  onShare,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: car.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`group flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-200 hover:shadow-md ${
              isActive
                ? "bg-primary/10 border-primary shadow-sm"
                : "bg-background border-border hover:border-sidebar-border"
            }`}
            onClick={onClick}
          >
            <div
              {...listeners}
              className="cursor-grab hover:cursor-grabbing"
            >
              <GripVertical className="text-muted-foreground h-4 w-4" />
            </div>

            <Car className="text-sidebar-primary h-4 w-4 flex-shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {car.customName || car.name}
              </div>
              <div className="text-muted-foreground text-xs">
                ₪{car.carPrice?.toLocaleString() || "0"}
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(car);
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => onDuplicate(car)}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onShare?.(car)}
            className="gap-2"
          >
            <Share className="h-4 w-4" />
            Share
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onRemove(car.id)}
            className="text-destructive focus:text-destructive gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};

const AppLayout = ({
  children,
  cars = [],
  activeView,
  setActiveView,
  addNewCar,
  showAIResearch,
  syncStatus = "synced",
  reorderCars,
  duplicateCar,
  removeCar,
  shareCar,
  currentUser,
  importCars, // Add this prop for importing cars
}) => {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = cars.findIndex((car) => car.id === active.id);
      const newIndex = cars.findIndex((car) => car.id === over.id);

      const newOrder = arrayMove(cars, oldIndex, newIndex);
      reorderCars?.(newOrder);
    }
  };

  // Function to handle sharing a single car
  const handleShareCar = async (car) => {
    try {
      const carData = [formatCarForClipboard(car)];
      await navigator.clipboard.writeText(
        JSON.stringify(carData, null, 2),
      );

      toast.success("Car copied to clipboard!", {
        title: "Car copied to clipboard!",
        description: `${car.customName || car.name} has been copied to your clipboard.`,
        duration: 3000,
      });

      // Call the original shareCar function if it exists
      shareCar?.(car);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("Failed to copy", {
        title: "Failed to copy",
        description: "Could not copy car to clipboard. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Function to export all cars
  const handleExportAllCars = async () => {
    try {
      await exportAllCars(cars);
      toast.success("All cars exported successfully!", {
        title: "All cars exported successfully!",
        description: `${cars.length} car${cars.length > 1 ? "s" : ""} exported successfully.`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to export all cars:", error);
      toast.error("Failed to export", {
        title: "Failed to export",
        description: "Could not export cars. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Function to handle importing cars
  const handleImportCars = () => {
    if (!importText.trim()) {
      toast.error("No data to import", {
        title: "No data to import",
        description: "Please paste car data to import.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      const parsedCars = parseImportedCars(importText);

      if (parsedCars.length === 0) {
        toast.error("Invalid format", {
          title: "Invalid format",
          description:
            "Could not parse the pasted data. Please check the format.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      // Call the importCars function passed as prop
      if (importCars) {
        importCars(parsedCars);
      }

      toast.success("Cars imported successfully!", {
        title: "Cars imported successfully!",
        description: `${parsedCars.length} car${parsedCars.length > 1 ? "s" : ""} have been imported.`,
        duration: 3000,
      });

      // Reset dialog state
      setImportText("");
      setShowImportDialog(false);
    } catch (error) {
      console.error("Error importing cars:", error);
      toast.error("Import failed", {
        title: "Import failed",
        description:
          "Could not import cars. Please check the format and try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return (
          <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
        );
      case "error":
        return <WifiOff className="text-destructive h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4 text-teal-500" />;
    }
  };

  return (
    <div className="flex h-[calc(100svh-4rem)]">
      {/* Sidebar */}
      <div className="bg-background border-border flex w-80 flex-col overflow-hidden border-r">
        {/* Header */}
        <div className="border-border border-b p-4">
          {/* Navigation */}
          <div className="grid grid-cols-1 gap-4 text-center">
            {/* Only show Profile button for authenticated users */}
            {currentUser && (
              <Button
                variant={
                  activeView === "profile" ? "secondary" : "outline"
                }
                size="sm"
                onClick={() => setActiveView("profile")}
                className={`justify-center gap-2 border-1${
                  activeView === "profile"
                    ? "border-primary"
                    : "border-border"
                }`}
              >
                <User className="h-4 w-4" />
                Profile
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveView("overview")}
              // white font if the active view is overview
              className={`bg-sidebar-primary justify-center gap-2 border-1 border-b-gray-400 text-gray-100 ${
                activeView === "overview"
                  ? "border-primary border-b-1"
                  : "border-b-3"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Compare Cars Overview
            </Button>
          </div>
        </div>

        {/* Cars List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-foreground text-sm font-semibold">
              Your Cars ({cars.length})
            </h3>
            {cars.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportAllCars}
                className="hover:bg-primary/10 text-sidebar-accent-foreground/80 hover:text-sidebar-accent-foreground h-8 px-2 text-xs"
              >
                <Share className="mr-1 h-3 w-3" />
                Export All
              </Button>
            )}
          </div>

          {cars.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <Car className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p className="text-sm">No cars added yet</p>
              <p className="text-xs">Add your first car to get started</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={cars.map((car) => car.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {cars.map((car) => (
                    <SortableCarItem
                      key={car.id}
                      car={car}
                      isActive={activeView === car.id}
                      onClick={() => setActiveView(car.id)}
                      onRemove={removeCar}
                      onDuplicate={duplicateCar}
                      onShare={handleShareCar}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div className="border-border border-t p-4">
          {/* Action Buttons */}
          <div className="mb-4 space-y-2">
            <div className="flex w-full gap-1">
              <Button
                onClick={() => setShowImportDialog(true)}
                className="w-1/4 justify-center"
                size="sm"
                variant="outline"
                title="Import Cars"
              >
                <Download className="text-sidebar-accent-foreground/80 hover:text-sidebar-accent-foreground mr-1 h-3 w-3" />
              </Button>
              <Button
                onClick={addNewCar}
                className="w-3/4 justify-center gap-2"
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                Add New Car
              </Button>
            </div>
            <Button
              onClick={showAIResearch}
              variant="gradient"
              className="w-full justify-center gap-2 border-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-gray-100 hover:from-purple-700 hover:to-indigo-700"
              size="sm"
            >
              <Search className="h-4 w-4" />
              AI Car Research
            </Button>
          </div>

          <div className="text-muted-foreground text-center text-xs">
            NextjsV1 © 2025
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-background/70 flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Cars</DialogTitle>
            <DialogDescription>
              Paste your exported car data below to import cars into your
              collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your exported car data here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="text-muted-foreground text-sm">
              <p>Supported formats:</p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-xs">
                <li>JSON array of car objects</li>
                <li>Individual car objects</li>
                <li>Exported format from this app</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportText("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImportCars}>Import Cars</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppLayout;
