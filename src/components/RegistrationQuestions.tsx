"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "./Toast";

/**
 * The extra fields an attendee fills in when registering.
 *
 * Lifted out of the host dashboard, which was the only place it had ever
 * existed: an admin editing the same event had no way to see a question, let
 * alone add one, so "which session are you booking?" was a thing only its
 * host could ask. Nothing about a registration question is host-specific --
 * the RLS policy admits an admin and the host alike -- so the editor had no
 * business living in one console.
 */
export function RegistrationQuestions({ eventId }: { eventId: string }) {
  const supabase = createClient();
  const { confirm, dialog } = useConfirm();

  type Question = {
    id: string;
    label: string;
    type: string;
    options: string[] | null;
    required: boolean;
  };
  /** A question being written, before it is a row. Options are still text. */
  type QuestionDraft = {
    label: string;
    type: string;
    options: string;
    required: boolean;
  };
  const BLANK_Q: QuestionDraft = {
    label: "",
    type: "text",
    options: "",
    required: false,
  };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQ, setNewQ] = useState<QuestionDraft>(BLANK_Q);
  const [editQ, setEditQ] = useState<(QuestionDraft & { id: string }) | null>(null);

  /**
   * One choice per line rather than comma-separated. "Week 1 — prompting, in
   * practice" is an ordinary session name and a comma would split it in half.
   */
  const parseOptions = (s: string) =>
    s.split("\n").map((o) => o.trim()).filter(Boolean);

  /**
   * What a draft owes the database. Options are nulled for anything that is
   * not a list, so a question switched to free text and back does not
   * resurrect the choices it had two edits ago.
   */
  const questionRow = (d: QuestionDraft) => ({
    label: d.label.trim(),
    type: d.type,
    options: d.type === "select" ? parseOptions(d.options) : null,
    required: d.required,
  });

  /** Refused rather than saved: both of these reach the registration form. */
  const questionProblem = (d: QuestionDraft): string | null => {
    if (!d.label.trim()) return "Give the question a label.";
    if (d.type === "select" && parseOptions(d.options).length < 2)
      return "A list needs at least two choices — one per line.";
    return null;
  };

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase
      .from("event_questions")
      .select("id,label,type,options,required")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true });
    return (data as Question[]) ?? [];
  }, [supabase, eventId]);

  /** Used after a write; the first load goes through the effect below. */
  const loadQuestions = async () => setQuestions(await fetchQuestions());

  // State is set after the await, and only if this editor is still mounted —
  // no synchronous setState in the effect body, no update after unmount.
  useEffect(() => {
    let alive = true;
    fetchQuestions().then((rows) => {
      if (alive) setQuestions(rows);
    });
    return () => {
      alive = false;
    };
  }, [fetchQuestions]);

  const addQuestion = async () => {
    const problem = questionProblem(newQ);
    if (problem) return toast(problem, "info");
    const { error } = await supabase.from("event_questions").insert({
      event_id: eventId,
      ...questionRow(newQ),
      sort_order: questions.length,
    });
    if (error) return toast("Couldn't add question. " + error.message, "error");
    setNewQ(BLANK_Q);
    await loadQuestions();
    toast("Question added.", "success");
  };

  const saveQuestion = async () => {
    if (!editQ) return;
    const problem = questionProblem(editQ);
    if (problem) return toast(problem, "info");
    const { error } = await supabase
      .from("event_questions")
      .update(questionRow(editQ))
      .eq("id", editQ.id);
    if (error) return toast("Couldn't save it. " + error.message, "error");
    setEditQ(null);
    await loadQuestions();
    toast("Question saved.", "success");
  };

  const removeQuestion = async (id: string) => {
    const ok = await confirm({
      title: "Remove this question?",
      body: "Answers already given by registrants are kept, but nobody will be asked it again.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    await supabase.from("event_questions").delete().eq("id", id);
    setEditQ((e) => (e?.id === id ? null : e));
    await loadQuestions();
  };

  /**
   * The same fields for a new question and an existing one, so the two cannot
   * drift apart. A plain function and not a component: a component declared in
   * here is a new type on every render, which would unmount the input the host
   * is typing into after every keystroke.
   */
  const questionFields = (
    d: QuestionDraft,
    set: (d: QuestionDraft) => void,
  ) => (
    <>
      <input
        type="text"
        value={d.label}
        onChange={(e) => set({ ...d, label: e.target.value })}
        placeholder="e.g. Which session are you booking?"
        className="min-w-40 flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-xs text-fg placeholder:text-faint focus:border-brand focus:outline-none"
      />
      <select
        value={d.type}
        onChange={(e) => set({ ...d, type: e.target.value })}
        className="rounded-lg border border-line bg-ink px-3 py-2 text-xs text-fg focus:border-brand focus:outline-none"
      >
        <option value="text">Short text</option>
        <option value="textarea">Long text</option>
        <option value="select">Choose from a list</option>
      </select>
      <label className="flex items-center gap-1.5 text-xs text-muted">
        <input
          type="checkbox"
          checked={d.required}
          onChange={(e) => set({ ...d, required: e.target.checked })}
          className="accent-[var(--color-brand)]"
        />
        Required
      </label>
      {d.type === "select" && (
        <div className="basis-full">
          <textarea
            value={d.options}
            onChange={(e) => set({ ...d, options: e.target.value })}
            rows={3}
            placeholder={"One choice per line:\nSession 1 — Prompting basics\nSession 2 — Building with tools\nAll four sessions"}
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-xs text-fg placeholder:text-faint focus:border-brand focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-faint">
            One choice per line. Attendees pick exactly one when they register.
          </p>
        </div>
      )}
    </>
  );

  return (
    <>
      {dialog}
        {/* Custom registration questions */}
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-fg">
            Registration questions
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Extra fields attendees fill in when they
            register — dietary needs, company, or a list to
            pick from, like which session they are booking.
          </p>

          {questions.length > 0 && (
            <ul className="mt-3 space-y-2">
              {questions.map((q) =>
                editQ?.id === q.id ? (
                  <li
                    key={q.id}
                    className="rounded-lg border border-brand/40 bg-ink-2 p-3"
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      {questionFields(editQ, (d) =>
                        setEditQ({ ...d, id: q.id }),
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => saveQuestion()}
                        className="rounded-full bg-brand px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-soft"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditQ(null)}
                        className="text-[11px] font-medium text-muted hover:text-fg"
                      >
                        Cancel
                      </button>
                    </div>
                  </li>
                ) : (
                  <li
                    key={q.id}
                    className="flex items-start justify-between gap-3 rounded-lg bg-ink-2 px-3 py-2"
                  >
                    <div className="min-w-0 text-xs text-fg">
                      {q.label}
                      <span className="ml-2 text-faint">
                        {q.type === "select" ? "list" : q.type}
                        {q.required ? " · required" : ""}
                      </span>
                      {q.type === "select" && (
                        <p className="mt-0.5 truncate text-[11px] text-faint">
                          {(q.options ?? []).length > 0
                            ? (q.options ?? []).join(" · ")
                            : "No choices yet — attendees see an empty list."}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        onClick={() =>
                          setEditQ({
                            id: q.id,
                            label: q.label,
                            type: q.type,
                            options: (q.options ?? []).join("\n"),
                            required: q.required,
                          })
                        }
                        className="text-[11px] font-medium text-fg hover:text-brand"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="text-[11px] font-medium text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-end gap-2">
            {questionFields(newQ, setNewQ)}
            <button
              onClick={() => addQuestion()}
              disabled={!newQ.label.trim()}
              className="rounded-full border border-line px-3 py-2 text-xs font-medium text-fg hover:border-brand hover:text-brand disabled:opacity-40"
            >
              Add question
            </button>
          </div>
        </div>
    </>
  );
}
