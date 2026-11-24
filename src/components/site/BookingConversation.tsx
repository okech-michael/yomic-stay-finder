import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getBookingConversation, sendBookingMessage } from "@/lib/accommodation.functions";

export function BookingConversation({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient();
  const loadMessages = useServerFn(getBookingConversation);
  const sendMessage = useServerFn(sendBookingMessage);
  const [body, setBody] = useState("");
  const messages = useQuery({
    queryKey: ["booking-messages", bookingId],
    queryFn: () => loadMessages({ data: { bookingId } }),
  });
  const send = useMutation({
    mutationFn: () => sendMessage({ data: { bookingId, body } }),
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["booking-messages", bookingId] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="rounded-2xl border p-4">
      <h3 className="font-semibold">Message your host or guest</h3>
      <div className="mt-3 max-h-56 space-y-2 overflow-auto">
        {(messages.data ?? []).map((message: { id: string; body: string; created_at: string }) => (
          <div key={message.id} className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
            <p>{message.body}</p>
            <time className="mt-1 block text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleString()}
            </time>
          </div>
        ))}
        {!messages.data?.length && (
          <p className="text-sm text-muted-foreground">Start a conversation about this stay.</p>
        )}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (body.trim()) send.mutate();
        }}
      >
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={5000}
          placeholder="Write a message"
          className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          disabled={!body.trim() || send.isPending}
          className="rounded-full gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
