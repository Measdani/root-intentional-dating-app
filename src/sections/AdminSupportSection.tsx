import React, { useState, useMemo } from 'react';
import { useAdmin } from '@/store/AdminContext';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import {
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { SupportMessage, SupportMessageStatus, SupportCategory } from '@/types';

const AdminSupportSection: React.FC = () => {
  const { supportMessages = [], supportMessageStats } = useAdmin();

  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [filterStatus, setFilterStatus] = useState<SupportMessageStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<'normal' | 'priority' | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<SupportCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');

  const ITEMS_PER_PAGE = 10;

  // Filter messages
  const filteredMessages = useMemo(() => {
    return supportMessages.filter(message => {
      if (filterStatus !== 'all' && message.status !== filterStatus) return false;
      if (filterPriority !== 'all' && message.priority !== filterPriority) return false;
      if (filterCategory !== 'all' && message.category !== filterCategory) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          message.id.toLowerCase().includes(term) ||
          message.userName.toLowerCase().includes(term) ||
          message.subject.toLowerCase().includes(term) ||
          message.message.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [supportMessages, filterStatus, filterPriority, filterCategory, searchTerm]);

  // Pagination
  const paginatedMessages = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return filteredMessages.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);

  const getStatusColor = (status: SupportMessageStatus) => {
    switch (status) {
      case 'unread':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'in-progress':
        return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
      case 'resolved':
        return 'bg-green-500/10 text-green-300 border-green-500/30';
    }
  };

  const getPriorityColor = (priority: 'normal' | 'priority') => {
    switch (priority) {
      case 'priority':
        return 'bg-[#D9FF3D]/10 text-[#D9FF3D] border-[#D9FF3D]/30';
      case 'normal':
        return 'bg-gray-500/10 text-gray-300 border-gray-500/30';
    }
  };

  const getMembershipColor = (tier: 'monthly' | 'quarterly' | 'annual') => {
    switch (tier) {
      case 'annual':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'quarterly':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'monthly':
        return 'bg-gray-500/10 text-gray-300 border-gray-500/30';
    }
  };

  const handleDetailClick = (message: SupportMessage) => {
    setSelectedMessage(message);
    setShowDetailModal(true);
  };

  const handleMarkInProgress = () => {
    if (!selectedMessage) return;
    // Update status in AdminContext
    toast.success('Message marked as in progress');
  };

  const handleOpenResponse = () => {
    setShowResponseModal(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedMessage || !adminResponse.trim()) return;

    // Update message with response and mark as resolved
    toast.success('Response sent and message resolved');
    setShowResponseModal(false);
    setShowDetailModal(false);
    setAdminResponse('');
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl text-[#F6FFF2] mb-2">Support Messages</h1>
          <p className="text-[#A9B5AA]">Review and respond to user support requests</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#111611] border-[#1A211A] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#A9B5AA] text-sm mb-1">Unread Messages</p>
                <p className="text-3xl font-display text-[#F6FFF2]">
                  {supportMessageStats?.unreadMessages || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-400" />
            </div>
          </Card>

          <Card className="bg-[#111611] border-[#1A211A] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#A9B5AA] text-sm mb-1">In Progress</p>
                <p className="text-3xl font-display text-[#F6FFF2]">
                  {supportMessageStats?.inProgressMessages || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>

          <Card className="bg-[#111611] border-[#1A211A] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#A9B5AA] text-sm mb-1">Resolved</p>
                <p className="text-3xl font-display text-[#F6FFF2]">
                  {supportMessageStats?.resolvedMessages || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="bg-[#111611] border-[#1A211A] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#A9B5AA] text-sm mb-1">Total Messages</p>
                <p className="text-3xl font-display text-[#F6FFF2]">
                  {supportMessageStats?.totalMessages || 0}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-400" />
            </div>
          </Card>
        </div>

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
                placeholder="Search by user name, subject, or message..."
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder:text-[#A9B5AA]/50 focus:outline-none focus:border-[#D9FF3D]"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[#A9B5AA] mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as SupportMessageStatus | 'all');
                    setCurrentPage(0);
                  }}
                  className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                >
                  <option value="all">All Statuses</option>
                  <option value="unread">Unread</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#A9B5AA] mb-2">Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => {
                    setFilterPriority(e.target.value as 'normal' | 'priority' | 'all');
                    setCurrentPage(0);
                  }}
                  className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                >
                  <option value="all">All Priorities</option>
                  <option value="priority">Priority</option>
                  <option value="normal">Normal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#A9B5AA] mb-2">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value as SupportCategory | 'all');
                    setCurrentPage(0);
                  }}
                  className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                >
                  <option value="all">All Categories</option>
                  <option value="technical">Technical Issue</option>
                  <option value="account">Account Question</option>
                  <option value="billing">Billing & Subscription</option>
                  <option value="feature-request">Feature Request</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <p className="text-sm text-[#A9B5AA]">
              Showing {paginatedMessages.length} of {filteredMessages.length} messages
            </p>
          </div>
        </Card>

        {/* Messages Table */}
        <Card className="bg-[#111611] border-[#1A211A] overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#1A211A] bg-[#0B0F0C]/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">ID</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">User</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Membership</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Category</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Subject</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Priority</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#A9B5AA]">Date</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-[#A9B5AA]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMessages.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-[#A9B5AA]">
                      No messages found
                    </td>
                  </tr>
                ) : (
                  paginatedMessages.map(message => (
                    <tr key={message.id} className="border-b border-[#1A211A] hover:bg-[#111611]/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-[#F6FFF2] font-mono">
                        {message.id.substring(0, 20)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-[#F6FFF2]">
                        {message.userName}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getMembershipColor(
                            message.membershipTier
                          )}`}
                        >
                          {message.membershipTier}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#F6FFF2]">
                        {message.category.replace(/-/g, ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#F6FFF2] max-w-xs truncate">
                        {message.subject}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                            message.priority
                          )}`}
                        >
                          {message.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            message.status
                          )}`}
                        >
                          {message.status.replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#A9B5AA]">
                        {new Date(message.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDetailClick(message)}
                          className="text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
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
      {showDetailModal && selectedMessage && (
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
              <h2 className="font-display text-2xl text-[#F6FFF2] mb-6">Message Details</h2>

              {/* Message Info */}
              <div className="space-y-4 mb-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#A9B5AA] mb-1">Message ID</p>
                    <p className="text-[#F6FFF2] font-mono text-sm">{selectedMessage.id}</p>
                  </div>

                  <div>
                    <p className="text-sm text-[#A9B5AA] mb-1">Date Submitted</p>
                    <p className="text-[#F6FFF2]">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                  </div>

                  <div>
                    <p className="text-sm text-[#A9B5AA] mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedMessage.status)}`}>
                      {selectedMessage.status.replace(/-/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-[#A9B5AA] mb-1">Priority</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(selectedMessage.priority)}`}>
                      {selectedMessage.priority}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#1A211A] pt-4">
                  <p className="text-sm text-[#A9B5AA] mb-2">From</p>
                  <div className="bg-[#0B0F0C]/50 rounded-lg p-4">
                    <p className="text-[#F6FFF2] font-medium">{selectedMessage.userName}</p>
                    <p className="text-sm text-[#A9B5AA]">{selectedMessage.userEmail}</p>
                    <div className="mt-2 flex gap-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getMembershipColor(selectedMessage.membershipTier)}`}>
                        {selectedMessage.membershipTier}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#1A211A] pt-4">
                  <p className="text-sm text-[#A9B5AA] mb-2">Category</p>
                  <p className="text-[#F6FFF2] capitalize">{selectedMessage.category.replace(/-/g, ' ')}</p>
                </div>

                <div>
                  <p className="text-sm text-[#A9B5AA] mb-2">Subject</p>
                  <p className="text-[#F6FFF2] bg-[#0B0F0C]/50 rounded-lg p-3 text-sm">{selectedMessage.subject}</p>
                </div>

                <div>
                  <p className="text-sm text-[#A9B5AA] mb-2">Message</p>
                  <p className="text-[#F6FFF2] bg-[#0B0F0C]/50 rounded-lg p-3 text-sm whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>

                {selectedMessage.adminNotes && (
                  <div>
                    <p className="text-sm text-[#A9B5AA] mb-2">Admin Notes</p>
                    <p className="text-[#F6FFF2] bg-[#0B0F0C]/50 rounded-lg p-3 text-sm whitespace-pre-wrap">{selectedMessage.adminNotes}</p>
                  </div>
                )}

                {selectedMessage.adminResponse && (
                  <div>
                    <p className="text-sm text-[#A9B5AA] mb-2">Admin Response</p>
                    <p className="text-[#F6FFF2] bg-[#0B0F0C]/50 rounded-lg p-3 text-sm whitespace-pre-wrap">{selectedMessage.adminResponse}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-[#1A211A] pt-4 flex gap-3">
                {selectedMessage.status === 'unread' && (
                  <button
                    onClick={handleMarkInProgress}
                    className="flex-1 py-2 bg-[#D9FF3D] text-[#0B0F0C] rounded-lg font-medium hover:scale-[1.02] transition-transform"
                  >
                    Mark In Progress
                  </button>
                )}

                <button
                  onClick={handleOpenResponse}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:scale-[1.02] transition-transform"
                >
                  Respond
                </button>

                <button
                  onClick={() => setShowDetailModal(false)}
                  className="py-2 px-4 bg-[#1A211A] text-[#A9B5AA] rounded-lg font-medium hover:bg-[#2A312A] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0B0F0C]/80">
          <Card className="bg-[#111611] border-[#1A211A] max-w-md w-full relative">
            <div className="p-8">
              {/* Close Button */}
              <button
                onClick={() => setShowResponseModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1A211A] flex items-center justify-center text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="font-display text-2xl text-[#F6FFF2] mb-6">Respond to Support Request</h2>

              <div className="mb-6 p-4 bg-[#0B0F0C]/50 rounded-lg">
                <p className="text-[#A9B5AA] text-sm mb-2">From:</p>
                <p className="text-[#F6FFF2] font-medium">{selectedMessage.userName}</p>
                <p className="text-[#A9B5AA] text-sm mt-2">{selectedMessage.subject}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-[#F6FFF2] mb-2 font-medium">
                  Your Response
                </label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] placeholder:text-[#A9B5AA]/50 focus:outline-none focus:border-[#D9FF3D] transition-colors resize-none"
                  rows={4}
                />
                <p className="text-xs text-[#A9B5AA] mt-2">
                  {adminResponse.length} characters
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitResponse}
                  disabled={!adminResponse.trim()}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  Send Response
                </button>

                <button
                  onClick={() => setShowResponseModal(false)}
                  className="py-2 px-4 bg-[#1A211A] text-[#A9B5AA] rounded-lg font-medium hover:bg-[#2A312A] transition-colors"
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

export default AdminSupportSection;
