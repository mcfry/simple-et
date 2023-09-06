// External
import { useEffect, useState, useContext } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@material-tailwind/react'
import { z } from 'zod'

// Internal
import { AuthContext } from '../../utils/Auth'

const Set = z.object({
  Id: z.number(),
  SetNumber: z.number(),
  SetRecordId: z.number(),
  Time: z.number(),
  TimeAfter: z.number(),
})
const SR = z.object({
  Id: z.number(),
  Uid: z.string(),
  CreatedAt: z.string().datetime(),
  ExerciseId: z.number(),
  Sets: z.array(Set),
})
const Exercise = z.object({
  id: z.number(),
  name: z.string().min(4),
  setRecords: z.array(z.any()),
  UserExercises: z.array(z.any()),
})
type Set = z.infer<typeof Set>
type SR = z.infer<typeof SR>
type Exercise = z.infer<typeof Exercise>

export default function Results() {
  const { currentUser } = useContext(AuthContext)
  const { setRecordId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const exerciseId = new URLSearchParams(location.search).get('exerciseId')

  // ---------
  // - State -
  // ---------
  const [lastAttempt, setLastAttempt] = useState<SR>()
  const [_, setSetRecords] = useState<SR[]>()
  const [exercise, setExercise] = useState<Exercise>()
  const [averageTimes, setAverageTimes] = useState<number[][]>([])
  const [averageRestTimes, setAverageRestTimes] = useState<number[][]>([])

  const setAveragesPerSet = (data: SR[]) => {
    const averageTime: number[][] = []
    const averageRest: number[][] = []

    if (data) {
      for (let setRecord of data) {
        for (let set of setRecord.Sets) {
          if (set.Time === 0 || set.TimeAfter === 0) {
            continue
          }

          if (averageTime.length < set.SetNumber) {
            averageTime.push([set.Time, 1])
          } else {
            averageTime[set.SetNumber - 1][0] += set.Time
            averageTime[set.SetNumber - 1][1] += 1
          }

          if (averageRest.length < set.SetNumber) {
            averageRest.push([set.TimeAfter, 1])
          } else {
            averageRest[set.SetNumber - 1][0] += set.TimeAfter
            averageRest[set.SetNumber - 1][1] += 1
          }
        }
      }
    }

    setAverageTimes(_ => averageTime)
    setAverageRestTimes(_ => averageRest)
  }

  // -------------
  // - Lifecycle -
  // -------------
  useEffect(() => {
    if (currentUser) {
      if (setRecordId) {
        fetch(
          import.meta.env.VITE_DB_URL + '/SetRecord/byExercise/' + exerciseId,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${currentUser.accessToken}`,
            },
          },
        )
          .then(res => {
            if (res.ok) {
              return res.json()
            }
          })
          .then(data => {
            setSetRecords(data)
            setLastAttempt(data[data.length - 1])
            setAveragesPerSet(data)
          })
          .catch(e => {
            console.error(e)
          })
      }

      if (exerciseId) {
        fetch(import.meta.env.VITE_DB_URL + '/Exercise/' + exerciseId, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.accessToken}`,
          },
        })
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
    }
  }, [currentUser])

  return (
    <section className="flex flex-col justify-center items-center grow w-full">
      <div className="card w-[30rem] bg-white text-black shadow-xl p-8 pb-10 rounded-md">
        <div className="flex flex-col items-center space-y-8">
          <span className="w-full text-center text-4xl font-bold">
            {exercise?.name} - History
          </span>

          {averageTimes.map((avg, index) => (
            <div
              key={`at-${index}`}
              className="flex flex-col justify-center items-center space-x-2"
            >
              <span>Average Time for Set {index + 1}</span>
              <span>Exercise: {(avg[0] / avg[1]).toFixed(0)}s</span>
              <span>
                Rest:{' '}
                {(
                  averageRestTimes[index][0] / averageRestTimes[index][1]
                ).toFixed(0)}
                s
              </span>
            </div>
          ))}

          {lastAttempt && (
            <div
              key={lastAttempt.Id}
              className="flex flex-col items-center justify-center w-full"
            >
              <span className="font-semibold">Your Most Recent Attempt</span>
              <span className="mb-4 font-semibold">
                {new Date(lastAttempt.CreatedAt).toLocaleDateString()}
              </span>
              {lastAttempt.Sets.map(set => (
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
          )}

          <Button
            color="orange"
            variant="gradient"
            className="font-bold text-lg w-[22rem]"
            onClick={() => navigate('/')}
          >
            Perform Another Set
          </Button>
        </div>
      </div>
    </section>
  )
}
