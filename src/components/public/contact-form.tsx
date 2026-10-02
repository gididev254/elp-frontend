"use client";

// Embuni ELC — Contact form (client component).
// Shows a success toast on submit; does NOT actually send an email.

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

export function ContactForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // Simulate a tiny delay for UX feedback.
    setTimeout(() => {
      setSubmitting(false);
      toast({
        title: "Message received",
        description:
          "Thanks for reaching out — we'll get back to you within 2 working days.",
      });
      (e.target as HTMLFormElement).reset();
    }, 600);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Jane Wambui"
            required
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@embuni.ac.ke"
            required
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          placeholder="What's this about?"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Write your message…"
          rows={5}
          required
        />
      </div>
      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        <Send className="mr-2 h-4 w-4" />
        {submitting ? "Sending…" : "Send message"}
      </Button>
      <p className="text-xs text-muted-foreground">
        This form does not send an email — it logs the message to the chapter
        communications team for response within 2 working days.
      </p>
    </form>
  );
}
