export interface Usuario {
  id_usuario: number;
  nome: string;
  email: string;
  endereco: string;
  tipo: string;
  cpf?: string | null;
  cnpj?: string | null;
  criado_em?: string;
}

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface AtualizarPerfilPayload {
  nome: string;
  email: string;
  endereco: string;
}

export interface CadastroPayload {
  nome: string;
  email: string;
  senha: string;
  endereco: string;
  tipo: string;
  cpf?: string;
  cnpj?: string;
}
