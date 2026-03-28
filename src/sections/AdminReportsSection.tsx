import React, { useState, useMemo } from 'react';
import { useAdmin } from '@/store/AdminContext';
import { useApp } from '@/store/AppContext';
import { getUserPoolId, persistUserPoolMembership, toInnerPool } from '@/modules';
import { accountEnforcementService } from '@/services/accountEnforcementService';
import { userService } from '@/services/userService';
import { SUPPORT_EMAIL } from '@/constants/support';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import {
  Flag,
  AlertCircle,
  Clock,
  CheckCircle,
  ShieldAlert,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Report, ReportStatus, ReportReason, ReportSeverity } from '@/types';
import { PATH_LABELS } from '@/lib/pathways';

type ReportSourceFilter = 'all' | 'member-reported' | 'concierge-system';
const SYSTEM_CONCIERGE_REPORTER_ID = 'system-concierge';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const AdminReportsSection: React.FC = () => {
  const { reports = [], reportStats, updateReportStatus } = useAdmin();
  const { users, interactions, suspendUser, addNotification } = useApp();

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all');
  const [filterReason, setFilterReason] = useState<ReportReason | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<ReportSeverity | 'all'>('all');
  const [filterSource, setFilterSource] = useState<ReportSourceFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (filterStatus !== 'all' && report.status !== filterStatus) return false;
      if (filterReason !== 'all' && report.reason !== filterReason) return false;
      if (filterSeverity !== 'all' && report.severity !== filterSeverity) return false;
      if (filterSource === 'member-reported' && report.reporterId === SYSTEM_CONCIERGE_REPORTER_ID) return false;
      if (filterSource === 'concierge-system' && report.reporterId !== SYSTEM_CONCIERGE_REPORTER_ID) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const reportedUser = users.find(u => u.id === report.reportedUserId);
        return (
          report.id.toLowerCase().includes(term) ||
          reportedUser?.name.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [reports, filterStatus, filterReason, filterSeverity, filterSource, searchTerm, users]);

  const conciergeSignals = useMemo(() => {
    const allInteractions = [
      ...Object.values(interactions.sentInterests),
      ...Object.values(interactions.receivedInterests),
    ];
    const uniqueConversations = Array.from(
      new Map(allInteractions.map((interaction) => [interaction.conversationId, interaction])).values()
    );

    return uniqueConversations
      .flatMap((interaction) =>
        (interaction.concierge?.nudges ?? []).map((nudge) => {
          const participantNames = [interaction.fromUserId, interaction.toUserId]
            .map((userId) => users.find((user) => user.id === userId)?.name ?? 'Unknown');
          const severity = nudge.type === 'off-platform-early' ? 'high' : 'medium';

          return {
            id: nudge.id,
            conversationId: interaction.conversationId,
            type: nudge.type,
            severity,
            message: nudge.message,
            participants: participantNames,
            createdAt: nudge.createdAt,
            messageCountAtTrigger: nudge.messageCountAtTrigger,
          };
        })
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [interactions, users]);

  // Pagination
  const paginatedReports = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return filteredReports.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReports, currentPage]);

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);

  const getSeverityColor = (severity: ReportSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-300 border-red-500/30';
      case 'high':
        return 'bg-orange-500/10 text-orange-300 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
      case 'low':
        return 'bg-gray-500/10 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'under-review':
        return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
      case 'resolved':
        return 'bg-green-500/10 text-green-300 border-green-500/30';
      case 'dismissed':
        return 'bg-gray-500/10 text-gray-300 border-gray-500/30';
    }
  };

  const handleDetailClick = (report: Report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const reportedUser = selectedReport ? users.find(u => u.id === selectedReport.reportedUserId) : null;

  const closeModerationModals = () => {
    setShowResolveModal(false);
    setShowDetailModal(false);
  };

  const dismissSelectedReport = () => {
    if (!selectedReport) return;

    updateReportStatus(selectedReport.id, 'dismissed');
    toast.success('Report dismissed');
    closeModerationModals();
  };

  const applyWarning = () => {
    if (!selectedReport || !reportedUser) return;

    updateReportStatus(selectedReport.id, 'resolved');
    addNotification(
      'warning',
      'Guideline Warning',
      `Your account has been flagged for behavior that does not align with Rooted Hearts community guidelines. This is a formal warning. Review the guidelines and adjust your behavior immediately. Further violations can lead to temporary suspension, a soft reset into ${PATH_LABELS.intentional}, or a permanent ban. Contact ${SUPPORT_EMAIL} if you need clarification.`,
      selectedReport.reportedUserId
    );
    toast.success(`Warning sent to ${reportedUser.name}`);
    closeModerationModals();
  };

  const applyTimedEnforcement = async (
    durationDays: number,
    config: {
      notificationTitle: string;
      successToast: string;
      moderationNote: string;
      buildMessage: (formattedDate: string) => string;
    }
  ) => {
    if (!selectedReport || !reportedUser) return;

    const suspensionEndDate = new Date(Date.now() + durationDays * DAY_IN_MS);
    const formattedDate = suspensionEndDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const fallbackPool = 'core-inner';
    const reportedPool = getUserPoolId(reportedUser, fallbackPool);
    const intentionalPool = toInnerPool(reportedPool);

    persistUserPoolMembership(
      { id: selectedReport.reportedUserId, email: reportedUser.email },
      intentionalPool
    );

    try {
      await userService.updateUser(selectedReport.reportedUserId, {
        poolId: intentionalPool,
        userStatus: 'suspended',
        suspensionEndDate: suspensionEndDate.getTime(),
        assessmentPassed: false,
        guidelinesAckRequired: true,
        moderationNote: config.moderationNote,
      });
    } catch (error) {
      console.error('[AdminReports] Failed to apply timed enforcement:', error);
      toast.error(`We couldn't update ${reportedUser.name}'s account right now.`);
      return;
    }

    suspendUser(selectedReport.reportedUserId, suspensionEndDate.getTime());
    updateReportStatus(selectedReport.id, 'resolved');
    addNotification(
      'suspension',
      config.notificationTitle,
      config.buildMessage(formattedDate),
      selectedReport.reportedUserId
    );

    toast.success(config.successToast.replace('{date}', formattedDate));
    closeModerationModals();
  };

  const applyPermanentBan = async () => {
    if (!selectedReport || !reportedUser) return;

    const reason = selectedReport.details?.trim()
      ? `Permanent ban from report ${selectedReport.id}: ${selectedReport.details.trim()}`
      : `Permanent ban from report ${selectedReport.id}: ${selectedReport.reason}`;

    try {
      await accountEnforcementService.adminBanUser(
        selectedReport.reportedUserId,
        reason,
        selectedReport.id
      );
    } catch (error) {
      console.error('[AdminReports] Failed to permanently ban user:', error);
      toast.error(
        error instanceof Error ? error.message : `We couldn't permanently ban ${reportedUser.name}.`
      );
      return;
    }

    updateReportStatus(selectedReport.id, 'resolved');
    toast.success(`${reportedUser.name}'s account has been permanently banned`);
    closeModerationModals();
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl text-[#F6FFF2] mb-2">User Reports</h1>
          <p className="text-[#A9B5AA]">Review and manage user safety reports</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#111611] border-[#1A211A] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#A9B5AA] text-sm mb-1">Pending Reports</p>
                <p className="text-3xl font-display text-[#F6FFF2]">
                  {reportStats?.pendingReports || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-400" />
            </div>
          </Card>

          <Card className="bg-[#111611] border-[#1A211A] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#A9B5AA] text-sm mb-1">Resolution Time</p>
                <p className="text-3xl font-display text-[#F6FFF2]">
                  {reportStats?.averageResolutionTime.toFixed(1) || '0'}h
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>

          <Card className="bg-[#111611] border-[#1A211A] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#A9B5AA] text-sm mb-1">Total Reports</p>
                <p className="text-3xl font-display text-[#F6FFF2]">
                  {reportStats?.totalReports || 0}
                </p>
              </div>
              <Flag className="w-8 h-8 text-red-400" />
            </div>
          </Card>

          <Card className="bg-[#111611] border-[#1A211A] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#A9B5AA] text-sm mb-1">Resolved</p>
                <p className="text-3xl font-display text-[#F6FFF2]">
                  {reportStats?.resolvedReports || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </Card>
        </div>

        <Card className="bg-[#111611] border-[#1A211A] p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl text-[#F6FFF2]">Concierge Risk Signals</h2>
              <p className="text-sm text-[#A9B5AA] mt-1">
                Automated room-health alerts from private relationship rooms
              </p>
            </div>
            <div className="flex items-center gap-2 text-[#F6FFF2]">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span className="font-display text-2xl">{conciergeSignals.length}</span>
            </div>
          </div>

          {conciergeSignals.length === 0 ? (
            <p className="text-sm text-[#A9B5AA]">No concierge risk signals yet.</p>
          ) : (
            <div className="space-y-3">
              {conciergeSignals.slice(0, 10).map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-xl border border-[#1A211A] bg-[#0B0F0C]/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#F6FFF2] font-medium">
                        {signal.type === 'off-platform-early'
                          ? 'Early off-platform attempt'
                          : 'Conversation balance warning'}
                      </p>
                      <p className="text-xs text-[#A9B5AA] mt-1">
                        {signal.participants.join(' & ')} • {new Date(signal.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-wider ${
                        signal.severity === 'high'
                          ? 'border-red-500/40 bg-red-500/10 text-red-300'
                          : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                      }`}
                    >
                      {signal.severity}
                    </span>
                  </div>
                  <p className="text-xs text-[#A9B5AA] mt-2">{signal.message}</p>
                  <p className="text-xs text-[#6E7A6F] mt-2">
                    Conversation: {signal.conversationId} • Triggered at message #{signal.messageCountAtTrigger}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Filter Bar */}
        <Card className="bg-[#111611] border-[#1A211A] p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#A9B5AA] mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
                placeholder="Search by user name or report ID..."
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder:text-[#A9B5AA]/50 focus:outline-none focus:border-[#D9FF3D]"
              />
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-[#A9B5AA] mb-2">Report Source</label>
                <select
                  value={filterSource}
                  onChange={(e) => {
                    setFilterSource(e.target.value as ReportSourceFilter);
                    setCurrentPage(0);
                  }}
                  className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                >
                  <option value="all">All Sources</option>
                  <option value="member-reported">Member Reported</option>
                  <option value="concierge-system">Concierge System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#A9B5AA] mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as ReportStatus | 'all');
                    setCurrentPage(0);
                  }}
                  className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="under-review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#A9B5AA] mb-2">Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => {
                    setFilterSeverity(e.target.value as ReportSeverity | 'all');
                    setCurrentPage(0);
                  }}
                  className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#A9B5AA] mb-2">Reason</label>
                <select
                  value={filterReason}
                  onChange={(e) => {
                    setFilterReason(e.target.value as ReportReason | 'all');
                    setCurrentPage(0);
                  }}
                  className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                >
                  <option value="all">All Reasons</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate-content">Inappropriate Content</option>
                  <option value="fake-profile">Fake Profile</option>
                  <option value="spam">Spam</option>
                  <option value="safety-concern">Safety Concern</option>
                  <option value="hateful-conduct">Hateful Conduct</option>
                  <option value="underage">Underage</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <p className="text-sm text-[#A9B5AA]">
              Showing {paginatedReports.length} of {filteredReports.length} reports
            </p>
          </div>
        </Card>

        {/* Reports Table */}
        <Card className="bg-[#111611] border-[#1A211A] overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#1A211A] bg-[#0B0F0C]/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Report ID</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Reported User</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Reason</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Severity</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Date</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-[#A9B5AA]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-[#A9B5AA]">
                      No reports found
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map(report => {
                    const user = users.find(u => u.id === report.reportedUserId);
                    return (
                      <tr key={report.id} className="border-b border-[#1A211A] hover:bg-[#111611]/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-[#F6FFF2] font-mono">
                          {report.id.substring(0, 20)}...
                        </td>
                        <td className="px-6 py-4 text-sm text-[#F6FFF2]">
                          {user?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#F6FFF2]">
                          {report.reason.replace(/-/g, ' ')}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(
                              report.severity
                            )}`}
                          >
                            {report.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              report.status
                            )}`}
                          >
                            {report.status.replace(/-/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#A9B5AA]">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDetailClick(report)}
                            className="text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-[#1A211A] px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="flex items-center gap-2 text-sm text-[#A9B5AA] hover:text-[#F6FFF2] disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="text-sm text-[#A9B5AA]">
                Page {currentPage + 1} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                className="flex items-center gap-2 text-sm text-[#A9B5AA] hover:text-[#F6FFF2] disabled:opacity-50 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReport && reportedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F0C]/80">
          <Card className="bg-[#111611] border-[#1A211A] max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            {/* Close Button */}
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1A211A] flex items-center justify-center text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6">
              <h2 className="font-display text-2xl text-[#F6FFF2] mb-6">Report Details</h2>

              {/* Report Info */}
              <div className="space-y-4 mb-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#A9B5AA] mb-1">Report ID</p>
                    <p className="text-[#F6FFF2] font-mono text-sm">{selectedReport.id}</p>
                  </div>

                  <div>
                    <p className="text-sm text-[#A9B5AA] mb-1">Date Submitted</p>
                    <p className="text-[#F6FFF2]">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                  </div>

                  <div>
                    <p className="text-sm text-[#A9B5AA] mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status.replace(/-/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-[#A9B5AA] mb-1">Severity</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(selectedReport.severity)}`}>
                      {selectedReport.severity}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#1A211A] pt-4">
                  <p className="text-sm text-[#A9B5AA] mb-2">Reported User</p>
                  <div className="bg-[#0B0F0C]/50 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D9FF3D] to-[#a8cc2d] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#0B0F0C] font-display text-lg">{reportedUser.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-[#F6FFF2] font-medium">{reportedUser.name}</p>
                      <p className="text-sm text-[#A9B5AA]">{reportedUser.age} • {reportedUser.city}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#1A211A] pt-4">
                  <p className="text-sm text-[#A9B5AA] mb-2">Reason</p>
                  <p className="text-[#F6FFF2] capitalize">{selectedReport.reason.replace(/-/g, ' ')}</p>
                </div>

                <div>
                  <p className="text-sm text-[#A9B5AA] mb-2">Details</p>
                  <p className="text-[#F6FFF2] bg-[#0B0F0C]/50 rounded-lg p-3 text-sm">{selectedReport.details}</p>
                </div>

                {selectedReport.adminNotes && (
                  <div>
                    <p className="text-sm text-[#A9B5AA] mb-2">Admin Notes</p>
                    <p className="text-[#F6FFF2] bg-[#0B0F0C]/50 rounded-lg p-3 text-sm">{selectedReport.adminNotes}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-[#1A211A] pt-4 flex gap-3">
                <button
                  onClick={() => {
                    updateReportStatus(selectedReport.id, 'under-review');
                    toast.success('Report marked as under review');
                  }}
                  className="flex-1 py-2 bg-[#D9FF3D] text-[#0B0F0C] rounded-lg font-medium hover:scale-[1.02] transition-transform"
                >
                  Mark Under Review
                </button>

                <button
                  onClick={() => {
                    setShowResolveModal(true);
                  }}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:scale-[1.02] transition-transform"
                >
                  Resolve
                </button>

                <button
                  onClick={() => {
                    dismissSelectedReport();
                  }}
                  className="py-2 px-4 bg-[#1A211A] text-[#A9B5AA] rounded-lg font-medium hover:bg-[#2A312A] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Resolve Modal - Choose action when resolving report */}
      {showResolveModal && selectedReport && reportedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0B0F0C]/80">
          <Card className="bg-[#111611] border-[#1A211A] max-w-md w-full relative">
            <div className="p-8">
              {/* Close Button */}
              <button
                onClick={() => setShowResolveModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1A211A] flex items-center justify-center text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="font-display text-2xl text-[#F6FFF2] mb-6">Resolve Report</h2>

              <div className="mb-6 p-4 bg-[#0B0F0C]/50 rounded-lg">
                <p className="text-[#A9B5AA] text-sm mb-2">Reported user:</p>
                <p className="text-[#F6FFF2] font-medium">{reportedUser.name}, {reportedUser.age}</p>
              </div>

              <p className="text-[#A9B5AA] text-sm mb-6">Choose enforcement action:</p>

              <div className="space-y-3">
                <button
                  onClick={applyWarning}
                  className="w-full py-3 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg font-medium hover:bg-blue-600/30 transition-colors text-left"
                >
                  <div className="font-medium">Tier 1: Warning</div>
                  <div className="text-xs opacity-75 mt-1">Send warning message to inbox. Account remains active.</div>
                </button>

                <button
                  onClick={() =>
                    applyTimedEnforcement(7, {
                      notificationTitle: '7-Day Suspension',
                      successToast: `${reportedUser.name}'s account suspended until {date}`,
                      moderationNote: '7-day suspension applied from admin report review.',
                      buildMessage: (formattedDate) =>
                        `Following a review of recent activity, your account has been suspended for 7 days. You have been moved into ${PATH_LABELS.intentional} and must acknowledge the community guidelines before re-entry. Access review resumes on ${formattedDate}. Contact ${SUPPORT_EMAIL} if you believe this action was made in error.`,
                    })
                  }
                  className="w-full py-3 bg-orange-600/20 text-orange-300 border border-orange-500/30 rounded-lg font-medium hover:bg-orange-600/30 transition-colors text-left"
                >
                  <div className="font-medium">Tier 2: 7-Day Suspension</div>
                  <div className="text-xs opacity-75 mt-1">Short timeout with mandatory guideline acknowledgement.</div>
                </button>

                <button
                  onClick={() =>
                    applyTimedEnforcement(14, {
                      notificationTitle: '14-Day Suspension',
                      successToast: `${reportedUser.name}'s account suspended until {date}`,
                      moderationNote: '14-day suspension applied from admin report review.',
                      buildMessage: (formattedDate) =>
                        `Following a review of recent activity, your account has been suspended for 14 days. You have been moved into ${PATH_LABELS.intentional} and must acknowledge the community guidelines before re-entry. Access review resumes on ${formattedDate}. Contact ${SUPPORT_EMAIL} if you believe this action was made in error.`,
                    })
                  }
                  className="w-full py-3 bg-orange-700/20 text-orange-200 border border-orange-500/30 rounded-lg font-medium hover:bg-orange-700/30 transition-colors text-left"
                >
                  <div className="font-medium">Tier 2: 14-Day Suspension</div>
                  <div className="text-xs opacity-75 mt-1">Extended timeout for repeated or more serious misalignment.</div>
                </button>

                <button
                  onClick={() =>
                    applyTimedEnforcement(30, {
                      notificationTitle: '30-Day Suspension',
                      successToast: `${reportedUser.name}'s account suspended until {date}`,
                      moderationNote: '30-day suspension applied from admin report review.',
                      buildMessage: (formattedDate) =>
                        `Following a review of recent activity, your account has been suspended for 30 days. You have been moved into ${PATH_LABELS.intentional} and must acknowledge the community guidelines before re-entry. Access review resumes on ${formattedDate}. Contact ${SUPPORT_EMAIL} if you believe this action was made in error.`,
                    })
                  }
                  className="w-full py-3 bg-orange-800/20 text-orange-100 border border-orange-500/30 rounded-lg font-medium hover:bg-orange-800/30 transition-colors text-left"
                >
                  <div className="font-medium">Tier 2: 30-Day Suspension</div>
                  <div className="text-xs opacity-75 mt-1">Longer timeout for repeated guideline problems.</div>
                </button>

                <button
                  onClick={() =>
                    applyTimedEnforcement(45, {
                      notificationTitle: 'Soft Reset',
                      successToast: `${reportedUser.name}'s soft reset runs through {date}`,
                      moderationNote: 'Soft reset applied from admin report review.',
                      buildMessage: (formattedDate) =>
                        `Your account has been placed into a soft reset. Rooted Hearts is pausing your access while you regroup and return with more intention. You have been moved into ${PATH_LABELS.intentional}. You may request re-entry after ${formattedDate}, and you will need to acknowledge the community guidelines before returning. Contact ${SUPPORT_EMAIL} if you believe this action was made in error.`,
                    })
                  }
                  className="w-full py-3 bg-yellow-700/20 text-yellow-200 border border-yellow-500/30 rounded-lg font-medium hover:bg-yellow-700/30 transition-colors text-left"
                >
                  <div className="font-medium">Tier 3: Soft Reset</div>
                  <div className="text-xs opacity-75 mt-1">Pause access, then return later through {PATH_LABELS.intentional}.</div>
                </button>

                <button
                  onClick={applyPermanentBan}
                  className="w-full py-3 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg font-medium hover:bg-red-600/30 transition-colors text-left"
                >
                  <div className="font-medium">Tier 4: Permanent Ban</div>
                  <div className="text-xs opacity-75 mt-1">Delete the account and block the email from re-entry.</div>
                </button>

                <button
                  onClick={() => {
                    setShowResolveModal(false);
                  }}
                  className="w-full py-3 bg-[#1A211A] text-[#A9B5AA] rounded-lg font-medium hover:bg-[#2A312A] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminReportsSection;
