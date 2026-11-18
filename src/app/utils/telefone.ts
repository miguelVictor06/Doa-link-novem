import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const TAMANHO_DDD = 2;
const TAMANHO_TRONCO_CELULAR = 5;
const TOTAL_DIGITOS = 11;
const TAMANHO_TELEFONE_FIXO = 10;

export function extrairDigitosTelefone(valor: unknown): string {
  return valor === null || valor === undefined ? '' : String(valor).replace(/\D/g, '');
}

export function telefoneEstaCompleto(valor: unknown): boolean {
  return extrairDigitosTelefone(valor).length === TOTAL_DIGITOS;
}

function montarTelefone(digitos: string, tamanhoTronco: number): string {
  if (!digitos) {
    return '';
  }

  const ddd = digitos.slice(0, TAMANHO_DDD);
  if (digitos.length <= TAMANHO_DDD) {
    return `(${ddd}`;
  }

  const tronco = digitos.slice(TAMANHO_DDD, TAMANHO_DDD + tamanhoTronco);
  const final = digitos.slice(TAMANHO_DDD + tamanhoTronco, TOTAL_DIGITOS);

  return final ? `(${ddd}) ${tronco}-${final}` : `(${ddd}) ${tronco}`;
}

export function aplicarMascaraTelefone(valor: unknown): string {
  return montarTelefone(extrairDigitosTelefone(valor).slice(0, TOTAL_DIGITOS), TAMANHO_TRONCO_CELULAR);
}

export function formatarTelefone(valor: unknown): string {
  const original = valor === null || valor === undefined ? '' : String(valor).trim();
  const digitos = extrairDigitosTelefone(original);

  if (!digitos || digitos.length > TOTAL_DIGITOS) {
    return original;
  }

  const tamanhoTronco =
    digitos.length === TAMANHO_TELEFONE_FIXO ? TAMANHO_TRONCO_CELULAR - 1 : TAMANHO_TRONCO_CELULAR;

  return montarTelefone(digitos, tamanhoTronco);
}

export function posicaoCursorTelefone(valorFormatado: string, digitosAntesDoCursor: number): number {
  if (digitosAntesDoCursor <= 0) {
    const primeiroDigito = valorFormatado.search(/\d/);
    return primeiroDigito === -1 ? 0 : primeiroDigito;
  }

  let digitosEncontrados = 0;
  for (let indice = 0; indice < valorFormatado.length; indice++) {
    if (/\d/.test(valorFormatado.charAt(indice))) {
      digitosEncontrados++;
      if (digitosEncontrados === digitosAntesDoCursor) {
        return indice + 1;
      }
    }
  }

  return valorFormatado.length;
}

export function aplicarMascaraTelefoneNoControle(
  controle: AbstractControl,
  input: HTMLInputElement | null | undefined
): void {
  const valor = controle.value;
  const formatado = aplicarMascaraTelefone(valor);

  if (formatado === valor) {
    return;
  }

  const texto = valor === null || valor === undefined ? '' : String(valor);
  const posicao = input?.selectionStart ?? texto.length;
  const digitosAntesDoCursor = extrairDigitosTelefone(texto.slice(0, posicao)).length;

  controle.setValue(formatado, { emitEvent: false });

  if (input) {
    const novaPosicao = posicaoCursorTelefone(formatado, digitosAntesDoCursor);
    input.setSelectionRange(novaPosicao, novaPosicao);
  }
}

export const validarTelefone: ValidatorFn = (controle: AbstractControl): ValidationErrors | null =>
  telefoneEstaCompleto(controle.value) ? null : { telefoneInvalido: true };
