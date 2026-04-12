"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Badge } from "./ui/badge";

const calculateTimeLeft = (expiryTimestamp: string) => {
  const difference = +new Date(expiryTimestamp) - +new Date();
  let timeLeft = {
    hours: 0,
    minutes: 0,
    seconds: 0,
  };

  if (difference > 0) {
    timeLeft = {
      hours: Math.floor(difference / (1000 * 60 * 60)),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  return timeLeft;
};

export function Countdown({ expiryTimestamp }: { expiryTimestamp: string }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(expiryTimestamp));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(expiryTimestamp));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryTimestamp]);

  const { hours, minutes, seconds } = timeLeft;
  const isExpired = hours === 0 && minutes === 0 && seconds === 0;

  if (isExpired) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        Expired
      </Badge>
    );
  }

  const isLowTime = hours < 1;

  return (
    <Badge
      variant={isLowTime ? "destructive" : "secondary"}
      className="flex items-center gap-1.5 font-mono"
    >
      <Clock className="h-3 w-3" />
      <span>
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </span>
    </Badge>
  );
}
