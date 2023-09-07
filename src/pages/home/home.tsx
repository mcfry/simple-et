// External
import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect, useContext } from 'react'
import {
  Input,
  Select,
  Option,
  Button,
  Progress,
  Chip,
} from '@material-tailwind/react'
import { IoMdInformationCircleOutline } from 'react-icons/io'
import { TbSettings, TbAnalyze, TbCheck, TbPlus, TbMinus } from 'react-icons/tb'
import { GiWeightLiftingUp, GiPush } from 'react-icons/gi'
import clsx from 'clsx'
import { z } from 'zod'

// Internal
import { AuthContext } from '../../utils/Auth'
import ValidationErrors from '../../components/ValidationErrors'
import simpleNotification from '../../../public/simple-notification.mp3'

// Types
import { Exercise, ExerciseName } from '../../types'

// Validations
const Nos = z.union([z.nan(), z.number().gte(1).lte(30)])
const Nor = z.union([z.nan(), z.number().gte(1).lte(300)])
const Weight = z.union([z.nan(), z.number().gte(0).lte(1000)])

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
    'Finish Entering Info',
  ]),
  numberOfRepsPerSet: z.array(z.number()),
  weightPerSet: z.array(z.number()),
})
type Nos = z.infer<typeof Nos>
type Nor = z.infer<typeof Nor>
type Weight = z.infer<typeof Weight>
type TimerState = z.infer<typeof TimerState>

