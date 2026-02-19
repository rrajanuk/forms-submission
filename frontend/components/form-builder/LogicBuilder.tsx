'use client';

import { useFormBuilder } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import type { LogicRule, LogicOperator, LogicType } from '@/types/form';

export default function LogicBuilder() {
  const { fields, logic, selectedLogicId, addLogicRule, updateLogicRule, deleteLogicRule, selectLogic } =
    useFormBuilder();

  const selectedRule = logic.find((l) => l.id === selectedLogicId);

  const logicTypes: { value: LogicType; label: string }[] = [
    { value: 'show', label: 'Show' },
    { value: 'hide', label: 'Hide' },
    { value: 'skip', label: 'Skip' },
    { value: 'jump', label: 'Jump to' },
  ];

  const operators: { value: LogicOperator; label: string }[] = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
    { value: 'includes_any', label: 'Includes any of' },
    { value: 'includes_all', label: 'Includes all of' },
  ];

  const updateRule = (data: Partial<LogicRule>) => {
    if (selectedLogicId) {
      updateLogicRule(selectedLogicId, data);
    }
  };

  const addCondition = () => {
    if (!selectedRule) return;
    updateRule({
      conditions: [
        ...selectedRule.conditions,
        { fieldId: '', operator: 'equals', value: '' },
      ],
    });
  };

  const updateCondition = (index: number, data: any) => {
    if (!selectedRule) return;
    const conditions = [...selectedRule.conditions];
    conditions[index] = { ...conditions[index], ...data };
    updateRule({ conditions });
  };

  const removeCondition = (index: number) => {
    if (!selectedRule) return;
    updateRule({
      conditions: selectedRule.conditions.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-4 border-b">
        <h3 className="font-semibold">Conditional Logic</h3>
        <Button size="sm" onClick={addLogicRule}>
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {logic.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No logic rules yet</p>
          <p className="text-sm mt-1">Add a rule to show/hide fields based on conditions</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logic.map((rule) => (
            <button
              key={rule.id}
              onClick={() => selectLogic(rule.id)}
              className={`
                w-full text-left p-3 rounded-lg border transition-all
                ${selectedLogicId === rule.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {logicTypes.find((t) => t.value === rule.type)?.label}{' '}
                    {rule.targetFieldId
                      ? fields.find((f) => f.id === rule.targetFieldId)?.label || 'unknown field'
                      : 'select field'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLogicRule(rule.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedRule && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Edit Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logic Type */}
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={selectedRule.type}
                onValueChange={(value) => updateRule({ type: value as LogicType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {logicTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Field */}
            <div className="space-y-2">
              <Label>Target Field</Label>
              <Select
                value={selectedRule.targetFieldId}
                onValueChange={(value) => updateRule({ targetFieldId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jump To Step (for jump logic) */}
            {selectedRule.type === 'jump' && (
              <div className="space-y-2">
                <Label>Jump to Step</Label>
                <Input
                  type="number"
                  value={selectedRule.action?.jumpToStep || ''}
                  onChange={(e) =>
                    updateRule({
                      action: { ...selectedRule.action, jumpToStep: parseInt(e.target.value) || 0 },
                    })
                  }
                  placeholder="Step number"
                />
              </div>
            )}

            {/* Conditions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Conditions</Label>
                <Button size="sm" variant="outline" onClick={addCondition}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {selectedRule.conditions.map((condition, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Condition {index + 1}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Select
                      value={condition.fieldId}
                      onValueChange={(value) => updateCondition(index, { fieldId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(index, { operator: value as LogicOperator })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      value={condition.value || ''}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      placeholder="Value"
                    />
                  </div>
                </div>
              ))}

              {selectedRule.conditions.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Add conditions to define when this rule applies
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
