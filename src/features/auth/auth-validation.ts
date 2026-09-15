export type PasswordValidation = Readonly<{
  isValid: boolean
  message?: string
}>

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateEmail(email: string): string | undefined {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return 'Escribe un correo electrónico válido.'
  }

  return undefined
}

export function validateDisplayName(displayName: string): string | undefined {
  const normalizedName = displayName.trim()

  if (!normalizedName) {
    return 'Escribe el nombre que quieres mostrar.'
  }

  if (normalizedName.length > 80) {
    return 'El nombre no puede superar 80 caracteres.'
  }

  return undefined
}

export function validatePassword(password: string): PasswordValidation {
  if (password.length < 8) {
    return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return {
      isValid: false,
      message: 'Usa al menos una mayúscula, una minúscula y un número.',
    }
  }

  return { isValid: true }
}
