'use client';

import { useState } from 'react';
import { Form } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { CheckCircle2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

interface InteractiveFormPreviewProps {
  form: Form;
}

export default function InteractiveFormPreview({ form }: InteractiveFormPreviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const theme = form.schema.theme || {
    primaryColor: '#4F46E5',
    backgroundColor: '#ffffff',
    textColor: '#1F2937',
    buttonColor: '#4F46E5',
    layout: 'classic',
  };

  const settings = form.schema.settings || {};

  // Get visible fields based on conditional logic
  const getVisibleFields = () => {
    if (!form.schema.logic || form.schema.logic.length === 0) {
      return form.schema.fields;
    }

    // Simple logic evaluation - can be enhanced
    return form.schema.fields.filter((field) => {
      const logicRules = form.schema.logic?.filter((rule) => rule.targetFieldId === field.id);

      if (!logicRules || logicRules.length === 0) return true;

      // Evaluate each logic rule
      return logicRules.every((rule) => {
        if (rule.type === 'hide') {
          // If any condition is met, hide the field
          return !rule.conditions.some((condition) => {
            const fieldValue = formData[condition.fieldId];
            return evaluateCondition(fieldValue, condition.operator, condition.value);
          });
        }
        if (rule.type === 'show') {
          // If any condition is met, show the field
          return rule.conditions.some((condition) => {
            const fieldValue = formData[condition.fieldId];
            return evaluateCondition(fieldValue, condition.operator, condition.value);
          });
        }
        return true;
      });
    });
  };

  const evaluateCondition = (fieldValue: any, operator: string, value: any): boolean => {
    switch (operator) {
      case 'equals':
        return fieldValue == value;
      case 'not_equals':
        return fieldValue != value;
      case 'contains':
        return String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      case 'is_not_empty':
        return fieldValue && fieldValue !== '';
      case 'includes_any':
        return Array.isArray(fieldValue) && fieldValue.some((v) => value.includes(v));
      case 'includes_all':
        return Array.isArray(fieldValue) && value.every((v: any) => fieldValue.includes(v));
      default:
        return false;
    }
  };

  const validateField = (field: any): string | null => {
    if (field.required && !formData[field.id]) {
      return `${field.label} is required`;
    }

    if (!formData[field.id]) return null;

    const value = formData[field.id];
    const validation = field.validation || {};

    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        break;
      case 'phone':
        const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
        if (!phoneRegex.test(value)) {
          return 'Please enter a valid phone number';
        }
        break;
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          return 'Please enter a valid number';
        }
        if (validation.min !== undefined && num < validation.min) {
          return `Value must be at least ${validation.min}`;
        }
        if (validation.max !== undefined && num > validation.max) {
          return `Value must be at most ${validation.max}`;
        }
        break;
      case 'short_text':
      case 'long_text':
        if (validation.minLength && String(value).length < validation.minLength) {
          return `Must be at least ${validation.minLength} characters`;
        }
        if (validation.maxLength && String(value).length > validation.maxLength) {
          return `Must be at most ${validation.maxLength} characters`;
        }
        if (validation.pattern) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            return validation.errorMessage || 'Invalid format';
          }
        }
        break;
    }

    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    getVisibleFields().forEach((field) => {
      const error = validateField(field);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);

    // Simulate submission
    setTimeout(() => {
      console.log('Form submitted:', formData);
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success('Form submitted successfully! (Preview mode - not saved)');
    }, 1000);
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const renderField = (field: any) => {
    const fieldError = errors[field.id];
    const fieldValue = formData[field.id];

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
              placeholder={field.placeholder || ''}
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={fieldError ? 'border-red-500' : ''}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {fieldError && <p className="text-sm text-red-500 mt-1">{fieldError}</p>}
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
              placeholder={field.placeholder || ''}
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              rows={4}
              className={fieldError ? 'border-red-500' : ''}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {fieldError && <p className="text-sm text-red-500 mt-1">{fieldError}</p>}
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
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={fieldError ? 'border-red-500' : ''}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {fieldError && <p className="text-sm text-red-500 mt-1">{fieldError}</p>}
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
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={fieldError ? 'border-red-500' : ''}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {fieldError && <p className="text-sm text-red-500 mt-1">{fieldError}</p>}
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
              placeholder={field.placeholder || ''}
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={fieldError ? 'border-red-500' : ''}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {fieldError && <p className="text-sm text-red-500 mt-1">{fieldError}</p>}
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
            <div className="flex gap-2">
              {Array.from({ length: maxRating }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleFieldChange(field.id, i + 1)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${
                      (fieldValue || 0) > i ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                </button>
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
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldError ? 'border-red-500' : 'border-gray-300'
              }`}
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
            {fieldError && <p className="text-sm text-red-500 mt-1">{fieldError}</p>}
          </div>
        );

      case 'multiple_choice':
        return (
          <div key={field.id} className="mb-4">
            <Label className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup value={fieldValue || ''} onValueChange={(value) => handleFieldChange(field.id, value)}>
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
            {fieldError && <p className="text-sm text-red-500 mt-1">{fieldError}</p>}
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
              {field.options?.map((option: any, idx: number) => {
                const isChecked = Array.isArray(fieldValue) && fieldValue.includes(option.value);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Checkbox
                      id={`${baseId}-${idx}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentArray = Array.isArray(fieldValue) ? fieldValue : [];
                        const newArray = checked
                          ? [...currentArray, option.value]
                          : currentArray.filter((v: any) => v !== option.value);
                        handleFieldChange(field.id, newArray);
                      }}
                    />
                    <Label htmlFor={`${baseId}-${idx}`}>{option.label}</Label>
                  </div>
                );
              })}
            </div>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {fieldError && <p className="text-sm text-red-500 mt-1">{fieldError}</p>}
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
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={fieldError ? 'border-red-500' : ''}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {fieldError && <p className="text-sm text-red-500 mt-1">{fieldError}</p>}
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
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleFieldChange(field.id, file?.name);
              }}
              className={fieldError ? 'border-red-500' : ''}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {fieldError && <p className="text-sm text-red-500 mt-1">{fieldError}</p>}
          </div>
        );

      case 'hidden':
        return null;

      default:
        return (
          <div key={field.id} className="mb-4 p-3 bg-gray-100 rounded">
            <p className="text-sm text-gray-600">Unknown field type: {field.type}</p>
          </div>
        );
    }
  };

  const visibleFields = getVisibleFields();

  if (isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <Card className="p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Thank you!
          </h2>
          <p className="text-gray-600 mb-6">
            Your response has been recorded.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            (Preview mode - not actually submitted)
          </p>
          <Button onClick={() => {
            setIsSubmitted(false);
            setFormData({});
          }}>
            Submit Another Response
          </Button>
        </Card>
        <Toaster position="top-center" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4">
      <Card className="p-8" style={{ backgroundColor: theme.backgroundColor }}>
        {/* Form Header */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold mb-3"
            style={{ color: theme.textColor }}
          >
            {form.name}
          </h1>
          {form.description && (
            <p className="text-gray-600 text-lg">{form.description}</p>
          )}
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit}>
          {visibleFields.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
              <p>This form has no fields yet</p>
            </div>
          ) : (
            visibleFields.map((field) => renderField(field))
          )}

          {/* Submit Button */}
          {visibleFields.length > 0 && !isSubmitted && (
            <div className="mt-8">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                style={{
                  backgroundColor: theme.buttonColor,
                  color: '#fff',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          )}
        </form>

        {/* Powered By */}
        {visibleFields.length > 0 && !isSubmitted && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">Powered by FormHub</p>
          </div>
        )}
      </Card>
      <Toaster position="top-center" />
    </div>
  );
}
