import { useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { z } from 'zod'

const Set = z.object({
  Id: z.number(),
  SetNumber: z.number(),
  SetRecordId: z.number(),
  Time: z.number(),
  TimeAfter: z.number(),
})
const SR = z.object({
  Id: z.number(),
  CreatedAt: z.string().datetime(),
  ExerciseId: z.number(),
  Sets: z.array(Set),
})
const Exercise = z.object({
  id: z.number(),
  name: z.string().min(4),
  setRecords: z.array(z.any()),
})
type Set = z.infer<typeof Set>
type SR = z.infer<typeof SR>
type Exercise = z.infer<typeof Exercise>

export default function Results() {
  const { setRecordId } = useParams()
  const location = useLocation()
  const exerciseId = new URLSearchParams(location.search).get('exerciseId')

  // ---------
  // - State -
  // ---------
  const [setRecords, setSetRecords] = useState<SR[]>()
  const [exercise, setExercise] = useState<Exercise>()

  // -------------
  // - Lifecycle -
  // -------------
  useEffect(() => {
    if (setRecordId) {
      fetch(import.meta.env.VITE_DB_URL + '/SetRecord/byExercise/' + exerciseId)
        .then(res => {
          if (res.ok) {
            return res.json()
          }
        })
        .then(data => {
          setSetRecords(data)
        })
        .catch(e => {
          console.error(e)
        })
    }

    if (exerciseId) {
      fetch(import.meta.env.VITE_DB_URL + '/Exercise/' + exerciseId)
        .then(res => {
          if (res.ok) {
            return res.json()
          }
        })
        .then(data => {
          setExercise(data)
        })
        .catch(e => {
          console.error(e)
        })
    }
  }, [])

  return (
    <section className="flex flex-col justify-center items-center grow w-full">
      <div className="card w-[30rem] bg-white text-black shadow-xl p-8 pb-10 rounded-md">
        <div className="flex flex-col items-center space-y-8">
          <span className="w-full text-center text-4xl font-bold">
            {exercise?.name} History
          </span>

          {setRecords?.map(sr => (
            <div
              key={sr.Id}
              className="flex flex-col items-center justify-center w-full"
            >
              <span className="mb-4 font-semibold">
                Date: {new Date(sr.CreatedAt).toLocaleDateString()}
              </span>
              {sr.Sets.map(set => (
                <span
                  key={set.Id}
                  className="flex flex-col items-center mb-2 w-full"
                >
                  <span className="italic">Set {set.SetNumber}</span>
                  <span>Time: {set.Time}s</span>
                  <span>Rest Time: {set.TimeAfter}s</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
