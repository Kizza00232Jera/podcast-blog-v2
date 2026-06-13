import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="relative grid min-h-screen place-items-center p-4">
      <div className="relative z-10">
        <SignUp />
      </div>
    </div>
  )
}
