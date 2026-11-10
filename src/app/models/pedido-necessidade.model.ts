export type CategoriaPedido = 'Alimentos' | 'Móveis' | 'Vestuário' | 'Materiais Escolares' | 'Saúde' | 'Outros';

export type UrgenciaPedido = 'Baixa' | 'Média' | 'Alta';

export type StatusPedido = 'Aberto' | 'Concluído';

export type OrdemPedido = 'relevancia' | 'urgencia' | 'proximidade';

export interface PedidoNecessidade {
  id_pedido: number;
  titulo: string;
  categoria: CategoriaPedido;
  urgencia: UrgenciaPedido;
  cidade: string;
  estado: string;
  descricao: string;
  telefone: string;
  quantidade: number;
  quantidade_atendida: number;
  status: StatusPedido;
  id_solicitante: number;
  nome_solicitante: string;
  tipo_solicitante: string;
  criado_em: string;
}

export interface PedidoPayload {
  titulo: string;
  categoria: CategoriaPedido;
  urgencia: UrgenciaPedido;
  cidade: string;
  estado: string;
  descricao: string;
  telefone: string;
  quantidade: number;
}

export const CATEGORIAS_PEDIDO: readonly CategoriaPedido[] = [
  'Alimentos',
  'Móveis',
  'Vestuário',
  'Materiais Escolares',
  'Saúde',
  'Outros'
];

export const URGENCIAS_PEDIDO: readonly UrgenciaPedido[] = ['Baixa', 'Média', 'Alta'];

export const ORDEM_URGENCIA: Record<UrgenciaPedido, number> = {
  Alta: 3,
  Média: 2,
  Baixa: 1
};
