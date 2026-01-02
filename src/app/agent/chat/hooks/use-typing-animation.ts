import { useState, useEffect, useRef } from "react";

export const useTypingAnimation = (
  text: string,
  speed: number = 50,
  enabled: boolean = true
) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayedText("");
      setIsTyping(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const typeText = () => {
      setDisplayedText("");
      setIsTyping(true);
      currentIndexRef.current = 0;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        if (currentIndexRef.current < text.length) {
          setDisplayedText(text.substring(0, currentIndexRef.current + 1));
          currentIndexRef.current++;
        } else {
          setIsTyping(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Reset after showing full text for a moment, then restart
          timeoutRef.current = setTimeout(() => {
            typeText();
          }, 2000);
        }
      }, speed);
    };

    typeText();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setDisplayedText("");
      setIsTyping(false);
    };
  }, [text, speed, enabled]);

  return { displayedText, isTyping };
};
