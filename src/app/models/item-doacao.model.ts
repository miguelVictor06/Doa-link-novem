export interface ItemDoacao {
  id_item: number;
  titulo: string;
  descricao: string;
  foto: string | null;
  condicao: string | null;
  telefone: string | null;
  status: 'Disponivel' | 'Doado';
  id_doador: number;
  id_receptor: number | null;
  nome_doador: string;
  endereco_doador: string | null;
  criado_em: string;
}
