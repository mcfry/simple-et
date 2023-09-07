// External
import { z } from 'zod'

// Internal
import { Set } from './set'

export const SR = z.object({
  Id: z.number(),
  Uid: z.string(),
  CreatedAt: z.string().datetime(),
  ExerciseId: z.number(),
  Sets: z.array(Set),
})

export type SR = z.infer<typeof SR>
