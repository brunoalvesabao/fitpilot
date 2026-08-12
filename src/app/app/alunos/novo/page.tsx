import { AlunoForm } from "../_components/aluno-form";
import { createAluno } from "../actions";

export default function NovoAlunoPage() {
  return <AlunoForm title="Novo aluno" action={createAluno} />;
}
