import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/store/AdminContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Eye, Trash2, Lock, Unlock } from 'lucide-react';
import { mockAdminUsers } from '@/data/adminUsers';
import { userService } from '@/services/userService';
import type { UserStatus, AssessmentStatus } from '@/types/admin';

const AdminUsersSection: React.FC = () => {
  const { users, setSelectedUser, updateUserStatus, deleteUser, updateUser } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [assessmentLookup, setAssessmentLookup] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const itemsPerPage = 10;

  const displayUsers = users.length > 0 ? users : mockAdminUsers;

  const filteredUsers = useMemo(() => {
    return displayUsers.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [displayUsers, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIdx, startIdx + itemsPerPage);

  const assessmentLookupUser = useMemo(() => {
    const query = assessmentLookup.trim().toLowerCase();
    if (!query) return null;
    return displayUsers.find((user) => (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )) || null;
  }, [assessmentLookup, displayUsers]);

  const getNextRetakeDateForUser = (userId: string): Date | null => {
    try {
      let timestamp = Number(localStorage.getItem(`rooted_last_assessment_date_${userId}`));

      if (!Number.isFinite(timestamp)) {
        const scopedResult = localStorage.getItem(`assessmentResult_${userId}`);
        if (scopedResult) {
          const parsed = JSON.parse(scopedResult);
          timestamp = Number(parsed?.timestamp);
        }
      }

      if (!Number.isFinite(timestamp)) return null;

      const nextDate = new Date(timestamp);
      nextDate.setMonth(nextDate.getMonth() + 6);
      return nextDate;
    } catch (error) {
      console.warn('Failed to compute retake date for user:', error);
      return null;
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Not scheduled';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusColors: Record<UserStatus, string> = {
    active: 'bg-green-500/10 text-green-300 border-green-500/30',
    pending: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    suspended: 'bg-red-500/10 text-red-300 border-red-500/30',
    inactive: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
  };

  const assessmentColors: Record<AssessmentStatus, string> = {
    passed: 'bg-green-500/10 text-green-300 border-green-500/30',
    failed: 'bg-red-500/10 text-red-300 border-red-500/30',
    'not-taken': 'bg-gray-500/10 text-gray-300 border-gray-500/30',
    'in-progress': 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  };

  const handleStatusUpdate = (userId: string, newStatus: UserStatus) => {
    updateUserStatus(userId, newStatus);
    const action = newStatus === 'suspended' ? 'suspended' : 'activated';
    toast.success(`User ${action} successfully`);
  };

  const handleDeleteUser = (userId: string) => {
    deleteUser(userId);
    setDeleteConfirm(null);
    toast.success('User deleted successfully');
  };

  const handleEnableAssessmentRetake = async () => {
    if (!assessmentLookupUser) {
      toast.error('No user found for this lookup.');
      return;
    }

    const userId = assessmentLookupUser.id;
    const nextUserStatus = assessmentLookupUser.status === 'suspended' ? 'suspended' : 'active';

    try {
      await userService.updateUser(userId, {
        assessmentPassed: null as any,
        alignmentScore: null as any,
        userStatus: nextUserStatus,
      } as any);
    } catch (error) {
      console.warn('Supabase user update failed, continuing local override:', error);
    }

    updateUser(userId, {
      assessmentStatus: 'not-taken',
      assessmentScore: undefined,
      alignmentScore: undefined,
      status: nextUserStatus,
    } as any);

    try {
      localStorage.removeItem(`assessmentResult_${userId}`);
      localStorage.removeItem(`rooted_last_assessment_date_${userId}`);

      const legacyResult = localStorage.getItem('assessmentResult');
      if (legacyResult) {
        const parsed = JSON.parse(legacyResult);
        if (parsed?.userId === userId) {
          localStorage.removeItem('assessmentResult');
        }
      }

      const currentUserRaw = localStorage.getItem('currentUser');
      if (currentUserRaw) {
        const currentUser = JSON.parse(currentUserRaw);
        if (currentUser?.id === userId) {
          const updatedCurrentUser = {
            ...currentUser,
            userStatus: nextUserStatus,
          } as any;
          delete updatedCurrentUser.assessmentPassed;
          delete updatedCurrentUser.alignmentScore;
          localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
          window.dispatchEvent(new CustomEvent('user-login', { detail: updatedCurrentUser }));
        }
      }
    } catch (error) {
      console.warn('Local assessment unlock cleanup failed:', error);
    }

    toast.success(`Assessment retake enabled for ${assessmentLookupUser.name}.`);
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] p-4 md:p-8">
      <Card className="bg-[#111611] border-[#1A211A] p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="Search by name or email..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="bg-[#0B0F0C] border-[#1A211A] text-[#F6FFF2]" />
          <Select value={statusFilter} onValueChange={(value: any) => { setStatusFilter(value); setCurrentPage(1); }}>
            <SelectTrigger className="bg-[#0B0F0C] border-[#1A211A] text-[#F6FFF2]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-[#111611] border-[#1A211A]">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-end text-sm text-[#A9B5AA]">{filteredUsers.length} of {displayUsers.length} users</div>
        </div>
      </Card>

      <Card className="bg-[#111611] border-[#1A211A] p-6 mb-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[#F6FFF2] font-medium">Assessment Retake Override</h3>
          <p className="text-sm text-[#A9B5AA]">
            Look up a user by name or email, then enable assessment retake immediately.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
          <Input
            placeholder="Lookup user by name or email..."
            value={assessmentLookup}
            onChange={(e) => setAssessmentLookup(e.target.value)}
            className="bg-[#0B0F0C] border-[#1A211A] text-[#F6FFF2]"
          />
          <Button
            onClick={handleEnableAssessmentRetake}
            disabled={!assessmentLookupUser}
            className="bg-[#D9FF3D] text-[#0B0F0C] hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            Enable Assessment Retake
          </Button>
        </div>

        {assessmentLookupUser ? (
          <div className="p-4 rounded-xl border border-[#1A211A] bg-[#0B0F0C]">
            <p className="text-sm text-[#F6FFF2] font-medium">
              {assessmentLookupUser.name} ({assessmentLookupUser.email})
            </p>
            <p className="text-xs text-[#A9B5AA] mt-1">
              Current assessment: {assessmentLookupUser.assessmentStatus} {typeof assessmentLookupUser.assessmentScore === 'number' ? `(${assessmentLookupUser.assessmentScore}%)` : ''}
            </p>
            <p className="text-xs text-[#A9B5AA]">
              Next retake window: {formatDate(getNextRetakeDateForUser(assessmentLookupUser.id))}
            </p>
          </div>
        ) : (
          <p className="text-xs text-[#A9B5AA]">No matching user found yet.</p>
        )}
      </Card>

      <Card className="bg-[#111611] border-[#1A211A] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#0B0F0C] border-b border-[#1A211A]">
              <TableHead className="text-[#A9B5AA]">Name</TableHead>
              <TableHead className="text-[#A9B5AA]">Email</TableHead>
              <TableHead className="text-[#A9B5AA]">Status</TableHead>
              <TableHead className="text-[#A9B5AA] text-center">Assessment</TableHead>
              <TableHead className="text-[#A9B5AA] text-center">Score</TableHead>
              <TableHead className="text-[#A9B5AA] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id} className="border-b border-[#1A211A] hover:bg-[#111611]/50 transition-colors">
                <TableCell className="text-[#F6FFF2] font-medium">{user.name}</TableCell>
                <TableCell className="text-[#A9B5AA] text-sm">{user.email}</TableCell>
                <TableCell><Badge className={statusColors[user.status] + ' border'}>{user.status}</Badge></TableCell>
                <TableCell className="text-center"><Badge className={assessmentColors[user.assessmentStatus] + ' border'}>{user.assessmentStatus}</Badge></TableCell>
                <TableCell className="text-center text-[#F6FFF2]">{user.assessmentScore || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(user); toast.info(`Viewing ${user.name}`); }} className="text-[#D9FF3D] hover:bg-[#D9FF3D]/10"><Eye className="w-4 h-4" /></Button>
                    {user.status === 'active' ? (<Button size="sm" variant="ghost" onClick={() => handleStatusUpdate(user.id, 'suspended')} className="text-yellow-400 hover:bg-yellow-500/10"><Lock className="w-4 h-4" /></Button>) : user.status === 'suspended' ? (<Button size="sm" variant="ghost" onClick={() => handleStatusUpdate(user.id, 'active')} className="text-green-400 hover:bg-green-500/10"><Unlock className="w-4 h-4" /></Button>) : null}
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(user.id)} className="text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4">
          <Button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="bg-[#D9FF3D] text-[#0B0F0C] hover:scale-105">Previous</Button>
          <span className="text-[#A9B5AA]">Page {currentPage} of {totalPages}</span>
          <Button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="bg-[#D9FF3D] text-[#0B0F0C] hover:scale-105">Next</Button>
        </div>
      )}

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-[#111611] border-[#1A211A]">
          <AlertDialogTitle className="text-[#F6FFF2]">Delete User</AlertDialogTitle>
          <AlertDialogDescription className="text-[#A9B5AA]">
            Are you sure you want to delete this user? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-4 justify-end pt-4">
            <AlertDialogCancel className="bg-[#0B0F0C] border-[#1A211A] text-[#F6FFF2] hover:bg-[#1A211A]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDeleteUser(deleteConfirm)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsersSection;
