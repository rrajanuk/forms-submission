'use client';

import { useFormBuilder } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  Calendar,
  Star,
  ChevronDown,
  List,
  CheckSquare,
  Upload,
  PenTool,
  EyeOff,
} from 'lucide-react';

const FIELD_TYPES = [
  { type: 'short_text', label: 'Short Text', icon: Type, description: 'Single line text' },
  { type: 'long_text', label: 'Long Text', icon: AlignLeft, description: 'Multi-line text' },
  { type: 'email', label: 'Email', icon: Mail, description: 'Email address' },
  { type: 'phone', label: 'Phone', icon: Phone, description: 'Phone number' },
  { type: 'number', label: 'Number', icon: Hash, description: 'Numeric input' },
  { type: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
  { type: 'rating', label: 'Rating', icon: Star, description: 'Star rating' },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, description: 'Select from list' },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: List, description: 'Choose one option' },
  { type: 'checkboxes', label: 'Checkboxes', icon: CheckSquare, description: 'Select multiple' },
  { type: 'file_upload', label: 'File Upload', icon: Upload, description: 'Upload files' },
  { type: 'signature', label: 'Signature', icon: PenTool, description: 'Signature pad' },
  { type: 'hidden', label: 'Hidden', icon: EyeOff, description: 'Hidden field' },
] as const;

export default function FieldLibrary() {
  const { addField } = useFormBuilder();

  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="p-4 space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Field Types
        </h3>

        {FIELD_TYPES.map(({ type, label, icon: Icon, description }) => (
          <Button
            key={type}
            variant="outline"
            className="w-full justify-start h-auto py-3 px-4"
            onClick={() => addField(type)}
          >
            <Icon className="w-5 h-5 mr-3 text-gray-600" />
            <div className="text-left">
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-gray-500">{description}</div>
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}
