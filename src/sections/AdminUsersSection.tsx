import React, { useState, useMemo } from 'react';
import { useAdmin } from '@/store/AdminContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Trash2, Lock, Unlock } from 'lucide-react';
import { mockAdminUsers } from '@/data/adminUsers';
import type { UserStatus, AssessmentStatus } from '@/types/admin';

const AdminUsersSection: React.FC = () => {
  const { users, setSelectedUser, updateUserStatus, deleteUser } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
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
                    <Button size="sm" variant="ghost" onClick={() => setSelectedUser(user)} className="text-[#D9FF3D] hover:bg-[#D9FF3D]/10"><Eye className="w-4 h-4" /></Button>
                    {user.status === 'active' ? (<Button size="sm" variant="ghost" onClick={() => updateUserStatus(user.id, 'suspended')} className="text-yellow-400 hover:bg-yellow-500/10"><Lock className="w-4 h-4" /></Button>) : user.status === 'suspended' ? (<Button size="sm" variant="ghost" onClick={() => updateUserStatus(user.id, 'active')} className="text-green-400 hover:bg-green-500/10"><Unlock className="w-4 h-4" /></Button>) : null}
                    <Button size="sm" variant="ghost" onClick={() => deleteUser(user.id)} className="text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
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
    </div>
  );
};

export default AdminUsersSection;
