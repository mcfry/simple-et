// Internal
import { z } from 'zod'

export const Set = z.object({
  Id: z.number(),
  SetNumber: z.number(),
  SetRecordId: z.number(),
  Time: z.number(),
  TimeAfter: z.number(),
})

export type Set = z.infer<typeof Set>
