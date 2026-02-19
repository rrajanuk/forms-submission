'use client';

import { useFormBuilder } from '@/lib/store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsBuilder() {
  const { settings, updateSettings, form, updateFormMetadata } = useFormBuilder();

  return (
    <div className="space-y-4">
      <div className="pb-4 border-b">
        <h3 className="font-semibold">Form Settings</h3>
        <p className="text-sm text-gray-500 mt-1">Configure form behavior and options</p>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="formName">Form Name</Label>
            <Input
              id="formName"
              value={form?.name || ''}
              onChange={(e) => updateFormMetadata({ name: e.target.value })}
              placeholder="My Form"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="formSlug">Form Slug (URL)</Label>
            <Input
              id="formSlug"
              value={form?.slug || ''}
              onChange={(e) => updateFormMetadata({ slug: e.target.value })}
              placeholder="my-form"
            />
            <p className="text-xs text-gray-500">
              This will be used in the public URL: yourdomain.com/forms/{form?.slug || 'my-form'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formDescription">Description</Label>
            <Textarea
              id="formDescription"
              value={form?.description || ''}
              onChange={(e) => updateFormMetadata({ description: e.target.value })}
              placeholder="What is this form for?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Access Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Access Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Anonymous</Label>
              <p className="text-xs text-gray-500">
                Users can submit without authentication
              </p>
            </div>
            <Switch
              checked={settings.allowAnonymous}
              onCheckedChange={(checked) => updateSettings({ allowAnonymous: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Authentication</Label>
              <p className="text-xs text-gray-500">
                Users must be logged in to submit
              </p>
            </div>
            <Switch
              checked={settings.requireAuth}
              onCheckedChange={(checked) => updateSettings({ requireAuth: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>One Response Per User</Label>
              <p className="text-xs text-gray-500">
                Each user can only submit once
              </p>
            </div>
            <Switch
              checked={settings.oneResponsePerUser}
              onCheckedChange={(checked) => updateSettings({ oneResponsePerUser: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Display Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Progress Bar</Label>
              <p className="text-xs text-gray-500">
                Display completion progress
              </p>
            </div>
            <Switch
              checked={settings.showProgressBar}
              onCheckedChange={(checked) => updateSettings({ showProgressBar: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Question Numbers</Label>
              <p className="text-xs text-gray-500">
                Number the questions
              </p>
            </div>
            <Switch
              checked={settings.showQuestionNumbers}
              onCheckedChange={(checked) => updateSettings({ showQuestionNumbers: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Shuffle Questions</Label>
              <p className="text-xs text-gray-500">
                Randomize question order
              </p>
            </div>
            <Switch
              checked={settings.shuffleQuestions}
              onCheckedChange={(checked) => updateSettings({ shuffleQuestions: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Auto-Save */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Auto-Save</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Save Interval</Label>
              <span className="text-sm text-gray-600">{settings.autoSaveInterval}s</span>
            </div>
            <Slider
              value={[settings.autoSaveInterval]}
              onValueChange={([value]) => updateSettings({ autoSaveInterval: value })}
              min={5}
              max={300}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              How often to save drafts (in seconds)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* After Submission */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">After Submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirmationMessage">Confirmation Message</Label>
            <Textarea
              id="confirmationMessage"
              value={settings.confirmationMessage}
              onChange={(e) => updateSettings({ confirmationMessage: e.target.value })}
              placeholder="Thank you for your submission!"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="redirectUrl">Redirect URL (Optional)</Label>
            <Input
              id="redirectUrl"
              value={settings.redirectUrl || ''}
              onChange={(e) => updateSettings({ redirectUrl: e.target.value || undefined })}
              placeholder="https://example.com/thank-you"
            />
            <p className="text-xs text-gray-500">
              Redirect users to this URL after submission
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
