---
name: new-service
description: Create a new service module for encapsulating business logic, external API integrations, or complex data processing
user-invocable: true
disable-model-invocation: false
---

Create a new service module for the AutoLab project.

Service purpose: $ARGUMENTS

## Requirements

1. Create the service file at `src/services/<name>Service.ts`
2. Follow the patterns in existing services:
   - `src/services/knowledgeBaseService.ts` (Supabase + business logic)
   - `src/services/openaiService.ts` (external API integration)
   - `src/services/routeOptimizer.ts` (pure logic service)
   - `src/lib/courier-service.ts` (utility with Supabase)

## Service Template

```typescript
import { supabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface ServiceInput {
  // Input types
}

export interface ServiceResult {
  success: boolean;
  data?: any;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const API_BASE_URL = '...';
const MAX_RETRIES = 3;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Description of what this function does
 */
export async function performAction(input: ServiceInput): Promise<ServiceResult> {
  try {
    // Implementation
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error in performAction:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Helper function
 */
function helperFunction(param: string): string {
  // ...
}
```

## Service Design Principles
- Services are pure TypeScript (no React, no JSX, no hooks)
- Services should NOT show toasts -- return errors and let the calling component handle UI feedback
- Services should NOT import React hooks or components
- Export explicit TypeScript types for all inputs and outputs
- Use named exports (not default export)
- Handle errors gracefully, always return structured results
- For API keys, import from `src/config/api-keys.ts` or use environment variables
- For Supabase operations, import from `@/lib/supabase`
- Include JSDoc comments for public functions
- Keep services focused -- one service per domain/integration

## After Creating the Service
1. Import and use in components/hooks:
```tsx
import { performAction } from '@/services/myService';
```
2. Add any required API keys to `src/config/api-keys.ts`
3. Verify with `npx tsc --noEmit`
