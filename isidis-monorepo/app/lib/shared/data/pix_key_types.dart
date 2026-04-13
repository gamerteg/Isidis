class PixKeyTypeOption {
  final String value;
  final String label;

  const PixKeyTypeOption({required this.value, required this.label});
}

const pixKeyTypeOptions = [
  PixKeyTypeOption(value: 'CPF', label: 'CPF'),
  PixKeyTypeOption(value: 'CNPJ', label: 'CNPJ'),
  PixKeyTypeOption(value: 'EMAIL', label: 'E-mail'),
  PixKeyTypeOption(value: 'PHONE', label: 'Celular'),
  PixKeyTypeOption(value: 'RANDOM', label: 'Chave aleatoria'),
];

String normalizePixKeyType(String? rawValue, {String? pixKey}) {
  final normalized = rawValue?.trim().toUpperCase();
  final digits = pixKey?.replaceAll(RegExp(r'\D'), '') ?? '';

  switch (normalized) {
    case 'CPF':
      return 'CPF';
    case 'CNPJ':
      return 'CNPJ';
    case 'CPF/CNPJ':
      return digits.length > 11 ? 'CNPJ' : 'CPF';
    case 'EMAIL':
      return 'EMAIL';
    case 'PHONE':
    case 'CELULAR':
    case 'TELEFONE':
      return 'PHONE';
    case 'RANDOM':
    case 'EVP':
    case 'ALEATORIA':
    case 'ALEATORIA ':
    case 'CHAVE ALEATORIA':
      return 'RANDOM';
    default:
      return 'CPF';
  }
}
