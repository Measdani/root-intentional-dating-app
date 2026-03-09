import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users, TrendingUp, CheckCircle2, Award } from 'lucide-react';
import { mockAnalytics } from '@/data/analytics';
import {
  runAdminCopilot,
  type AdminCopilotSummaryResult,
} from '@/services/adminCopilotService';

const AdminDashboardSection: React.FC = () => {
  const [copilotSummary, setCopilotSummary] = useState<AdminCopilotSummaryResult | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(true);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadCopilotSummary = async () => {
      setCopilotLoading(true);
      setCopilotError(null);

      const result = await runAdminCopilot({
        action: 'generate_daily_summary',
        periodType: 'daily',
        maxItems: 8,
      });

      if (!active) return;

      if (!result) {
        setCopilotError('Admin Copilot summary is currently unavailable.');
      } else {
        setCopilotSummary(result);
      }
      setCopilotLoading(false);
    };

    void loadCopilotSummary();

    return () => {
      active = false;
    };
  }, []);

  const stats = [
    {
      label: 'Total Users',
      value: mockAnalytics.totalUsers,
      icon: Users,
      color: '#D9FF3D',
    },
    {
      label: 'Active Users',
      value: mockAnalytics.activeUsers,
      icon: TrendingUp,
      color: '#4CAF50',
    },
    {
      label: 'Pass Rate',
      value: `${mockAnalytics.assessmentPassRate}%`,
      icon: CheckCircle2,
      color: '#2196F3',
    },
    {
      label: 'Avg Alignment Score',
      value: mockAnalytics.avgAlignmentScore,
      icon: Award,
      color: '#FFC107',
    },
  ];

  const CHART_COLORS = [
    '#D9FF3D',
    '#4CAF50',
    '#2196F3',
    '#FFC107',
    '#FF6B6B',
  ];

  return (
    <div className="min-h-screen bg-[#0B0F0C] p-4 md:p-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="bg-[#111611] border-[#1A211A] p-6 hover:border-[#1A211A] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#A9B5AA] mb-2">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-[#F6FFF2]">
                    {stat.value}
                  </p>
                </div>
                <Icon
                  className="w-8 h-8"
                  style={{ color: stat.color }}
                  opacity={0.7}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="bg-[#111611] border-[#1A211A] p-6 mb-8">
        <h3 className="text-lg font-display font-bold text-[#F6FFF2] mb-3">
          Admin Copilot: Daily Summary
        </h3>

        {copilotLoading && (
          <p className="text-sm text-[#A9B5AA]">Generating summary...</p>
        )}

        {!copilotLoading && copilotError && (
          <p className="text-sm text-amber-300">{copilotError}</p>
        )}

        {!copilotLoading && !copilotError && copilotSummary && (
          <div className="space-y-4">
            <p className="text-sm text-[#F6FFF2] leading-relaxed">
              {copilotSummary.summaryText}
            </p>

            {copilotSummary.patternAlerts.length > 0 && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-amber-300 mb-1">
                  Pattern Alerts
                </p>
                <p className="text-sm text-amber-100">{copilotSummary.patternAlerts[0]}</p>
              </div>
            )}

            {copilotSummary.prioritizedReviewList.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-[#A9B5AA] mb-2">
                  Top Cases To Review
                </p>
                <div className="space-y-2">
                  {copilotSummary.prioritizedReviewList.slice(0, 3).map((item) => (
                    <div
                      key={item.case_id}
                      className="rounded-lg border border-[#1A211A] bg-[#0B0F0C]/60 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs text-[#A9B5AA] uppercase">
                          {item.severity}
                        </span>
                        <span className="text-[11px] text-[#A9B5AA]">{item.source}</span>
                      </div>
                      <p className="text-sm text-[#F6FFF2] line-clamp-2">{item.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="bg-[#111611] border-[#1A211A] p-6">
          <h3 className="text-lg font-display font-bold text-[#F6FFF2] mb-4">
            User Growth
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockAnalytics.userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A211A" />
              <XAxis
                dataKey="month"
                stroke="#A9B5AA"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#A9B5AA" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111611',
                  border: '1px solid #1A211A',
                  borderRadius: '8px',
                  color: '#F6FFF2',
                }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#D9FF3D"
                strokeWidth={2}
                dot={{ fill: '#D9FF3D', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Scores Chart */}
        <Card className="bg-[#111611] border-[#1A211A] p-6">
          <h3 className="text-lg font-display font-bold text-[#F6FFF2] mb-4">
            Average Category Scores
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockAnalytics.categoryScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A211A" />
              <XAxis
                dataKey="category"
                stroke="#A9B5AA"
                style={{ fontSize: '11px' }}
              />
              <YAxis stroke="#A9B5AA" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111611',
                  border: '1px solid #1A211A',
                  borderRadius: '8px',
                  color: '#F6FFF2',
                }}
              />
              <Bar dataKey="avgScore" fill="#D9FF3D" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* User Status Distribution */}
        <Card className="bg-[#111611] border-[#1A211A] p-6">
          <h3 className="text-lg font-display font-bold text-[#F6FFF2] mb-4">
            User Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={mockAnalytics.userStatusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.status}: ${entry.count}`}
                outerRadius={80}
                fill="#D9FF3D"
                dataKey="count"
              >
                {mockAnalytics.userStatusDistribution.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111611',
                  border: '1px solid #1A211A',
                  borderRadius: '8px',
                  color: '#F6FFF2',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Family Intent Distribution */}
        <Card className="bg-[#111611] border-[#1A211A] p-6">
          <h3 className="text-lg font-display font-bold text-[#F6FFF2] mb-4">
            Family Intent
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={mockAnalytics.familyIntentDistribution}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1A211A" />
              <XAxis type="number" stroke="#A9B5AA" style={{ fontSize: '12px' }} />
              <YAxis
                dataKey="intent"
                type="category"
                stroke="#A9B5AA"
                style={{ fontSize: '11px' }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111611',
                  border: '1px solid #1A211A',
                  borderRadius: '8px',
                  color: '#F6FFF2',
                }}
              />
              <Bar dataKey="count" fill="#4CAF50" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardSection;
