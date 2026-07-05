import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "echo_app_rating";

export function getStoredRating(): number {
  return Number(localStorage.getItem(STORAGE_KEY) ?? 0);
}

export function RatePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [rating, setRating] = useState(getStoredRating());
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(rating > 0);

  const handleRate = (value: number) => {
    setRating(value);
    localStorage.setItem(STORAGE_KEY, String(value));
    setSubmitted(true);
    toast({
      title: "Спасибо за оценку!",
      description: value >= 4 ? "Рады, что вам нравится ECHO 💛" : "Мы учтём ваш отзыв и станем лучше",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <div className="text-6xl">⭐</div>
      <div className="text-[20px] font-bold">Вам нравится ECHO?</div>
      <div className="text-[14px] text-muted-foreground">Оставьте отзыв и помогите нам стать лучше</div>
      <div className="flex gap-2 text-4xl mt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            onClick={() => handleRate(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            className="cursor-pointer hover:scale-110 transition-transform select-none"
          >
            {(hover || rating) >= i ? "⭐" : "☆"}
          </span>
        ))}
      </div>
      {submitted && (
        <>
          <div className="text-[13px] text-muted-foreground">Ваша оценка сохранена: {rating} из 5</div>
          <button
            onClick={() => navigate("/settings")}
            className="mt-2 text-primary text-[15px] font-medium"
          >
            Готово
          </button>
        </>
      )}
    </div>
  );
}
