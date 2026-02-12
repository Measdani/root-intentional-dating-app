import type { AdminUser } from '@/types/admin';

export const mockAdminUsers: AdminUser[] = [
  {
    id: 'admin-1',
    name: 'Sarah Chen',
    email: 'sarah@rooted.app',
    role: 'super-admin',
    permissions: [
      { resource: 'users', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'assessments', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'content', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'analytics', actions: ['view'] },
      { resource: 'settings', actions: ['view', 'edit'] },
    ],
    createdAt: '2026-01-01',
    lastLogin: '2026-02-12',
  },
  {
    id: 'admin-2',
    name: 'Marcus Wilson',
    email: 'marcus@rooted.app',
    role: 'admin',
    permissions: [
      { resource: 'users', actions: ['view', 'edit'] },
      { resource: 'assessments', actions: ['view', 'edit'] },
      { resource: 'content', actions: ['view', 'edit'] },
      { resource: 'analytics', actions: ['view'] },
    ],
    createdAt: '2026-01-15',
    lastLogin: '2026-02-11',
  },
  {
    id: 'admin-3',
    name: 'Emma Rodriguez',
    email: 'emma@rooted.app',
    role: 'moderator',
    permissions: [
      { resource: 'users', actions: ['view'] },
      { resource: 'content', actions: ['view', 'edit'] },
      { resource: 'analytics', actions: ['view'] },
    ],
    createdAt: '2026-02-01',
    lastLogin: '2026-02-10',
  },
];

export const mockAdminCredentials: Record<string, string> = {
  'sarah@rooted.app': 'admin123',
  'marcus@rooted.app': 'admin123',
  'emma@rooted.app': 'admin123',
};
