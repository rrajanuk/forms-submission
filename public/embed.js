/**
 * Form Embed SDK
 * A JavaScript library for embedding Typeform-like forms on any website
 *
 * Usage:
 * <div id="my-form"></div>
 * <script src="https://your-domain.com/embed.js"></script>
 * <script>
 *   new FormEmbed({
 *     formSlug: 'customer-feedback',
 *     container: document.getElementById('my-form'),
 *     onComplete: (response) => console.log('Submitted!', response)
 *   });
 * </script>
 */

(function(window, document) {
  'use strict';

  class FormEmbed {
    constructor(options) {
      // Configuration
      this.formSlug = options.formSlug;
      this.container = options.container || document.body;
      this.autoLoad = options.autoLoad !== false;

      // Callbacks
      this.onProgress = options.onProgress || function() {};
      this.onComplete = options.onComplete || function() {};
      this.onError = options.onError || function() {};
      this.onFieldChange = options.onFieldChange || function() {};

      // API configuration
      this.apiBaseUrl = options.apiBaseUrl || window.location.origin;

      // Session state
      this.sessionId = this.generateSessionId();
      this.currentStep = 0;
      this.submissionData = {};
      this.formSchema = null;
      this.formData = null;

      // Auto-save timer
      this.autoSaveTimer = null;
      this.autoSaveInterval = null;

      // UI state
      this.isLoading = true;
      this.currentFieldId = null;

      // Auto-load if enabled
      if (this.autoLoad) {
        this.init();
      }
    }

    /**
     * Generate a unique session ID
     */
    generateSessionId() {
      return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Initialize the embed
     */
    async init() {
      try {
        this.showLoading();

        // Load form schema
        await this.loadFormSchema();

        // Check for existing draft
        await this.loadDraft();

        // Render form
        this.render();

        // Setup auto-save
        this.setupAutoSave();

        this.hideLoading();
      } catch (error) {
        this.hideLoading();
        this.onError(error);
      }
    }

    /**
     * Load the form schema from the API
     */
    async loadFormSchema() {
      const response = await fetch(`${this.apiBaseUrl}/api/public/forms/${this.formSlug}`);

      if (!response.ok) {
        throw new Error('Failed to load form');
      }

      this.formData = await response.json();
      this.formSchema = this.formData.schema;
    }

    /**
     * Load any existing draft for this session
     */
    async loadDraft() {
      try {
        const response = await fetch(
          `${this.apiBaseUrl}/api/public/forms/${this.formSlug}/draft/${this.sessionId}`
        );

        if (response.ok) {
          const draft = await response.json();
          this.submissionData = draft.submissionData || {};
          this.currentStep = draft.currentStep || 0;

          // Update draft expiration display
          this.updateDraftExpiry(draft.expiresAt);
        }
      } catch (error) {
        // No draft exists, that's ok
        console.log('No existing draft found');
      }
    }

    /**
     * Render the form UI
     */
    render() {
      // Create container
      const formContainer = document.createElement('div');
      formContainer.className = 'fe-form-embed';
      formContainer.dataset.formSlug = this.formSlug;

      // Add form header
      const header = this.renderHeader();
      formContainer.appendChild(header);

      // Add progress bar
      if (this.formSchema.settings.showProgressBar) {
        const progressBar = this.renderProgressBar();
        formContainer.appendChild(progressBar);
      }

      // Add fields container
      const fieldsContainer = document.createElement('div');
      fieldsContainer.className = 'fe-fields-container';
      formContainer.appendChild(fieldsContainer);

      // Render each field
      this.formSchema.fields.forEach((field, index) => {
        const fieldElement = this.renderField(field, index);
        fieldsContainer.appendChild(fieldElement);
      });

      // Add navigation buttons
      const navigation = this.renderNavigation();
      formContainer.appendChild(navigation);

      // Clear container and append form
      this.container.innerHTML = '';
      this.container.appendChild(formContainer);

      // Apply theme
      this.applyTheme();

      // Setup event listeners
      this.setupEventListeners();

      // Focus first field
      this.focusField(0);

      // Trigger progress callback
      this.onProgress({
        step: this.currentStep,
        totalSteps: this.formSchema.fields.length,
        percentage: 0
      });
    }

    /**
     * Render form header
     */
    renderHeader() {
      const header = document.createElement('div');
      header.className = 'fe-header';

      if (this.formData.name) {
        const title = document.createElement('h1');
        title.className = 'fe-title';
        title.textContent = this.formData.name;
        header.appendChild(title);
      }

      if (this.formData.description) {
        const description = document.createElement('p');
        description.className = 'fe-description';
        description.textContent = this.formData.description;
        header.appendChild(description);
      }

      return header;
    }

    /**
     * Render progress bar
     */
    renderProgressBar() {
      const container = document.createElement('div');
      container.className = 'fe-progress-container';

      const bar = document.createElement('div');
      bar.className = 'fe-progress-bar';

      const fill = document.createElement('div');
      fill.className = 'fe-progress-fill';

      bar.appendChild(fill);
      container.appendChild(bar);

      const text = document.createElement('div');
      text.className = 'fe-progress-text';

      container.appendChild(text);

      // Store references
      this.progressBarContainer = container;
      this.progressBarFill = fill;
      this.progressText = text;

      return container;
    }

    /**
     * Update progress bar
     */
    updateProgress() {
      if (!this.progressBarFill) return;

      const total = this.formSchema.fields.length;
      const current = this.currentStep;
      const percentage = (current / total) * 100;

      this.progressBarFill.style.width = `${percentage}%`;
      this.progressText.textContent = `${current + 1} of ${total}`;
    }

    /**
     * Render a single field
     */
    renderField(field, index) {
      const wrapper = document.createElement('div');
      wrapper.className = `fe-field fe-field-${field.type}`;
      wrapper.dataset.fieldId = field.id;
      wrapper.dataset.fieldIndex = index;
      wrapper.style.display = 'none'; // Hidden initially, will be shown based on logic

      // Question number
      if (this.formSchema.settings.showQuestionNumbers) {
        const number = document.createElement('div');
        number.className = 'fe-field-number';
        number.textContent = index + 1;
        wrapper.appendChild(number);
      }

      // Label
      if (field.label) {
        const label = document.createElement('label');
        label.className = 'fe-label';
        label.textContent = field.label;
        if (field.required) {
          label.classList.add('fe-required');
          label.innerHTML += ' <span class="fe-required-star">*</span>';
        }
        wrapper.appendChild(label);
      }

      // Description
      if (field.description) {
        const description = document.createElement('div');
        description.className = 'fe-description';
        description.textContent = field.description;
        wrapper.appendChild(description);
      }

      // Input element
      const input = this.renderInput(field);
      wrapper.appendChild(input);

      // Error message container
      const error = document.createElement('div');
      error.className = 'fe-error';
      error.style.display = 'none';
      wrapper.appendChild(error);

      return wrapper;
    }

    /**
     * Render input element based on field type
     */
    renderInput(field) {
      const container = document.createElement('div');
      container.className = 'fe-input-container';

      switch (field.type) {
        case 'short_text':
          const input = document.createElement('input');
          input.type = 'text';
          input.name = field.id;
          input.className = 'fe-input fe-input-text';
          input.placeholder = field.placeholder || '';
          input.required = field.required;
          input.value = this.submissionData[field.id] || '';
          input.addEventListener('input', (e) => this.handleFieldChange(field.id, e.target.value));
          container.appendChild(input);
          break;

        case 'long_text':
          const textarea = document.createElement('textarea');
          textarea.name = field.id;
          textarea.className = 'fe-input fe-input-textarea';
          textarea.placeholder = field.placeholder || '';
          textarea.required = field.required;
          textarea.rows = 4;
          textarea.value = this.submissionData[field.id] || '';
          textarea.addEventListener('input', (e) => this.handleFieldChange(field.id, e.target.value));
          container.appendChild(textarea);
          break;

        case 'email':
          const emailInput = document.createElement('input');
          emailInput.type = 'email';
          emailInput.name = field.id;
          emailInput.className = 'fe-input fe-input-email';
          emailInput.placeholder = field.placeholder || 'you@example.com';
          emailInput.required = field.required;
          emailInput.value = this.submissionData[field.id] || '';
          emailInput.addEventListener('input', (e) => this.handleFieldChange(field.id, e.target.value));
          container.appendChild(emailInput);
          break;

        case 'phone':
          const phoneInput = document.createElement('input');
          phoneInput.type = 'tel';
          phoneInput.name = field.id;
          phoneInput.className = 'fe-input fe-input-phone';
          phoneInput.placeholder = field.placeholder || '+1 234 567 8900';
          phoneInput.required = field.required;
          phoneInput.value = this.submissionData[field.id] || '';
          phoneInput.addEventListener('input', (e) => this.handleFieldChange(field.id, e.target.value));
          container.appendChild(phoneInput);
          break;

        case 'number':
          const numberInput = document.createElement('input');
          numberInput.type = 'number';
          numberInput.name = field.id;
          numberInput.className = 'fe-input fe-input-number';
          numberInput.placeholder = field.placeholder || '0';
          numberInput.required = field.required;
          numberInput.value = this.submissionData[field.id] || '';
          numberInput.step = 'any';
          if (field.validation) {
            if (field.validation.min !== undefined) numberInput.min = field.validation.min;
            if (field.validation.max !== undefined) numberInput.max = field.validation.max;
          }
          numberInput.addEventListener('input', (e) => this.handleFieldChange(field.id, e.target.value));
          container.appendChild(numberInput);
          break;

        case 'date':
          const dateInput = document.createElement('input');
          dateInput.type = 'date';
          dateInput.name = field.id;
          dateInput.className = 'fe-input fe-input-date';
          dateInput.required = field.required;
          dateInput.value = this.submissionData[field.id] || '';
          dateInput.addEventListener('input', (e) => this.handleFieldChange(field.id, e.target.value));
          container.appendChild(dateInput);
          break;

        case 'rating':
          const ratingContainer = this.renderRatingInput(field);
          container.appendChild(ratingContainer);
          break;

        case 'dropdown':
          const select = document.createElement('select');
          select.name = field.id;
          select.className = 'fe-input fe-input-select';
          select.required = field.required;

          const defaultOption = document.createElement('option');
          defaultOption.value = '';
          defaultOption.text = field.placeholder || 'Select an option';
          defaultOption.disabled = true;
          select.appendChild(defaultOption);

          field.options?.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value || opt.id;
            option.textContent = opt.label;
            select.appendChild(option);
          });

          select.value = this.submissionData[field.id] || '';
          select.addEventListener('change', (e) => this.handleFieldChange(field.id, e.target.value));
          container.appendChild(select);
          break;

        case 'multiple_choice':
          const radioGroup = this.renderRadioGroup(field);
          container.appendChild(radioGroup);
          break;

        case 'checkboxes':
          const checkboxGroup = this.renderCheckboxGroup(field);
          container.appendChild(checkboxGroup);
          break;

        case 'hidden':
          const hidden = document.createElement('input');
          hidden.type = 'hidden';
          hidden.name = field.id;
          hidden.value = field.properties?.value || '';
          container.appendChild(hidden);
          break;

        default:
          const defaultInput = document.createElement('input');
          defaultInput.type = 'text';
          defaultInput.name = field.id;
          defaultInput.className = 'fe-input';
          defaultInput.value = this.submissionData[field.id] || '';
          defaultInput.addEventListener('input', (e) => this.handleFieldChange(field.id, e.target.value));
          container.appendChild(defaultInput);
      }

      return container;
    }

    /**
     * Render rating input
     */
    renderRatingInput(field) {
      const container = document.createElement('div');
      container.className = 'fe-rating-container';

      const scale = field.properties?.scale || 10;
      const minLabel = field.properties?.minLabel || '';
      const maxLabel = field.properties?.maxLabel || '';

      // Min label
      if (minLabel) {
        const minSpan = document.createElement('span');
        minSpan.className = 'fe-rating-min';
        minSpan.textContent = minLabel;
        container.appendChild(minSpan);
      }

      // Rating buttons
      for (let i = 1; i <= scale; i++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'fe-rating-button';
        button.textContent = i;
        button.dataset.value = i;

        if (parseInt(this.submissionData[field.id]) === i) {
          button.classList.add('fe-rating-selected');
        }

        button.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleFieldChange(field.id, i);
          this.updateRatingUI(field.id, i);
        });

        container.appendChild(button);
      }

      // Max label
      if (maxLabel) {
        const maxSpan = document.createElement('span');
        maxSpan.className = 'fe-rating-max';
        maxSpan.textContent = maxLabel;
        container.appendChild(maxSpan);
      }

      return container;
    }

    /**
     * Update rating UI
     */
    updateRatingUI(fieldId, value) {
      const wrapper = this.container.querySelector(`[data-field-id="${fieldId}"]`);
      if (!wrapper) return;

      const buttons = wrapper.querySelectorAll('.fe-rating-button');
      buttons.forEach(btn => {
        const btnValue = parseInt(btn.dataset.value);
        if (btnValue === value) {
          btn.classList.add('fe-rating-selected');
        } else {
          btn.classList.remove('fe-rating-selected');
        }
      });
    }

    /**
     * Render radio group
     */
    renderRadioGroup(field) {
      const container = document.createElement('div');
      container.className = 'fe-radio-group';

      field.options?.forEach((opt, index) => {
        const label = document.createElement('label');
        label.className = 'fe-radio-label';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = field.id;
        radio.value = opt.value || opt.id;
        radio.required = field.required;
        radio.id = `${field.id}_${index}`;

        if (this.submissionData[field.id] === (opt.value || opt.id)) {
          radio.checked = true;
        }

        radio.addEventListener('change', (e) => {
          this.handleFieldChange(field.id, e.target.value);
        });

        label.appendChild(radio);
        label.appendChild(document.createTextNode(opt.label));
        container.appendChild(label);
      });

      return container;
    }

    /**
     * Render checkbox group
     */
    renderCheckboxGroup(field) {
      const container = document.createElement('div');
      container.className = 'fe-checkbox-group';

      field.options?.forEach((opt, index) => {
        const label = document.createElement('label');
        label.className = 'fe-checkbox-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = field.id;
        checkbox.value = opt.value || opt.id;
        checkbox.id = `${field.id}_${index}`;

        const currentValue = this.submissionData[field.id];
        if (Array.isArray(currentValue) && currentValue.includes(opt.value || opt.id)) {
          checkbox.checked = true;
        }

        checkbox.addEventListener('change', (e) => {
          this.handleCheckboxChange(field.id);
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(opt.label));
        container.appendChild(label);
      });

      return container;
    }

    /**
     * Render navigation buttons
     */
    renderNavigation() {
      const nav = document.createElement('div');
      nav.className = 'fe-navigation';

      // Back button
      if (this.currentStep > 0) {
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'fe-button fe-button-secondary';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => this.goBack());
        nav.appendChild(backBtn);
      }

      // Submit button (shown on last step)
      const submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.className = 'fe-button fe-button-primary';
      submitBtn.textContent = 'Submit';
      submitBtn.addEventListener('click', () => this.submit());
      nav.appendChild(submitBtn);

      this.navigationElement = nav;
      this.submitButton = submitBtn;

      return nav;
    }

    /**
     * Apply form theme
     */
    applyTheme() {
      const theme = this.formSchema.theme;
      const container = this.container.querySelector('.fe-form-embed');

      if (!container) return;

      // Apply colors
      container.style.setProperty('--fe-primary', theme.colors.primary);
      container.style.setProperty('--fe-background', theme.colors.background);
      container.style.setProperty('--fe-text', theme.colors.text);
      container.style.setProperty('--fe-button', theme.colors.button);

      // Apply font
      document.font = theme.font;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
      // Handle keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          // Submit on Enter (but allow Shift+Enter for newlines)
          const focused = document.activeElement;
          if (focused && focused.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.nextStep();
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.goBack();
        }
      });
    }

    /**
     * Handle field value change
     */
    handleFieldChange(fieldId, value) {
      this.submissionData[fieldId] = value;

      // Trigger auto-save
      this.debouncedSave();

      // Trigger callback
      this.onFieldChange({
        fieldId,
        value,
        allData: this.submissionData
      });
    }

    /**
     * Handle checkbox group change
     */
    handleCheckboxChange(fieldId) {
      const checkboxes = this.container.querySelectorAll(`input[name="${fieldId}"]:checked`);
      const values = Array.from(checkboxes).map(cb => cb.value);
      this.submissionData[fieldId] = values;

      this.debouncedSave();

      this.onFieldChange({
        fieldId,
        value: values,
        allData: this.submissionData
      });
    }

    /**
     * Debounced auto-save
     */
    debouncedSave() {
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
      }

      this.autoSaveTimer = setTimeout(() => {
        this.saveDraft();
      }, 2000); // Wait 2 seconds after last change
    }

    /**
     * Setup periodic auto-save
     */
    setupAutoSave() {
      const autoSaveInterval = this.formSchema.settings.autoSaveInterval || 30;

      this.autoSaveTimer = setInterval(() => {
        this.saveDraft();
      }, autoSaveInterval * 1000);
    }

    /**
     * Save draft to server
     */
    async saveDraft() {
      try {
        await fetch(`${this.apiBaseUrl}/api/public/forms/${this.formSlug}/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.sessionId,
            submission_data: this.submissionData,
            current_step: this.currentStep
          })
        });

        console.log('[FormEmbed] Draft saved');
      } catch (error) {
        console.error('[FormEmbed] Auto-save failed:', error);
      }
    }

    /**
     * Load draft and restore form state
     */
    async loadDraft() {
      // Already called in init(), this restores state
    }

    /**
     * Focus on a specific field
     */
    focusField(fieldIndex) {
      const field = this.container.querySelector(`[data-field-index="${fieldIndex}"]`);
      if (field) {
        const input = field.querySelector('input, textarea, select');
        if (input) {
          input.focus();
        }
        this.currentFieldId = field.dataset.fieldId;
      }

      // Show current field, hide others
      this.updateFieldVisibility();
    }

    /**
     * Update field visibility based on logic
     */
    updateFieldVisibility() {
      const fields = this.formSchema.fields;
      const logic = this.formSchema.logic || [];

      // For now, show all fields (conditional logic evaluation can be added)
      fields.forEach((field, index) => {
        const fieldEl = this.container.querySelector(`[data-field-id="${field.id}"]`);
        if (fieldEl) {
          // Show current field and all fields before it
          if (index <= this.currentStep) {
            fieldEl.style.display = 'block';
          } else {
            fieldEl.style.display = 'none';
          }
        }
      });

      // Update navigation
      this.updateNavigation();
    }

    /**
     * Update navigation buttons
     */
    updateNavigation() {
      const fields = this.formSchema.fields;

      // Update submit button text
      if (this.currentStep === fields.length - 1) {
        if (this.submitButton) {
          this.submitButton.textContent = 'Submit';
        }
      }
    }

    /**
     * Update draft expiry display
     */
    updateDraftExpiry(expiresAt) {
      const now = Date.now();
      const remaining = expiresAt - now;
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      // Could display this somewhere in the UI
      console.log(`Draft expires in ${hours}h ${minutes}m`);
    }

    /**
     * Show loading state
     */
    showLoading() {
      const loading = document.createElement('div');
      loading.className = 'fe-loading';
      loading.innerHTML = '<div class="fe-spinner"></div><p>Loading form...</p>';
      this.container.innerHTML = '';
      this.container.appendChild(loading);
    }

    /**
     * Hide loading state
     */
    hideLoading() {
      const loading = this.container.querySelector('.fe-loading');
      if (loading) {
        loading.remove();
      }
    }

    /**
     * Show error message
     */
    showError(fieldId, message) {
      const field = this.container.querySelector(`[data-field-id="${fieldId}"]`);
      if (!field) return;

      const error = field.querySelector('.fe-error');
      if (error) {
        error.textContent = message;
        error.style.display = 'block';
      }
    }

    /**
     * Clear all errors
     */
    clearErrors() {
      const errors = this.container.querySelectorAll('.fe-error');
      errors.forEach(err => {
        err.style.display = 'none';
      });
    }

    /**
     * Validate current field
     */
    validateCurrentField() {
      const field = this.formSchema.fields[this.currentStep];
      if (!field) return true;

      const value = this.submissionData[field.id];
      const error = document.querySelector('.fe-error');

      // Required check
      if (field.required && !value) {
        this.showError(field.id, `${field.label} is required`);
        return false;
      }

      // Type-specific validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          this.showError(field.id, 'Please enter a valid email address');
          return false;
        }
      }

      // Custom validation
      if (field.validation) {
        if (field.validation.min && value.length < field.validation.min) {
          this.showError(field.id, `Minimum ${field.validation.min} characters`);
          return false;
        }
        if (field.validation.max && value.length > field.validation.max) {
          this.showError(field.id, `Maximum ${field.validation.max} characters`);
          return false;
        }
      }

      this.clearErrors();
      return true;
    }

    /**
     * Move to next step
     */
    nextStep() {
      if (!this.validateCurrentField()) {
        return;
      }

      if (this.currentStep < this.formSchema.fields.length - 1) {
        this.currentStep++;
        this.focusField(this.currentStep);
        this.updateProgress();

        this.onProgress({
          step: this.currentStep,
          totalSteps: this.formSchema.fields.length,
          percentage: (this.currentStep / this.formSchema.fields.length) * 100
        });
      } else {
        this.submit();
      }
    }

    /**
     * Go to previous step
     */
    goBack() {
      if (this.currentStep > 0) {
        this.currentStep--;
        this.focusField(this.currentStep);
        this.updateProgress();

        this.onProgress({
          step: this.currentStep,
          totalSteps: this.formSchema.fields.length,
          percentage: (this.currentStep / this.formSchema.fields.length) * 100
        });
      }
    }

    /**
     * Submit the form
     */
    async submit() {
      if (!this.validateCurrentField()) {
        return;
      }

      // Clear auto-save timer
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
      }

      try {
        const response = await fetch(`${this.apiBaseUrl}/api/public/forms/${this.formSlug}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submission_data: this.submissionData,
            session_id: this.sessionId
          })
        });

        if (response.ok) {
          const result = await response.json();
          this.onComplete(result);
          this.showThankYou();
        } else {
          const error = await response.json();
          this.onError(error);
        }
      } catch (error) {
        this.onError(error);
      }
    }

    /**
     * Show thank you message
     */
    showThankYou() {
      const message = this.formSchema.settings.confirmationMessage || 'Thank you!';

      // Handle redirect
      const redirectUrl = this.formSchema.settings.redirectUrl;
      if (redirectUrl) {
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 2000);
      }

      const container = this.container.querySelector('.fe-form-embed');
      if (container) {
        container.innerHTML = `
          <div class="fe-thank-you">
            <h2>${message}</h2>
            <p>Your response has been recorded.</p>
          </div>
        `;
      }
    }

    /**
     * Destroy the embed and cleanup
     */
    destroy() {
      // Clear auto-save timer
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
      }

      // Remove container content
      if (this.container) {
        this.container.innerHTML = '';
      }
    }
  }

  // Export to window
  window.FormEmbed = FormEmbed;

})(window, document);
