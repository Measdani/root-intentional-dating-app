import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { assessmentQuestions } from '@/data/assessment';

const AdminAssessmentsSection: React.FC = () => {
  const [questions] = useState(assessmentQuestions);
  const [passThreshold, setPassThreshold] = useState(78);

  return (
    <div className="min-h-screen bg-[#0B0F0C] p-4 md:p-8">
      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="bg-[#111611] border-[#1A211A] p-1">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold text-[#F6FFF2]">Assessment Questions ({questions.length})</h3>
            <Button className="bg-[#D9FF3D] text-[#0B0F0C]"><Plus className="w-4 h-4 mr-2" />Add</Button>
          </div>
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <Card key={q.id} className="bg-[#111611] border-[#1A211A] p-6">
                <div className="flex justify-between items-start mb-4">
                  <div><p className="text-[#F6FFF2] font-medium">{idx + 1}. {q.question}</p><p className="text-xs text-[#A9B5AA] mt-1">{q.category.replace('-', ' ')}</p></div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-[#D9FF3D]"><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-[#0B0F0C] rounded">
                      <div className="flex-1"><p className="text-sm text-[#F6FFF2]">{opt.text}</p></div>
                      <span className="text-xs text-[#A9B5AA]">{opt.score}/10 {opt.redFlag ? '🚩' : ''}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="bg-[#111611] border-[#1A211A] p-6">
            <h3 className="text-lg font-display font-bold text-[#F6FFF2] mb-6">Scoring Configuration</h3>
            <label className="block text-sm text-[#F6FFF2] mb-3">Pass Threshold: {passThreshold}%</label>
            <input type="range" min="50" max="100" value={passThreshold} onChange={(e) => setPassThreshold(parseInt(e.target.value))} className="w-full accent-[#D9FF3D]" />
            <p className="text-xs text-[#A9B5AA] mt-3">Users need {passThreshold}% to pass the assessment</p>
            <Button onClick={() => toast.success(`Pass threshold updated to ${passThreshold}%`)} className="w-full mt-6 bg-[#D9FF3D] text-[#0B0F0C]">Save Settings</Button>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[#111611] border-[#1A211A] p-4"><p className="text-xs text-[#A9B5AA]">Total Taken</p><p className="text-2xl font-bold text-[#F6FFF2]">847</p></Card>
            <Card className="bg-[#111611] border-[#1A211A] p-4"><p className="text-xs text-[#A9B5AA]">Pass Rate</p><p className="text-2xl font-bold text-[#D9FF3D]">76%</p></Card>
            <Card className="bg-[#111611] border-[#1A211A] p-4"><p className="text-xs text-[#A9B5AA]">Avg Time</p><p className="text-2xl font-bold text-[#F6FFF2]">8:42</p></Card>
            <Card className="bg-[#111611] border-[#1A211A] p-4"><p className="text-xs text-[#A9B5AA]">Avg Score</p><p className="text-2xl font-bold text-[#F6FFF2]">82%</p></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAssessmentsSection;
