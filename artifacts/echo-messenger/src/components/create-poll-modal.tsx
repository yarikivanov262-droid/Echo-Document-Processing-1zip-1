import { useState } from "react";
import { X, Plus, Trash2, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatePollModalProps {
  onClose: () => void;
  onSubmit: (data: {
    question: string;
    options: string[];
    isAnonymous: boolean;
    isMultipleChoice: boolean;
    isQuiz: boolean;
    correctOptionIndex: number | null;
    explanation: string | null;
  }) => void;
  isPending?: boolean;
}

export function CreatePollModal({ onClose, onSubmit, isPending }: CreatePollModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [isQuiz, setIsQuiz] = useState(false);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState("");

  const addOption = () => {
    if (options.length < 10) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, i) => i !== idx);
    setOptions(next);
    if (correctOptionIndex === idx) setCorrectOptionIndex(null);
    else if (correctOptionIndex !== null && correctOptionIndex > idx) setCorrectOptionIndex(correctOptionIndex - 1);
  };

  const updateOption = (idx: number, val: string) => {
    setOptions(options.map((o, i) => i === idx ? val : o));
  };

  const canSubmit = question.trim().length > 0 &&
    options.filter(o => o.trim().length > 0).length >= 2 &&
    (!isQuiz || correctOptionIndex !== null);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      question: question.trim(),
      options: options.filter(o => o.trim().length > 0),
      isAnonymous,
      isMultipleChoice,
      isQuiz,
      correctOptionIndex: isQuiz ? correctOptionIndex : null,
      explanation: isQuiz && explanation.trim() ? explanation.trim() : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-background rounded-t-[20px] sm:rounded-[16px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <span className="text-[17px] font-semibold">Новый опрос</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
          {/* Question */}
          <div>
            <label className="text-[12px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">
              Вопрос
            </label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="О чём хотите спросить?"
              maxLength={255}
              rows={2}
              className="w-full bg-muted rounded-[10px] px-3 py-2.5 text-[15px] outline-none resize-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-[12px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">
              Варианты ответа
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {isQuiz && (
                    <button
                      onClick={() => setCorrectOptionIndex(idx === correctOptionIndex ? null : idx)}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 shrink-0 transition-all",
                        correctOptionIndex === idx
                          ? "border-green-500 bg-green-500"
                          : "border-muted-foreground/40"
                      )}
                    />
                  )}
                  <input
                    value={opt}
                    onChange={e => updateOption(idx, e.target.value)}
                    placeholder={`Вариант ${idx + 1}`}
                    maxLength={100}
                    className="flex-1 bg-muted rounded-[10px] px-3 h-9 text-[15px] outline-none placeholder:text-muted-foreground"
                  />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(idx)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-primary text-[14px]"
              >
                <Plus className="h-4 w-4" /> Добавить вариант
              </button>
            )}
            {isQuiz && correctOptionIndex === null && (
              <p className="text-[12px] text-amber-500 mt-1">Выберите правильный ответ (зелёный кружок)</p>
            )}
          </div>

          {/* Quiz explanation */}
          {isQuiz && (
            <div>
              <label className="text-[12px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">
                Объяснение (необязательно)
              </label>
              <input
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                placeholder="Покажется после голосования"
                maxLength={200}
                className="w-full bg-muted rounded-[10px] px-3 h-9 text-[15px] outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          {/* Toggles */}
          <div className="rounded-[12px] border border-border/50 overflow-hidden divide-y divide-border/50">
            {[
              { key: "anon", label: "Анонимный опрос", value: isAnonymous, set: setIsAnonymous },
              { key: "multi", label: "Несколько вариантов", value: isMultipleChoice, set: setIsMultipleChoice },
              { key: "quiz", label: "Режим викторины", value: isQuiz, set: (v: boolean) => { setIsQuiz(v); if (!v) setCorrectOptionIndex(null); } },
            ].map(({ key, label, value, set }) => (
              <div key={key} className="flex items-center justify-between px-4 py-3">
                <span className="text-[15px]">{label}</span>
                <button
                  onClick={() => set(!value)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-all",
                    value ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    value ? "left-5.5" : "left-0.5"
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="px-4 py-3 border-t border-border/50 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="w-full h-11 rounded-[12px] bg-primary text-white font-semibold text-[16px] disabled:opacity-50 transition-all"
          >
            {isPending ? "Создание..." : "Создать опрос"}
          </button>
        </div>
      </div>
    </div>
  );
}
