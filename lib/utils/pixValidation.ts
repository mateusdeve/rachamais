export interface PixValidationResult {
  valid: boolean;
  type?: 'CPF' | 'Email' | 'Telefone' | 'Chave Aleatória';
  error?: string;
}

export function validatePixKey(pixKey: string | null | undefined): PixValidationResult {
  if (!pixKey || pixKey.trim().length === 0) {
    return { valid: true }; // Chave vazia é válida (opcional)
  }

  const key = pixKey.trim();

  // CPF: 11 dígitos numéricos
  if (/^\d{11}$/.test(key)) {
    return { valid: true, type: 'CPF' };
  }

  // Email: formato válido
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(key)) {
    return { valid: true, type: 'Email' };
  }

  // Telefone: formato brasileiro (+55 seguido de DDD + número) ou apenas números
  if (/^\+55\d{10,11}$/.test(key) || /^\d{10,11}$/.test(key)) {
    return { valid: true, type: 'Telefone' };
  }

  // Chave aleatória: formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(key)) {
    return { valid: true, type: 'Chave Aleatória' };
  }

  return {
    valid: false,
    error: 'Chave PIX inválida. Use CPF (11 dígitos), email, telefone (+55DDD...) ou chave aleatória (UUID)',
  };
}
