export type FormState = {
  errors: Record<string, string>;
  formError: string | null;
  success: boolean;
};

export const emptyFormState: FormState = { errors: {}, formError: null, success: false };
