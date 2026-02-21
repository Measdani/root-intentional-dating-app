import React, { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import type { JournalEntry } from '@/services/journalService';
import { journalService } from '@/services/journalService';
import { X, Edit2, Trash2, Plus } from 'lucide-react';

const SECTIONS = {
  boundaries: {
    title: 'Boundaries',
    description: 'What you will and will not accept. Clarity here protects your peace.',
  },
  needs: {
    title: 'Needs',
    description: 'What helps you feel safe, valued, and understood.',
  },
  'non-negotiables': {
    title: 'Non-Negotiables',
    description: 'Core standards that are not flexible.',
  },
  triggers: {
    title: 'Triggers & Patterns',
    description: 'Notice patterns before they repeat.',
  },
  connections: {
    title: 'Connection Notes',
    description: 'Reflect on how conversations feel.',
  },
};

interface EntryForm {
  sectionKey: keyof typeof SECTIONS;
  title: string;
  content: string;
  editingId?: string;
}

const ClarityRoomSection: React.FC = () => {
  const { setCurrentView, previousView } = useApp();
  const [entries, setEntries] = useState<Record<string, JournalEntry[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<EntryForm>({
    sectionKey: 'boundaries',
    title: '',
    content: '',
  });

  // Load entries for all sections
  useEffect(() => {
    const loadEntries = async () => {
      const allEntries: Record<string, JournalEntry[]> = {};
      for (const sectionKey of Object.keys(SECTIONS)) {
        const sectionEntries = await journalService.getEntriesBySection(
          sectionKey as keyof typeof SECTIONS
        );
        allEntries[sectionKey] = sectionEntries;
      }
      setEntries(allEntries);
    };
    loadEntries();
  }, []);

  const handleSaveEntry = async () => {
    if (!formData.content.trim()) {
      alert('Please write something');
      return;
    }

    if (formData.editingId) {
      await journalService.updateEntry(
        formData.editingId,
        formData.content,
        formData.title || undefined
      );
    } else {
      await journalService.createEntry(
        formData.sectionKey,
        formData.content,
        formData.title || undefined
      );
    }

    // Reload entries
    const updatedEntries = await journalService.getEntriesBySection(formData.sectionKey);
    setEntries((prev) => ({
      ...prev,
      [formData.sectionKey]: updatedEntries,
    }));

    setShowForm(false);
    setFormData({ sectionKey: 'boundaries', title: '', content: '' });
  };

  const handleDeleteEntry = async (sectionKey: string, entryId: string) => {
    if (confirm('Delete this reflection?')) {
      await journalService.deleteEntry(entryId);
      setEntries((prev) => ({
        ...prev,
        [sectionKey]: prev[sectionKey].filter((e) => e.id !== entryId),
      }));
    }
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setFormData({
      sectionKey: entry.section_key as keyof typeof SECTIONS,
      title: entry.title || '',
      content: entry.content,
      editingId: entry.id,
    });
    setShowForm(true);
  };

  const handleNewReflection = (sectionKey: keyof typeof SECTIONS) => {
    setFormData({
      sectionKey,
      title: '',
      content: '',
    });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-3xl text-[#F6FFF2]">Clarity Room</h1>
            <button
              onClick={() => setCurrentView(previousView)}
              className="text-[#A9B5AA] hover:text-[#F6FFF2] transition"
            >
              ← Back
            </button>
          </div>
          <p className="text-[#A9B5AA] mt-2">
            This is your private space for reflection. Nothing written here is shared or used for matching.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="space-y-12">
          {Object.entries(SECTIONS).map(([sectionKey, section]) => (
            <div key={sectionKey} className="bg-[#111611] border border-[#1A211A] rounded-lg p-8">
              {/* Section Header */}
              <div className="mb-6">
                <h2 className="font-display text-2xl text-[#D9FF3D] mb-2">{section.title}</h2>
                <p className="text-[#A9B5AA] text-sm">{section.description}</p>
              </div>

              {/* Entries List */}
              <div className="space-y-4 mb-6">
                {entries[sectionKey]?.map((entry) => (
                  <div key={entry.id} className="bg-[#0B0F0C] border border-[#1A211A] rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {entry.title && (
                          <h3 className="font-medium text-white mb-2">{entry.title}</h3>
                        )}
                        <p className="text-[#A9B5AA] whitespace-pre-wrap">{entry.content}</p>
                        <p className="text-xs text-[#666] mt-2">
                          {new Date(entry.created_at).toLocaleDateString()} at{' '}
                          {new Date(entry.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="p-2 text-[#A9B5AA] hover:text-[#D9FF3D] transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(sectionKey, entry.id)}
                          className="p-2 text-[#A9B5AA] hover:text-red-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* New Reflection Button */}
              <button
                onClick={() => handleNewReflection(sectionKey as keyof typeof SECTIONS)}
                className="w-full py-3 px-4 border border-[#D9FF3D] text-[#D9FF3D] rounded-lg hover:bg-[#D9FF3D]/10 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Reflection
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Entry Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0B0F0C]/80 backdrop-blur-sm">
          <div className="bg-[#111611] border border-[#1A211A] rounded-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-2xl text-[#F6FFF2]">
                {formData.editingId ? 'Edit' : 'New'} - {SECTIONS[formData.sectionKey].title}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormData({ sectionKey: 'boundaries', title: '', content: '' });
                }}
                className="text-[#A9B5AA] hover:text-[#F6FFF2] transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-sm text-[#A9B5AA] mb-2">Title (optional)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Add a title..."
                  className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] placeholder-[#666]"
                />
              </div>

              {/* Content Input */}
              <div>
                <label className="block text-sm text-[#A9B5AA] mb-2">Reflection</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your thoughts..."
                  rows={8}
                  className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] placeholder-[#666] resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveEntry}
                  className="flex-1 py-3 px-4 bg-[#D9FF3D] text-[#0B0F0C] rounded-lg font-medium hover:bg-[#C4E622] transition"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ sectionKey: 'boundaries', title: '', content: '' });
                  }}
                  className="flex-1 py-3 px-4 border border-[#1A211A] text-[#A9B5AA] rounded-lg hover:border-[#A9B5AA] transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClarityRoomSection;
