'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Settings, GitBranch, Palette, Save, Eye, Loader2, ArrowLeft, ExternalLink, Sparkles, Monitor } from 'lucide-react';
import { useFormBuilder } from '@/lib/store';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FieldLibrary from './FieldLibrary';
import FieldEditor from './FieldEditor';
import LogicBuilder from './LogicBuilder';
import ThemeBuilder from './ThemeBuilder';
import SettingsBuilder from './SettingsBuilder';
import FormPreview from './FormPreview';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function FormBuilder() {
  const router = useRouter();
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const {
    form,
    fields,
    logic,
    selectedFieldId,
    activeTab,
    isDirty,
    isSaving,
    selectField,
    reorderFields,
    saveForm,
    publishForm,
    setActiveTab,
    resetState,
  } = useFormBuilder();

  // Helper to check if a field has logic rules applied to it
  const getFieldLogicRules = (fieldId: string) => {
    return logic.filter((rule) => rule.targetFieldId === fieldId);
  };

  // Helper to check if a field is used in any logic condition
  const isFieldUsedInConditions = (fieldId: string) => {
    return logic.some((rule) =>
      rule.conditions.some((condition) => condition.fieldId === fieldId)
    );
  };

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order property
    const reorderedFields = items.map((field, index) => ({
      ...field,
      order: index,
    }));

    reorderFields(reorderedFields);
  };

  const handleSave = async () => {
    try {
      await saveForm();
      toast.success('Form saved successfully!');
    } catch (error) {
      toast.error('Failed to save form');
    }
  };

  const handlePublish = async () => {
    if (isDirty) {
      toast.error('Please save your changes before publishing');
      return;
    }

    try {
      await publishForm();
      toast.success('Form published successfully!');
    } catch (error) {
      toast.error('Failed to publish form');
    }
  };

  const handlePreview = () => {
    if (!form?.id) {
      toast.error('Please save the form first');
      return;
    }

    // Navigate to preview page - works for both draft and published forms
    window.open(`/preview/${form.id}`, '_blank');
  };

  const handlePreviewAnyway = () => {
    setShowPreviewDialog(false);
    if (form?.id) {
      window.open(`/preview/${form.id}`, '_blank');
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Field Library */}
      <div className="w-80 border-r bg-white overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Form Builder</h2>
          <p className="text-sm text-gray-500 mt-1">
            Drag fields to the canvas
          </p>
        </div>
        <FieldLibrary />
      </div>

      {/* Center - Form Canvas */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/forms')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Forms
              </Button>
              <span className="text-sm text-gray-500">
                {form?.name || 'Untitled Form'}
              </span>
              {isDirty && (
                <span className="text-sm text-orange-600 font-medium">
                  (Unsaved)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={!form?.slug}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handlePublish}
                disabled={isSaving}
              >
                Publish
              </Button>
            </div>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="max-w-3xl mx-auto py-8 px-4">
            <Droppable droppableId="form-fields">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {fields.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                      <Plus className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 font-medium">Your form is empty</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Drag fields from the left sidebar to get started
                      </p>
                    </div>
                  ) : (
                    fields.map((field, index) => {
                      const logicRules = getFieldLogicRules(field.id);
                      const usedInConditions = isFieldUsedInConditions(field.id);
                      const hasLogic = logicRules.length > 0 || usedInConditions;

                      return (
                        <Draggable
                          key={field.id}
                          draggableId={field.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => selectField(field.id)}
                              className={`
                                bg-white border rounded-lg p-4 cursor-pointer transition-all
                                ${selectedFieldId === field.id
                                  ? 'border-blue-500 ring-2 ring-blue-100'
                                  : 'border-gray-200 hover:border-gray-300'
                                }
                                ${hasLogic ? 'border-purple-200 hover:border-purple-300' : ''}
                                ${snapshot.isDragging ? 'shadow-lg' : ''}
                              `}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs text-gray-500 uppercase font-medium">
                                      {field.type}
                                    </span>
                                    {field.required && (
                                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                        Required
                                      </span>
                                    )}
                                    {logicRules.length > 0 && (
                                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        Logic ({logicRules.length})
                                      </span>
                                    )}
                                    {usedInConditions && (
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                        Trigger
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-medium text-gray-900">
                                    {field.label || 'Untitled field'}
                                  </h4>
                                  {field.description && (
                                    <p className="text-sm text-gray-500 mt-1">
                                      {field.description}
                                    </p>
                                  )}
                                  {hasLogic && (
                                    <div className="mt-2 text-xs text-gray-500">
                                      {logicRules.length > 0 && (
                                        <div>
                                          {logicRules.map((rule, i) => (
                                            <span key={rule.id} className="mr-2">
                                              {i === 0 ? '' : '• '}
                                              {rule.type === 'show' && 'Show if'}
                                              {rule.type === 'hide' && 'Hide if'}
                                              {rule.type === 'skip' && 'Skip if'}
                                              {rule.type === 'jump' && 'Jump if'}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      </div>

      {/* Right Sidebar - Field Editor & Settings */}
      <div className="w-96 border-l bg-white overflow-y-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="fields" className="gap-2">
              <Settings className="w-4 h-4" />
              Field
            </TabsTrigger>
            <TabsTrigger value="logic" className="gap-2 relative">
              <GitBranch className="w-4 h-4" />
              Logic
              {logic.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {logic.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-2">
              <Palette className="w-4 h-4" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Monitor className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="p-4 mt-0">
            {selectedField ? (
              <FieldEditor field={selectedField} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select a field to edit its properties</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logic" className="p-4 mt-0">
            <LogicBuilder />
          </TabsContent>

          <TabsContent value="theme" className="p-4 mt-0">
            <ThemeBuilder />
          </TabsContent>

          <TabsContent value="settings" className="p-4 mt-0">
            <SettingsBuilder />
          </TabsContent>

          <TabsContent value="preview" className="p-4 mt-0">
            <FormPreview />
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Form Not Published</DialogTitle>
            <DialogDescription>
              This form is still in draft status. You can still preview it, but it won't be publicly accessible until you publish it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePreviewAnyway}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
