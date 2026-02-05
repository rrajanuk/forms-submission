import { ConditionalLogic, LogicCondition, FormField } from '../types/forms';

export interface LogicResult {
  visibleFields: Set<string>;
  hiddenFields: Set<string>;
  jumps: JumpTarget[];
  skippedFields: Set<string>;
}

export interface JumpTarget {
  fieldId: string;
  jumpToStep: number;
}

/**
 * Logic Engine for evaluating conditional logic in forms
 */
export class LogicEngine {
  /**
   * Evaluate all conditional logic rules against submission data
   */
  static evaluate(
    logic: ConditionalLogic[],
    submissionData: Record<string, any>
  ): LogicResult {
    const result: LogicResult = {
      visibleFields: new Set(),
      hiddenFields: new Set(),
      jumps: [],
      skippedFields: new Set(),
    };

    for (const rule of logic) {
      const shouldApply = this.evaluateConditions(rule.conditions, submissionData);

      if (shouldApply) {
        switch (rule.type) {
          case 'show':
            result.visibleFields.add(rule.targetFieldId);
            // Remove from hidden if it was there
            result.hiddenFields.delete(rule.targetFieldId);
            break;

          case 'hide':
            result.hiddenFields.add(rule.targetFieldId);
            // Remove from visible if it was there
            result.visibleFields.delete(rule.targetFieldId);
            break;

          case 'skip':
            result.skippedFields.add(rule.targetFieldId);
            break;

          case 'jump':
            if (rule.action?.jumpToStep !== undefined) {
              result.jumps.push({
                fieldId: rule.targetFieldId,
                jumpToStep: rule.action.jumpToStep,
              });
            }
            break;
        }
      }
    }

    return result;
  }

  /**
   * Check if all conditions in a rule are met (AND logic)
   */
  private static evaluateConditions(
    conditions: LogicCondition[],
    data: Record<string, any>
  ): boolean {
    // ALL conditions must be true
    return conditions.every((condition) =>
      this.evaluateCondition(condition, data)
    );
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(
    condition: LogicCondition,
    data: Record<string, any>
  ): boolean {
    const fieldValue = data[condition.fieldId];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;

      case 'not_equals':
        return fieldValue !== condition.value;

      case 'contains':
        // Handle both arrays and strings
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(condition.value);
        }
        return String(fieldValue).includes(String(condition.value));

      case 'greater_than':
        return this.compareNumbers(fieldValue, condition.value) > 0;

      case 'less_than':
        return this.compareNumbers(fieldValue, condition.value) < 0;

      case 'is_empty':
        return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);

      case 'is_not_empty':
        return fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);

      case 'includes_any':
        // Check if fieldValue includes any of the values in condition.value (array)
        if (Array.isArray(condition.value)) {
          if (Array.isArray(fieldValue)) {
            return fieldValue.some(v => condition.value.includes(v));
          }
          return condition.value.includes(fieldValue);
        }
        return false;

      case 'includes_all':
        // Check if fieldValue includes all of the values in condition.value (array)
        if (Array.isArray(condition.value)) {
          if (Array.isArray(fieldValue)) {
            return condition.value.every(v => fieldValue.includes(v));
          }
          return condition.value.includes(fieldValue);
        }
        return false;

      default:
        console.warn(`Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Compare two values as numbers
   */
  private static compareNumbers(a: any, b: any): number {
    const numA = typeof a === 'number' ? a : parseFloat(a) || 0;
    const numB = typeof b === 'number' ? b : parseFloat(b) || 0;
    return numA - numB;
  }

  /**
   * Get the next visible field based on logic and current position
   */
  static getNextField(
    fields: FormField[],
    currentFieldId: string,
    submissionData: Record<string, any>,
    logic: ConditionalLogic[]
  ): FormField | null {
    const results = this.evaluate(logic, submissionData);
    const currentIndex = fields.findIndex(f => f.id === currentFieldId);

    if (currentIndex === -1) {
      return null;
    }

    // Check if there's a jump from current field
    const jump = results.jumps.find(j => j.fieldId === currentFieldId);
    if (jump) {
      const jumpIndex = Math.min(jump.jumpToStep, fields.length - 1);
      const targetField = fields[jumpIndex];

      // Verify the target isn't hidden
      if (targetField && !results.hiddenFields.has(targetField.id)) {
        return targetField;
      }
    }

    // Find next visible field
    for (let i = currentIndex + 1; i < fields.length; i++) {
      const field = fields[i];

      // Skip if field is hidden
      if (results.hiddenFields.has(field.id)) {
        continue;
      }

      // Skip if field has explicit visibility logic and isn't visible
      const fieldLogic = logic.filter(l => l.targetFieldId === field.id);
      if (fieldLogic.length > 0 && !results.visibleFields.has(field.id)) {
        continue;
      }

      // Skip if marked as skipped
      if (results.skippedFields.has(field.id)) {
        continue;
      }

      return field;
    }

    return null; // End of form
  }

  /**
   * Get all visible fields based on current submission data
   */
  static getVisibleFields(
    fields: FormField[],
    submissionData: Record<string, any>,
    logic: ConditionalLogic[]
  ): FormField[] {
    const results = this.evaluate(logic, submissionData);

    return fields.filter(field => {
      // Skip if explicitly hidden
      if (results.hiddenFields.has(field.id)) {
        return false;
      }

      // Check if field has visibility logic
      const fieldLogic = logic.filter(l => l.targetFieldId === field.id);
      if (fieldLogic.length > 0) {
        return results.visibleFields.has(field.id);
      }

      // Skip if marked as skipped
      if (results.skippedFields.has(field.id)) {
        return false;
      }

      // Default: visible
      return true;
    });
  }

  /**
   * Validate logic rules for consistency
   */
  static validateLogic(logic: ConditionalLogic[], fieldIds: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of logic) {
      // Check if target field exists
      if (!fieldIds.includes(rule.targetFieldId)) {
        errors.push(`Rule ${rule.id}: Target field '${rule.targetFieldId}' does not exist`);
      }

      // Check if condition fields exist
      for (const condition of rule.conditions) {
        if (!fieldIds.includes(condition.fieldId)) {
          errors.push(`Rule ${rule.id}: Condition field '${condition.fieldId}' does not exist`);
        }
      }

      // Validate jump targets
      if (rule.type === 'jump') {
        if (!rule.action?.jumpToStep || rule.action.jumpToStep < 0) {
          errors.push(`Rule ${rule.id}: Invalid jump target`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