function Home() {
  const navigate = useNavigate()
  const { currentUser } = useContext(AuthContext)

  // ---------
  // - State -
  // ---------
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exercise, setExercise] = useState<Exercise | null>(null)
  // allow empty string so user can backspace
  const [numberOfSets, setNumberOfSets] = useState<Nos | ''>(1)
  const [numberOfReps, setNumberOfReps] = useState<Nor | ''>(1)
  const [weight, setWeight] = useState<Weight | ''>(0)
  const [restGoal, setRestGoal] = useState<string>('90s')
  const [exerciseErrors, setExerciseErrors] = useState<string[]>([''])
  const [nosErrors, setNosErrors] = useState<string[]>([''])
  const [norErrors, setNorErrors] = useState<string[]>([''])
  const [weightErrors, setWeightErrors] = useState<string[]>([''])
  const [timerState, setTimerState] = useState<TimerState>({
    set: 1,
    buttonText: 'Start First Set',
    timer: 0,
    setDurations: [],
    restDurations: [],
    numberOfRepsPerSet: [],
    weightPerSet: [],
  })

  const [isAddingExercise, setIsAddingExercise] = useState<boolean>(false)
  const [exerciseToAdd, setExerciseToAdd] = useState<ExerciseName>('')
  const [exerciseToAddErrors, setExerciseToAddErrors] = useState<string[]>([''])

  // --------
  // - Refs -
  // --------
  let secondsInterval = useRef<NodeJS.Timeout | null>(null)
  let audioRef = useRef<HTMLAudioElement>(null)

  const isExerciseStarted = (): boolean => {
    return timerState.buttonText !== 'Start First Set'
  }

  const isUserResting = (): boolean => {
    return timerState.buttonText === 'End Rest and Start Set'
  }

  const isUserRestingOrDone = (): boolean => {
    return (
      timerState.buttonText === 'End Rest and Start Set' ||
      timerState.buttonText === 'Finish Entering Info'
    )
  }

  const isUserDone = (): boolean => {
    return timerState.buttonText === 'Finish Entering Info'
  }

  const restGoalToInt = (): number => {
    return parseInt(
      restGoal
        .split('')
        .splice(0, restGoal.length - 1)
        .join(''),
    )
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

  const parseNorErrors = (
    norResults: z.SafeParseReturnType<number, number>,
  ) => {
    if (!norResults.success) {
      const errors = norResults.error.format()
      setNorErrors(errors._errors)
    } else if (numberOfReps == '' || isNaN(numberOfReps)) {
      setNorErrors(['Input must be a number'])
    } else {
      setNorErrors([''])
    }
  }

  const parseWeightErrors = (
    weightResults: z.SafeParseReturnType<number, number>,
  ) => {
    if (!weightResults.success) {
      const errors = weightResults.error.format()
      setWeightErrors(errors._errors)
    } else if (weight == '' || isNaN(weight)) {
      setWeightErrors(['Input must be a number'])
    } else {
      setWeightErrors([''])
    }
  }

  const createSetRecordFromState = () => {
    const sets = []
    if (numberOfSets !== '') {
      for (let i = 0; i < numberOfSets; i += 1) {
        let time = timerState.setDurations[i]
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
      numberOfRepsPerSet: [],
      weightPerSet: [],
    }))
    setIsAddingExercise(_ => false)
    setExerciseToAdd(_ => '')
    setExerciseToAddErrors(_ => [''])
    if (secondsInterval.current) clearInterval(secondsInterval.current)
  }

  // -------------
  // - Lifecycle -
  // -------------
  useEffect(() => {
    if (currentUser) {
      resetState()

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
    type: 'nos' | 'exercise' | 'toAdd' | 'restGoal' | 'nor' | 'weight',
  ) => {
    let val
    if (e) val = parseInt(e.currentTarget.value)

    if (type === 'nos' && val) {
      checkAndSetNos(val)
    } else if (type === 'exercise' && manualValue) {
      setExercise(findExerciseByName(manualValue))
    } else if (type === 'restGoal' && manualValue) {
      setRestGoal(manualValue)
    } else if (type === 'toAdd' && e) {
      setExerciseToAdd(e.currentTarget.value)
    } else if (type === 'nor' && val) {
      setNumberOfReps(val)
    } else if (type === 'weight' && val) {
      setWeight(val)
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

    const newTimerState = { ...timerState }

    if (timerState.buttonText === 'Start First Set') {
      const exerciseResults = Exercise.safeParse(exercise)
      const nosResults = Nos.safeParse(numberOfSets)
      if (nosResults.success && exerciseResults.success) {
        if (numberOfSets === 1) {
          newTimerState.buttonText = 'End Last Set'
        } else {
          newTimerState.buttonText = 'End Set and Start Rest'
        }
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
    } else if (timerState.buttonText === 'End Set and Start Rest') {
      newTimerState.setDurations.push(timerState.timer)
      newTimerState.timer = 0

      newTimerState.buttonText = 'End Rest and Start Set'
    } else if (
      timerState.buttonText === 'End Rest and Start Set' ||
      timerState.buttonText === 'End Last Set'
    ) {
      const norResults = Nor.safeParse(numberOfReps)
      const weightResults = Weight.safeParse(weight)
      if (!norResults.success || !weightResults.success) {
        parseNorErrors(norResults)
        parseWeightErrors(weightResults)
      } else {
        if (timerState.buttonText === 'End Rest and Start Set') {
          newTimerState.restDurations.push(timerState.timer)
        } else {
          newTimerState.setDurations.push(timerState.timer)
        }

        newTimerState.numberOfRepsPerSet.push(numberOfReps || 1)
        newTimerState.weightPerSet.push(weight || 0)
        newTimerState.timer = 0

        if (newTimerState.buttonText === 'End Rest and Start Set') {
          newTimerState.set = timerState.set + 1
        }

        if (newTimerState.set === numberOfSets) {
          if (newTimerState.buttonText === 'End Rest and Start Set') {
            newTimerState.buttonText = 'End Last Set'
          } else {
            newTimerState.buttonText = 'Finish Entering Info'
          }
        } else {
          newTimerState.buttonText = 'End Set and Start Rest'
        }
      }
    } else if (timerState.buttonText === 'Finish Entering Info') {
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

    setTimerState(_ => ({
      ...newTimerState,
    }))

    // Start timer for current set, unless finished
    if (newTimerState.buttonText !== 'Finish Entering Info')
      secondsInterval.current = createSecondsTimer()
  }

  const handleAddClick = () => {
    setIsAddingExercise(prev => !prev)
  }

  const handleAddSubmitClick = () => {
    if (!currentUser) return

    const exerciseResults = ExerciseName.safeParse(exerciseToAdd)
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
    <main className="flex flex-col justify-center items-center grow w-full">
      <audio ref={audioRef}>
        <source src={simpleNotification} type="audio/mp3" />
      </audio>

      <section className="card w-[30rem] bg-white text-black shadow-xl p-8 pb-10 rounded-md">
        <div className="flex flex-col items-center space-y-8">
          {!currentUser ? (
            <h1 className="w-full text-center text-2xl font-bold">
              Must login to get started
            </h1>
          ) : (
            <>
              {isExerciseStarted() && (
                <h1 className="flex justify-between items-center w-full italic font-medium">
                  <span>Set {timerState.set}</span>
                  <span>
                    {timerState.set}/{numberOfSets}
                  </span>
                </h1>
              )}
              <span className="w-full text-center text-4xl font-bold">
                {!isExerciseStarted() ? (
                  <h1>
                    <TbSettings />
                    Settings
                  </h1>
                ) : (
                  <h2 className="flex items-center justify-center space-x-3">
                    <GiPush className="h-14 w-14" />
                    <span>{exercise?.Name}</span>
                  </h2>
                )}
              </span>

              {!isExerciseStarted() ? (
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
                  <div className="flex flex-col items-center justify-center space-y-8">
                    <div className="flex flex-col items-center justify-center">
                      {!isUserDone() && (
                        <>
                          <span className="text-xl italic font-semibold">
                            {isUserResting() ? 'Resting' : 'Exercising'}
                          </span>
                          <span className="font-semibold">
                            <Chip
                              variant="gradient"
                              value={`${timerState.timer} seconds`}
                            />
                          </span>
                        </>
                      )}
                    </div>

                    {isUserRestingOrDone() && (
                      <>
                        <span className="font-semibold">How'd you do?</span>
                        <div className="flex flex-col items-center justify-center">
                          <Input
                            type="number"
                            color="orange"
                            label="Number of Reps"
                            value={numberOfReps}
                            onChange={e => handleChange(e, undefined, 'nor')}
                          />

                          <ValidationErrors errors={norErrors} />
                        </div>

                        <div className="flex flex-col items-center justify-center">
                          <Input
                            type="number"
                            color="orange"
                            label="Weight"
                            value={weight}
                            onChange={e => handleChange(e, undefined, 'weight')}
                          />

                          <ValidationErrors errors={weightErrors} />
                        </div>

                        {!isUserDone() && (
                          <div className="w-full animate-pulse">
                            <Progress
                              color={'orange'}
                              value={(timerState.timer / restGoalToInt()) * 100}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              <Button
                color="orange"
                variant="gradient"
                className="flex justify-center items-center space-x-4 font-bold text-sm w-[22rem]"
                disabled={isAddingExercise}
                onClick={handleClick}
              >
                {!isExerciseStarted() && <GiWeightLiftingUp />}
                <span>{timerState.buttonText}</span>
                {!isExerciseStarted() && <GiWeightLiftingUp />}
              </Button>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default Home
