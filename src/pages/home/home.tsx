// External
import { useState, useRef } from 'react'
import { Input } from '@material-tailwind/react'
import { Select, Option } from '@material-tailwind/react'
import { Button } from '@material-tailwind/react'
import { IoMdInformationCircleOutline } from 'react-icons/io'
import { TbAnalyze, TbCheck, TbPlus, TbMinus } from 'react-icons/tb'
import clsx from 'clsx'
import { z } from 'zod'

// Internal
import simpleNotification from '../../../public/simple-notification.mp3'

// Validations
const Exercise = z.string().min(4)
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
type Nos = z.infer<typeof Nos>
type TimerState = z.infer<typeof TimerState>

function Home() {
  // ---------
  // - State -
  // ---------
  const [exercise, setExercise] = useState<Exercise>('')
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
  const [exerciseToAdd, setExerciseToAdd] = useState<Exercise>('')
  const [exerciseToAddErrors, setExerciseToAddErrors] = useState<string[]>([''])

  // --------
  // - Refs -
  // --------
  let secondsInterval = useRef<number>(0)
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

  // const checkAndSetExercise = (val: string) => {
  //   const exerciseResults = Exercise.safeParse(val)
  //   if (!exerciseResults.success) {
  //     const errors = exerciseResults.error.format()
  //     setExerciseErrors(errors._errors)
  //   } else {
  //     setExerciseErrors([''])
  //     setExercise(val)
  //   }
  // }

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
      setExercise(manualValue)
    } else if (type === 'restGoal' && manualValue) {
      setRestGoal(manualValue)
    } else if (type === 'toAdd' && e) {
      setExerciseToAdd(e.currentTarget.value)
    }
  }

  const createSecondsTimer = () =>
    setInterval(() => {
      setTimerState(state => ({
        ...state,
        timer: state.timer + 1,
      }))
    }, 1000)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    clearInterval(secondsInterval.current)

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
        // database stuff, route to new page
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
    //audioRef.current?.play()
  }

  const handleAddSubmitClick = () => {
    const exerciseResults = Exercise.safeParse(exerciseToAdd)
    if (!exerciseResults.success) {
      const errors = exerciseResults.error.format()
      setExerciseToAddErrors(errors._errors)
    } else {
      setExerciseToAddErrors([''])
      setIsAddingExercise(false)
      // submit exercise to db, then set it as selected
      // display alert
    }
  }

  return (
    <section className="flex flex-col justify-center items-center grow w-full">
      <audio ref={audioRef}>
        <source src={simpleNotification} type="audio/mp3" />
      </audio>
      <div className="card w-[30rem] bg-white text-black shadow-xl p-8 pb-10 rounded-md">
        <div className="flex flex-col items-center space-y-8">
          <span className="w-full text-center text-4xl font-bold">
            {isExerciseStarted() ? 'Settings' : exercise}
          </span>

          {isExerciseStarted() ? (
            <>
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="flex w-full justify-center">
                  <div className="flex w-[22rem] space-x-2">
                    <Select
                      color="orange"
                      label="Select Exercise"
                      value={exercise}
                      onChange={val => handleChange(undefined, val, 'exercise')}
                    >
                      <Option value={'Push Ups'}>Push Ups</Option>
                      <Option value={'Pull Ups'}>Pull Ups</Option>
                      <Option value={'Dips'}>Dips</Option>
                      <Option value={'Plank'}>Plank</Option>
                      <Option value={'Handstands'}>Handstand</Option>
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

                {exerciseErrors && exerciseErrors[0] != '' && (
                  <span className="text-red-500 ml-2 font-semibold">
                    <ul>
                      {exerciseErrors.map((ee, index) => (
                        <li key={index}>{ee}</li>
                      ))}
                    </ul>
                  </span>
                )}

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

                    {exerciseToAddErrors && exerciseToAddErrors[0] != '' && (
                      <span className="text-red-500 ml-2 font-semibold">
                        <ul>
                          {exerciseToAddErrors.map((ee, index) => (
                            <li key={index}>{ee}</li>
                          ))}
                        </ul>
                      </span>
                    )}
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

                {nosErrors && nosErrors[0] != '' && (
                  <span className="text-red-500 ml-2 font-semibold">
                    <ul>
                      {nosErrors.map((nse, index) => (
                        <li key={index}>{nse}</li>
                      ))}
                    </ul>
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="w-[22rem]">
                  <Select
                    color="orange"
                    label="Select Rest Time Goal"
                    value={restGoal}
                    disabled={isAddingExercise}
                    onChange={val => handleChange(undefined, val, 'restGoal')}
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
                  One button. Press it to start a set, press it again to end a
                  set and start rest time. Finally, press it whenever to start
                  the next set. Continue until completion.
                </p>

                <p className="w-[22rem]">
                  <TbAnalyze className="inline-block mb-1 mr-1" />
                  Your set and rest times will be recorded, so you can compare
                  against previous exercises.
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
        </div>
      </div>
    </section>
  )
}

export default Home
