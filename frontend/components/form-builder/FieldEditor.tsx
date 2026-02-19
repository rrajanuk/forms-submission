'use client';

import { useFormBuilder } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Copy } from 'lucide-react';
import type { FormField } from '@/types/form';
import { useState } from 'react';

interface FieldEditorProps {
  field: FormField;
}

export default function FieldEditor({ field }: FieldEditorProps) {
  const { updateField, deleteField, duplicateField } = useFormBuilder();
  const [options, setOptions] = useState(
    field.options?.map((o) => ({ id: o.id, label: o.label })) || []
  );

  const handleUpdate = (data: Partial<FormField>) => {
    updateField(field.id, data);
  };

  const handleAddOption = () => {
    const newOption = {
      id: `opt_${Date.now()}`,
      label: '',
      order: options.length,
    };
    const updated = [...options, newOption];
    setOptions(updated);
    handleUpdate({ options: updated });
  };

  const handleUpdateOption = (index: number, label: string) => {
    const updated = options.map((o, i) => (i === index ? { ...o, label } : o));
    setOptions(updated);
    handleUpdate({ options: updated });
  };

  const handleDeleteOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
    handleUpdate({ options: updated });
  };

  const needsOptions = ['dropdown', 'multiple_choice', 'checkboxes'].includes(field.type);
  const needsValidation = ['short_text', 'long_text', 'number', 'rating'].includes(field.type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <h3 className="font-semibold">Edit Field</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => duplicateField(field.id)}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteField(field.id)}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      </div>

      {/* Basic Properties */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Basic Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={field.label}
              onChange={(e) => handleUpdate({ label: e.target.value })}
              placeholder="Field label"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={field.description || ''}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="placeholder">Placeholder</Label>
            <Input
              id="placeholder"
              value={field.placeholder || ''}
              onChange={(e) => handleUpdate({ placeholder: e.target.value })}
              placeholder="Placeholder text"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="required">Required</Label>
            <Switch
              id="required"
              checked={field.required}
              onCheckedChange={(checked) => handleUpdate({ required: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Options (for dropdown, multiple_choice, checkboxes) */}
      {needsOptions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <Input
                  value={option.label}
                  onChange={(e) => handleUpdateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteOption(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleAddOption}
            >
              Add Option
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Validation */}
      {needsValidation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {field.type === 'number' || field.type === 'rating' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="min">Minimum Value</Label>
                  <Input
                    id="min"
                    type="number"
                    value={field.validation?.min || ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: { ...field.validation, min: parseFloat(e.target.value) || undefined },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">Maximum Value</Label>
                  <Input
                    id="max"
                    type="number"
                    value={field.validation?.max || ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: { ...field.validation, max: parseFloat(e.target.value) || undefined },
                      })
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="minLength">Minimum Length</Label>
                  <Input
                    id="minLength"
                    type="number"
                    value={field.validation?.min || ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: { ...field.validation, min: parseFloat(e.target.value) || undefined },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLength">Maximum Length</Label>
                  <Input
                    id="maxLength"
                    type="number"
                    value={field.validation?.max || ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: { ...field.validation, max: parseFloat(e.target.value) || undefined },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pattern">Pattern (Regex)</Label>
                  <Input
                    id="pattern"
                    value={field.validation?.pattern || ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: { ...field.validation, pattern: e.target.value || undefined },
                      })
                    }
                    placeholder="^[A-Za-z]+$"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Error Message</Label>
              <Input
                id="customMessage"
                value={field.validation?.customMessage || ''}
                onChange={(e) =>
                  handleUpdate({
                    validation: { ...field.validation, customMessage: e.target.value || undefined },
                  })
                }
                placeholder="Invalid input"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
