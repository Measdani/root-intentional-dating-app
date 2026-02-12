import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Trash2, Edit2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { growthResources, membershipTiers } from '@/data/assessment';

const AdminContentSection: React.FC = () => {
  const [resources] = useState(growthResources);
  const [tiers] = useState(membershipTiers);

  return (
    <div className="min-h-screen bg-[#0B0F0C] p-4 md:p-8">
      <Tabs defaultValue="resources" className="space-y-6">
        <TabsList className="bg-[#111611] border-[#1A211A] p-1">
          <TabsTrigger value="resources">Growth Resources</TabsTrigger>
          <TabsTrigger value="membership">Membership Tiers</TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold text-[#F6FFF2]">Growth Resources ({resources.length})</h3>
            <Button className="bg-[#D9FF3D] text-[#0B0F0C]"><Plus className="w-4 h-4 mr-2" />Add Resource</Button>
          </div>

          <div className="space-y-4">
            {resources.map((resource) => (
              <Card key={resource.id} className="bg-[#111611] border-[#1A211A] p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-semibold text-[#F6FFF2]">{resource.title}</h4>
                      <Badge className="bg-[#D9FF3D]/10 text-[#D9FF3D] border-[#D9FF3D]/30 border">{resource.category}</Badge>
                    </div>
                    <p className="text-sm text-[#A9B5AA] mb-2">{resource.description}</p>
                    <p className="text-xs text-[#A9B5AA]">Est. time: {resource.estimatedTime}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-[#D9FF3D]"><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="membership" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold text-[#F6FFF2]">Membership Tiers</h3>
            <Button className="bg-[#D9FF3D] text-[#0B0F0C]"><Plus className="w-4 h-4 mr-2" />Add Tier</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <Card key={tier.id} className="bg-[#111611] border-[#1A211A] p-6">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-semibold text-[#F6FFF2]">{tier.name}</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-[#D9FF3D]"><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>

                {tier.badge && (<Badge className="bg-[#D9FF3D]/10 text-[#D9FF3D] border-[#D9FF3D]/30 border mb-4">{tier.badge}</Badge>)}

                <div className="mb-6">
                  <p className="text-3xl font-display font-bold text-[#D9FF3D]">{tier.price}</p>
                  <p className="text-sm text-[#A9B5AA]">per {tier.period}</p>
                </div>

                <div className="space-y-2">
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-[#F6FFF2]">
                      <span className="text-[#D9FF3D]">checkmark</span>
                      {feature}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminContentSection;
