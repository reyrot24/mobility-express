export const validateTelefono = (phone: string): boolean => {
  const phoneRegex = /^[0-9]{9,15}$/;
  return phoneRegex.test(phone);
};

export const validatePIVA = (piva: string): boolean => {
  const pivaRegex = /^[0-9]{11}$/;
  return pivaRegex.test(piva);
};
