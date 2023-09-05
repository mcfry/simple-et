// External
import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect, useContext } from 'react'
import { Input, Select, Option, Button } from '@material-tailwind/react'
import { IoMdInformationCircleOutline } from 'react-icons/io'
import { TbAnalyze, TbCheck, TbPlus, TbMinus } from 'react-icons/tb'
import clsx from 'clsx'
import { z } from 'zod'

// Internal
import { AuthContext } from '../../utils/Auth'
import ValidationErrors from '../../components/ValidationErrors'
import simpleNotification from '../../../public/simple-notification.mp3'

// Validations
const Exercise = z.object({
  Id: z.number(),
  Name: z.string().min(4),
  SetRecords: z.array(z.any()),
  UserExercises: z.array(z.any()),
})
const ExerciseToAdd = z.string().min(4)
const Nos = z.union([z.nan(), z.number().gte(1).lte(30)])

// Schema
const TimerState = z.object({
  set: z.number().gte(1).lte(30),
  timer: z.number(),
  setDurations: z.array(z.number()),
  restDurations: z.array(z.number()),
  buttonText: z.enum([
    'Start First Set',
    'End Set and Start Rest',
    'End Rest and Start Set',
    'End Last Set',
  ]),
})
type Exercise = z.infer<typeof Exercise>
type ExerciseToAdd = z.infer<typeof ExerciseToAdd>
type Nos = z.infer<typeof Nos>
type TimerState = z.infer<typeof TimerState>

