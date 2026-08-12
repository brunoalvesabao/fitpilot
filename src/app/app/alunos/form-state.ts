export type FormState = {
  errors: Record<string, string>;
  formError: string | null;
};

export const emptyFormState: FormState = { errors: {}, formError: null };
