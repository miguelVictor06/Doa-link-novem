const { configurar, obterPool, fechar } = require('../src/database');
const { migrar } = require('../src/database/migrator');
const {
  enviarArquivo,
  excluirArquivoCloudinaryComLog
} = require('../src/services/arquivos');

async function main() {
  configurar();
  await migrar();

  const cliente = await obterPool().connect();
  const enviados = [];

  try {
    const coluna = await cliente.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'arquivo'
         AND column_name = 'conteudo'`
    );

    if (coluna.rowCount === 0) {
      await finalizar(cliente);
      console.log('Nenhum arquivo binário legado encontrado. Nada a fazer.');
      return;
    }

    const pendentes = await cliente.query(
      `SELECT id_arquivo, id_usuario, nome_original, mime, tamanho, conteudo
       FROM arquivo
       WHERE conteudo IS NOT NULL
       ORDER BY id_arquivo`
    );

    if (pendentes.rowCount === 0) {
      await finalizar(cliente);
      console.log('Nenhum arquivo binário legado encontrado. Coluna conteudo removida.');
      return;
    }

    await cliente.query('BEGIN');

    try {
      for (const arquivo of pendentes.rows) {
        const metadados = await enviarArquivo({
          arquivo: {
            buffer: arquivo.conteudo,
            size: arquivo.tamanho,
            mimetype: arquivo.mime,
            originalname: arquivo.nome_original
          },
          nomeOriginal: arquivo.nome_original,
          permitirNaoImagem: true
        });

        enviados.push(metadados);

        await cliente.query(
          `UPDATE arquivo
           SET nome_original = $1,
               mime = $2,
               tamanho = $3,
               url_segura = $4,
               public_id = $5,
               provedor = 'cloudinary',
               resource_type = $6,
               conteudo = NULL
           WHERE id_arquivo = $7`,
          [
            metadados.nomeOriginal,
            metadados.mime,
            metadados.tamanho,
            metadados.urlSegura,
            metadados.publicId,
            metadados.resourceType,
            arquivo.id_arquivo
          ]
        );
      }

      await finalizar(cliente);
      await cliente.query('COMMIT');
    } catch (erro) {
      await cliente.query('ROLLBACK');
      throw erro;
    }

    console.log(`[CLOUDINARY] ${pendentes.rowCount} arquivo(s) migrado(s) com sucesso.`);
  } catch (erro) {
    for (const enviado of enviados) {
      await excluirArquivoCloudinaryComLog({
        public_id: enviado.publicId,
        provedor: enviado.provedor,
        resource_type: enviado.resourceType
      });
    }

    throw erro;
  } finally {
    cliente.release();
    await fechar();
  }
}

async function finalizar(cliente) {
  const coluna = await cliente.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'arquivo'
       AND column_name = 'conteudo'`
  );

  if (coluna.rowCount > 0) {
    const restantes = await cliente.query(
      'SELECT COUNT(*)::int AS total FROM arquivo WHERE conteudo IS NOT NULL'
    );

    if (restantes.rows[0].total > 0) {
      throw new Error('Ainda existem arquivos binários pendentes de migração.');
    }

    await cliente.query('ALTER TABLE arquivo DROP COLUMN conteudo');
  }

  await cliente.query('ALTER TABLE arquivo VALIDATE CONSTRAINT arquivo_url_segura_check');
  await cliente.query('ALTER TABLE arquivo VALIDATE CONSTRAINT arquivo_resource_type_check');
}

main().catch((erro) => {
  console.error('[CLOUDINARY] Falha na migração:', erro.causa?.message || erro.message);
  process.exit(1);
});
