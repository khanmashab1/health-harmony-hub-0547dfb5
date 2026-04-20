import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare, Plus, Send, Paperclip, ArrowLeft, FileText, Loader2, Clock, CheckCircle2, PlayCircle, XCircle, RotateCcw, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

type SenderRole = "doctor" | "admin" | "org_owner";
type Status = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  doctor_user_id: string;
  organization_id: string | null;
  subject: string;
  category: string;
  priority: string;
  status: Status;
  last_message_at: string;
  unread_for_admin: boolean;
  unread_for_doctor: boolean;
  created_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  sender_role: SenderRole;
  body: string;
  attachment_path: string | null;
  attachment_name: string | null;
  created_at: string;
}

interface SupportChatPanelProps {
  /** "doctor" | "org_owner" | "admin" — controls UI behavior */
  viewerRole: SenderRole;
  /** Current user's id */
  userId: string;
  /** Optional: limit to a specific organization (for org owners) */
  organizationId?: string | null;
}

const STATUS_COLORS: Record<Status, string> = {
  open: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  in_progress: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  resolved: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  urgent: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function SupportChatPanel({ viewerRole, userId, organizationId }: SupportChatPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [composer, setComposer] = useState("");
  const [composerFile, setComposerFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ---------- Tickets list ----------
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["support-tickets", viewerRole, userId],
    queryFn: async () => {
      let q = supabase.from("support_tickets" as any).select("*").order("last_message_at", { ascending: false });
      // RLS will narrow results; admin sees all
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Ticket[];
    },
  });

  // Realtime: refresh tickets + messages on changes
  useEffect(() => {
    const channel = supabase
      .channel("support-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
        const tId = payload?.new?.ticket_id ?? payload?.old?.ticket_id;
        if (tId) queryClient.invalidateQueries({ queryKey: ["support-messages", tId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const filteredTickets = useMemo(
    () => statusFilter === "all" ? tickets : tickets.filter(t => t.status === statusFilter),
    [tickets, statusFilter]
  );

  // ---------- Active ticket messages ----------
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["support-messages", activeTicketId],
    queryFn: async () => {
      if (!activeTicketId) return [];
      const { data, error } = await supabase
        .from("support_messages" as any)
        .select("*")
        .eq("ticket_id", activeTicketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Message[];
    },
    enabled: !!activeTicketId,
  });

  const activeTicket = tickets.find(t => t.id === activeTicketId);

  // Mark unread cleared when opening
  useEffect(() => {
    if (!activeTicketId || !activeTicket) return;
    const updates: any = {};
    if (viewerRole === "admin" && activeTicket.unread_for_admin) updates.unread_for_admin = false;
    if ((viewerRole === "doctor" || viewerRole === "org_owner") && activeTicket.unread_for_doctor) updates.unread_for_doctor = false;
    if (Object.keys(updates).length) {
      supabase.from("support_tickets" as any).update(updates).eq("id", activeTicketId).then(() => {
        queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      });
    }
  }, [activeTicketId, activeTicket, viewerRole, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------- Create ticket (doctors / org owners only) ----------
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newPriority, setNewPriority] = useState("normal");
  const [newBody, setNewBody] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);

  const createTicket = useMutation({
    mutationFn: async () => {
      if (!newSubject.trim() || !newBody.trim()) throw new Error("Subject and message are required");
      const { data: ticket, error: tErr } = await supabase
        .from("support_tickets" as any)
        .insert({
          doctor_user_id: userId,
          organization_id: organizationId ?? null,
          subject: newSubject.trim(),
          category: newCategory,
          priority: newPriority,
        })
        .select()
        .single();
      if (tErr) throw tErr;

      let attachmentPath: string | null = null;
      let attachmentName: string | null = null;
      if (newFile) {
        const path = `${(ticket as any).id}/${Date.now()}-${newFile.name}`;
        const { error: upErr } = await supabase.storage.from("support-attachments").upload(path, newFile);
        if (!upErr) { attachmentPath = path; attachmentName = newFile.name; }
      }

      const { error: mErr } = await supabase.from("support_messages" as any).insert({
        ticket_id: (ticket as any).id,
        sender_user_id: userId,
        sender_role: viewerRole === "org_owner" ? "org_owner" : "doctor",
        body: newBody.trim(),
        attachment_path: attachmentPath,
        attachment_name: attachmentName,
      });
      if (mErr) throw mErr;

      // Fire-and-forget email
      supabase.functions.invoke("notify-support-reply", {
        body: { ticket_id: (ticket as any).id, sender_role: viewerRole === "org_owner" ? "org_owner" : "doctor" },
      }).catch(() => {});

      return (ticket as any).id as string;
    },
    onSuccess: (id) => {
      toast({ title: "Ticket created", description: "Our admin team will reply soon." });
      setNewDialogOpen(false);
      setNewSubject(""); setNewBody(""); setNewCategory("general"); setNewPriority("normal"); setNewFile(null);
      setActiveTicketId(id);
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (e: any) => toast({ title: "Could not create ticket", description: e.message, variant: "destructive" }),
  });

  // ---------- Send reply ----------
  const sendReply = async () => {
    if (!activeTicketId || (!composer.trim() && !composerFile)) return;
    setSending(true);
    try {
      let attachmentPath: string | null = null;
      let attachmentName: string | null = null;
      if (composerFile) {
        const path = `${activeTicketId}/${Date.now()}-${composerFile.name}`;
        const { error: upErr } = await supabase.storage.from("support-attachments").upload(path, composerFile);
        if (!upErr) { attachmentPath = path; attachmentName = composerFile.name; }
      }
      const { error } = await supabase.from("support_messages" as any).insert({
        ticket_id: activeTicketId,
        sender_user_id: userId,
        sender_role: viewerRole,
        body: composer.trim() || (attachmentName ? `📎 ${attachmentName}` : ""),
        attachment_path: attachmentPath,
        attachment_name: attachmentName,
      });
      if (error) throw error;
      setComposer(""); setComposerFile(null);
      supabase.functions.invoke("notify-support-reply", {
        body: { ticket_id: activeTicketId, sender_role: viewerRole },
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["support-messages", activeTicketId] });
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // ---------- Status changer (admin only) ----------
  const changeStatus = async (status: Status) => {
    if (!activeTicketId) return;
    const { error } = await supabase.from("support_tickets" as any).update({ status }).eq("id", activeTicketId);
    if (error) toast({ title: "Could not update status", description: error.message, variant: "destructive" });
    else {
      toast({ title: `Marked as ${status.replace("_", " ")}` });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    }
  };

  const downloadAttachment = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("support-attachments").createSignedUrl(path, 60);
    if (error || !data) { toast({ title: "Download failed", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  // ===== Render =====
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      {/* Ticket List */}
      <Card className={activeTicketId ? "hidden lg:block" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Tickets
            </CardTitle>
            {viewerRole !== "admin" && (
              <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" />New</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Open a support ticket</DialogTitle>
                    <DialogDescription>Send a query to the admin team.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Subject</Label>
                      <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Brief summary" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Category</Label>
                        <Select value={newCategory} onValueChange={setNewCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="billing">Billing</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="feature_request">Feature Request</SelectItem>
                            <SelectItem value="account">Account</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select value={newPriority} onValueChange={setNewPriority}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Textarea rows={5} value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Describe your issue..." />
                    </div>
                    <div>
                      <Label>Attachment (optional)</Label>
                      <Input type="file" onChange={e => setNewFile(e.target.files?.[0] ?? null)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => createTicket.mutate()} disabled={createTicket.isPending}>
                      {createTicket.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                      Submit
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="h-8 mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]">
            {ticketsLoading ? (
              <div className="p-3 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No tickets yet.</div>
            ) : (
              <div className="divide-y">
                {filteredTickets.map(t => {
                  const isActive = t.id === activeTicketId;
                  const unread = viewerRole === "admin" ? t.unread_for_admin : t.unread_for_doctor;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTicketId(t.id)}
                      className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${isActive ? "bg-muted" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`text-sm font-medium line-clamp-1 ${unread ? "font-semibold" : ""}`}>{t.subject}</span>
                        {unread && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={`${STATUS_COLORS[t.status]} text-[10px] px-1.5 py-0`}>{t.status.replace("_", " ")}</Badge>
                        <Badge variant="outline" className={`${PRIORITY_COLORS[t.priority]} text-[10px] px-1.5 py-0 border-0`}>{t.priority}</Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(t.last_message_at), "MMM d, HH:mm")}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Thread View */}
      <Card className={!activeTicketId ? "hidden lg:flex lg:items-center lg:justify-center" : "flex flex-col"}>
        {!activeTicket ? (
          <CardContent className="text-center py-16 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a ticket to view the conversation</p>
          </CardContent>
        ) : (
          <>
            <CardHeader className="border-b pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2 min-w-0">
                  <Button variant="ghost" size="icon" className="lg:hidden -ml-2" onClick={() => setActiveTicketId(null)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{activeTicket.subject}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {activeTicket.category} • {format(new Date(activeTicket.created_at), "PP")}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={STATUS_COLORS[activeTicket.status]}>{activeTicket.status.replace("_", " ")}</Badge>
                  {viewerRole === "admin" && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {activeTicket.status === "open" && (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => changeStatus("in_progress")}>
                          Mark In Progress
                        </Button>
                      )}
                      {(activeTicket.status === "open" || activeTicket.status === "in_progress") && (
                        <Button size="sm" className="h-8" onClick={() => changeStatus("resolved")}>
                          Mark Resolved
                        </Button>
                      )}
                      {activeTicket.status === "resolved" && (
                        <>
                          <Button size="sm" variant="outline" className="h-8" onClick={() => changeStatus("in_progress")}>
                            Reopen
                          </Button>
                          <Button size="sm" variant="secondary" className="h-8" onClick={() => changeStatus("closed")}>
                            Close Ticket
                          </Button>
                        </>
                      )}
                      {activeTicket.status === "closed" && (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => changeStatus("in_progress")}>
                          Reopen
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 p-4 max-h-[55vh]">
                {messagesLoading ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
                ) : (
                  <div className="space-y-4">
                    {/* ===== Activity Timeline ===== */}
                    <ActivityTimeline ticket={activeTicket} messages={messages} />

                    {/* ===== Messages ===== */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <MessageCircle className="w-3.5 h-3.5" /> Conversation
                      </div>
                      {messages.map(m => {
                        const fromMe = m.sender_user_id === userId;
                        const isAdmin = m.sender_role === "admin";
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${fromMe ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              fromMe
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : isAdmin
                                  ? "bg-accent text-accent-foreground rounded-bl-sm border"
                                  : "bg-muted text-foreground rounded-bl-sm"
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] uppercase tracking-wide font-semibold opacity-70">
                                  {m.sender_role === "admin" ? "Admin" : m.sender_role === "org_owner" ? "Org Owner" : "Doctor"}
                                </span>
                                <span className="text-[10px] opacity-60">{format(new Date(m.created_at), "MMM d HH:mm")}</span>
                              </div>
                              {m.body && <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>}
                              {m.attachment_path && m.attachment_name && (
                                <button
                                  onClick={() => downloadAttachment(m.attachment_path!, m.attachment_name!)}
                                  className={`mt-2 flex items-center gap-2 text-xs underline ${fromMe ? "text-primary-foreground/90" : "text-foreground/80"}`}
                                >
                                  <FileText className="w-3.5 h-3.5" />{m.attachment_name}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                )}
              </ScrollArea>
              {activeTicket.status !== "closed" && (
                <div className="border-t p-3 space-y-2">
                  {composerFile && (
                    <div className="flex items-center gap-2 text-xs bg-muted px-2 py-1.5 rounded">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="truncate flex-1">{composerFile.name}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setComposerFile(null)}>×</Button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <Textarea
                      placeholder="Type your reply..."
                      value={composer}
                      onChange={e => setComposer(e.target.value)}
                      rows={2}
                      className="resize-none flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
                      }}
                    />
                    <div className="flex flex-col gap-2">
                      <label>
                        <input type="file" className="hidden" onChange={e => setComposerFile(e.target.files?.[0] ?? null)} />
                        <Button asChild variant="outline" size="icon"><span><Paperclip className="w-4 h-4" /></span></Button>
                      </label>
                      <Button onClick={sendReply} disabled={sending || (!composer.trim() && !composerFile)} size="icon">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {activeTicket.status === "closed" && (
                <div className="border-t p-3 text-center text-xs text-muted-foreground">This ticket is closed.</div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
