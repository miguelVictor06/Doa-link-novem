// Seletores da área de upload de imagem (Arrastar e Soltar)
const zonaUpload = document.getElementById('dropZone');
const campoArquivo = document.getElementById('fileInput');

// Ativa o clique no campo de arquivo oculto ao clicar na área visual
zonaUpload.addEventListener('click', () => campoArquivo.click());

zonaUpload.addEventListener('dragover', (evento) => {
    evento.preventDefault();
    zonaUpload.classList.add('bg-primary/5', 'border-primary');
});

zonaUpload.addEventListener('dragleave', () => {
    zonaUpload.classList.remove('bg-primary/5', 'border-primary');
});

zonaUpload.addEventListener('drop', (evento) => {
    evento.preventDefault();
    zonaUpload.classList.remove('bg-primary/5', 'border-primary');
    if (evento.dataTransfer.files.length > 0) {
        processarArquivo(evento.dataTransfer.files[0]);
    }
});

campoArquivo.addEventListener('change', (evento) => {
    if (evento.target.files.length > 0) {
        processarArquivo(evento.target.files[0]);
    }
});

function processarArquivo(arquivo) {
    const leitorArquivo = new FileReader();
    leitorArquivo.onload = (evento) => {
        zonaUpload.innerHTML = `<img src="${evento.target.result}" class="w-full h-full object-cover" alt="Preview">`;
    };
    leitorArquivo.readAsDataURL(arquivo);
}

// Máscara simples para o campo de telefone: (00) 00000-0000
const campoTelefone = document.getElementById('phone');
campoTelefone.addEventListener('input', (evento) => {
    let valoresLimpos = evento.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
    evento.target.value = !valoresLimpos[2] ? valoresLimpos[1] : '(' + valoresLimpos[1] + ') ' + valoresLimpos[2] + (valoresLimpos[3] ? '-' + valoresLimpos[3] : '');
});

// Envio do formulário e integração com o backend Java
const formularioDoacao = document.getElementById('donationForm');

formularioDoacao.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // Impede o recarregamento automático da página
    
    const botaoEnviar = evento.target.querySelector('button[type="submit"]');
    const textoOriginal = botaoEnviar.innerHTML;
    
    // Modifica a interface para o estado de carregamento
    botaoEnviar.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Publicando...';
    botaoEnviar.disabled = true;
    
    // Objeto contendo os valores digitados nos campos do formulário
    const titulo = document.getElementById('itemName').value.trim();
    const descricao = document.getElementById('description').value.trim();

    if (!titulo || !descricao) {
        alert('Os campos título e descrição são obrigatórios para publicar uma doação.');
        botaoEnviar.innerHTML = textoOriginal;
        botaoEnviar.disabled = false;
        return;
    }

    // Payload alinhado ao contrato da API: titulo e descricao
    const dadosDoacao = {
        titulo: titulo,
        descricao: descricao
    };

    try {
        // Envio dos dados para o servidor local do Spring Boot
        const resposta = await fetch('http://localhost:8080/api/doacoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosDoacao)
        });

        if (resposta.ok) {
            alert('Doação publicada com sucesso! Obrigado por colaborar com a comunidade.');
            window.location.reload();
        } else {
            alert('Erro ao publicar a doação no servidor. Verifique o status da API.');
            botaoEnviar.innerHTML = textoOriginal;
            botaoEnviar.disabled = false;
        }
    } catch (erro) {
        console.error("Erro na comunicação com o backend:", erro);
        alert('Não foi possível conectar ao servidor Java.');
        botaoEnviar.innerHTML = textoOriginal;
        botaoEnviar.disabled = false;
    }
});