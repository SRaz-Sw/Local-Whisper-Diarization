"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Play } from "lucide-react";

const WatchVideoButton = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Button
      type="button"
      className="flex items-center gap-3 rounded-full border bg-transparent transition-all hover:bg-transparent hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() =>
        window.open(
          "https://youtu.be/N9h_eXiXdMM?si=i2AlT2jlYgxdtmcP&t=17",
          "_blank",
        )
      }
    >
      <motion.span
        className="text-foreground flex items-center justify-center border-0"
        initial={false}
        animate={
          isHovered
            ? {
                width: 12,
                height: 28,
                borderRadius: 999,
              }
            : {
                width: 16,
                height: 16,
                borderRadius: 999,
              }
        }
        transition={{
          type: "spring",
          stiffness: 600,
          damping: 22,
        }}
        style={{
          background: "rgb(239 68 68)",
          display: "inline-block",
        }}
      ></motion.span>
      <span className="text-foreground text-sm font-medium select-none">
        Watch Tutorial
      </span>
    </Button>
  );
};

export default WatchVideoButton;
