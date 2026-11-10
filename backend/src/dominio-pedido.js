const CATEGORIAS = [
  'Alimentos',
  'Móveis',
  'Vestuário',
  'Materiais Escolares',
  'Saúde',
  'Outros'
];

const URGENCIAS = ['Baixa', 'Média', 'Alta'];

const STATUS = ['Aberto', 'Concluído'];

const ehCategoriaValida = categoria => CATEGORIAS.includes(categoria);

const ehUrgenciaValida = urgencia => URGENCIAS.includes(urgencia);

module.exports = { CATEGORIAS, URGENCIAS, STATUS, ehCategoriaValida, ehUrgenciaValida };
