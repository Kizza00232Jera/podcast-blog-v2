import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="relative grid min-h-screen place-items-center p-4">
      <div className="relative z-10">
        <SignIn />
      </div>
    </div>
  )
}
