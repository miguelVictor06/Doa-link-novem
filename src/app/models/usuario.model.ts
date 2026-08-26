export interface Usuario {
  id_usuario: number;
  nome: string;
  email: string;
  senha: string;
  endereco: string;
}

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface CadastroPayload {
  nome: string;
  email: string;
  senha: string;
  endereco: string;
}
