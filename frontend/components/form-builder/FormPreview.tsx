'use client';

import { useFormBuilder } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Star } from 'lucide-react';

export default function FormPreview() {
  const { form, fields, theme } = useFormBuilder();

  const getThemeStyles = () => {
    const colors = theme || {
      primaryColor: '#4F46E5',
      backgroundColor: '#ffffff',
      textColor: '#1F2937',
      buttonColor: '#4F46E5',
    };

    return {
      '--form-primary': colors.primaryColor,
      '--form-bg': colors.backgroundColor,
      '--form-text': colors.textColor,
      '--form-button': colors.buttonColor,
    } as React.CSSProperties;
  };

  const renderField = (field: any) => {
    const baseId = `preview-${field.id}`;

    switch (field.type) {
      case 'short_text':
        return (
          <div key={field.id} className="mb-4">
            <Label htmlFor={baseId} className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={baseId}
              type="text"
              placeholder={field.placeholder}
              disabled
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'long_text':
        return (
          <div key={field.id} className="mb-4">
            <Label htmlFor={baseId} className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={baseId}
              placeholder={field.placeholder}
              rows={4}
              disabled
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'email':
        return (
          <div key={field.id} className="mb-4">
            <Label htmlFor={baseId} className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={baseId}
              type="email"
              placeholder={field.placeholder || 'you@example.com'}
              disabled
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'phone':
        return (
          <div key={field.id} className="mb-4">
            <Label htmlFor={baseId} className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={baseId}
              type="tel"
              placeholder={field.placeholder || '+1 (555) 000-0000'}
              disabled
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="mb-4">
            <Label htmlFor={baseId} className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={baseId}
              type="number"
              placeholder={field.placeholder}
              disabled
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'rating':
        const maxRating = field.validation?.max || 5;
        return (
          <div key={field.id} className="mb-4">
            <Label className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex gap-1">
              {Array.from({ length: maxRating }).map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-gray-200 text-gray-200" />
              ))}
            </div>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'dropdown':
        return (
          <div key={field.id} className="mb-4">
            <Label htmlFor={baseId} className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <select
              id={baseId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              <option value="">Select an option</option>
              {field.options?.map((option: any, idx: number) => (
                <option key={idx} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'multiple_choice':
        return (
          <div key={field.id} className="mb-4">
            <Label className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup disabled>
              {field.options?.map((option: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <RadioGroupItem value={option.value} id={`${baseId}-${idx}`} />
                  <Label htmlFor={`${baseId}-${idx}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'checkboxes':
        return (
          <div key={field.id} className="mb-4">
            <Label className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <Checkbox id={`${baseId}-${idx}`} disabled />
                  <Label htmlFor={`${baseId}-${idx}`}>{option.label}</Label>
                </div>
              ))}
            </div>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="mb-4">
            <Label htmlFor={baseId} className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={baseId}
              type="date"
              disabled
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'file_upload':
        return (
          <div key={field.id} className="mb-4">
            <Label htmlFor={baseId} className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={baseId}
              type="file"
              disabled
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'signature':
        return (
          <div key={field.id} className="mb-4">
            <Label className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="border-2 border-dashed border-gray-300 rounded-md h-32 flex items-center justify-center">
              <p className="text-sm text-gray-400">Signature pad (preview)</p>
            </div>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.id} className="mb-4 p-3 bg-gray-100 rounded">
            <p className="text-sm text-gray-600">Unknown field type: {field.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="pb-4 border-b">
        <h3 className="font-semibold">Live Preview</h3>
        <p className="text-sm text-gray-500">This is how your form will appear</p>
      </div>

      <Card
        className="p-6"
        style={getThemeStyles()}
      >
        {/* Form Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--form-text)' }}>
            {form?.name || 'Untitled Form'}
          </h1>
          {form?.description && (
            <p className="text-gray-600">{form.description}</p>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
              <p>Your form is empty</p>
              <p className="text-sm mt-1">Add fields from the library</p>
            </div>
          ) : (
            fields.map((field) => renderField(field))
          )}
        </div>

        {/* Submit Button */}
        {fields.length > 0 && (
          <div className="mt-6">
            <Button
              className="w-full"
              style={{
                backgroundColor: 'var(--form-button)',
                color: '#fff',
              }}
              disabled
            >
              Submit
            </Button>
          </div>
        )}

        {/* Powered By */}
        {fields.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">Powered by FormHub</p>
          </div>
        )}
      </Card>

      {/* Theme Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Layout:</strong> {theme?.layout || 'classic'}</p>
        <p><strong>Primary Color:</strong> {theme?.primaryColor || '#4F46E5'}</p>
      </div>
    </div>
  );
}
