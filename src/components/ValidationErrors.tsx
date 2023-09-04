export default function ValidationErrors({ errors }: { errors: string[] }) {
  return (
    <>
      {errors && errors[0] != '' && (
        <span className="text-red-500 ml-2 font-semibold">
          <ul>
            {errors.map((nse, index) => (
              <li key={index}>{nse}</li>
            ))}
          </ul>
        </span>
      )}
    </>
  )
}
