import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Search,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EmailLog {
  id: string;
  appointment_id: string | null;
  recipient_email: string;
  email_type: string;
  status: string;
  error_message: string | null;
  subject: string | null;
  created_at: string;
  sent_at: string | null;
}

export function EmailLogsPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["email-logs", statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (typeFilter !== "all") {
        query = query.eq("email_type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (log: EmailLog) => {
      if (!log.appointment_id) {
        throw new Error("No appointment associated with this email");
      }

      const { data, error } = await supabase.functions.invoke("send-appointment-notification", {
        body: { 
          appointmentId: log.appointment_id, 
          type: log.email_type,
          resend: true 
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Email Resent",
        description: "The notification has been resent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Resend Failed",
        description: error.message,
      });
    },
  });

  const filteredLogs = logs?.filter((log) =>
    log.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "confirmation" ? (
      <Badge variant="outline" className="border-primary text-primary">
        Confirmation
      </Badge>
    ) : (
      <Badge variant="outline" className="border-amber-500 text-amber-600">
        Reminder
      </Badge>
    );
  };

  // Stats
  const stats = {
    total: logs?.length || 0,
    sent: logs?.filter((l) => l.status === "sent").length || 0,
    failed: logs?.filter((l) => l.status === "failed").length || 0,
    pending: logs?.filter((l) => l.status === "pending").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Emails</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Email Notification Logs</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="confirmation">Confirmation</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.recipient_email}
                      </TableCell>
                      <TableCell>{getTypeBadge(log.email_type)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.subject || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(log.status)}
                          {log.error_message && (
                            <span className="text-xs text-red-500 max-w-[150px] truncate">
                              {log.error_message}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.sent_at 
                          ? format(new Date(log.sent_at), "MMM d, HH:mm")
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {log.status === "failed" && log.appointment_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendMutation.mutate(log)}
                            disabled={resendMutation.isPending}
                          >
                            <RefreshCw className={`w-3 h-3 mr-1 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                            Resend
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No email logs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
