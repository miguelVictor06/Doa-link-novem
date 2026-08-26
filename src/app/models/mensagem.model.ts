export interface UsuarioContato {
  id_usuario: number;
  nome: string;
  endereco: string;
}

export interface Mensagem {
  id_mensagem: number;
  id_remetente: number;
  id_destinatario: number;
  texto: string;
  lida: number;
  criado_em: string;
}

export interface MensagemPayload {
  id_remetente: number;
  id_destinatario: number;
  texto: string;
}
