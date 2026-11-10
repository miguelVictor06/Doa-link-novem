function normalizarDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function normalizarEmail(valor) {
  return String(valor ?? '').trim().toLowerCase();
}

function normalizarTipoConta(valor) {
  return valor === 'Instituicao' ? 'Instituicao' : 'Pessoal';
}

function validarCpf(valor) {
  const cpf = normalizarDigitos(valor);

  if (cpf.length !== 11 || new Set(cpf).size === 1) {
    return false;
  }

  const calcularDigito = (ate) => {
    let soma = 0;
    for (let indice = 0; indice < ate; indice++) {
      soma += Number(cpf[indice]) * (ate + 1 - indice);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(cpf[9]) && calcularDigito(10) === Number(cpf[10]);
}

function validarCnpj(valor) {
  const cnpj = normalizarDigitos(valor);

  if (cnpj.length !== 14 || new Set(cnpj).size === 1) {
    return false;
  }

  const calcularDigito = (posicao) => {
    const pesos = posicao === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let indice = 0; indice < posicao; indice++) {
      soma += Number(cnpj[indice]) * pesos[indice];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calcularDigito(12) === Number(cnpj[12]) && calcularDigito(13) === Number(cnpj[13]);
}

module.exports = {
  normalizarDigitos,
  normalizarEmail,
  normalizarTipoConta,
  validarCpf,
  validarCnpj
};
