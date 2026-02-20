import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Trash2, Edit2, Plus, X, ChevronDown, ChevronUp, Clock, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { growthResources, paidGrowthResources, membershipTiers } from '@/data/assessment';
import type { GrowthResource, BlogArticle } from '@/types';
import { blogService } from '@/services/blogService';

const AdminContentSection: React.FC = () => {
  const [resources, setResources] = useState<GrowthResource[]>(() => {
    const saved = localStorage.getItem('growth-resources');
    return saved ? JSON.parse(saved) : growthResources;
  });
  const [paidResources, setPaidResources] = useState<GrowthResource[]>(() => {
    const saved = localStorage.getItem('paid-growth-resources');
    return saved ? JSON.parse(saved) : paidGrowthResources;
  });
  const [tiers] = useState(membershipTiers);
  const [showForm, setShowForm] = useState(false);
  const [selectedResource, setSelectedResource] = useState<GrowthResource | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<GrowthResource>>({});
  const [newOutcome, setNewOutcome] = useState('');
  const [activeTab, setActiveTab] = useState<'free' | 'paid' | 'membership' | 'blogs'>('free');
  const [blogs, setBlogs] = useState<BlogArticle[]>(() => {
    const saved = localStorage.getItem('community-blogs');
    return saved ? JSON.parse(saved) : [];
  });
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<BlogArticle | null>(null);
  const [blogFormData, setBlogFormData] = useState<Partial<BlogArticle>>({});

  // Save resources to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('growth-resources', JSON.stringify(resources));
  }, [resources]);

  // Save paid resources to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('paid-growth-resources', JSON.stringify(paidResources));
  }, [paidResources]);

  // Save blogs to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('community-blogs', JSON.stringify(blogs));
  }, [blogs]);

  // Load blogs from Supabase on mount
  React.useEffect(() => {
    const loadBlogs = async () => {
      try {
        const supabaseBlogList = await blogService.getAllBlogs();
        if (supabaseBlogList.length > 0) {
          console.log('Loaded blogs from Supabase:', supabaseBlogList.length);
          setBlogs(supabaseBlogList);
        } else {
          console.log('No blogs in Supabase, using localStorage');
          // Keep existing blogs from localStorage
        }
      } catch (error) {
        console.error('Error loading blogs from Supabase:', error);
        // Fall back to localStorage
      }
    };
    loadBlogs();
  }, []);

  const handleAddNew = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      estimatedTime: '',
      difficulty: 'beginner',
      learningOutcomes: [],
      modules: [],
    });
    setSelectedResource(null);
    setNewOutcome('');
    setShowForm(true);
  };

  const handleEdit = (resource: GrowthResource) => {
    setFormData(resource);
    setSelectedResource(resource);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.description || !formData.category || !formData.estimatedTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    const currentResources = activeTab === 'paid' ? paidResources : resources;
    const setCurrentResources = activeTab === 'paid' ? setPaidResources : setResources;

    if (selectedResource) {
      setCurrentResources(
        currentResources.map(r =>
          r.id === selectedResource.id
            ? { ...r, ...formData, updatedAt: Date.now() } as GrowthResource
            : r
        )
      );
      toast.success('Resource updated successfully');
    } else {
      const newResource: GrowthResource = {
        ...formData,
        id: `${activeTab === 'paid' ? 'pg' : 'g'}${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as GrowthResource;
      setCurrentResources([...currentResources, newResource]);
      toast.success('Resource created successfully');
    }

    setShowForm(false);
    setFormData({});
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this resource?')) {
      if (activeTab === 'paid') {
        setPaidResources(paidResources.filter(r => r.id !== id));
      } else {
        setResources(resources.filter(r => r.id !== id));
      }
      toast.success('Resource deleted successfully');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] p-4 md:p-8">
      <Tabs defaultValue="free" className="space-y-6">
        <TabsList className="bg-[#111611] border-[#1A211A] p-1">
          <TabsTrigger value="free" onClick={() => setActiveTab('free')}>Free Resources</TabsTrigger>
          <TabsTrigger value="paid" onClick={() => setActiveTab('paid')}>Paid Resources</TabsTrigger>
          <TabsTrigger value="membership" onClick={() => setActiveTab('membership')}>Membership Tiers</TabsTrigger>
          <TabsTrigger value="blogs" onClick={() => setActiveTab('blogs')}>Community Blog</TabsTrigger>
        </TabsList>

        <TabsContent value="free" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold text-[#F6FFF2]">Free Growth Resources ({resources.length})</h3>
            <p className="text-sm text-[#A9B5AA]">For users who haven't passed the assessment</p>
            <Button onClick={handleAddNew} className="bg-[#D9FF3D] text-[#0B0F0C] hover:bg-[#C4E622]"><Plus className="w-4 h-4 mr-2" />Add Resource</Button>
          </div>

          <div className="space-y-4">
            {resources.map((resource) => (
              <Card key={resource.id} className="bg-[#111611] border-[#1A211A] p-6 cursor-pointer hover:border-[#2A3A2A] transition-colors" onClick={() => setExpandedId(expandedId === resource.id ? null : resource.id)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="w-5 h-5 text-[#D9FF3D]" />
                      <h4 className="text-lg font-semibold text-[#F6FFF2]">{resource.title}</h4>
                      <Badge className="bg-[#D9FF3D]/10 text-[#D9FF3D] border-[#D9FF3D]/30 border">{resource.category}</Badge>
                      {resource.difficulty && (
                        <Badge className={`${
                          resource.difficulty === 'beginner' ? 'bg-blue-500/20 text-blue-300' :
                          resource.difficulty === 'intermediate' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {resource.difficulty}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#A9B5AA] mb-2">{resource.description}</p>
                    <div className="flex items-center gap-4 text-xs text-[#A9B5AA]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {resource.estimatedTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(resource); }} className="text-[#D9FF3D]"><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(resource.id); }} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
                    <button className="p-2 text-[#A9B5AA]" onClick={(e) => e.stopPropagation()}>
                      {expandedId === resource.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedId === resource.id && (
                  <div className="mt-4 pt-4 border-t border-[#1A211A] space-y-4">
                    {resource.learningOutcomes && resource.learningOutcomes.length > 0 && (
                      <div>
                        <h4 className="font-medium text-[#F6FFF2] mb-2">Learning Outcomes</h4>
                        <ul className="space-y-1 text-sm text-[#A9B5AA]">
                          {resource.learningOutcomes.map((outcome, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-[#D9FF3D]">✓</span>
                              <span>{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-display font-bold text-[#F6FFF2]">Paid Growth Resources ({paidResources.length})</h3>
              <p className="text-sm text-[#A9B5AA]">For users who passed the assessment (quarterly & annual members)</p>
            </div>
            <Button onClick={handleAddNew} className="bg-emerald-500 text-[#0B0F0C] hover:bg-emerald-600"><Plus className="w-4 h-4 mr-2" />Add Resource</Button>
          </div>

          <div className="space-y-4">
            {paidResources.map((resource) => (
              <Card key={resource.id} className="bg-[#111611] border-[#1A211A] p-6 cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={() => setExpandedId(expandedId === resource.id ? null : resource.id)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-lg font-semibold text-[#F6FFF2]">{resource.title}</h4>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 border">{resource.category}</Badge>
                      {resource.difficulty && (
                        <Badge className={`${
                          resource.difficulty === 'beginner' ? 'bg-blue-500/20 text-blue-300' :
                          resource.difficulty === 'intermediate' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {resource.difficulty}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#A9B5AA] mb-2">{resource.description}</p>
                    <div className="flex items-center gap-4 text-xs text-[#A9B5AA]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {resource.estimatedTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(resource); }} className="text-emerald-400"><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(resource.id); }} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
                    <button className="p-2 text-[#A9B5AA]" onClick={(e) => e.stopPropagation()}>
                      {expandedId === resource.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedId === resource.id && (
                  <div className="mt-4 pt-4 border-t border-[#1A211A] space-y-4">
                    {resource.learningOutcomes && resource.learningOutcomes.length > 0 && (
                      <div>
                        <h4 className="font-medium text-[#F6FFF2] mb-2">Learning Outcomes</h4>
                        <ul className="space-y-1 text-sm text-[#A9B5AA]">
                          {resource.learningOutcomes.map((outcome, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-emerald-400">✓</span>
                              <span>{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="membership" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold text-[#F6FFF2]">Membership Tiers</h3>
            <Button onClick={() => toast.success('New tier added')} className="bg-[#D9FF3D] text-[#0B0F0C]"><Plus className="w-4 h-4 mr-2" />Add Tier</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <Card key={tier.id} className="bg-[#111611] border-[#1A211A] p-6">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-semibold text-[#F6FFF2]">{tier.name}</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => toast.info(`Editing ${tier.name}`)} className="text-[#D9FF3D]"><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => toast.success('Tier deleted')} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
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

        <TabsContent value="blogs" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold text-[#F6FFF2]">Community Blog Articles ({blogs.length})</h3>
            <Button onClick={() => {
              setBlogFormData({
                title: '',
                content: '',
                category: '',
                excerpt: '',
                published: false,
              });
              setSelectedBlog(null);
              setShowBlogForm(true);
            }} className="bg-[#D9FF3D] text-[#0B0F0C] hover:bg-[#C4E622]"><Plus className="w-4 h-4 mr-2" />New Article</Button>
          </div>

          <div className="space-y-4">
            {blogs.map((blog) => (
              <Card key={blog.id} className="bg-[#111611] border-[#1A211A] p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="w-5 h-5 text-[#D9FF3D]" />
                      <h4 className="text-lg font-semibold text-[#F6FFF2]">{blog.title}</h4>
                      <Badge className="bg-[#D9FF3D]/10 text-[#D9FF3D] border-[#D9FF3D]/30 border">{blog.category}</Badge>
                      {blog.published ? (
                        <Badge className="bg-green-500/20 text-green-300">Published</Badge>
                      ) : (
                        <Badge className="bg-gray-500/20 text-gray-300">Draft</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#A9B5AA] mb-2">{blog.excerpt}</p>
                    <div className="flex items-center gap-4 text-xs text-[#A9B5AA]">
                      {blog.moduleOnly && <span className="text-[#D9FF3D]">Module Only</span>}
                      {blog.readTime && <span>{blog.readTime} read</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setBlogFormData(blog);
                      setSelectedBlog(blog);
                      setShowBlogForm(true);
                    }} className="text-[#D9FF3D]"><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm('Delete this article?')) {
                        blogService.deleteBlog(blog.id);
                        setBlogs(blogs.filter(b => b.id !== blog.id));
                        toast.success('Article deleted');
                      }
                    }} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </Card>
            ))}
            {blogs.length === 0 && (
              <div className="text-center py-12 text-[#A9B5AA]">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No articles yet. Create one to help your community learn.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0B0F0C]/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <Card className="relative bg-[#111611] border-[#1A211A] p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#1A211A] text-[#A9B5AA] hover:text-[#F6FFF2]"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="font-display text-2xl text-[#F6FFF2] mb-6">
              {selectedResource ? 'Edit Resource' : 'Add New Resource'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                  placeholder="Resource title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Description *</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] resize-none"
                  rows={3}
                  placeholder="Resource description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Category *</label>
                <input
                  type="text"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                  placeholder="e.g., Emotional Regulation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Estimated Time *</label>
                <input
                  type="text"
                  value={formData.estimatedTime || ''}
                  onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                  placeholder="e.g., 4 weeks"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Difficulty</label>
                <select
                  value={formData.difficulty || 'beginner'}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Learning Outcomes */}
              <div>
                <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Learning Outcomes</label>
                <div className="space-y-2 mb-3">
                  {(formData.learningOutcomes || []).map((outcome, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={outcome}
                        onChange={(e) => {
                          const updated = [...(formData.learningOutcomes || [])];
                          updated[idx] = e.target.value;
                          setFormData({ ...formData, learningOutcomes: updated });
                        }}
                        className="flex-1 px-3 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] text-sm"
                        placeholder="Learning outcome"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.learningOutcomes?.filter((_, i) => i !== idx) || [];
                          setFormData({ ...formData, learningOutcomes: updated });
                        }}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOutcome}
                    onChange={(e) => setNewOutcome(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] text-sm"
                    placeholder="Add new outcome..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newOutcome.trim()) {
                        setFormData({
                          ...formData,
                          learningOutcomes: [...(formData.learningOutcomes || []), newOutcome],
                        });
                        setNewOutcome('');
                      }
                    }}
                    className="px-4 py-2 bg-[#D9FF3D]/20 text-[#D9FF3D] rounded-lg text-sm hover:bg-[#D9FF3D]/30"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Modules */}
              <div>
                <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Modules</label>
                <div className="space-y-3 mb-3">
                  {(formData.modules || []).map((module, idx) => (
                    <div key={idx} className="p-3 bg-[#0B0F0C] border border-[#1A211A] rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-[#A9B5AA]">Module {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.modules?.filter((_, i) => i !== idx) || [];
                            setFormData({ ...formData, modules: updated });
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={module.title}
                        onChange={(e) => {
                          const updated = [...(formData.modules || [])];
                          updated[idx] = { ...module, title: e.target.value };
                          setFormData({ ...formData, modules: updated });
                        }}
                        className="w-full px-3 py-2 bg-[#111611] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] text-sm mb-2"
                        placeholder="Module title"
                      />
                      <textarea
                        value={module.description}
                        onChange={(e) => {
                          const updated = [...(formData.modules || [])];
                          updated[idx] = { ...module, description: e.target.value };
                          setFormData({ ...formData, modules: updated });
                        }}
                        className="w-full px-3 py-2 bg-[#111611] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] text-sm resize-none"
                        placeholder="Module description"
                        rows={2}
                      />
                      <textarea
                        value={module.exercise || ''}
                        onChange={(e) => {
                          const updated = [...(formData.modules || [])];
                          updated[idx] = { ...module, exercise: e.target.value };
                          setFormData({ ...formData, modules: updated });
                        }}
                        className="w-full px-3 py-2 bg-[#111611] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] text-sm resize-none mt-2"
                        placeholder="What do they need to do? (e.g., journaling prompt, reflection exercise, action step)"
                        rows={2}
                      />

                      {/* Module Blogs Selection */}
                      <div className="mt-3 pt-3 border-t border-[#1A211A]">
                        <label className="block text-xs font-medium text-[#A9B5AA] mb-2">Attach Module Blogs (optional)</label>
                        <select
                          multiple
                          value={module.blogIds || []}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                            const updated = [...(formData.modules || [])];
                            updated[idx] = { ...module, blogIds: selected };
                            setFormData({ ...formData, modules: updated });
                          }}
                          className="w-full px-3 py-2 bg-[#111611] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] text-sm"
                        >
                          {blogs
                            .filter(b => b.moduleOnly)
                            .map(blog => (
                              <option key={blog.id} value={blog.id}>
                                {blog.title}
                              </option>
                            ))}
                        </select>
                        <p className="text-xs text-[#A9B5AA] mt-1">Hold Ctrl/Cmd to select multiple blogs</p>

                        {/* Show selected blogs */}
                        {(module.blogIds || []).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {(module.blogIds || []).map(blogId => {
                              const blog = blogs.find(b => b.id === blogId);
                              return (
                                <div key={blogId} className="flex items-center justify-between px-2 py-1 bg-[#D9FF3D]/10 rounded text-xs text-[#D9FF3D]">
                                  <span className="truncate">{blog?.title || 'Unknown Blog'}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(formData.modules || [])];
                                      updated[idx] = {
                                        ...module,
                                        blogIds: (module.blogIds || []).filter(id => id !== blogId)
                                      };
                                      setFormData({ ...formData, modules: updated });
                                    }}
                                    className="ml-2 text-red-400 hover:text-red-300"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `m${Date.now()}`;
                    setFormData({
                      ...formData,
                      modules: [
                        ...(formData.modules || []),
                        { id: newId, title: '', description: '', exercise: '', orderIndex: (formData.modules?.length || 0) + 1 },
                      ],
                    });
                  }}
                  className="w-full px-4 py-2 bg-[#D9FF3D]/10 text-[#D9FF3D] rounded-lg text-sm hover:bg-[#D9FF3D]/20 border border-[#D9FF3D]/30"
                >
                  + Add Module
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#1A211A]">
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-[#D9FF3D] text-[#0B0F0C] rounded-xl font-medium hover:scale-[1.02] transition-transform"
                >
                  {selectedResource ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-[#1A211A] text-[#A9B5AA] rounded-xl font-medium hover:text-[#F6FFF2] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Blog Form Modal */}
      {showBlogForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0B0F0C]/80 backdrop-blur-sm" onClick={() => setShowBlogForm(false)} />
          <Card className="relative bg-[#111611] border-[#1A211A] p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowBlogForm(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#1A211A] text-[#A9B5AA] hover:text-[#F6FFF2]"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="font-display text-2xl text-[#F6FFF2] mb-6">
              {selectedBlog ? 'Edit Article' : 'Create New Article'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Title *</label>
                <input
                  type="text"
                  value={blogFormData.title || ''}
                  onChange={(e) => setBlogFormData({ ...blogFormData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                  placeholder="Article title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Category *</label>
                <input
                  type="text"
                  value={blogFormData.category || ''}
                  onChange={(e) => setBlogFormData({ ...blogFormData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                  placeholder="e.g., Emotional Regulation"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl">
                <input
                  type="checkbox"
                  checked={blogFormData.moduleOnly || false}
                  onChange={(e) => setBlogFormData({ ...blogFormData, moduleOnly: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-[#F6FFF2]">
                  <span className="font-medium">Module-Only Article</span>
                  <p className="text-xs text-[#A9B5AA]">If checked: only visible in modules, not on community blog</p>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Excerpt *</label>
                <textarea
                  value={blogFormData.excerpt || ''}
                  onChange={(e) => setBlogFormData({ ...blogFormData, excerpt: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] resize-none"
                  rows={2}
                  placeholder="Brief summary for blog listing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Content *</label>
                <textarea
                  value={blogFormData.content || ''}
                  onChange={(e) => setBlogFormData({ ...blogFormData, content: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] resize-none"
                  rows={6}
                  placeholder="Full article content (separate paragraphs with double line break)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Author</label>
                  <input
                    type="text"
                    value={blogFormData.author || ''}
                    onChange={(e) => setBlogFormData({ ...blogFormData, author: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                    placeholder="Author name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F6FFF2] mb-2">Read Time</label>
                  <input
                    type="text"
                    value={blogFormData.readTime || ''}
                    onChange={(e) => setBlogFormData({ ...blogFormData, readTime: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                    placeholder="e.g., 5 min"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl">
                <input
                  type="checkbox"
                  checked={blogFormData.published || false}
                  onChange={(e) => setBlogFormData({ ...blogFormData, published: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-[#F6FFF2]">Publish article (make visible to users)</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#1A211A]">
                <button
                  onClick={async () => {
                    if (!blogFormData.title || !blogFormData.category || !blogFormData.excerpt || !blogFormData.content) {
                      toast.error('Please fill in all required fields');
                      return;
                    }
                    const newBlog: BlogArticle = {
                      id: selectedBlog?.id || `blog${Date.now()}`,
                      title: blogFormData.title!,
                      content: blogFormData.content!,
                      category: blogFormData.category!,
                      excerpt: blogFormData.excerpt!,
                      author: blogFormData.author,
                      readTime: blogFormData.readTime,
                      published: blogFormData.published || false,
                      moduleOnly: blogFormData.moduleOnly || false,
                      createdAt: selectedBlog?.createdAt || Date.now(),
                      updatedAt: Date.now(),
                    };

                    if (selectedBlog) {
                      // Update to Supabase and localStorage
                      const success = await blogService.updateBlog(selectedBlog.id, newBlog);
                      setBlogs(blogs.map(b => b.id === selectedBlog.id ? newBlog : b));
                      if (success) {
                        toast.success('Article updated in database');
                      } else {
                        toast.warning('Article updated locally (database save failed)');
                      }
                    } else {
                      // Create in Supabase and localStorage
                      const result = await blogService.createBlog(newBlog);
                      setBlogs([...blogs, newBlog]);
                      if (result.error) {
                        toast.warning(`Article created locally (database error: ${result.error})`);
                      } else {
                        toast.success('Article created and saved to database');
                      }
                    }

                    setShowBlogForm(false);
                    setBlogFormData({});
                  }}
                  className="flex-1 py-3 bg-[#D9FF3D] text-[#0B0F0C] rounded-xl font-medium hover:scale-[1.02] transition-transform"
                >
                  {selectedBlog ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => setShowBlogForm(false)}
                  className="flex-1 py-3 bg-[#1A211A] text-[#A9B5AA] rounded-xl font-medium hover:text-[#F6FFF2] transition-colors"
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

export default AdminContentSection;
