# Tarefa: Implementar Validação de CPF (Módulo 11) em TypeScript

## Objetivo
Criar uma função utilitária em TypeScript puro (sem instalar nenhuma biblioteca ou pacote externo) para validar CPFs brasileiros baseada no cálculo oficial de Módulo 11 da Receita Federal.

## Requisitos da Função (`validarCPF`)
1. **Limpeza de máscara:** Remover todos os caracteres que não sejam números (pontos, traços e espaços) usando regex (`/[^\d]/g`).
2. **Validação inicial de tamanho e repetição:**
   - O CPF limpo deve ter exatamente 11 dígitos.
   - Rejeitar sequências de números iguais (ex: `111.111.111-11`, `000.000.000-00`), pois são matematicamente aceitas pelo algoritmo mas inválidas pela Receita Federal.
3. **Cálculo do 1º Dígito Verificador:**
   - Multiplicar os primeiros 9 dígitos por pesos decrescentes de 10 a 2.
   - Somar os resultados, multiplicar por 10 e tirar o resto da divisão por 11 (`soma % 11`).
   - Se o resto for 10 ou 11, o dígito verificador deve ser 0. Caso contrário, é `11 - resto`.
   - Comparar com o 10º dígito do CPF. Se divergir, retornar `false`.
4. **Cálculo do 2º Dígito Verificador:**
   - Multiplicar os 10 primeiros dígitos (incluindo o primeiro dígito já validado) por pesos decrescentes de 11 a 2.
   - Aplicar a mesma lógica de resto por 11.
   - Comparar com o 11º dígito do CPF. Se divergir, retornar `false`.
5. **Retorno:** Retornar `true` se o CPF for válido e `false` se for inválido.

## Arquivo de Destino
Criar ou atualizar a função em um arquivo de utilitários (ex: `src/app/utils/cpf-validator.ts` ou equivalente) para que possa ser importada e utilizada nos formulários do front-end / back-end do projeto.


CODIGO DE INSPIRAÇÃO OU ATÉ MESMO PARA UTILIZAÇÃO:
export function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos (pontos, traços e espaços)
  const cpfLimpo = cpf.replace(/[^\d]/g, '');

  // Verifica se o tamanho é 11 ou se é uma sequência de números iguais (ex: 111.111.111-11)
  if (cpfLimpo.length !== 11 || /^(\d)\1{10}$/.test(cpfLimpo)) {
    return false;
  }

  // Validação do 1º dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i), 10) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(9), 10)) {
    return false;
  }

  // Validação do 2º dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i), 10) * (11 - i);
  }
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(10), 10)) {
    return false;
  }

  return true;
}