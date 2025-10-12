"use client";

import React, { useState } from "react";
import { Plus, Trash } from "lucide-react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

// Define types for the card and props
interface Card {
  id: string;
  title: string;
  column: string;
}

interface ColumnProps {
  title: string;
  column: string;
  headingColor: string;
  cards: Card[];
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
}

interface CardProps {
  id: string;
  title: string;
  column: string;
  handleDragStart: (e: React.DragEvent, card: Card) => void;
}

interface DropIndicatorProps {
  beforeId: string | null;
  column: string;
}

interface BurnBarrelProps {
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
}

interface AddCardProps {
  column: string;
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
}

export const CustomKanban: React.FC = () => {
    return (
      <div className="h-96 bg-popover text-accent-foreground overflow-hidden">
        <Board />
      </div>
    );
  };
  
  const Board: React.FC = () => {
    const [cards, setCards] = useState<Card[]>(DEFAULT_CARDS);
  
    return (
      <div className="flex h-full w-full gap-3  p-6 box-border">
        <Column
          title="Future"
          column="future"
          headingColor="text-muted-foreground"
          cards={cards}
          setCards={setCards}
        />
        <Column
          title="TODO"
          column="todo"
          headingColor="text-chart-3"
          cards={cards}
          setCards={setCards}
        />
        <Column
          title="In Progress"
          column="doing"
          headingColor="text-chart-4"
          cards={cards}
          setCards={setCards}
        />
        <Column
          title="Complete"
          column="done"
          headingColor="text-chart-2"
          cards={cards}
          setCards={setCards}
        />
        <BurnBarrel setCards={setCards} />
      </div>
    );
  };
  
  const Column: React.FC<ColumnProps> = ({ title, headingColor, cards, column, setCards }) => {
    const [active, setActive] = useState<boolean>(false);
  
    const handleDragStart = (e: React.DragEvent, card: Card): void => {
      e.dataTransfer.setData("cardId", card.id);
    };
  
    const handleDragEnd = (e: React.DragEvent): void => {
      const cardId = e.dataTransfer.getData("cardId");
  
      setActive(false);
      clearHighlights();
  
      const indicators = getIndicators();
      const { element } = getNearestIndicator(e, indicators);
  
      const before = element.dataset.before || "-1";
  
      if (before !== cardId) {
        let copy = [...cards];
  
        let cardToTransfer = copy.find((c) => c.id === cardId);
        if (!cardToTransfer) return;
        cardToTransfer = { ...cardToTransfer, column };
  
        copy = copy.filter((c) => c.id !== cardId);
  
        const moveToBack = before === "-1";
  
        if (moveToBack) {
          copy.push(cardToTransfer);
        } else {
          const insertAtIndex = copy.findIndex((el) => el.id === before);
          if (insertAtIndex === -1) return;
  
          copy.splice(insertAtIndex, 0, cardToTransfer);
        }
  
        setCards(copy);
      }
    };
  
    const handleDragOver = (e: React.DragEvent): void => {
      e.preventDefault();
      highlightIndicator(e);
  
      setActive(true);
    };
  
    const clearHighlights = (els?: HTMLElement[]): void => {
      const indicators = els || getIndicators();
  
      indicators.forEach((i) => {
        i.style.opacity = "0";
      });
    };
  
    const highlightIndicator = (e: React.DragEvent): void => {
      const indicators = getIndicators();
  
      clearHighlights(indicators);
  
      const el = getNearestIndicator(e, indicators);
  
      el.element.style.opacity = "1";
    };
  
    const getNearestIndicator = (e: React.DragEvent, indicators: HTMLElement[]) => {
      const DISTANCE_OFFSET = 50;
  
      const el = indicators.reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect();
  
          const offset = e.clientY - (box.top + DISTANCE_OFFSET);
  
          if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
          } else {
            return closest;
          }
        },
        {
          offset: Number.NEGATIVE_INFINITY,
          element: indicators[indicators.length - 1],
        }
      );
  
      return el;
    };
  
    const getIndicators = (): HTMLElement[] => {
      return Array.from(document.querySelectorAll(`[data-column="${column}"]`)) as HTMLElement[];
    };
  
    const handleDragLeave = (): void => {
      clearHighlights();
      setActive(false);
    };
  
    const filteredCards = cards.filter((c) => c.column === column);
  
    return (
      <div className="w-56 shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <h3 className={`font-medium ${headingColor}`}>{title}</h3>
          <span className="rounded-lg text-sm text-muted-foreground">
            {filteredCards.length}
          </span>
        </div>
        <div
          onDrop={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`h-full w-full transition-colors ${
            active ? "bg-secondary/50" : "bg-secondary/0"
          }`}
        >
          {filteredCards.map((c) => {
            return <Card key={c.id} {...c} handleDragStart={handleDragStart} />;
          })}
          <DropIndicator beforeId={null} column={column} />
          <AddCard column={column} setCards={setCards} />
        </div>
      </div>
    );
  };
  
  const Card: React.FC<CardProps> = ({ title, id, column, handleDragStart }) => {
    return (
      <>
        <DropIndicator beforeId={id} column={column} />
        <motion.div
          layout
          layoutId={id}
          draggable="true"
          onDragStart={(e: any) => handleDragStart(e, { title, id, column })}
          className="cursor-grab rounded-lg-lg border border-border bg-secondary p-3 active:cursor-grabbing"
        >
          <p className="text-sm text-accent-foreground">{title}</p>
        </motion.div>
      </>
    );
  };
  
  const DropIndicator: React.FC<DropIndicatorProps> = ({ beforeId, column }) => {
    return (
      <div
        data-before={beforeId || "-1"}
        data-column={column}
        className="my-0.5 h-0.5 w-full bg-chart-1 opacity-0"
      />
    );
  };
  
  const BurnBarrel: React.FC<BurnBarrelProps> = ({ setCards }) => {
    const [active, setActive] = useState<boolean>(false);
  
    const handleDragOver = (e: React.DragEvent): void => {
      e.preventDefault();
      setActive(true);
    };
  
    const handleDragLeave = (): void => {
      setActive(false);
    };
  
    const handleDragEnd = (e: React.DragEvent): void => {
      const cardId = e.dataTransfer.getData("cardId");
  
      setCards((pv) => pv.filter((c) => c.id !== cardId));
  
      setActive(false);
    };
  
    return (
      <div
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`mt-10 grid h-56 w-56 shrink-0 place-content-center rounded-lg border text-3xl ${
          active
            ? "border-destructive bg-destructive/20 text-destructive"
            : "border-muted-foreground bg-muted-foreground/20 text-muted-foreground"
        }`}
      >
        {active ? <Flame className="animate-bounce" /> : <Trash />}
      </div>
    );
  };
  
  const AddCard: React.FC<AddCardProps> = ({ column, setCards }) => {
    const [text, setText] = useState<string>("");
    const [adding, setAdding] = useState<boolean>(false);
  
    const handleSubmit = (e: React.FormEvent): void => {
      e.preventDefault();
  
      if (!text.trim().length) return;
  
      const newCard: Card = {
        column,
        title: text.trim(),
        id: Math.random().toString(),
      };
  
      setCards((pv) => [...pv, newCard]);
  
      setAdding(false);
    };
  
    return (
      <>
        {adding ? (
          <motion.form layout onSubmit={handleSubmit}>
            <textarea
              onChange={(e) => setText(e.target.value)}
              autoFocus
              placeholder="Add new task..."
              className="w-full rounded-lg border border-chart-1 bg-chart-1/20 p-3 text-sm text-accent-foreground placeholder-chart-1 focus:outline-0"
            />
            <div className="mt-1.5 flex items-center justify-end gap-1.5">
              <button
                onClick={() => setAdding(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-accent-foreground"
              >
                Close
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-accent-foreground px-3 py-1.5 text-xs text-background transition-colors hover:bg-muted"
              >
                <span>Add</span>
                <Plus size={16} />
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.button
            layout
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-accent-foreground"
          >
            <span>Add card</span>
            <Plus size={16} />
          </motion.button>
        )}
      </>
    );
  };
  

const DEFAULT_CARDS: Card[] = [
    // BACKLOG
    { title: "Auth: add 3rd party authentication (Google/Apple..)", id: "1343", column: "future" },
    { title: "Internationalization: add i18n support", id: "423", column: "future" },
    { title: "Security: apply rate-limiting to API", id: "1351341355", column: "future" },
    { title: "Feature: add photo sending", id: "1345223", column: "future" },
  
    // TODO
    { title: "SEO: implement metadata strategy", id: "135", column: "todo" },
    { title: "UX: add skeleton loaders", id: "135135", column: "todo" },
    { title: "Performance: optimize image loading", id: "135135135", column: "todo" },
    { title: "Storage: verify multi-provider architecture works with Cloudinary or S3", id: "13545", column: "todo" },
      
    // DOING
    { title: "UI: refactor for mobile responsiveness", id: "13555", column: "doing" },
    { title: "Frontend: assure API calls made by react-query", id: "13566666", column: "doing" },
    { title: "AI: add a summarize unread messages feature", id: "53313", column: "doing" },
    { title: "AI: add make me sound smart", id: "65211334", column: "doing" },
    
    // DONE
    { title: "Backend: assure BLL, DAL architecture", id: "7775674", column: "done" },
    { title: "Realtime: add multi-provider architecture", id: "774564", column: "done" },
    { title: "Storage: add UploadThing", id: "646246", column: "done" },
    { title: "DevOps: setup CI/CD pipeline that deploys backend and frontend separately", id: "246666", column: "done" },

  ];