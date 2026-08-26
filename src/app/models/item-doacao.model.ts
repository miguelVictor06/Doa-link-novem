export interface ItemDoacao {
  id_item: number;
  titulo: string;
  descricao: string;
  status: 'Disponivel' | 'Doado';
  id_doador: number;
  id_receptor: number | null;
}

export interface DoacaoPayload {
  titulo: string;
  descricao: string;
}
