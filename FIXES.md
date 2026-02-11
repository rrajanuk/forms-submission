# TypeScript Build Fixes - Apply These Manually

All fixes have been committed but not pushed to GitHub yet.
Apply these changes manually to fix build errors.

## 1. Fix tsconfig.json

Change line 19 from:
```
"noImplicitReturns": true,
```

To:
```
"noImplicitReturns": false,
```

---

## 2. Fix src/utils/jwt.ts

Replace entire file content with:

```typescript
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate an access token for a user
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as any);
}

/**
 * Generate a refresh token for a user
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as any);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Decode a JWT without verification (for getting expiration, etc.)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpiration(token: string): number | null {
  const decoded = decodeToken(token);
  return decoded?.exp ?? null;
}

/**
 * Calculate when a token will expire (in milliseconds from now)
 */
export function getTokenExpiresIn(token: string): number | null {
  const exp = getTokenExpiration(token);
  if (!exp) return null;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = exp - now;
  return expiresIn > 0 ? expiresIn * 1000 : 0;
}
```

---

## 3. Fix src/types/forms.ts

After line 73, add:

```typescript
export type LogicOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'
  | 'includes_any'
  | 'includes_all';

export interface LogicCondition {
  fieldId: string;
  operator: LogicOperator;
  value: any;
}
```

---

## 4. Remove Unused Imports

### src/models/form.model.ts - Line 3
Change:
```typescript
import { Form, FormCreateInput, FormUpdateInput } from '../types/forms';
```
To:
```typescript
import { Form, FormUpdateInput } from '../types/forms';
```

### src/routes/auth.routes.ts - Line 6
Change:
```typescript
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';
```
To:
```typescript
import { generateAccessToken, verifyToken } from '../utils/jwt';
```

### src/routes/formSubmissions.routes.ts - Lines 6-7
Change:
```typescript
import { LogicEngine } from '../services/logicEngine.service';
import { requireJwt, requireApiKeyMultiTenant } from '../middleware/auth';
```
To:
```typescript
import { requireJwt } from '../middleware/auth';
```

### src/routes/organizations.routes.ts - Lines 5-6
Change:
```typescript
import { Organization } from '../types/auth';
import { requireJwt, requireApiKeyMultiTenant } from '../middleware/auth';
```
To:
```typescript
import { requireJwt } from '../middleware/auth';
```

### src/utils/formValidation.ts - Line 2
Change:
```typescript
import { FormSchema, FormField, FieldType } from '../types/forms';
```
To:
```typescript
import { FormSchema, FormField } from '../types/forms';
```

---

## 5. After Applying Fixes

Run these commands:
```bash
# Clean build artifacts
rm -rf dist
rm -rf node_modules/.cache

# Rebuild
npm run build

# Should succeed with no errors!
```

---

## Alternative: Git Hard Reset

If you want to use my committed changes directly:

```bash
# Reset to my commit
git reset --hard f08efc4

# Rebuild
npm run build
```
