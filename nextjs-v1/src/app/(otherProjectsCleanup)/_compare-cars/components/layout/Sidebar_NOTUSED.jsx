import React, { useState, useRef } from "react";
import {
  BarChart3,
  PlusCircle,
  X,
  Sparkles,
  User,
  Car,
  Copy,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default function Sidebar({
  cars,
  activeView,
  setActiveView,
  addNewCar,
  showAIResearch,
  isOpen,
  setIsOpen,
  reorderCars,
  duplicateCar,
  removeCar,
}) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Reorder cars array
    const newCars = Array.from(cars);
    const [removed] = newCars.splice(sourceIndex, 1);
    newCars.splice(destinationIndex, 0, removed);

    // Call parent function to update the order
    if (reorderCars) {
      reorderCars(newCars);
    }
  };

  const handleDuplicateCar = (car) => {
    if (duplicateCar) {
      duplicateCar(car);
    }
  };

  const handleRemoveCar = (car) => {
    if (
      removeCar &&
      window.confirm(
        `Are you sure you want to remove "${car.customName || car.name}"?`,
      )
    ) {
      removeCar(car.id);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      <aside
        className={`bg-background/80 dark:bg-background/80 border-border dark:border-border fixed top-0 left-0 z-40 flex h-full w-64 transform flex-col border-r backdrop-blur-lg transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Header - Fixed at top */}
        <div className="border-border dark:border-border flex flex-shrink-0 items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600">
              <Car className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-foreground dark:text-foreground text-xl font-bold">
              NextjsV1
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation - Fixed at top */}
        <div className="border-border dark:border-border flex-shrink-0 border-b p-4">
          <h2 className="text-muted-foreground mb-3 px-2 text-sm font-semibold uppercase dark:text-gray-400">
            Navigation
          </h2>

          <div className="space-y-2">
            <Button
              variant={activeView === "profile" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => {
                setActiveView("profile");
                setIsOpen(false);
              }}
            >
              <User className="h-4 w-4" />
              My Profile
            </Button>

            <Button
              variant={activeView === "overview" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => {
                setActiveView("overview");
                setIsOpen(false);
              }}
            >
              <BarChart3 className="h-4 w-4" />
              Car Comparison
            </Button>
          </div>
        </div>

        {/* Cars List - Scrollable middle section */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-shrink-0 p-4 pb-2">
            <h2 className="text-muted-foreground px-2 text-sm font-semibold uppercase dark:text-gray-400">
              My Cars
              {cars.length > 1 && (
                <span className="ml-1 text-xs opacity-60">
                  (drag handle to reorder)
                </span>
              )}
            </h2>
          </div>

          {/* Scrollable cars container */}
          <div className="flex-1 overflow-y-auto px-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="cars">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-1 pb-4 ${
                      snapshot.isDraggingOver
                        ? "rounded-lg bg-blue-50 p-1 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    {cars.map((car, index) => (
                      <Draggable
                        key={car.id}
                        draggableId={car.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <ContextMenu>
                            <ContextMenuTrigger>
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`group relative flex w-full items-center gap-2 rounded-lg text-left transition-all duration-200 ${
                                  snapshot.isDragging
                                    ? "dark:bg-secondary border-info/20 z-50 scale-105 border bg-white shadow-xl dark:border-blue-700"
                                    : activeView === car.id
                                      ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
                                      : "dark:text-foreground/90 hover:bg-secondary text-gray-700 dark:hover:bg-gray-800"
                                }`}
                              >
                                {/* Drag Handle */}
                                <div
                                  {...provided.dragHandleProps}
                                  className={`flex-shrink-0 cursor-grab rounded-md p-2 transition-colors duration-200 active:cursor-grabbing ${
                                    snapshot.isDragging
                                      ? "bg-info/20 text-blue-600 dark:bg-blue-900/50"
                                      : "hover:text-muted-foreground text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>

                                {/* Car Content - Clickable */}
                                <div
                                  className="min-w-0 flex-1 cursor-pointer py-2 pr-2"
                                  onClick={() => {
                                    setActiveView(car.id);
                                    setIsOpen(false);
                                  }}
                                >
                                  <div className="truncate text-sm leading-tight font-medium">
                                    {car.customName || car.name}
                                  </div>
                                  {car.customName && (
                                    <div className="mt-0.5 truncate text-xs opacity-70">
                                      {car.name}
                                    </div>
                                  )}
                                  <div className="mt-1 text-xs opacity-60">
                                    ₪{(car.carPrice || 0).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuItem
                                onClick={() => handleDuplicateCar(car)}
                                className="flex items-center gap-2"
                              >
                                <Copy className="h-4 w-4" />
                                Duplicate Car
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => handleRemoveCar(car)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 flex items-center gap-2 dark:focus:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove Car
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        {/* Bottom Actions - Fixed at bottom */}
        <div className="border-border dark:border-border bg-background/60 flex-shrink-0 border-t p-4 backdrop-blur-sm dark:bg-gray-900/60">
          <div className="space-y-2">
            <Button
              onClick={addNewCar}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <PlusCircle className="h-4 w-4" />
              Add New Car
            </Button>

            <Button
              variant="gradient"
              onClick={() => {
                showAIResearch();
                setIsOpen(false);
              }}
              className="w-full justify-start gap-2"
            >
              <Sparkles className="h-4 w-4" />
              AI Car Research
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