function Home() {
  const navigate = useNavigate()
  const { currentUser } = useContext(AuthContext)

  // ---------
  // - State -
  // ---------
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [numberOfSets, setNumberOfSets] = useState<Nos | ''>(1) // allow empty string so user can backspace
  const [restGoal, setRestGoal] = useState<string>('90s')
  const [exerciseErrors, setExerciseErrors] = useState<string[]>([''])
  const [nosErrors, setNosErrors] = useState<string[]>([''])
  const [timerState, setTimerState] = useState<TimerState>({
    set: 1,
    buttonText: 'Start First Set',
    timer: 0,
    setDurations: [],
    restDurations: [],
  })

  const [isAddingExercise, setIsAddingExercise] = useState<boolean>(false)
  const [exerciseToAdd, setExerciseToAdd] = useState<ExerciseToAdd>('')
  const [exerciseToAddErrors, setExerciseToAddErrors] = useState<string[]>([''])

  // --------
  // - Refs -
  // --------
  let secondsInterval = useRef<NodeJS.Timeout | null>(null)
  let audioRef = useRef<HTMLAudioElement>(null)

  const isExerciseStarted = (): boolean => {
    return timerState.buttonText === 'Start First Set'
  }

  const checkAndSetNos = (val: number) => {
    const nosResults = Nos.safeParse(val)
    if (!nosResults.success) {
      const errors = nosResults.error.format()
      setNosErrors(errors._errors)
    } else if (isNaN(val)) {
      setNosErrors(['Input must be a number'])
      setNumberOfSets('')
    } else {
      setNosErrors([''])
      setNumberOfSets(val)
    }
  }

  const createSetRecordFromState = () => {
    const sets = []
    if (numberOfSets !== '') {
      for (let i = 0; i < numberOfSets; i += 1) {
        let time =
          i === numberOfSets - 1 ? timerState.timer : timerState.setDurations[i]
        let timeAfter =
          i < timerState.restDurations.length ? timerState.restDurations[i] : 0

        const setObj = {
          Time: time,
          TimeAfter: timeAfter,
          SetNumber: i + 1,
        }
        sets.push(setObj)
      }
    }

    return {
      Uid: currentUser.uid,
      ExerciseId: exercise?.Id,
      Sets: sets,
    }
  }

  const findExerciseByName = (name: string) => {
    return exercises.filter(exer => exer.Name === name)[0]
  }

  const resetState = () => {
    setExercise(_ => null)
    setExercises(_ => [])
    setNumberOfSets(_ => 1)
    setRestGoal(_ => '90s')
    setExerciseErrors(_ => [''])
    setNosErrors(_ => [''])
    setTimerState(_ => ({
      set: 1,
      buttonText: 'Start First Set',
      timer: 0,
      setDurations: [],
      restDurations: [],
    }))
    setIsAddingExercise(_ => false)
    setExerciseToAdd(_ => '')
    setExerciseToAddErrors(_ => [''])
  }

  // -------------
  // - Lifecycle -
  // -------------
  useEffect(() => {
    if (currentUser) {
      resetState()

      console.log(currentUser)
      fetch(import.meta.env.VITE_DB_URL + '/Exercise', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.accessToken}`,
        },
      })
        .then(res => {
          if (res.ok) {
            return res.json()
          } else {
            throw Error('Response not ok.')
          }
        })
        .then(data => {
          setExercises(data)
        })
        .catch(e => {
          console.error(e)
        })
    }
  }, [currentUser])

  // ------------
  // - Handlers -
  // ------------
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement> | undefined,
    manualValue: string | undefined,
    type: 'nos' | 'exercise' | 'toAdd' | 'restGoal',
  ) => {
    if (type === 'nos' && e) {
      const val = parseInt(e.currentTarget.value)
      checkAndSetNos(val)
    } else if (type === 'exercise' && manualValue) {
      setExercise(findExerciseByName(manualValue))
    } else if (type === 'restGoal' && manualValue) {
      setRestGoal(manualValue)
    } else if (type === 'toAdd' && e) {
      setExerciseToAdd(e.currentTarget.value)
    }
  }

  const createSecondsTimer = () => {
    const convertedRestGoal = parseInt(restGoal.slice(0, restGoal.length - 1))

    return setInterval(() => {
      setTimerState(state => {
        if (
          state.timer + 1 === convertedRestGoal &&
          state.buttonText === 'End Rest and Start Set'
        ) {
          audioRef.current?.play()
        }

        return {
          ...state,
          timer: state.timer + 1,
        }
      })
    }, 1000)
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (secondsInterval.current) clearInterval(secondsInterval.current)
    if (!currentUser) return

    const exerciseResults = Exercise.safeParse(exercise)
    const nosResults = Nos.safeParse(numberOfSets)
    if (nosResults.success && exerciseResults.success) {
      const newTimerState = { ...timerState }

      if (timerState.buttonText === 'Start First Set') {
        newTimerState.buttonText = 'End Set and Start Rest'
      } else if (timerState.buttonText === 'End Set and Start Rest') {
        newTimerState.setDurations.push(timerState.timer)
        newTimerState.timer = 0

        newTimerState.buttonText = 'End Rest and Start Set'
      } else if (timerState.buttonText === 'End Rest and Start Set') {
        newTimerState.restDurations.push(timerState.timer)
        newTimerState.set = timerState.set + 1
        newTimerState.timer = 0

        if (newTimerState.set === numberOfSets) {
          newTimerState.buttonText = 'End Last Set'
        } else {
          newTimerState.buttonText = 'End Set and Start Rest'
        }
      } else if (timerState.buttonText === 'End Last Set') {
        const SetRecord = createSetRecordFromState()

        fetch(import.meta.env.VITE_DB_URL + '/SetRecord', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.accessToken}`,
          },
          body: JSON.stringify(SetRecord),
        })
          .then(res => {
            if (res.ok) {
              return res.json()
            } else {
              throw Error('Response not ok.')
            }
          })
          .then(data => {
            if (data) {
              navigate(`/results/${data?.Id}?exerciseId=${data.ExerciseId}`)
            }
          })
          .catch(e => {
            console.error(e)
          })
      }

      setNosErrors([''])
      setExerciseErrors([''])
      setTimerState(_ => ({
        ...newTimerState,
      }))

      // Start timer for current set
      secondsInterval.current = createSecondsTimer()
    } else {
      if (!exerciseResults.success) {
        const errors = exerciseResults.error.format()
        setExerciseErrors(errors._errors)
      }

      if (!nosResults.success) {
        const errors = nosResults.error.format()
        setNosErrors(errors._errors)
      }
    }
  }

  const handleAddClick = () => {
    setIsAddingExercise(prev => !prev)
  }

  const handleAddSubmitClick = () => {
    if (!currentUser) return

    const exerciseResults = ExerciseToAdd.safeParse(exerciseToAdd)
    if (!exerciseResults.success) {
      const errors = exerciseResults.error.format()
      setExerciseToAddErrors(errors._errors)
    } else {
      // display alert
      fetch(import.meta.env.VITE_DB_URL + '/Exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.accessToken}`, // Set the content type to JSON
        },
        body: JSON.stringify({
          name: exerciseToAdd,
        }),
      })
        .then(res => {
          if (res.ok) {
            return res.json()
          } else {
            throw Error('Response not ok.')
          }
        })
        .then(data => {
          if (data) {
            setExercises(prev => [...prev, data])
            setExercise(data)
            setExerciseToAddErrors([''])
            setIsAddingExercise(false)
            setExerciseToAdd('')
          }
        })
        .catch(err => {
          console.error('Error:', err)
        })
    }
  }

  return (
    <section className="flex flex-col justify-center items-center grow w-full">
      <audio ref={audioRef}>
        <source src={simpleNotification} type="audio/mp3" />
      </audio>

      <div className="card w-[30rem] bg-white text-black shadow-xl p-8 pb-10 rounded-md">
        <div className="flex flex-col items-center space-y-8">
          {!currentUser ? (
            <span className="w-full text-center text-2xl font-bold">
              Must login to get started
            </span>
          ) : (
            <>
              <span className="w-full text-center text-4xl font-bold">
                {isExerciseStarted() ? 'Settings' : exercise?.Name}
              </span>

              {isExerciseStarted() ? (
                <>
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="flex w-full justify-center">
                      <div className="flex w-[22rem] space-x-2">
                        <Select
                          color="orange"
                          label="Select Exercise"
                          value={exercise?.Name}
                          selected={() => exercise?.Name}
                          disabled={isAddingExercise}
                          onChange={val =>
                            handleChange(undefined, val, 'exercise')
                          }
                        >
                          {exercises.map(exer => (
                            <Option key={exer.Id} value={exer.Name}>
                              {exer.Name}
                            </Option>
                          ))}
                        </Select>

                        <Button
                          color="orange"
                          variant="gradient"
                          className="font-bold text-lg w-16 relative overflow-hidden"
                          onClick={handleAddClick}
                        >
                          <span className="flex items-center">
                            {isAddingExercise ? <TbMinus /> : <TbPlus />}
                          </span>
                        </Button>
                      </div>
                    </div>

                    <ValidationErrors errors={exerciseErrors} />

                    {isAddingExercise && (
                      <div className="flex flex-col w-full justify-center">
                        <div className="flex w-[22rem] space-x-2">
                          <Input
                            type="text"
                            color="orange"
                            label="Exercise to Add"
                            value={exerciseToAdd}
                            onChange={e => handleChange(e, undefined, 'toAdd')}
                          />

                          <Button
                            color="orange"
                            variant="gradient"
                            className="font-bold text-lg w-16 relative overflow-hidden"
                            onClick={handleAddSubmitClick}
                          >
                            <span className="flex w-full items-center justify-center">
                              <TbCheck />
                            </span>
                          </Button>
                        </div>

                        <ValidationErrors errors={exerciseToAddErrors} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="w-[22rem]">
                      <Input
                        type="number"
                        color="orange"
                        label="Number of Sets"
                        value={numberOfSets}
                        disabled={isAddingExercise}
                        onChange={e => handleChange(e, undefined, 'nos')}
                      />
                    </div>

                    <ValidationErrors errors={nosErrors} />
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="w-[22rem]">
                      <Select
                        color="orange"
                        label="Select Rest Time Goal (Sound Alert)"
                        value={restGoal}
                        disabled={isAddingExercise}
                        onChange={val =>
                          handleChange(undefined, val, 'restGoal')
                        }
                      >
                        <Option value={'30s'}>30 seconds</Option>
                        <Option value={'45s'}>45 seconds</Option>
                        <Option value={'60s'}>1 minute</Option>
                        <Option value={'75s'}>1 minute 15s</Option>
                        <Option value={'90s'}>1 minute 30s</Option>
                        <Option value={'120s'}>2 minutes</Option>
                        <Option value={'150s'}>2 minutes 30s</Option>
                        <Option value={'180s'}>3 minutes</Option>
                      </Select>
                    </div>
                  </div>

                  <div
                    className={clsx(
                      'flex flex-col items-center justify-center space-y-2',
                      { 'text-gray-400': isAddingExercise },
                    )}
                  >
                    <p className="w-[22rem]">
                      <IoMdInformationCircleOutline className="inline-block mb-1 mr-1" />
                      One button. Press it to start a set, press it again to end
                      a set and start rest time. Finally, press it whenever to
                      start the next set. Continue until completion.
                    </p>

                    <p className="w-[22rem]">
                      <TbAnalyze className="inline-block mb-1 mr-1" />
                      Your set and rest times will be recorded, so you can
                      compare against previous exercises.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xl italic font-semibold">
                      {timerState.buttonText === 'End Rest and Start Set'
                        ? 'Resting'
                        : 'Exercising'}
                    </span>
                    <span className="font-semibold">
                      Set {timerState.set}/{numberOfSets}: {timerState.timer}s
                    </span>
                  </div>
                </>
              )}

              <Button
                color="orange"
                variant="gradient"
                className="font-bold text-lg w-[22rem]"
                disabled={isAddingExercise}
                onClick={handleClick}
              >
                {timerState.buttonText}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default Home
