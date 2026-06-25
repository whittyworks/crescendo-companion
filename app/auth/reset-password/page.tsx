// app/auth/reset-password/page.tsx
import { ResetPasswordForm } from './reset-password-form'

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 flex-col bg-cream text-navy">
      <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <ResetPasswordForm />
      </main>
      <footer className="px-6 pb-10 pt-6 text-center sm:px-10">
        <p className="font-serif text-base italic text-gold sm:text-lg">
          Stella Maris, ora pro nobis
        </p>
      </footer>
    </div>
  )
}
