import { DraftSubmissionModel } from '../models/draftSubmission.model';
import { FormSubmissionModel } from '../models/formSubmission.model';
import { FormModel } from '../models/form.model';
import { SubmissionMetadata } from '../types/forms';

/**
 * Auto-Save Service for managing draft form submissions
 */
export class AutoSaveService {
  /**
   * Save or update a draft submission
   */
  static async saveDraft(data: {
    formSlug: string;
    sessionId: string;
    submissionData: Record<string, any>;
    currentStep?: number;
  }): Promise<{
    id: string;
    isNew: boolean;
    message: string;
  }> {
    // Find form by slug - search across all published forms
    const form = await FormModel.findPublishedBySlug(data.formSlug);

    if (!form) {
      throw new Error('Form not found');
    }

    if (form.status !== 'published') {
      throw new Error('Form is not published');
    }

    // Check if draft already exists
    const existing = await DraftSubmissionModel.findByFormAndSession(form.id, data.sessionId);

    if (existing) {
      // Update existing draft
      await DraftSubmissionModel.update(existing.id, {
        submission_data: data.submissionData,
        current_step: data.currentStep || 0,
      });

      return {
        id: existing.id,
        isNew: false,
        message: 'Draft updated successfully',
      };
    }

    // Create new draft
    const draft = await DraftSubmissionModel.create({
      form_id: form.id,
      session_id: data.sessionId,
      submission_data: data.submissionData,
      current_step: data.currentStep || 0,
    });

    return {
      id: draft.id,
      isNew: true,
      message: 'Draft saved successfully',
    };
  }

  /**
   * Load a draft for a session
   */
  static async loadDraft(formSlug: string, sessionId: string): Promise<{
    id: string;
    formId: string;
    submissionData: Record<string, any>;
    currentStep: number;
    expiresAt: number;
  } | null> {
    // Find form by slug
    const form = await FormModel.findPublishedBySlug(formSlug);

    if (!form) {
      return null;
    }

    const draft = await DraftSubmissionModel.findByFormAndSession(form.id, sessionId);

    if (!draft) {
      return null;
    }

    // Check if draft has expired
    if (Number(draft.expires_at) < Date.now()) {
      await DraftSubmissionModel.delete(draft.id);
      return null;
    }

    return {
      id: draft.id,
      formId: draft.form_id,
      submissionData: draft.submission_data,
      currentStep: draft.current_step,
      expiresAt: Number(draft.expires_at),
    };
  }

  /**
   * Convert a draft to a complete submission
   */
  static async completeDraft(
    formSlug: string,
    sessionId: string,
    metadata?: SubmissionMetadata
  ): Promise<{
    id: string;
    formId: string;
    organizationId: string;
    submissionData: Record<string, any>;
    submittedAt: number;
  }> {
    // Find form by slug
    const form = await FormModel.findPublishedBySlug(formSlug);

    if (!form) {
      throw new Error('Form not found');
    }

    // Find draft
    const draft = await DraftSubmissionModel.findByFormAndSession(form.id, sessionId);

    if (!draft) {
      throw new Error('Draft not found');
    }

    // Check if draft has expired
    if (Number(draft.expires_at) < Date.now()) {
      await DraftSubmissionModel.delete(draft.id);
      throw new Error('Draft has expired');
    }

    // Create complete submission
    const submission = await FormSubmissionModel.create({
      form_id: form.id,
      organization_id: form.organization_id,
      submission_data: draft.submission_data,
      status: 'complete',
      metadata,
    });

    // Delete draft
    await DraftSubmissionModel.delete(draft.id);

    return {
      id: submission.id,
      formId: submission.form_id,
      organizationId: submission.organization_id,
      submissionData: submission.submission_data,
      submittedAt: submission.submitted_at || Date.now(),
    };
  }

  /**
   * Delete a draft
   */
  static async deleteDraft(formSlug: string, sessionId: string): Promise<boolean> {
    // Find form by slug
    const form = await FormModel.findPublishedBySlug(formSlug);

    if (!form) {
      return false;
    }

    const draft = await DraftSubmissionModel.findByFormAndSession(form.id, sessionId);

    if (!draft) {
      return false;
    }

    return await DraftSubmissionModel.delete(draft.id);
  }

  /**
   * Cleanup expired drafts
   * This should be called periodically (e.g., every hour)
   */
  static async cleanupExpiredDrafts(): Promise<{
    count: number;
    oldest: number;
  }> {
    const result = await DraftSubmissionModel.deleteExpired();

    // Get the oldest remaining draft age
    const drafts = await DraftSubmissionModel.findByForm('', 1000, 0);
    const now = Date.now();
    const oldest = drafts.length > 0
      ? Math.min(...drafts.map((d: any) => (now - d.created_at) / (1000 * 60 * 60 * 24))) // days
      : 0;

    return {
      count: result.count,
      oldest,
    };
  }

  /**
   * Get draft statistics
   */
  static async getDraftStats(): Promise<{
    total: number;
    expired: number;
    active: number;
    expiryDays: number;
  }> {
    const expiryDays = parseInt(process.env.DRAFT_EXPIRY_DAYS || '7');
    const cutoffTime = Date.now();

    // Get all drafts (limited to 1000 for performance)
    const drafts = await DraftSubmissionModel.findByForm('', 1000, 0);

    const expired = drafts.filter((d: any) => d.expires_at < cutoffTime).length;
    const active = drafts.filter((d: any) => d.expires_at >= cutoffTime).length;

    return {
      total: drafts.length,
      expired,
      active,
      expiryDays,
    };
  }
}
