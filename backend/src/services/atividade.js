async function registrarAtividade(cliente, dados) {
  await cliente.query(
    `INSERT INTO atividade (id_usuario, tipo, entidade, entidade_id, detalhes)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      dados.idUsuario ?? null,
      dados.tipo,
      dados.entidade,
      dados.entidadeId ?? null,
      JSON.stringify(dados.detalhes ?? {})
    ]
  );
}

module.exports = { registrarAtividade };
