'use client';

import { useFormBuilder } from '@/lib/store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ThemeBuilder() {
  const { theme, updateTheme } = useFormBuilder();

  const layouts = [
    { value: 'classic', label: 'Classic' },
    { value: 'modern', label: 'Modern' },
    { value: 'minimal', label: 'Minimal' },
  ];

  const fonts = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Montserrat', label: 'Montserrat' },
  ];

  return (
    <div className="space-y-4">
      <div className="pb-4 border-b">
        <h3 className="font-semibold">Form Theme</h3>
        <p className="text-sm text-gray-500 mt-1">Customize the appearance of your form</p>
      </div>

      {/* Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Layout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Layout Style</Label>
            <Select
              value={theme.layout}
              onValueChange={(value: any) => updateTheme({ layout: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {layouts.map((layout) => (
                  <SelectItem key={layout.value} value={layout.value}>
                    {layout.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Font</Label>
            <Select
              value={theme.font}
              onValueChange={(value) => updateTheme({ font: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fonts.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary">Primary Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="primary"
                type="color"
                value={theme.colors.primary}
                onChange={(e) =>
                  updateTheme({
                    colors: { ...theme.colors, primary: e.target.value },
                  })
                }
                className="w-20 h-10"
              />
              <Input
                value={theme.colors.primary}
                onChange={(e) =>
                  updateTheme({
                    colors: { ...theme.colors, primary: e.target.value },
                  })
                }
                placeholder="#4F46E5"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background">Background Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="background"
                type="color"
                value={theme.colors.background}
                onChange={(e) =>
                  updateTheme({
                    colors: { ...theme.colors, background: e.target.value },
                  })
                }
                className="w-20 h-10"
              />
              <Input
                value={theme.colors.background}
                onChange={(e) =>
                  updateTheme({
                    colors: { ...theme.colors, background: e.target.value },
                  })
                }
                placeholder="#FFFFFF"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">Text Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="text"
                type="color"
                value={theme.colors.text}
                onChange={(e) =>
                  updateTheme({
                    colors: { ...theme.colors, text: e.target.value },
                  })
                }
                className="w-20 h-10"
              />
              <Input
                value={theme.colors.text}
                onChange={(e) =>
                  updateTheme({
                    colors: { ...theme.colors, text: e.target.value },
                  })
                }
                placeholder="#1F2937"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="button">Button Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="button"
                type="color"
                value={theme.colors.button}
                onChange={(e) =>
                  updateTheme({
                    colors: { ...theme.colors, button: e.target.value },
                  })
                }
                className="w-20 h-10"
              />
              <Input
                value={theme.colors.button}
                onChange={(e) =>
                  updateTheme({
                    colors: { ...theme.colors, button: e.target.value },
                  })
                }
                placeholder="#4F46E5"
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg p-4 border"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              fontFamily: theme.font,
            }}
          >
            <h4
              className="font-medium mb-2"
              style={{ color: theme.colors.primary }}
            >
              Sample Form Title
            </h4>
            <div className="space-y-2">
              <div>
                <label className="text-sm">Sample Field</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded text-sm"
                  placeholder="Enter your answer"
                  style={{ borderColor: theme.colors.primary }}
                />
              </div>
              <button
                className="w-full py-2 px-4 rounded text-white text-sm font-medium"
                style={{ backgroundColor: theme.colors.button }}
              >
                Submit
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
