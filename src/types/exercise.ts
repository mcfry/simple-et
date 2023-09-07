// External
import { z } from 'zod'

// Internal
import { SR } from './set_record'

export const ExerciseName = z.string().min(4)
export const Exercise = z.object({
  Id: z.number(),
  Name: ExerciseName,
  SetRecords: z.array(SR),
  UserExercises: z.array(z.any()),
})

export type Exercise = z.infer<typeof Exercise>
export type ExerciseName = z.infer<typeof ExerciseName>
