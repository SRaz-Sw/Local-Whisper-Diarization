import React, { useMemo, useState, useEffect, JSX } from "react";

interface ColorScheme {
  bg?: string;
  c1?: string;
  c2?: string;
  c3?: string;
}

interface SiriOrbProps {
  size?: string;
  className?: string;
  colors?: ColorScheme;
  animationDuration?: number;
  isListening?: boolean;
  audioLevel?: number;
}

function SiriOrb({
  size = "192px",
  className = "",
  colors,
  animationDuration = 20,
  isListening = false,
  audioLevel = 0,
}: SiriOrbProps): JSX.Element {
  // Track dark mode changes reactively - check for 'dark' class on document
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Initialize dark mode state after hydration
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  // Listen for theme changes by observing the 'dark' class on document
  useEffect(() => {
    const observer = new MutationObserver(
      (mutations: MutationRecord[]) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "class"
          ) {
            const hasDarkClass =
              document.documentElement.classList.contains("dark");
            setIsDarkMode(hasDarkClass);
          }
        });
      },
    );

    // Observe changes to the class attribute of the document element
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Memoize default colors to prevent recreation with reactive dark mode support
  const defaultColors = useMemo((): ColorScheme => {
    if (isDarkMode) {
      return {
        bg: "oklch(15% 0.02 264.695)", // Much darker background
        c1: "oklch(45% 0.12 350)", // Muted pink for dark mode
        c2: "oklch(50% 0.10 200)", // Muted blue for dark mode
        c3: "oklch(48% 0.11 280)", // Muted purple for dark mode
      };
    } else {
      return {
        bg: "oklch(92% 0.02 264.695)", // Light background
        c1: "oklch(70% 0.13 350)", // Softer pink for light mode
        c2: "oklch(75% 0.10 200)", // Softer blue for light mode
        c3: "oklch(73% 0.12 280)", // Softer purple for light mode
      };
    }
  }, [isDarkMode]);

  // Memoize final colors
  const finalColors = useMemo(
    (): Required<ColorScheme> =>
      ({
        ...defaultColors,
        ...colors,
      }) as Required<ColorScheme>,
    [defaultColors, colors],
  );

  // Extract numeric value from size for calculations
  const sizeValue: number = parseInt(size.replace("px", ""), 10);

  // Responsive calculations based on size
  const blurAmount: number =
    sizeValue < 50
      ? Math.max(sizeValue * 0.003, 0.5) // Reduced blur for better color visibility
      : Math.max(sizeValue * 0.015, 4);

  const contrastAmount: number =
    sizeValue < 50
      ? Math.max(sizeValue * 0.008, 1.8) // Increased contrast
      : Math.max(sizeValue * 0.008, 1.5);

  const dotSize: number =
    sizeValue < 50
      ? Math.max(sizeValue * 0.004, 0.05) // Smaller dots for small sizes
      : Math.max(sizeValue * 0.008, 0.1);

  const shadowSpread: number =
    sizeValue < 50
      ? Math.max(sizeValue * 0.004, 0.5) // Reduced shadow for small sizes
      : Math.max(sizeValue * 0.008, 2);

  // Adjust mask radius based on size to reduce black center in small sizes
  const maskRadius: string =
    sizeValue < 30
      ? "0%"
      : sizeValue < 50
        ? "5%"
        : sizeValue < 100
          ? "15%"
          : "25%";

  // Use more subtle contrast for very small sizes
  const finalContrast: number =
    sizeValue < 30
      ? 1.1 // Very subtle contrast for tiny sizes
      : sizeValue < 50
        ? Math.max(contrastAmount * 1.2, 1.3) // Reduced contrast for small sizes
        : contrastAmount;

  // Add audio-responsive calculations
  const audioScale: number = 1 + (audioLevel / 255) * 0.3; // Scale from 1.0 to 1.3 based on audio
  const audioBlur: number = blurAmount * (1 + (audioLevel / 255) * 0.5); // Increase blur with audio
  const audioAnimationSpeed: number = Math.max(
    5,
    animationDuration - (audioLevel / 255) * 15,
  ); // Speed up with audio

  return (
    <div
      className={`siri-orb ${className}`}
      style={
        {
          width: size,
          height: size,
          "--bg": finalColors.bg,
          "--c1": finalColors.c1,
          "--c2": finalColors.c2,
          "--c3": finalColors.c3,
          "--animation-duration": `${audioAnimationSpeed}s`, // Use audio-responsive speed
          "--blur-amount": `${audioBlur}px`, // Use audio-responsive blur
          "--contrast-amount": finalContrast,
          "--dot-size": `${dotSize}px`,
          "--shadow-spread": `${shadowSpread}px`,
          "--mask-radius": maskRadius,
          transform: `scale(${audioScale})`, // Add audio-responsive scale
          transition: "transform 0.1s ease-out", // Smooth transitions
        } as React.CSSProperties
      }
    >
      <style>{`
				@property --angle {
					syntax: '<angle>';
					inherits: false;
					initial-value: 0deg;
				}

				.siri-orb {
					display: grid;
					grid-template-areas: 'stack';
					overflow: hidden;
					border-radius: 50%;
					position: relative;
					transform: scale(1.1);
				}

				.siri-orb::before,
				.siri-orb::after {
					content: '';
					display: block;
					grid-area: stack;
					width: 100%;
					height: 100%;
					border-radius: 50%;
					transform: translateZ(0);
				}

				.siri-orb::before {
					background: conic-gradient(
							from calc(var(--angle) * 2) at 25% 70%,
							var(--c3),
							transparent 20% 80%,
							var(--c3)
						),
						conic-gradient(
							from calc(var(--angle) * 2) at 45% 75%,
							var(--c2),
							transparent 30% 60%,
							var(--c2)
						),
						conic-gradient(
							from calc(var(--angle) * -3) at 80% 20%,
							var(--c1),
							transparent 40% 60%,
							var(--c1)
						),
						conic-gradient(from calc(var(--angle) * 2) at 15% 5%, var(--c2), transparent 10% 90%, var(--c2)),
						conic-gradient(
							from calc(var(--angle) * 1) at 20% 80%,
							var(--c1),
							transparent 10% 90%,
							var(--c1)
						),
						conic-gradient(
							from calc(var(--angle) * -2) at 85% 10%,
							var(--c3),
							transparent 20% 80%,
							var(--c3)
						);
					box-shadow: inset var(--bg) 0 0 var(--shadow-spread) calc(var(--shadow-spread) * 0.2);
					filter: blur(var(--blur-amount)) contrast(var(--contrast-amount));
					animation: rotate var(--animation-duration) linear infinite;
				}

				.siri-orb::after {
					background-image: radial-gradient(
						circle at center,
						var(--bg) var(--dot-size),
						transparent var(--dot-size)
					);
					background-size: calc(var(--dot-size) * 2) calc(var(--dot-size) * 2);
					backdrop-filter: blur(calc(var(--blur-amount) * 2)) contrast(calc(var(--contrast-amount) * 2));
					mix-blend-mode: overlay;
				}

				.siri-orb[style*='--mask-radius: 0%']::after {
					mask-image: none;
				}

				.siri-orb:not([style*='--mask-radius: 0%'])::after {
					mask-image: radial-gradient(
						circle at center,
						transparent var(--mask-radius),
						black calc(var(--mask-radius) + 1px)
					);
				}

				@keyframes rotate {
					from {
						--angle: 0deg;
					}
					to {
						--angle: 360deg;
					}
				}
			`}</style>
    </div>
  );
}

export default SiriOrb;
